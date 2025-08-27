#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

interface GrayMatterFile<T = any> {
  data: T;
  content: string;
}

interface HugoFrontmatter {
  title?: string;
  date?: string;
  draft?: boolean;
  slug?: string;
  tags?: string[];
  [key: string]: any;
}

interface TagExtractionResult {
  tags: string[];
  cleanContent: string;
}

class ObsidianToHugoConverter {
  private readonly inputDir: string;
  private readonly outputDir: string;
  private readonly staticDir: string;

  constructor(inputDir: string = './obsidian', outputDir: string = './content', staticDir: string = './static') {
    this.inputDir = inputDir;
    this.outputDir = outputDir;
    this.staticDir = staticDir;
  }

  /**
   * Convert Obsidian image embeds ![[image.png]] to markdown image syntax
   */
  convertImageEmbeds(content: string): string {
    // Handle image embeds with alt text: ![[image.png|Alt Text]]
    content = content.replace(/!\[\[([^|\]]+)\|([^\]]+)\]\]/g, (match: string, imageName: string, altText: string): string => {
      const encodedImageName = encodeURIComponent(imageName);
      return `![${altText}](/${encodedImageName})`;
    });

    // Handle simple image embeds: ![[image.png]]
    content = content.replace(/!\[\[([^\]]+)\]\]/g, (match: string, imageName: string): string => {
      const altText = path.basename(imageName, path.extname(imageName));
      const encodedImageName = encodeURIComponent(imageName);
      return `![${altText}](/${encodedImageName})`;
    });

    return content;
  }

  /**
   * Convert Obsidian wikilinks [[Page Name]] to Hugo markdown links
   */
  convertWikilinks(content: string): string {
    // Handle wikilinks with aliases: [[Page Name|Display Text]]
    content = content.replace(/(?<!\!)\[\[([^|\]]+)\|([^\]]+)\]\]/g, (match: string, pageName: string, displayText: string): string => {
      const slug = this.pageNameToSlug(pageName);
      return `[${displayText}](../${slug}/)`;
    });

    // Handle simple wikilinks: [[Page Name]]
    content = content.replace(/(?<!\!)\[\[([^\]]+)\]\]/g, (match: string, pageName: string): string => {
      const slug = this.pageNameToSlug(pageName);
      return `[${pageName}](../${slug}/)`;
    });

    return content;
  }

  /**
   * Extract tags from content and remove them
   */
  extractObsidianTags(content: string): TagExtractionResult {
    const tags: string[] = [];
    
    // Extract inline tags (including Japanese characters)
    const tagRegex = /#([a-zA-Z0-9_\-/\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/g;
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
   * Convert page names to URL-friendly slugs
   */
  pageNameToSlug(pageName: string): string {
    return pageName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Generate title from filename
   */
  filenameToTitle(filename: string): string {
    return path.basename(filename, '.md')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (l: string): string => l.toUpperCase());
  }

  /**
   * Generate slug from filename
   */
  filenameToSlug(filename: string): string {
    return this.pageNameToSlug(path.basename(filename, '.md'));
  }

  /**
   * Process a single markdown file
   */
  processFile(filePath: string): string | null {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = matter(content) as GrayMatterFile<HugoFrontmatter>;
      
      // Extract tags from content
      const { tags: contentTags, cleanContent } = this.extractObsidianTags(parsed.content);
      
      // Convert image embeds and wikilinks
      let convertedContent = this.convertImageEmbeds(cleanContent);
      convertedContent = this.convertWikilinks(convertedContent);

      // Auto-complete frontmatter fields if they don't exist
      const frontmatter: HugoFrontmatter = { ...parsed.data };
      
      if (!frontmatter.title) {
        frontmatter.title = this.filenameToTitle(filePath);
      }
      
      if (!frontmatter.date) {
        frontmatter.date = new Date().toISOString();
      }
      
      if (frontmatter.draft === undefined) {
        frontmatter.draft = false;
      }
      
      if (!frontmatter.slug) {
        frontmatter.slug = this.filenameToSlug(filePath);
      }

      // Merge tags (existing + extracted)
      const allTags = [...(frontmatter.tags || []), ...contentTags];
      const uniqueTags = [...new Set(allTags)];
      if (uniqueTags.length > 0) {
        frontmatter.tags = uniqueTags;
      }

      // Create new content with frontmatter
      const hugoContent = matter.stringify(convertedContent, frontmatter);
      return hugoContent;
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Copy asset file to static directory, preserving directory structure
   */
  copyAssetFile(filePath: string): boolean {
    try {
      const relativePath = path.relative(this.inputDir, filePath);
      const staticPath = path.join(this.staticDir, relativePath);
      
      this.ensureDirectoryExists(staticPath);
      fs.copyFileSync(filePath, staticPath);
      return true;
    } catch (error) {
      console.error(`Error copying asset ${filePath}:`, error);
      return false;
    }
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
   * Get output file path maintaining directory structure
   */
  getOutputFilePath(inputFilePath: string): string {
    const relativePath = path.relative(this.inputDir, inputFilePath);
    return path.join(this.outputDir, relativePath);
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
        if (entry.isDirectory() && entry.name !== '.obsidian') {
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
   * Find asset files (non-markdown files)
   */
  findAssetFiles(dir: string): string[] {
    const files: string[] = [];
    const traverse = (currentDir: string): void => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      entries.forEach((entry) => {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory() && entry.name !== '.obsidian') {
          traverse(fullPath);
        } else if (entry.isFile() && !entry.name.endsWith('.md') && entry.name !== '.vault-nickname') {
          files.push(fullPath);
        }
      });
    };
    traverse(dir);
    return files;
  }

  /**
   * Convert all files from obsidian to content
   */
  convertAll(): void {
    const markdownFiles = this.findMarkdownFiles(this.inputDir);
    const assetFiles = this.findAssetFiles(this.inputDir);
    
    console.log(`Processing ${markdownFiles.length} markdown files and ${assetFiles.length} assets`);

    // Clean output directory
    if (fs.existsSync(this.outputDir)) {
      fs.rmSync(this.outputDir, { recursive: true, force: true });
    }

    let converted = 0;
    let copied = 0;

    // Process markdown files
    markdownFiles.forEach((filePath) => {
      const convertedContent = this.processFile(filePath);
      if (convertedContent !== null) {
        const outputPath = this.getOutputFilePath(filePath);
        this.ensureDirectoryExists(outputPath);
        fs.writeFileSync(outputPath, convertedContent, 'utf8');
        converted++;
      }
    });

    // Copy asset files
    assetFiles.forEach((filePath) => {
      if (this.copyAssetFile(filePath)) {
        copied++;
      }
    });

    console.log(`Conversion complete: ${converted} files converted, ${copied} assets copied`);
  }
}

// Main execution
if (require.main === module) {
  const inputDir = process.argv[2] || './obsidian';
  const outputDir = process.argv[3] || './content';
  const staticDir = process.argv[4] || './static';
  
  const converter = new ObsidianToHugoConverter(inputDir, outputDir, staticDir);
  converter.convertAll();
}

export default ObsidianToHugoConverter;