// Type definitions for document processing feature

export interface DocumentProcessor {
  supportedTypes: string[];
  maxFileSize: number;
  process(file: File): Promise<DocumentProcessingResult>;
}

export interface DocumentProcessingResult {
  extractedText: string;
  metadata: DocumentMetadata;
  chunks?: TextChunk[];
  previewHtml?: string;
  originalContent?: string; // Store original HTML content for HTML files
}

export interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  pageCount?: number;
  wordCount: number;
  characterCount: number;
  language?: string;
  author?: string;
  title?: string;
  creationDate?: Date;
}

export interface TextChunk {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  context?: string;
}

export interface DocumentProcessingConfig {
  maxFileSize: number;
  chunkSize: number;
  preserveFormatting: boolean;
  includeMetadata: boolean;
  sanitizeHtml: boolean;
}