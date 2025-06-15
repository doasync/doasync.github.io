import mammoth from 'mammoth';
import TurndownService from 'turndown';
import type {
  DocumentProcessor,
  DocumentProcessingResult,
  DocumentMetadata,
  TextChunk,
} from '../types';

export class DOCXProcessor implements DocumentProcessor {
  supportedTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];
  maxFileSize = 50 * 1024 * 1024; // 50MB

  private turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  });

  async process(file: File): Promise<DocumentProcessingResult> {
    const arrayBuffer = await file.arrayBuffer();

    // Convert DOCX to HTML
    const result = await mammoth.convertToHtml({ arrayBuffer });

    // Convert HTML to Markdown
    const markdown = this.turndownService.turndown(result.value);

    const extractedText = this.cleanMarkdown(markdown);
    const metadata = this.extractMetadata(file, extractedText);
    const chunks = this.splitIntoChunks(extractedText);

    return {
      extractedText,
      metadata,
      chunks,
      previewHtml: this.generatePreviewHtml(result.value),
    };
  }

  private cleanMarkdown(markdown: string): string {
    return markdown
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();
  }

  private extractMetadata(file: File, text: string): DocumentMetadata {
    return {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      wordCount: this.countWords(text),
      characterCount: text.length,
    };
  }

  private splitIntoChunks(text: string, chunkSize = 4000): TextChunk[] {
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

  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  private generatePreviewHtml(html: string): string {
    // Return clean HTML preview (first 500 chars)
    const previewLength = 500;
    const textContent = html.replace(/<[^>]*>/g, '');
    const preview =
      textContent.length > previewLength
        ? textContent.substring(0, previewLength) + '...'
        : textContent;

    return `<div style="line-height: 1.5;">${preview}</div>`;
  }
}
