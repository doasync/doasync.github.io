import TurndownService from 'turndown';

import type {
  DocumentMetadata,
  DocumentProcessingResult,
  DocumentProcessor,
  TextChunk,
} from '@/features/document-processing/types';

// Lazy import DOMPurify to avoid SSR issues
const getDOMPurify = async () => {
  if (typeof window === 'undefined') {
    throw new TypeError('HTML processing is only available in the browser');
  }

  const DOMPurify = await import('dompurify');
  return DOMPurify.default;
};

function cleanMarkdown(markdown: string): string {
  return markdown
    .replaceAll(/\n{3,}/g, '\n\n')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .trim();
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

function extractMetadata(
  file: File,
  text: string,
  html: string,
): DocumentMetadata {
  // Extract title from HTML if available
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : undefined;

  return {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    wordCount: countWords(text),
    characterCount: text.length,
    title,
  };
}

function splitIntoChunks(text: string, chunkSize = 4000): TextChunk[] {
  // Similar to DOCX processor - respect markdown structure
  const chunks: TextChunk[] = [];
  const sections = text.split(/\n(?=#)/);

  for (const section of sections) {
    if (section.length <= chunkSize) {
      chunks.push({
        id: crypto.randomUUID(),
        content: section.trim(),
        startIndex: 0,
        endIndex: section.length,
      });
    } else {
      const paragraphs = section.split(/\n\n/);
      let currentChunk = '';

      for (const paragraph of paragraphs) {
        if (
          currentChunk.length + paragraph.length > chunkSize &&
          currentChunk
        ) {
          chunks.push({
            id: crypto.randomUUID(),
            content: currentChunk.trim(),
            startIndex: 0,
            endIndex: currentChunk.length,
          });
          currentChunk = paragraph;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
      }

      if (currentChunk) {
        chunks.push({
          id: crypto.randomUUID(),
          content: currentChunk.trim(),
          startIndex: 0,
          endIndex: currentChunk.length,
        });
      }
    }
  }

  return chunks;
}

function generatePreviewHtml(html: string): string {
  const previewLength = 500;
  const textContent = html.replaceAll(/<[^>]*>/g, '');
  const preview =
    textContent.length > previewLength
      ? `${textContent.slice(0, Math.max(0, previewLength))}...`
      : textContent;

  return `<div style="line-height: 1.5;">${preview}</div>`;
}

export function createHTMLProcessor(): DocumentProcessor {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  });

  return {
    supportedTypes: ['text/html', 'application/xhtml+xml'],
    maxFileSize: 10 * 1024 * 1024, // 10MB

    async process(file: File): Promise<DocumentProcessingResult> {
      const htmlContent = await file.text();

      const DOMPurify = await getDOMPurify();

      // Sanitize HTML content
      const cleanHtml = DOMPurify.sanitize(htmlContent);

      // Convert to Markdown
      const markdown = turndownService.turndown(cleanHtml);
      const extractedText = cleanMarkdown(markdown);

      const metadata = extractMetadata(file, extractedText, cleanHtml);
      const chunks = splitIntoChunks(extractedText);

      return {
        extractedText,
        metadata,
        chunks,
        previewHtml: generatePreviewHtml(cleanHtml),
        originalContent: cleanHtml, // Store original sanitized HTML content
      };
    },
  };
}
