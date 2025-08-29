#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import matter from 'gray-matter';

interface GrayMatterFile<T = any> {
  data: T;
  content: string;
}

interface ZennFrontmatter {
  title?: string;
  emoji?: string;
  type?: 'tech' | 'idea';
  topics?: string[];
  published?: boolean;
  published_at?: string;
  slug?: string;
  date?: string;
  [key: string]: any;
}

interface TagExtractionResult {
  tags: string[];
  cleanContent: string;
}

class ObsidianToZennConverter {
  private readonly inputDir: string;
  private readonly outputDir: string;
  private readonly imagesDir: string;

  constructor(inputDir: string = './articles-vault', outputDir: string = './articles') {
    this.inputDir = inputDir;
    this.outputDir = outputDir;
    this.imagesDir = './images';
  }

  /**
   * Find all image files in the input directory
   */
  findImageFiles(dir: string): string[] {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'];
    const imageFiles: string[] = [];

    const traverse = (currentDir: string): void => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      entries.forEach(entry => {
        if (entry.isDirectory() && entry.name !== '.obsidian') {
          traverse(path.join(currentDir, entry.name));
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (imageExtensions.includes(ext)) {
            imageFiles.push(path.join(currentDir, entry.name));
          }
        }
      });
    };

    traverse(dir);
    return imageFiles;
  }

  /**
   * Copy image files from input directory to images directory
   */
  copyImages(): void {
    const imageFiles = this.findImageFiles(this.inputDir);
    
    if (imageFiles.length === 0) {
      console.log('No image files found to copy.');
      return;
    }

    // Ensure images directory exists
    this.ensureDirectoryExists(path.join(this.imagesDir, 'dummy.txt'));

    imageFiles.forEach(imagePath => {
      const filename = path.basename(imagePath);
      const destinationPath = path.join(this.imagesDir, filename);
      
      try {
        fs.copyFileSync(imagePath, destinationPath);
        console.log(`Copied image: ${filename} -> ${destinationPath}`);
      } catch (error) {
        console.error(`Error copying image ${filename}:`, error);
      }
    });
  }

  /**
   * Convert Obsidian image embeds ![[image.png]] to markdown image syntax
   */
  convertImageEmbeds(content: string): string {
    // Handle image embeds with alt text: ![[image.png|Alt Text]]
    content = content.replace(/!\[\[([^|\]]+)\|([^\]]+)\]\]/g, (match: string, imageName: string, altText: string): string => {
      const encodedImageName = encodeURIComponent(imageName);
      return `![${altText}](/images/${encodedImageName})`;
    });

    // Handle simple image embeds: ![[image.png]]
    content = content.replace(/!\[\[([^\]]+)\]\]/g, (match: string, imageName: string): string => {
      const altText = path.basename(imageName, path.extname(imageName));
      const encodedImageName = encodeURIComponent(imageName);
      return `![${altText}](/images/${encodedImageName})`;
    });

    return content;
  }

  /**
   * Convert Obsidian wikilinks [[Page Name]] to markdown links
   */
  convertWikilinks(content: string): string {
    // Handle wikilinks with aliases: [[Page Name|Display Text]]
    content = content.replace(/(?<!\!)\[\[([^|\]]+)\|([^\]]+)\]\]/g, (match: string, pageName: string, displayText: string): string => {
      return `[${displayText}](${pageName})`;
    });

    // Handle simple wikilinks: [[Page Name]]
    content = content.replace(/(?<!\!)\[\[([^\]]+)\]\]/g, (match: string, pageName: string): string => {
      return `[${pageName}](${pageName})`;
    });

    return content;
  }

  /**
   * Extract tags from content and remove them
   */
  extractObsidianTags(content: string): TagExtractionResult {
    const tags: string[] = [];
    
    // Extract inline tags (including Japanese characters)
    // Use negative lookbehind to avoid matching hashtags preceded by "C" (for C#) or at line start (for markdown headings)
    const tagRegex = /(?<!C)(?<!^[ \t]*#{1,6}[ \t]*)#([a-zA-Z0-9_\-/\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/gm;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(content)) !== null) {
      tags.push(match[1]);
    }

    // Remove tags from content and clean up whitespace
    let cleanContent = content.replace(tagRegex, '');
    cleanContent = cleanContent.replace(/\n\s*\n/g, '\n\n');
    
    return { tags, cleanContent };
  }

  /**
   * Generate title from filename
   */
  filenameToTitle(filename: string): string {
    return path.basename(filename, '.md');
  }

  /**
   * Convert extracted tags to Zenn topics
   */
  tagsToTopics(tags: string[]): string[] {
    // Convert common tags to Zenn-friendly topics
    const topicMap: { [key: string]: string } = {
      'javascript': 'javascript',
      'typescript': 'typescript',
      'react': 'react',
      'vue': 'vue',
      'nodejs': 'nodejs',
      'web': 'web',
      'frontend': 'frontend',
      'backend': 'backend',
      'oss': 'oss',
      'github': 'github',
      'npm': 'npm',
      'css': 'css',
      'html': 'html'
    };

    const topics = tags.map(tag => {
      const lowerTag = tag.toLowerCase();
      return topicMap[lowerTag] || lowerTag;
    }).slice(0, 5); // Zenn allows max 5 topics

    return Array.from(new Set(topics));
  }

  /**
   * Process a single markdown file
   */
  processFile(filePath: string): { content: string; filename: string } | null {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = matter(content) as GrayMatterFile<ZennFrontmatter>;
      
      // Extract tags from content
      const { tags: contentTags, cleanContent } = this.extractObsidianTags(parsed.content);
      
      // Convert image embeds and wikilinks
      let convertedContent = this.convertImageEmbeds(cleanContent);
      convertedContent = this.convertWikilinks(convertedContent);

      // Create Zenn frontmatter
      const frontmatter: ZennFrontmatter = {};
      
      // Title
      frontmatter.title = parsed.data.title || this.filenameToTitle(filePath);
      
      // Emoji (default if not provided, preserve native emoji)
      if (parsed.data.emoji) {
        // If emoji exists, use it as-is (preserve native emoji)
        frontmatter.emoji = parsed.data.emoji;
      } else {
        frontmatter.emoji = "📝";
      }
      
      // Type (default to tech)
      frontmatter.type = parsed.data.type || "tech";
      
      // Topics from tags and existing topics
      const existingTopics = parsed.data.topics || [];
      const extractedTopics = this.tagsToTopics(contentTags);
      const allTopics = [...existingTopics, ...extractedTopics];
      const uniqueTopics = Array.from(new Set(allTopics)).slice(0, 5);
      if (uniqueTopics.length > 0) {
        frontmatter.topics = uniqueTopics;
      }
      
      // Published status (default to true)
      frontmatter.published = parsed.data.published !== undefined ? parsed.data.published : true;
      
      // Published_at from date field
      if (parsed.data.date) {
        frontmatter.published_at = parsed.data.date;
      }

      // Generate filename from slug or create new one
      let filename: string;
      if (parsed.data.slug) {
        filename = `${parsed.data.slug}.md`;
      } else {
        // Generate a random 12-character slug
        const slug = this.generateRandomSlug();
        filename = `${slug}.md`;
      }

      // Create new content with Zenn frontmatter
      const yamlContent = yaml.dump(frontmatter, {
        quotingType: '"' as const,
        forceQuotes: true
      });
      const zennContent = `---\n${yamlContent}---\n${convertedContent}`;
      
      return { content: zennContent, filename };
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Generate a random 12-character alphanumeric string
   */
  generateRandomSlug(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Ensure directory exists
   */
  ensureDirectoryExists(filePath: string): void {
    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  }

  /**
   * Find markdown files recursively
   */
  findMarkdownFiles(dir: string): string[] {
    const files: string[] = [];
    const traverse = (currentDir: string): void => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      entries.forEach((entry) => {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory() && entry.name !== '.obsidian' && entry.name !== 'templates') {
          traverse(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      });
    };
    traverse(dir);
    return files;
  }

  /**
   * Convert all files from articles-vault to articles
   */
  convertAll(): void {
    const markdownFiles = this.findMarkdownFiles(this.inputDir);
    
    console.log(`Processing ${markdownFiles.length} markdown files from ${this.inputDir} to ${this.outputDir}`);

    // Copy images from articles-vault to images directory
    console.log('Copying images...');
    this.copyImages();

    // Clear existing articles before regeneration
    if (fs.existsSync(this.outputDir)) {
      const existingFiles = fs.readdirSync(this.outputDir);
      existingFiles.forEach((file) => {
        if (file.endsWith('.md')) {
          const filePath = path.join(this.outputDir, file);
          fs.unlinkSync(filePath);
          console.log(`Deleted existing article: ${file}`);
        }
      });
    }

    // Ensure output directory exists
    this.ensureDirectoryExists(path.join(this.outputDir, 'dummy.md'));

    let converted = 0;

    // Process markdown files
    markdownFiles.forEach((filePath) => {
      const result = this.processFile(filePath);
      if (result !== null) {
        const outputPath = path.join(this.outputDir, result.filename);
        fs.writeFileSync(outputPath, result.content, 'utf8');
        console.log(`Converted: ${path.basename(filePath)} → ${result.filename}`);
        converted++;
      }
    });

    console.log(`Conversion complete: ${converted} files converted to Zenn format`);
  }
}

// Main execution
if (require.main === module) {
  const inputDir = process.argv[2] || './articles-vault';
  const outputDir = process.argv[3] || './articles';
  
  const converter = new ObsidianToZennConverter(inputDir, outputDir);
  converter.convertAll();
}

export default ObsidianToZennConverter;