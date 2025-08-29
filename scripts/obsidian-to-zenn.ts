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

// Configuration constants
const CONFIG = {
  IMAGE_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'],
  EXCLUDED_DIRS: ['.obsidian', 'templates'],
  SLUG_CHARS: 'abcdefghijklmnopqrstuvwxyz0123456789',
  SLUG_LENGTH: 12,
  DEFAULTS: {
    EMOJI: '📝',
    TYPE: 'tech' as const,
    PUBLISHED: true,
    MAX_TOPICS: 5
  },
  TOPIC_MAP: {
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
  }
} as const;

// Regular expressions
const REGEX = {
  TAG: /(?:^|[\s])#([a-zA-Z0-9_\-/\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/gm,
  WIKILINK_WITH_ALIAS: /(?<!\!)\[\[([^|\]]+)\|([^\]]+)\]\]/g,
  WIKILINK_SIMPLE: /(?<!\!)\[\[([^\]]+)\]\]/g,
  IMAGE_WITH_ALT: /!\[\[([^|\]]+)\|([^\]]+)\]\]/g,
  IMAGE_SIMPLE: /!\[\[([^\]]+)\]\]/g
} as const;

// Log levels
enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Enhanced logging with levels and timestamps
 */
function log(level: LogLevel, message: string, ...args: any[]): void {
  const timestamp = new Date().toISOString().substring(11, 19);
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  switch (level) {
    case LogLevel.ERROR:
      console.error(prefix, message, ...args);
      break;
    case LogLevel.WARN:
      console.warn(prefix, message, ...args);
      break;
    default:
      console.log(prefix, message, ...args);
  }
}

/**
 * Error handling helper
 */
function handleError(operation: string, error: unknown, context?: string): void {
  const message = context 
    ? `Error ${operation} ${context}: ${error}`
    : `Error ${operation}: ${error}`;
  log(LogLevel.ERROR, message);
}

/**
 * Generic file finder with filter predicate
 */
function findFiles(dir: string, fileFilter: (fileName: string) => boolean): string[] {
  const files: string[] = [];
  const traverse = (currentDir: string): void => {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      entries.forEach(entry => {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory() && !CONFIG.EXCLUDED_DIRS.includes(entry.name)) {
          traverse(fullPath);
        } else if (entry.isFile() && fileFilter(entry.name)) {
          files.push(fullPath);
        }
      });
    } catch (error) {
      handleError('traversing directory', error, currentDir);
    }
  };
  traverse(dir);
  return files;
}

/**
 * Find all image files in the input directory
 */
function findImageFiles(dir: string): string[] {
  return findFiles(dir, fileName => 
    CONFIG.IMAGE_EXTENSIONS.includes(path.extname(fileName).toLowerCase())
  );
}

/**
 * Extract image references from markdown content
 */
function extractImageReferences(content: string): Set<string> {
  const imageRefs = new Set<string>();
  
  // Extract images with alt text: ![[image.png|Alt Text]]
  const withAltMatches = content.matchAll(REGEX.IMAGE_WITH_ALT);
  for (const match of withAltMatches) {
    imageRefs.add(match[1]);
  }
  
  // Extract simple images: ![[image.png]]
  const simpleMatches = content.matchAll(REGEX.IMAGE_SIMPLE);
  for (const match of simpleMatches) {
    imageRefs.add(match[1]);
  }
  
  return imageRefs;
}

/**
 * Copy only referenced image files from input directory to images directory
 */
function copyImages(inputDir: string, imagesDir: string, referencedImages: Set<string>): number {
  if (referencedImages.size === 0) {
    log(LogLevel.INFO, 'No image references found in content.');
    return 0;
  }

  // Ensure images directory exists
  ensureDirectoryExists(path.join(imagesDir, 'dummy.txt'));

  // Clean up existing images that are not referenced
  cleanupUnusedImages(imagesDir, referencedImages);

  const imageFiles = findImageFiles(inputDir);
  let copiedCount = 0;

  // Create a map of basename to full path for quick lookup
  const imageMap = new Map<string, string>();
  imageFiles.forEach(imagePath => {
    const basename = path.basename(imagePath);
    imageMap.set(basename, imagePath);
  });

  referencedImages.forEach(imageRef => {
    const imagePath = imageMap.get(imageRef);
    if (imagePath) {
      const destinationPath = path.join(imagesDir, imageRef);
      try {
        fs.copyFileSync(imagePath, destinationPath);
        log(LogLevel.INFO, `Copied image: ${imageRef}`);
        copiedCount++;
      } catch (error) {
        handleError('copying image', error, imageRef);
      }
    } else {
      log(LogLevel.WARN, `Referenced image not found: ${imageRef}`);
    }
  });

  return copiedCount;
}

/**
 * Clean up unused images from images directory
 */
function cleanupUnusedImages(imagesDir: string, referencedImages: Set<string>): number {
  if (!fs.existsSync(imagesDir)) {
    return 0;
  }

  let cleanedCount = 0;
  try {
    const existingFiles = fs.readdirSync(imagesDir);
    existingFiles.forEach(filename => {
      if (!referencedImages.has(filename) && 
          CONFIG.IMAGE_EXTENSIONS.includes(path.extname(filename).toLowerCase())) {
        const filePath = path.join(imagesDir, filename);
        try {
          fs.unlinkSync(filePath);
          log(LogLevel.INFO, `Cleaned up unused image: ${filename}`);
          cleanedCount++;
        } catch (error) {
          handleError('deleting unused image', error, filename);
        }
      }
    });
  } catch (error) {
    handleError('cleaning up images directory', error, imagesDir);
  }

  if (cleanedCount > 0) {
    log(LogLevel.INFO, `Cleaned up ${cleanedCount} unused images`);
  }

  return cleanedCount;
}

/**
 * Convert Obsidian image embeds ![[image.png]] to markdown image syntax
 */
function convertImageEmbeds(content: string): string {
  // Handle image embeds with alt text: ![[image.png|Alt Text]]
  content = content.replace(REGEX.IMAGE_WITH_ALT, (match: string, imageName: string, altText: string): string => {
    const encodedImageName = encodeURIComponent(imageName);
    return `![${altText}](/images/${encodedImageName})`;
  });

  // Handle simple image embeds: ![[image.png]]
  content = content.replace(REGEX.IMAGE_SIMPLE, (match: string, imageName: string): string => {
    const altText = path.basename(imageName, path.extname(imageName));
    const encodedImageName = encodeURIComponent(imageName);
    return `![${altText}](/images/${encodedImageName})`;
  });

  return content;
}

/**
 * Convert Obsidian wikilinks [[Page Name]] to markdown links
 */
function convertWikilinks(content: string): string {
  // Handle wikilinks with aliases: [[Page Name|Display Text]]
  content = content.replace(REGEX.WIKILINK_WITH_ALIAS, (match: string, pageName: string, displayText: string): string => {
    return `[${displayText}](${pageName})`;
  });

  // Handle simple wikilinks: [[Page Name]]
  content = content.replace(REGEX.WIKILINK_SIMPLE, (match: string, pageName: string): string => {
    return `[${pageName}](${pageName})`;
  });

  return content;
}

/**
 * Extract tags from content and remove them
 */
function extractObsidianTags(content: string): TagExtractionResult {
  const tags: string[] = [];
  
  // Extract inline tags (including Japanese characters)
  let match: RegExpExecArray | null;
  const tagRegex = new RegExp(REGEX.TAG.source, REGEX.TAG.flags);

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
function filenameToTitle(filename: string): string {
  return path.basename(filename, '.md');
}

/**
 * Convert extracted tags to Zenn topics
 */
function tagsToTopics(tags: string[]): string[] {
  const topics = tags.map(tag => {
    const lowerTag = tag.toLowerCase();
    return CONFIG.TOPIC_MAP[lowerTag] || lowerTag;
  }).slice(0, CONFIG.DEFAULTS.MAX_TOPICS);

  return Array.from(new Set(topics));
}

/**
 * Generate a random slug using configured parameters
 */
function generateRandomSlug(): string {
  let result = '';
  for (let i = 0; i < CONFIG.SLUG_LENGTH; i++) {
    result += CONFIG.SLUG_CHARS.charAt(Math.floor(Math.random() * CONFIG.SLUG_CHARS.length));
  }
  return result;
}

/**
 * Format date for Zenn published_at field
 */
function formatDateForZenn(date?: string): string {
  const targetDate = date ? new Date(date) : new Date();
  
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const hours = String(targetDate.getHours()).padStart(2, '0');
  const minutes = String(targetDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Create Zenn frontmatter from parsed data and extracted content
 */
function createZennFrontmatter(
  parsedData: ZennFrontmatter, 
  filePath: string, 
  extractedTags: string[]
): ZennFrontmatter {
  const frontmatter: ZennFrontmatter = {};
  
  frontmatter.title = parsedData.title || filenameToTitle(filePath);
  frontmatter.emoji = parsedData.emoji || CONFIG.DEFAULTS.EMOJI;
  frontmatter.type = parsedData.type || CONFIG.DEFAULTS.TYPE;
  frontmatter.published = parsedData.published ?? CONFIG.DEFAULTS.PUBLISHED;
  frontmatter.published_at = formatDateForZenn(parsedData.date);
  
  // Topics processing
  const existingTopics = parsedData.topics || [];
  const convertedTopics = tagsToTopics(extractedTags);
  const allTopics = [...existingTopics, ...convertedTopics];
  const uniqueTopics = Array.from(new Set(allTopics)).slice(0, CONFIG.DEFAULTS.MAX_TOPICS);
  
  if (uniqueTopics.length > 0) {
    frontmatter.topics = uniqueTopics;
  }
  
  return frontmatter;
}

/**
 * Ensure directory exists
 */
function ensureDirectoryExists(filePath: string): void {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

/**
 * Process a single markdown file
 */
function processFile(filePath: string): { content: string; filename: string } | null {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = matter(content) as GrayMatterFile<ZennFrontmatter>;
    
    // Extract tags from content
    const { tags: contentTags, cleanContent } = extractObsidianTags(parsed.content);
    
    // Convert image embeds and wikilinks
    let convertedContent = convertImageEmbeds(cleanContent);
    convertedContent = convertWikilinks(convertedContent);

    // Create Zenn frontmatter using dedicated function
    const frontmatter = createZennFrontmatter(parsed.data, filePath, contentTags);

    // Generate filename from slug or create new one
    let filename: string;
    if (parsed.data.slug || parsed.data.slug === "") {
      filename = `${parsed.data.slug}.md`;
    } else {
      const slug = generateRandomSlug();
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
    handleError('processing file', error, filePath);
    return null;
  }
}

/**
 * Find markdown files recursively
 */
function findMarkdownFiles(dir: string): string[] {
  return findFiles(dir, fileName => fileName.endsWith('.md'));
}

/**
 * Convert all files from articles-vault to articles
 */
function convertObsidianToZenn(
  inputDir: string = './articles-vault',
  outputDir: string = './articles',
  imagesDir: string = './images'
): void {
  const markdownFiles = findMarkdownFiles(inputDir);
  
  log(LogLevel.INFO, `Processing ${markdownFiles.length} markdown files from ${inputDir} to ${outputDir}`);

  // First pass: collect all image references from all files
  log(LogLevel.INFO, 'Analyzing image references...');
  const allImageRefs = new Set<string>();
  
  markdownFiles.forEach((filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = matter(content) as GrayMatterFile<ZennFrontmatter>;
      const { cleanContent } = extractObsidianTags(parsed.content);
      const imageRefs = extractImageReferences(cleanContent);
      imageRefs.forEach(ref => allImageRefs.add(ref));
    } catch (error) {
      handleError('analyzing image references in', error, filePath);
    }
  });

  log(LogLevel.INFO, `Found ${allImageRefs.size} unique image references`);

  // Copy only referenced images and cleanup unused ones
  log(LogLevel.INFO, 'Managing images...');
  const copiedCount = copyImages(inputDir, imagesDir, allImageRefs);

  // Clear existing articles before regeneration
  if (fs.existsSync(outputDir)) {
    const existingFiles = fs.readdirSync(outputDir);
    const deletedFiles = existingFiles.filter(file => {
      if (file.endsWith('.md')) {
        const filePath = path.join(outputDir, file);
        try {
          fs.unlinkSync(filePath);
          log(LogLevel.INFO, `Deleted existing article: ${file}`);
          return true;
        } catch (error) {
          handleError('deleting existing article', error, file);
          return false;
        }
      }
      return false;
    });
    
    if (deletedFiles.length > 0) {
      log(LogLevel.INFO, `Deleted ${deletedFiles.length} existing articles`);
    }
  }

  // Ensure output directory exists
  ensureDirectoryExists(path.join(outputDir, 'dummy.md'));

  let converted = 0;

  // Process markdown files
  markdownFiles.forEach((filePath) => {
    const result = processFile(filePath);
    if (result !== null) {
      const outputPath = path.join(outputDir, result.filename);
      try {
        fs.writeFileSync(outputPath, result.content, 'utf8');
        log(LogLevel.INFO, `Converted: ${path.basename(filePath)} → ${result.filename}`);
        converted++;
      } catch (error) {
        handleError('writing converted file', error, result.filename);
      }
    }
  });

  // Summary
  log(LogLevel.INFO, `Conversion complete: ${converted} files converted, ${copiedCount} images copied`);
}

// Main execution
if (require.main === module) {
  const inputDir = process.argv[2] || './articles-vault';
  const outputDir = process.argv[3] || './articles';
  const imagesDir = process.argv[4] || './images';
  
  convertObsidianToZenn(inputDir, outputDir, imagesDir);
}

export default convertObsidianToZenn;