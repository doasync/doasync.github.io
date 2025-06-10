import type { DocumentProcessor, DocumentProcessingResult, DocumentMetadata, TextChunk } from '../types';

export class TextProcessor implements DocumentProcessor {
  supportedTypes = ['text/plain', 'text/markdown', 'application/x-markdown'];
  maxFileSize = 10 * 1024 * 1024; // 10MB

  async process(file: File): Promise<DocumentProcessingResult> {
    const text = await file.text();
    const extractedText = this.cleanText(text);
    const metadata = this.extractMetadata(file, extractedText);
    const chunks = this.splitIntoChunks(extractedText);

    return {
      extractedText,
      metadata,
      chunks,
      previewHtml: this.generatePreviewHtml(extractedText, file.type)
    };
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private extractMetadata(file: File, text: string): DocumentMetadata {
    return {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      wordCount: this.countWords(text),
      characterCount: text.length
    };
  }

  private splitIntoChunks(text: string, chunkSize = 4000): TextChunk[] {
    const chunks: TextChunk[] = [];
    const lines = text.split('\n');
    let currentChunk = '';
    let startIndex = 0;

    for (const line of lines) {
      if (currentChunk.length + line.length > chunkSize && currentChunk) {
        chunks.push({
          id: crypto.randomUUID(),
          content: currentChunk.trim(),
          startIndex,
          endIndex: startIndex + currentChunk.length
        });
        startIndex += currentChunk.length;
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }

    if (currentChunk) {
      chunks.push({
        id: crypto.randomUUID(),
        content: currentChunk.trim(),
        startIndex,
        endIndex: startIndex + currentChunk.length
      });
    }

    return chunks;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private generatePreviewHtml(text: string, mimeType: string): string {
    const previewLength = 500;
    const preview = text.length > previewLength 
      ? text.substring(0, previewLength) + '...'
      : text;
    
    if (mimeType.includes('markdown')) {
      // Basic markdown rendering for preview
      const htmlPreview = preview
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/\n/g, '<br>');
      
      return `<div style="line-height: 1.5;">${htmlPreview}</div>`;
    } else {
      return `<pre style="white-space: pre-wrap; font-family: inherit;">${preview}</pre>`;
    }
  }
}