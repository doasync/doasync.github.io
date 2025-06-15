import mammoth from 'mammoth';
import TurndownService from 'turndown';

import type {
  DocumentMetadata,
  DocumentProcessingResult,
  DocumentProcessor,
  TextChunk,
} from '@/features/document-processing/types';

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

function extractMetadata(file: File, text: string): DocumentMetadata {
  return {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    wordCount: countWords(text),
    characterCount: text.length,
  };
}

function splitIntoChunks(text: string, chunkSize = 4000): TextChunk[] {
  // Similar to PDF processor but respects Markdown structure
  const chunks: TextChunk[] = [];
  const sections = text.split(/\n(?=#)/); // Split on headers

  for (const section of sections) {
    if (section.length <= chunkSize) {
      chunks.push({
        id: crypto.randomUUID(),
        content: section.trim(),
        startIndex: 0,
        endIndex: section.length,
      });
    } else {
      // Further split large sections
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
  // Return clean HTML preview (first 500 chars)
  const previewLength = 500;
  const textContent = html.replaceAll(/<[^>]*>/g, '');
  const preview =
    textContent.length > previewLength
      ? `${textContent.slice(0, Math.max(0, previewLength))}...`
      : textContent;

  return `<div style="line-height: 1.5;">${preview}</div>`;
}

export function createDOCXProcessor(): DocumentProcessor {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  });

  return {
    supportedTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ],
    maxFileSize: 50 * 1024 * 1024, // 50MB

    async process(file: File): Promise<DocumentProcessingResult> {
      const arrayBuffer = await file.arrayBuffer();

      // Convert DOCX to HTML
      const result = await mammoth.convertToHtml({ arrayBuffer });

      // Convert HTML to Markdown
      const markdown = turndownService.turndown(result.value);

      const extractedText = cleanMarkdown(markdown);
      const metadata = extractMetadata(file, extractedText);
      const chunks = splitIntoChunks(extractedText);

      return {
        extractedText,
        metadata,
        chunks,
        previewHtml: generatePreviewHtml(result.value),
      };
    },
  };
}
