import TurndownService from 'turndown';
import type { DocumentProcessor, DocumentProcessingResult, DocumentMetadata, TextChunk } from '../types';

// Lazy import DOMPurify to avoid SSR issues
const getDOMPurify = async () => {
  if (typeof window === 'undefined') {
    throw new Error('HTML processing is only available in the browser');
  }
  
  const DOMPurify = await import('dompurify');
  return DOMPurify.default;
};

export class HTMLProcessor implements DocumentProcessor {
  supportedTypes = ['text/html', 'application/xhtml+xml'];
  maxFileSize = 10 * 1024 * 1024; // 10MB
  
  private turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced'
  });

  async process(file: File): Promise<DocumentProcessingResult> {
    const htmlContent = await file.text();
    
    const DOMPurify = await getDOMPurify();
    
    // Sanitize HTML content
    const cleanHtml = DOMPurify.sanitize(htmlContent);
    
    // Convert to Markdown
    const markdown = this.turndownService.turndown(cleanHtml);
    const extractedText = this.cleanMarkdown(markdown);
    
    const metadata = this.extractMetadata(file, extractedText, cleanHtml);
    const chunks = this.splitIntoChunks(extractedText);

    return {
      extractedText,
      metadata,
      chunks,
      previewHtml: this.generatePreviewHtml(cleanHtml)
    };
  }

  private cleanMarkdown(markdown: string): string {
    return markdown
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();
  }

  private extractMetadata(file: File, text: string, html: string): DocumentMetadata {
    // Extract title from HTML if available
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    return {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      wordCount: this.countWords(text),
      characterCount: text.length,
      title
    };
  }

  private splitIntoChunks(text: string, chunkSize = 4000): TextChunk[] {
    // Similar to DOCX processor - respect markdown structure
    const chunks: TextChunk[] = [];
    const sections = text.split(/\n(?=#)/);
    
    for (const section of sections) {
      if (section.length <= chunkSize) {
        chunks.push({
          id: crypto.randomUUID(),
          content: section.trim(),
          startIndex: 0,
          endIndex: section.length
        });
      } else {
        const paragraphs = section.split(/\n\n/);
        let currentChunk = '';
        
        for (const paragraph of paragraphs) {
          if (currentChunk.length + paragraph.length > chunkSize && currentChunk) {
            chunks.push({
              id: crypto.randomUUID(),
              content: currentChunk.trim(),
              startIndex: 0,
              endIndex: currentChunk.length
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
            endIndex: currentChunk.length
          });
        }
      }
    }
    
    return chunks;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private generatePreviewHtml(html: string): string {
    const previewLength = 500;
    const textContent = html.replace(/<[^>]*>/g, '');
    const preview = textContent.length > previewLength 
      ? textContent.substring(0, previewLength) + '...'
      : textContent;
    
    return `<div style="line-height: 1.5;">${preview}</div>`;
  }
}