import type {
  DocumentMetadata,
  DocumentProcessingResult,
  DocumentProcessor,
  TextChunk,
} from '@/features/document-processing/types';

// PDF.js type interfaces
interface PDFTextItem {
  str: string;
  transform: [number, number, number, number, number, number];
  fontName?: string;
  width?: number;
  height?: number;
}

interface PDFTextContent {
  items: PDFTextItem[];
}

interface PDFViewport {
  width: number;
  height: number;
}

// Simple type for PDF text items with position
interface TextItemWithPosition extends PDFTextItem {
  y: number;
}

// Lazy import PDF.js to avoid SSR issues
const getPdfJs = async () => {
  if (typeof window === 'undefined') {
    throw new TypeError('PDF processing is only available in the browser');
  }

  const pdfjsLibrary = await import('pdfjs-dist');

  // Configure worker for Next.js environment
  if (!pdfjsLibrary.GlobalWorkerOptions.workerSrc) {
    // Use the worker file we copied to the public directory
    pdfjsLibrary.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    console.log(
      `PDF.js worker configured: ${pdfjsLibrary.GlobalWorkerOptions.workerSrc}`,
    );
  }

  return pdfjsLibrary;
};

function cleanPdfText(text: string): string {
  return text
    .replaceAll(String.raw`\r\n`, '\n')
    .replaceAll(String.raw`\r`, '\n')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim();
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

function detectLanguage(sample: string): string | undefined {
  // Simple language detection based on character patterns
  if (/[а-яё]/i.test(sample)) return 'ru';
  if (/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i.test(sample)) return 'fr';
  if (/[ßäöü]/i.test(sample)) return 'de';
  if (/[áéíñóúü]/i.test(sample)) return 'es';
  return 'en'; // Default to English
}

function extractMetadata(
  file: File,
  text: string,
  pageCount: number,
): DocumentMetadata {
  return {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    pageCount,
    wordCount: countWords(text),
    characterCount: text.length,
    // PDF.js metadata extraction would require additional API calls
    // For now, rely on filename for title
    title: file.name.replace(/\.pdf$/i, ''),
    language: detectLanguage(text.slice(0, 1000)), // Sample first 1000 chars
  };
}

function splitIntoChunks(text: string, chunkSize = 4000): TextChunk[] {
  const chunks: TextChunk[] = [];
  const sentences = text.split(/[!.?]+\s+/);
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

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function convertPageToHtml(
  textContent: PDFTextContent,
  viewport: PDFViewport,
  pageNumber: number,
): string {
  const { items } = textContent;

  if (!items || items.length === 0) {
    return `<div class="pdf-page" data-page="${pageNumber}">No content</div>`;
  }

  // Group text items by vertical position to identify lines
  const lines: Array<Array<TextItemWithPosition>> = [];
  let currentLine: Array<TextItemWithPosition> = [];
  let lastY = -1;
  const yTolerance = 3; // Increased tolerance for better line grouping

  for (const item of items) {
    // Type check for proper PDF text item
    if (
      item.transform &&
      item.transform.length >= 6 &&
      typeof item.str === 'string'
    ) {
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
        const text = escapeHtml(item.str || '');
        if (text.trim()) {
          lineHtml += `<span style="font-size:${fontSize}px;font-weight:${fontWeight};">${text}</span>`;
          lastX = x + text.length * fontSize * 0.6; // Estimate text width
        }
      }

      return lineHtml
        ? `<div style="margin-bottom:4px;line-height:1.2;">${lineHtml}</div>`
        : '';
    })
    .filter(Boolean); // Remove empty lines

  return `
    <div class="pdf-page" data-page="${pageNumber}" style="margin-bottom:30px;padding:20px;border:1px solid #e0e0e0;border-radius:8px;background:white;font-family:Arial,sans-serif;">
      <div style="font-size:12px;color:#666;margin-bottom:15px;border-bottom:1px solid #eee;padding-bottom:5px;">Page ${pageNumber}</div>
      ${htmlLines.join('')}
    </div>
  `;
}

function generateFallbackPreviewHtml(text: string): string {
  const previewLength = 500;
  const preview =
    text.length > previewLength
      ? `${text.slice(0, Math.max(0, previewLength))}...`
      : text;

  return `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(
    preview,
  )}</pre>`;
}

export function createPDFProcessor(): DocumentProcessor {
  return {
    supportedTypes: ['application/pdf'],
    maxFileSize: 50 * 1024 * 1024, // 50MB

    async process(file: File): Promise<DocumentProcessingResult> {
      const arrayBuffer = await file.arrayBuffer();

      const pdfjsLibrary = await getPdfJs();

      try {
        const pdf = await pdfjsLibrary.getDocument({
          data: arrayBuffer,
          verbosity: 0, // Reduce console noise
          useSystemFonts: true, // Use system fonts when available
          standardFontDataUrl: undefined, // Don't load standard fonts from CDN
        }).promise;

        // Process all pages concurrently to avoid await-in-loop
        const pageNumbers = Array.from(
          { length: pdf.numPages },
          (_, index) => index + 1,
        );

        const pageResults = await Promise.all(
          pageNumbers.map(async (pageNumber) => {
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1 });

            // Extract plain text for backward compatibility
            const pageText = textContent.items
              .filter((item) => 'str' in item)
              .map((item) => (item as { str: string }).str)
              .join(' ');

            // Generate structured HTML with positioning
            // Convert PDF.js TextContent to our PDFTextContent interface
            interface PdfJsTextItem {
              str: string;
              transform: number[];
              fontName?: string;
              width?: number;
              height?: number;
            }

            const convertedTextContent: PDFTextContent = {
              items: textContent.items
                .filter(
                  (item) =>
                    typeof item === 'object' &&
                    item !== null &&
                    'str' in item &&
                    'transform' in item &&
                    Array.isArray((item as PdfJsTextItem).transform),
                )
                .map((item) => {
                  const pdfItem = item as PdfJsTextItem;
                  return {
                    str: pdfItem.str,
                    transform:
                      Array.isArray(pdfItem.transform) &&
                      pdfItem.transform.length >= 6
                        ? ([
                            pdfItem.transform[0],
                            pdfItem.transform[1],
                            pdfItem.transform[2],
                            pdfItem.transform[3],
                            pdfItem.transform[4],
                            pdfItem.transform[5],
                          ] as [number, number, number, number, number, number])
                        : [0, 0, 0, 0, 0, 0],
                    fontName: pdfItem.fontName,
                    width: pdfItem.width,
                    height: pdfItem.height,
                  };
                }),
            };
            const pageHtml = convertPageToHtml(
              convertedTextContent,
              viewport,
              pageNumber,
            );

            return {
              pageNumber,
              pageText,
              pageHtml,
            };
          }),
        );

        // Sort results by page number and combine
        pageResults.sort((a, b) => a.pageNumber - b.pageNumber);

        const pageTexts: string[] = [];
        let fullText = '';
        let fullHtml = '';

        for (const { pageText, pageHtml } of pageResults) {
          pageTexts.push(pageText);
          fullText += `${pageText}\n\n`;
          fullHtml += pageHtml;
        }

        const extractedText = cleanPdfText(fullText);
        const metadata = extractMetadata(file, extractedText, pdf.numPages);
        const chunks = splitIntoChunks(extractedText);

        return {
          extractedText,
          metadata,
          chunks,
          previewHtml: fullHtml || generateFallbackPreviewHtml(extractedText),
          originalContent:
            fullHtml || generateFallbackPreviewHtml(extractedText), // Store HTML representation for "Copy Code"
        };
      } catch (error) {
        console.error('PDF processing error:', error);
        throw new Error(
          `Failed to process PDF: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    },
  };
}
