import type {
  DocumentProcessor,
  DocumentProcessingResult,
  DocumentMetadata,
  TextChunk,
} from '../types';

// Lazy import PDF.js to avoid SSR issues
const getPdfJs = async () => {
  if (typeof window === 'undefined') {
    throw new Error('PDF processing is only available in the browser');
  }

  const pdfjsLib = await import('pdfjs-dist');

  // Configure worker for Next.js environment
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // Use the worker file we copied to the public directory
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    console.log(
      `PDF.js worker configured: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`,
    );
  }

  return pdfjsLib;
};

export class PDFProcessor implements DocumentProcessor {
  supportedTypes = ['application/pdf'];
  maxFileSize = 50 * 1024 * 1024; // 50MB

  async process(file: File): Promise<DocumentProcessingResult> {
    const arrayBuffer = await file.arrayBuffer();

    const pdfjsLib = await getPdfJs();

    try {
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0, // Reduce console noise
        useSystemFonts: true, // Use system fonts when available
        standardFontDataUrl: undefined, // Don't load standard fonts from CDN
      }).promise;

      let fullText = '';
      let fullHtml = '';
      const pageTexts: string[] = [];

      // Extract text and generate HTML from each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        // Extract plain text for backward compatibility
        const pageText = textContent.items
          .map((item: unknown) =>
            'str' in (item as object) ? (item as { str: string }).str : '',
          )
          .join(' ');

        pageTexts.push(pageText);
        fullText += pageText + '\n\n';

        // Generate structured HTML with positioning
        const pageHtml = this.convertPageToHtml(textContent, viewport, pageNum);
        fullHtml += pageHtml;
      }

      const extractedText = this.cleanPdfText(fullText);
      const metadata = this.extractMetadata(file, extractedText, pdf.numPages);
      const chunks = this.splitIntoChunks(extractedText);

      return {
        extractedText,
        metadata,
        chunks,
        previewHtml:
          fullHtml || this.generateFallbackPreviewHtml(extractedText),
        originalContent:
          fullHtml || this.generateFallbackPreviewHtml(extractedText), // Store HTML representation for "Copy Code"
      };
    } catch (error) {
      console.error('PDF processing error:', error);
      throw new Error(
        `Failed to process PDF: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private cleanPdfText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private extractMetadata(
    file: File,
    text: string,
    pageCount: number,
  ): DocumentMetadata {
    return {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      pageCount,
      wordCount: this.countWords(text),
      characterCount: text.length,
      // PDF.js metadata extraction would require additional API calls
      // For now, rely on filename for title
      title: file.name.replace(/\.pdf$/i, ''),
      language: this.detectLanguage(text.substring(0, 1000)), // Sample first 1000 chars
    };
  }

  private detectLanguage(sample: string): string | undefined {
    // Simple language detection based on character patterns
    if (/[а-яё]/i.test(sample)) return 'ru';
    if (/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i.test(sample)) return 'fr';
    if (/[äöüß]/i.test(sample)) return 'de';
    if (/[ñáéíóúü]/i.test(sample)) return 'es';
    return 'en'; // Default to English
  }

  private splitIntoChunks(text: string, chunkSize = 4000): TextChunk[] {
    const chunks: TextChunk[] = [];
    const sentences = text.split(/[.!?]+\s+/);
    let currentChunk = '';
    let startIndex = 0;

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize && currentChunk) {
        chunks.push({
          id: crypto.randomUUID(),
          content: currentChunk.trim(),
          startIndex,
          endIndex: startIndex + currentChunk.length,
        });
        startIndex += currentChunk.length;
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }

    if (currentChunk) {
      chunks.push({
        id: crypto.randomUUID(),
        content: currentChunk.trim(),
        startIndex,
        endIndex: startIndex + currentChunk.length,
      });
    }

    return chunks;
  }

  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  private convertPageToHtml(
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    textContent: any,
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    viewport: any,
    pageNum: number,
  ): string {
    const items = textContent.items;

    if (!items || items.length === 0) {
      return `<div class="pdf-page" data-page="${pageNum}">No content</div>`;
    }

    // Group text items by vertical position to identify lines
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    const lines: any[][] = [];
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    let currentLine: any[] = [];
    let lastY = -1;
    const yTolerance = 3; // Increased tolerance for better line grouping

    for (const item of items) {
      if (!item.transform || item.transform.length < 6) {
        continue;
      }

      const y = Math.round(viewport.height - item.transform[5]);

      if (lastY === -1 || Math.abs(y - lastY) <= yTolerance) {
        currentLine.push({ ...item, y });
        lastY = y;
      } else {
        if (currentLine.length > 0) {
          lines.push([...currentLine]);
        }
        currentLine = [{ ...item, y }];
        lastY = y;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    // Sort lines by Y position (top to bottom)
    lines.sort((a, b) => a[0].y - b[0].y);

    // Convert each line to HTML with simplified approach
    const htmlLines = lines
      .map((line) => {
        // Sort items in line by X position (left to right)
        line.sort((a, b) => a.transform[4] - b.transform[4]);

        let lineHtml = '';
        let lastX = 0;

        for (const item of line) {
          const fontSize = Math.round(Math.abs(item.transform[0]) || 12);
          const fontWeight =
            item.fontName && item.fontName.toLowerCase().includes('bold')
              ? 'bold'
              : 'normal';
          const x = Math.round(item.transform[4]);

          // Add spacing based on X position difference
          const spacing = x > lastX + 10 ? '&nbsp;&nbsp;&nbsp;' : ' ';
          if (lineHtml && spacing) {
            lineHtml += spacing;
          }

          // Escape HTML characters and add the text
          const text = this.escapeHtml(item.str || '');
          if (text.trim()) {
            lineHtml += `<span style="font-size:${fontSize}px;font-weight:${fontWeight};">${text}</span>`;
            lastX = x + text.length * fontSize * 0.6; // Estimate text width
          }
        }

        return lineHtml
          ? `<div style="margin-bottom:4px;line-height:1.2;">${lineHtml}</div>`
          : '';
      })
      .filter((line) => line); // Remove empty lines

    return `
      <div class="pdf-page" data-page="${pageNum}" style="margin-bottom:30px;padding:20px;border:1px solid #e0e0e0;border-radius:8px;background:white;font-family:Arial,sans-serif;">
        <div style="font-size:12px;color:#666;margin-bottom:15px;border-bottom:1px solid #eee;padding-bottom:5px;">Page ${pageNum}</div>
        ${htmlLines.join('')}
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private generateFallbackPreviewHtml(text: string): string {
    const previewLength = 500;
    const preview =
      text.length > previewLength
        ? text.substring(0, previewLength) + '...'
        : text;

    return `<pre style="white-space: pre-wrap; font-family: inherit;">${this.escapeHtml(
      preview,
    )}</pre>`;
  }
}
