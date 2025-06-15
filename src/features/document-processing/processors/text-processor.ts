import type {
  DocumentMetadata,
  DocumentProcessingResult,
  DocumentProcessor,
  TextChunk,
} from '@/features/document-processing/types';

function cleanText(text: string): string {
  return text
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replaceAll(/\n{3,}/g, '\n\n')
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
        endIndex: startIndex + currentChunk.length,
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
      endIndex: startIndex + currentChunk.length,
    });
  }

  return chunks;
}

function generatePreviewHtml(text: string, mimeType: string): string {
  const previewLength = 500;
  const preview =
    text.length > previewLength
      ? `${text.slice(0, Math.max(0, previewLength))}...`
      : text;

  if (mimeType.includes('markdown')) {
    // Basic markdown rendering for preview
    const htmlPreview = preview
      .replaceAll(/^### (.*$)/gim, '<h3>$1</h3>')
      .replaceAll(/^## (.*$)/gim, '<h2>$1</h2>')
      .replaceAll(/^# (.*$)/gim, '<h1>$1</h1>')
      .replaceAll(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replaceAll(/\*(.*?)\*/gim, '<em>$1</em>')
      .replaceAll('\n', '<br>');

    return `<div style="line-height: 1.5;">${htmlPreview}</div>`;
  }

  return `<pre style="white-space: pre-wrap; font-family: inherit;">${preview}</pre>`;
}

export function createTextProcessor(): DocumentProcessor {
  return {
    supportedTypes: ['text/plain', 'text/markdown', 'application/x-markdown'],
    maxFileSize: 10 * 1024 * 1024, // 10MB

    async process(file: File): Promise<DocumentProcessingResult> {
      const text = await file.text();
      const extractedText = cleanText(text);
      const metadata = extractMetadata(file, extractedText);
      const chunks = splitIntoChunks(extractedText);

      return {
        extractedText,
        metadata,
        chunks,
        previewHtml: generatePreviewHtml(extractedText, file.type),
      };
    },
  };
}
