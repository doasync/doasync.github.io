# Comprehensive File Upload Implementation Plan

## Phase 1: Dependencies & Libraries

### 1.1 Add Required NPM Packages

```bash
npm install --save \
  pdfjs-dist \
  mammoth \
  turndown \
  dompurify \
  jszip \
  localforage
```

**Library Justifications:**

- `pdfjs-dist`: Mozilla's PDF.js for robust client-side PDF processing
- `mammoth`: Convert DOCX to clean HTML/Markdown
- `turndown`: Convert HTML to Markdown for consistent formatting
- `dompurify`: Sanitize HTML content for security
- `jszip`: Handle DOCX file structure (ZIP format)
- `localforage`: Enhanced storage for caching processed documents

### 1.2 Create Document Processing Feature

#### New Feature Structure:

```
src/features/document-processing/
├── index.ts              # Public API exports
├── model.ts              # Effector state management
├── types.ts              # TypeScript interfaces
├── processors/
│   ├── pdf-processor.ts  # PDF text extraction
│   ├── docx-processor.ts # DOCX to Markdown conversion
│   ├── text-processor.ts # Plain text files
│   └── html-processor.ts # HTML to Markdown
├── utils/
│   ├── file-validator.ts # File type/size validation
│   ├── text-cleaner.ts   # Clean and format extracted text
│   └── chunk-splitter.ts # Split large documents
└── components/
    ├── DocumentPreview.tsx    # Document content preview
    ├── ExtractionProgress.tsx # Processing progress indicator
    └── DocumentMetadata.tsx   # File metadata display
```

## Phase 2: Core Document Processing

### 2.1 Document Processor Interface

```typescript
// src/features/document-processing/types.ts
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
```

### 2.2 PDF Processor Implementation

```typescript
// src/features/document-processing/processors/pdf-processor.ts
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.entry';

export class PDFProcessor implements DocumentProcessor {
  supportedTypes = ['application/pdf'];
  maxFileSize = 50 * 1024 * 1024; // 50MB

  async process(file: File): Promise<DocumentProcessingResult> {
    const arrayBuffer = await file.arrayBuffer();

    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    let pageTexts: string[] = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items.map((item: any) => item.str).join(' ');

      pageTexts.push(pageText);
      fullText += pageText + '\n\n';
    }

    const extractedText = this.cleanPdfText(fullText);
    const metadata = this.extractMetadata(
      file,
      extractedText,
      pdf.numPages,
      pageTexts,
    );
    const chunks = this.splitIntoChunks(extractedText);

    return {
      extractedText,
      metadata,
      chunks,
      previewHtml: this.generatePreviewHtml(extractedText),
    };
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
    pageTexts: string[],
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

  private generatePreviewHtml(text: string): string {
    const previewLength = 500;
    const preview =
      text.length > previewLength
        ? text.substring(0, previewLength) + '...'
        : text;

    return `<pre style="white-space: pre-wrap; font-family: inherit;">${preview}</pre>`;
  }
}
```

### 2.3 DOCX Processor Implementation

```typescript
// src/features/document-processing/processors/docx-processor.ts
import mammoth from 'mammoth';
import TurndownService from 'turndown';

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
```

### 2.4 Text File Processors

```typescript
// src/features/document-processing/processors/text-processor.ts
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
      previewHtml: this.generatePreviewHtml(extractedText, file.type),
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
      characterCount: text.length,
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

  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  private generatePreviewHtml(text: string, mimeType: string): string {
    const previewLength = 500;
    const preview =
      text.length > previewLength
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
```

### 2.5 HTML Processor

```typescript
// src/features/document-processing/processors/html-processor.ts
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';

export class HTMLProcessor implements DocumentProcessor {
  supportedTypes = ['text/html', 'application/xhtml+xml'];
  maxFileSize = 10 * 1024 * 1024; // 10MB

  private turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  });

  async process(file: File): Promise<DocumentProcessingResult> {
    const htmlContent = await file.text();

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
      previewHtml: this.generatePreviewHtml(cleanHtml),
    };
  }

  private cleanMarkdown(markdown: string): string {
    return markdown
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();
  }

  private extractMetadata(
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
      wordCount: this.countWords(text),
      characterCount: text.length,
      title,
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

  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  private generatePreviewHtml(html: string): string {
    const previewLength = 500;
    const textContent = html.replace(/<[^>]*>/g, '');
    const preview =
      textContent.length > previewLength
        ? textContent.substring(0, previewLength) + '...'
        : textContent;

    return `<div style="line-height: 1.5;">${preview}</div>`;
  }
}
```

## Phase 3: State Management & Processing Pipeline

### 3.1 Document Processing Model

```typescript
// src/features/document-processing/model.ts
import {
  sample,
  createDomain,
  createEvent,
  createEffect,
  createStore,
} from 'effector';
import { debug } from 'patronum/debug';
import { PDFProcessor } from './processors/pdf-processor';
import { DOCXProcessor } from './processors/docx-processor';
import { TextProcessor } from './processors/text-processor';
import { HTMLProcessor } from './processors/html-processor';
import {
  DocumentProcessor,
  DocumentProcessingResult,
  DocumentProcessingConfig,
} from './types';

const documentDomain = createDomain('document-processing');

// Events
export const processDocuments =
  documentDomain.event<File[]>('processDocuments');
export const documentProcessingConfigUpdated = documentDomain.event<
  Partial<DocumentProcessingConfig>
>('documentProcessingConfigUpdated');
export const clearProcessingResults = documentDomain.event<void>(
  'clearProcessingResults',
);

// Effects
export const processDocumentsFx = documentDomain.effect<
  File[],
  DocumentProcessingResult[]
>({
  name: 'processDocumentsFx',
  handler: async (files: File[]) => {
    const processors: DocumentProcessor[] = [
      new PDFProcessor(),
      new DOCXProcessor(),
      new TextProcessor(),
      new HTMLProcessor(),
    ];

    const results: DocumentProcessingResult[] = [];

    for (const file of files) {
      const processor = processors.find((p) =>
        p.supportedTypes.includes(file.type),
      );

      if (!processor) {
        throw new Error(
          `Unsupported file type: ${file.type} for file: ${file.name}`,
        );
      }

      if (file.size > processor.maxFileSize) {
        throw new Error(
          `File "${file.name}" exceeds maximum size of ${processor.maxFileSize / (1024 * 1024)}MB`,
        );
      }

      try {
        const result = await processor.process(file);
        results.push(result);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        throw new Error(
          `Failed to process file "${file.name}": ${error.message}`,
        );
      }
    }

    return results;
  },
});

// Stores
export const $processingResults = documentDomain.store<
  DocumentProcessingResult[]
>([], {
  name: '$processingResults',
});

export const $isProcessingDocuments = documentDomain.store<boolean>(false, {
  name: '$isProcessingDocuments',
});

export const $processingError = documentDomain.store<string | null>(null, {
  name: '$processingError',
});

export const $processingConfig = documentDomain.store<DocumentProcessingConfig>(
  {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    chunkSize: 4000,
    preserveFormatting: true,
    includeMetadata: true,
    sanitizeHtml: true,
  },
  {
    name: '$processingConfig',
  },
);

// Store updates
$processingResults
  .on(processDocumentsFx.doneData, (_, results) => results)
  .reset(clearProcessingResults);

$isProcessingDocuments
  .on(processDocumentsFx, () => true)
  .reset(processDocumentsFx.finally);

$processingError
  .on(processDocumentsFx.failData, (_, error) => error.message)
  .reset(processDocumentsFx.done, processDocuments);

$processingConfig.on(documentProcessingConfigUpdated, (config, update) => ({
  ...config,
  ...update,
}));

// Samples
sample({
  clock: processDocuments,
  target: processDocumentsFx,
});

// Debug
debug(
  $processingResults,
  $isProcessingDocuments,
  $processingError,
  $processingConfig,
  processDocuments,
  processDocumentsFx,
);
```

### 3.2 Document Processing Feature Index

```typescript
// src/features/document-processing/index.ts
export {
  // Events
  processDocuments,
  documentProcessingConfigUpdated,
  clearProcessingResults,

  // Stores
  $processingResults,
  $isProcessingDocuments,
  $processingError,
  $processingConfig,

  // Effects
  processDocumentsFx,
} from './model';

export type {
  DocumentProcessor,
  DocumentProcessingResult,
  DocumentMetadata,
  TextChunk,
  DocumentProcessingConfig,
} from './types';

export { PDFProcessor } from './processors/pdf-processor';
export { DOCXProcessor } from './processors/docx-processor';
export { TextProcessor } from './processors/text-processor';
export { HTMLProcessor } from './processors/html-processor';
```

## Phase 4: UI Components

### 4.1 Document Preview Component

```typescript
// src/features/document-processing/components/DocumentPreview.tsx
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Chip,
  Collapse,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
  TabPanel
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { DocumentProcessingResult } from "../types";

interface DocumentPreviewProps {
  result: DocumentProcessingResult;
  onCopyText?: (text: string) => void;
  onDownload?: (result: DocumentProcessingResult) => void;
  maxPreviewHeight?: number;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  result,
  onCopyText,
  onDownload,
  maxPreviewHeight = 400
}) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleCopyText = () => {
    onCopyText?.(result.extractedText);
    navigator.clipboard.writeText(result.extractedText);
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" noWrap>
              {result.metadata.fileName}
            </Typography>
            <Chip
              label={result.metadata.mimeType.split('/')[1].toUpperCase()}
              size="small"
              color="primary"
            />
          </Box>
        }
        subheader={
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {formatFileSize(result.metadata.fileSize)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {result.metadata.wordCount.toLocaleString()} words
            </Typography>
            {result.metadata.pageCount && (
              <Typography variant="body2" color="text.secondary">
                {result.metadata.pageCount} pages
              </Typography>
            )}
          </Box>
        }
        action={
          <Box>
            <IconButton onClick={handleCopyText} title="Copy text">
              <ContentCopyIcon />
            </IconButton>
            {onDownload && (
              <IconButton onClick={() => onDownload(result)} title="Download">
                <FileDownloadIcon />
              </IconButton>
            )}
            <IconButton onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        }
      />

      <Collapse in={expanded}>
        <CardContent>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Preview" />
            <Tab label="Extracted Text" />
            {result.chunks && <Tab label={`Chunks (${result.chunks.length})`} />}
            <Tab label="Metadata" />
          </Tabs>

          {/* Preview Tab */}
          {activeTab === 0 && (
            <Box sx={{ mt: 2, maxHeight: maxPreviewHeight, overflow: 'auto' }}>
              {result.previewHtml ? (
                <Box
                  dangerouslySetInnerHTML={{ __html: result.previewHtml }}
                  sx={{
                    '& pre': {
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      margin: 0
                    }
                  }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No preview available
                </Typography>
              )}
            </Box>
          )}

          {/* Extracted Text Tab */}
          {activeTab === 1 && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  maxHeight: maxPreviewHeight,
                  overflow: 'auto',
                  backgroundColor: 'grey.50',
                  p: 2,
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {result.extractedText}
              </Box>
            </Box>
          )}

          {/* Chunks Tab */}
          {activeTab === 2 && result.chunks && (
            <Box sx={{ mt: 2 }}>
              <List dense sx={{ maxHeight: maxPreviewHeight, overflow: 'auto' }}>
                {result.chunks.map((chunk, index) => (
                  <ListItem key={chunk.id} divider>
                    <ListItemText
                      primary={`Chunk ${index + 1}`}
                      secondary={
                        <Typography
                          variant="body2"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {chunk.content}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Metadata Tab */}
          {activeTab === 3 && (
            <Box sx={{ mt: 2 }}>
              <List dense>
                <ListItem>
                  <ListItemText primary="File Name" secondary={result.metadata.fileName} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="File Size" secondary={formatFileSize(result.metadata.fileSize)} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="MIME Type" secondary={result.metadata.mimeType} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Word Count" secondary={result.metadata.wordCount.toLocaleString()} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Character Count" secondary={result.metadata.characterCount.toLocaleString()} />
                </ListItem>
                {result.metadata.pageCount && (
                  <ListItem>
                    <ListItemText primary="Page Count" secondary={result.metadata.pageCount} />
                  </ListItem>
                )}
                {result.metadata.title && (
                  <ListItem>
                    <ListItemText primary="Title" secondary={result.metadata.title} />
                  </ListItem>
                )}
                {result.metadata.author && (
                  <ListItem>
                    <ListItemText primary="Author" secondary={result.metadata.author} />
                  </ListItem>
                )}
                {result.metadata.creationDate && (
                  <ListItem>
                    <ListItemText
                      primary="Creation Date"
                      secondary={result.metadata.creationDate.toLocaleDateString()}
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
};
```

### 4.2 Extraction Progress Component

```typescript
// src/features/document-processing/components/ExtractionProgress.tsx
import React from "react";
import {
  Box,
  LinearProgress,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert
} from "@mui/material";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

interface ExtractionProgressProps {
  files: File[];
  isProcessing: boolean;
  error: string | null;
  results: any[];
}

export const ExtractionProgress: React.FC<ExtractionProgressProps> = ({
  files,
  isProcessing,
  error,
  results
}) => {
  const getFileStatus = (file: File, index: number) => {
    if (error) return 'error';
    if (results.length > index) return 'complete';
    if (isProcessing) return 'processing';
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'processing':
        return <HourglassEmptyIcon color="primary" />;
      default:
        return <InsertDriveFileIcon />;
    }
  };

  const progress = files.length > 0 ? (results.length / files.length) * 100 : 0;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Document Processing
        </Typography>

        {isProcessing && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Processing {results.length} of {files.length} files...
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <List dense>
          {files.map((file, index) => {
            const status = getFileStatus(file, index);
            return (
              <ListItem key={`${file.name}-${index}`}>
                <ListItemIcon>
                  {getStatusIcon(status)}
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB • ${file.type}`}
                />
              </ListItem>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
};
```

## Phase 5: Integration with Existing Chat System

### 5.1 Update AttachmentMenu Component

```typescript
// Add to src/components/AttachmentMenu.tsx
import DocumentIcon from "@mui/icons-material/Description";

// Add these constants
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB
const SUPPORTED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/markdown",
  "application/x-markdown",
  "text/html",
  "application/xhtml+xml"
];

// Add ref for document input
const documentInputRef = useRef<HTMLInputElement>(null);

// Add document upload handler
const handleDocumentUpload = () => {
  handleMenuClose();
  documentInputRef.current?.click();
};

const handleDocumentFileChange = (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const fileArray = Array.from(files);
  const validFiles: File[] = [];

  for (const file of fileArray) {
    if (!SUPPORTED_DOCUMENT_TYPES.includes(file.type)) {
      console.error("Unsupported document type:", file.type);
      continue;
    }
    if (file.size > MAX_DOCUMENT_SIZE) {
      console.error("Document file too large:", file.size);
      continue;
    }
    validFiles.push(file);
  }

  if (validFiles.length > 0) {
    filesSelected(validFiles);
  }

  if (documentInputRef.current) {
    documentInputRef.current.value = "";
  }
};

// Add to the menu items
<MenuItem
  onClick={handleDocumentUpload}
  disabled={disabled || isProcessingFile}
>
  <ListItemIcon>
    <DocumentIcon />
  </ListItemIcon>
  <ListItemText
    primary="Upload Document"
    secondary="PDF, DOCX, TXT, MD, HTML"
  />
</MenuItem>

// Add to hidden inputs
<input
  ref={documentInputRef}
  type="file"
  accept={SUPPORTED_DOCUMENT_TYPES.join(",")}
  onChange={handleDocumentFileChange}
  style={{ display: "none" }}
  multiple={true}
/>
```

### 5.2 Update Chat Model for Document Processing

```typescript
// Update src/features/chat/model.ts processFilesFx effect

import {
  processDocuments,
  $processingResults,
  $isProcessingDocuments,
} from '@/features/document-processing';

// Add to processFilesFx handler
const processFilesFx = chatDomain.effect<File[], Message[]>({
  name: 'processFilesFx',
  handler: async (files: File[]) => {
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB for audio, 20MB for images
    const SUPPORTED_IMAGE_TYPES = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    const SUPPORTED_AUDIO_TYPES = [
      'audio/wav',
      'audio/mp3',
      'audio/aiff',
      'audio/aac',
      'audio/ogg',
      'audio/flac',
      'audio/mp4',
      'audio/mpeg',
      'audio/mpga',
      'audio/m4a',
      'audio/webm',
    ];
    const SUPPORTED_DOCUMENT_TYPES = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'application/x-markdown',
      'text/html',
      'application/xhtml+xml',
    ];

    const messages: Message[] = [];
    const documentFiles: File[] = [];

    for (const file of files) {
      const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
      const isAudio = SUPPORTED_AUDIO_TYPES.includes(file.type);
      const isDocument = SUPPORTED_DOCUMENT_TYPES.includes(file.type);

      if (isDocument) {
        documentFiles.push(file);
        continue; // Process documents separately
      }

      // Existing image/audio processing logic...
      // [Keep existing image and audio processing code]
    }

    // Process documents if any
    if (documentFiles.length > 0) {
      // Trigger document processing
      processDocuments(documentFiles);

      // Wait for processing to complete
      const processingResults = await new Promise((resolve, reject) => {
        const unsubscribe = $processingResults.watch((results) => {
          if (results.length === documentFiles.length) {
            unsubscribe();
            resolve(results);
          }
        });

        // Also watch for errors
        const unsubscribeError = $processingError.watch((error) => {
          if (error) {
            unsubscribeError();
            reject(new Error(error));
          }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          unsubscribe();
          unsubscribeError();
          reject(new Error('Document processing timeout'));
        }, 30000);
      });

      // Create messages for processed documents
      for (let i = 0; i < documentFiles.length; i++) {
        const file = documentFiles[i];
        const result = processingResults[i];

        // Create text content with document information
        const documentText =
          `**📄 ${result.metadata.fileName}**\n\n` +
          `*File type: ${result.metadata.mimeType}*\n` +
          `*Size: ${(result.metadata.fileSize / 1024 / 1024).toFixed(2)} MB*\n` +
          `*Words: ${result.metadata.wordCount.toLocaleString()}*\n\n` +
          `**Content:**\n\n${result.extractedText}`;

        const content: MessageContentPart[] = [
          {
            type: 'text',
            text: documentText,
          },
        ];

        const attachment: Attachment = {
          id: crypto.randomUUID(),
          type: 'document',
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          extractedText: result.extractedText,
          metadata: {
            wordCount: result.metadata.wordCount,
            pageCount: result.metadata.pageCount,
          },
        };

        const message: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          timestamp: Date.now(),
          status: 'pending',
          attachments: [attachment],
        };

        messages.push(message);
      }
    }

    return messages;
  },
});
```

### 5.3 Update Chat Types

```typescript
// Update src/features/chat/types.ts

// Add document content part
export interface DocumentContentPart {
  type: 'document';
  document: {
    text: string;
    metadata: {
      fileName: string;
      fileSize: number;
      mimeType: string;
      wordCount: number;
      pageCount?: number;
      title?: string;
      author?: string;
    };
  };
}

// Update MessageContentPart
export type MessageContentPart =
  | TextContentPart
  | ImageContentPart
  | AudioContentPart
  | GeneratedImageContentPart
  | DocumentContentPart;

// Update Attachment interface
export interface Attachment {
  id: string;
  type: 'image' | 'audio' | 'document';
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl?: string;
  previewUrl?: string;
  extractedText?: string; // For documents
  chunks?: TextChunk[]; // For large documents
  metadata?: {
    dimensions?: { width: number; height: number };
    duration?: number; // For audio files
    wordCount?: number; // For documents
    pageCount?: number; // For documents
    title?: string; // For documents
    author?: string; // For documents
  };
}
```

## Phase 6: Message Rendering & UX

### 6.1 Update MessageItem Component

```typescript
// Update src/components/MessageItem.tsx to handle document content

import { DocumentPreview } from "@/features/document-processing/components/DocumentPreview";

// Add to message content rendering
const renderContentPart = (part: MessageContentPart, index: number) => {
  switch (part.type) {
    // ... existing cases for text, image_url, input_audio, generated_image

    case "document":
      return (
        <Box key={index} sx={{ mt: 1 }}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DocumentIcon color="primary" />
                <Typography variant="subtitle2">
                  {part.document.metadata.fileName}
                </Typography>
                <Chip
                  label={part.document.metadata.mimeType.split('/')[1].toUpperCase()}
                  size="small"
                />
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                {(part.document.metadata.fileSize / 1024 / 1024).toFixed(2)} MB •
                {part.document.metadata.wordCount.toLocaleString()} words
                {part.document.metadata.pageCount && ` • ${part.document.metadata.pageCount} pages`}
              </Typography>

              {/* Expandable text content */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">View extracted content</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box
                    sx={{
                      maxHeight: 300,
                      overflow: 'auto',
                      backgroundColor: 'grey.50',
                      p: 2,
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {part.document.text}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        </Box>
      );

    default:
      return null;
  }
};
```

### 6.2 Add Document Processing Dialog

```typescript
// src/components/DocumentProcessingDialog.tsx
import React from "react";
import { useUnit } from "effector-react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box
} from "@mui/material";
import {
  $isProcessingDocuments,
  $processingError,
  $processingResults,
  clearProcessingResults
} from "@/features/document-processing";
import { ExtractionProgress } from "@/features/document-processing/components/ExtractionProgress";
import { DocumentPreview } from "@/features/document-processing/components/DocumentPreview";

interface DocumentProcessingDialogProps {
  open: boolean;
  onClose: () => void;
  files: File[];
}

export const DocumentProcessingDialog: React.FC<DocumentProcessingDialogProps> = ({
  open,
  onClose,
  files
}) => {
  const [isProcessing, error, results] = useUnit([
    $isProcessingDocuments,
    $processingError,
    $processingResults
  ]);

  const handleClose = () => {
    clearProcessingResults();
    onClose();
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle>Document Processing</DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <ExtractionProgress
            files={files}
            isProcessing={isProcessing}
            error={error}
            results={results}
          />
        </Box>

        {results.length > 0 && (
          <Box sx={{ mt: 2 }}>
            {results.map((result, index) => (
              <DocumentPreview
                key={index}
                result={result}
                onCopyText={handleCopyText}
                maxPreviewHeight={200}
              />
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {isProcessing ? 'Cancel' : 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

## Phase 7: Error Handling & Validation

### 7.1 File Validation Utility

```typescript
// src/features/document-processing/utils/file-validator.ts
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export class FileValidator {
  private static readonly SUPPORTED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown',
    'application/x-markdown',
    'text/html',
    'application/xhtml+xml',
  ];

  private static readonly MAX_FILE_SIZES = {
    'application/pdf': 50 * 1024 * 1024, // 50MB
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      50 * 1024 * 1024,
    'application/msword': 50 * 1024 * 1024,
    'text/plain': 10 * 1024 * 1024, // 10MB
    'text/markdown': 10 * 1024 * 1024,
    'application/x-markdown': 10 * 1024 * 1024,
    'text/html': 10 * 1024 * 1024,
    'application/xhtml+xml': 10 * 1024 * 1024,
  };

  static validateFile(file: File): FileValidationResult {
    const warnings: string[] = [];

    // Check file type
    if (!this.SUPPORTED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `Unsupported file type: ${file.type}. Supported types: PDF, DOCX, DOC, TXT, MD, HTML`,
      };
    }

    // Check file size
    const maxSize = this.MAX_FILE_SIZES[file.type] || 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(maxSize)})`,
      };
    }

    // File size warnings
    if (file.size > 20 * 1024 * 1024) {
      warnings.push('Large file may take longer to process');
    }

    // Empty file check
    if (file.size === 0) {
      return {
        isValid: false,
        error: 'File appears to be empty',
      };
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  static validateFiles(files: File[]): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check total number of files
    if (files.length > 10) {
      return {
        isValid: false,
        error: 'Maximum 10 files can be processed at once',
      };
    }

    // Check total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 200 * 1024 * 1024) {
      // 200MB total
      return {
        isValid: false,
        error: `Total file size (${this.formatFileSize(totalSize)}) exceeds maximum allowed (200MB)`,
      };
    }

    // Validate each file
    for (const file of files) {
      const result = this.validateFile(file);
      if (!result.isValid) {
        errors.push(`${file.name}: ${result.error}`);
      }
      if (result.warnings) {
        warnings.push(...result.warnings.map((w) => `${file.name}: ${w}`));
      }
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        error: errors.join('\n'),
      };
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
```

### 7.2 Error Handling in Processors

```typescript
// Enhanced error handling in all processors
export class ProcessingError extends Error {
  constructor(
    message: string,
    public readonly fileName: string,
    public readonly processorType: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ProcessingError';
  }
}

// Add to each processor class:
async process(file: File): Promise<DocumentProcessingResult> {
  try {
    // ... existing processing logic
  } catch (error) {
    throw new ProcessingError(
      `Failed to process ${file.name}: ${error.message}`,
      file.name,
      this.constructor.name,
      error
    );
  }
}
```

## Phase 8: Performance Optimization

### 8.1 Web Worker for Large File Processing

```typescript
// src/features/document-processing/workers/document-worker.ts
// Create web worker for CPU-intensive processing
const worker = new Worker(new URL('./document-worker.ts', import.meta.url));

// Use worker for large files
if (file.size > 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    worker.postMessage({ file, type: 'process' });
    worker.onmessage = (e) => {
      if (e.data.success) {
        resolve(e.data.result);
      } else {
        reject(new Error(e.data.error));
      }
    };
  });
}
```

### 8.2 Chunking Strategy for Large Documents

```typescript
// Smart chunking based on document structure
export class SmartChunker {
  static chunkDocument(text: string, options: ChunkOptions): TextChunk[] {
    const {
      maxChunkSize = 4000,
      overlapSize = 200,
      respectStructure = true,
    } = options;

    if (!respectStructure || text.length <= maxChunkSize) {
      return this.simpleChunk(text, maxChunkSize, overlapSize);
    }

    // Try to chunk by structure (headers, paragraphs, sentences)
    return this.structureAwareChunk(text, maxChunkSize, overlapSize);
  }

  private static structureAwareChunk(
    text: string,
    maxSize: number,
    overlap: number,
  ): TextChunk[] {
    // Implementation for structure-aware chunking
    // Priority: Headers > Paragraphs > Sentences > Words
  }
}
```

## Phase 9: Testing Strategy

### 9.1 Unit Tests for Processors

```typescript
// src/features/document-processing/__tests__/processors.test.ts
describe('Document Processors', () => {
  describe('PDFProcessor', () => {
    it('should extract text from PDF files', async () => {
      const processor = new PDFProcessor();
      const mockFile = new File(['%PDF-1.4...'], 'test.pdf', {
        type: 'application/pdf',
      });

      const result = await processor.process(mockFile);

      expect(result.extractedText).toBeDefined();
      expect(result.metadata.fileName).toBe('test.pdf');
      expect(result.metadata.mimeType).toBe('application/pdf');
    });
  });

  // Similar tests for other processors...
});
```

### 9.2 Integration Tests

```typescript
// Test the complete flow from file upload to message creation
describe('Document Upload Integration', () => {
  it('should process uploaded documents and create chat messages', async () => {
    const files = [
      new File(['Hello world'], 'test.txt', { type: 'text/plain' }),
    ];

    // Trigger file processing
    filesSelected(files);

    // Wait for processing
    await waitFor(() => {
      expect($isProcessingDocuments.getState()).toBe(false);
    });

    // Check messages were created
    const messages = $messages.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0].attachments?.[0].extractedText).toBe('Hello world');
  });
});
```

## Phase 10: Documentation & Deployment

### 10.1 Update CLAUDE.md

````markdown
### Document Processing Feature

The `document-processing` feature handles client-side extraction and processing
of text documents including PDF, DOCX, TXT, MD, and HTML files.

#### Key Components:

- **Processors**: File-type specific text extraction
- **Chunking**: Smart splitting of large documents
- **Validation**: File type and size validation
- **UI Components**: Preview and progress indicators

#### Usage:

```typescript
import { processDocuments } from '@/features/document-processing';

// Process files
processDocuments(fileArray);
```
````

#### Supported Formats:

- **PDF**: Text extraction via pdf-parse
- **DOCX**: Conversion to Markdown via mammoth
- **TXT/MD**: Direct text processing
- **HTML**: Sanitization and Markdown conversion

````

### 10.2 Update Package.json Scripts

```json
{
  "scripts": {
    "test:documents": "jest src/features/document-processing",
    "build:check-deps": "npm run build && node scripts/check-bundle-size.js"
  }
}
````

This comprehensive plan provides a complete implementation strategy for adding
robust file upload functionality to support PDF, DOCX, TXT, MD, and HTML files
with client-side text extraction, proper error handling, and seamless
integration with the existing chat system.

---

# ADDENDUM: Missing Critical Components

## Phase 11: API Integration & Message Formatting

### 11.1 Update formatMessagesForAPI for Documents

```typescript
// Update src/features/chat/lib.ts
export const formatMessagesForAPI = (
  messages: (
    | Message
    | {
        role: 'system' | 'user' | 'assistant';
        content: string | MessageContentPart[];
      }
  )[],
  modelId: string,
): Array<{
  role: 'system' | 'user' | 'assistant';
  content: string | StreamMessageContentPart[];
}> => {
  const isGPTModel = modelId.includes('gpt') || modelId.includes('chatgpt');

  return messages.map((message) => {
    if (typeof message.content === 'string') {
      return {
        role: message.role,
        content: message.content,
      };
    }

    if (Array.isArray(message.content)) {
      const validContentParts = message.content.filter(
        (part): part is StreamMessageContentPart => {
          if (part.type === 'text') {
            return typeof part.text === 'string' && part.text.trim().length > 0;
          }
          if (part.type === 'image_url') {
            return (
              part.image_url &&
              typeof part.image_url.url === 'string' &&
              part.image_url.url.length > 0 &&
              (part.image_url.url.startsWith('data:image/') ||
                part.image_url.url.startsWith('https://'))
            );
          }
          if (part.type === 'input_audio') {
            return (
              part.input_audio &&
              typeof part.input_audio.data === 'string' &&
              part.input_audio.data.length > 0
            );
          }
          // NEW: Handle document content parts
          if (part.type === 'document') {
            return (
              part.document &&
              typeof part.document.text === 'string' &&
              part.document.text.length > 0
            );
          }
          if (part.type === 'generated_image') {
            return false;
          }
          return false;
        },
      );

      // Convert document parts to text for API consumption
      const apiContentParts = validContentParts.map((part) => {
        if (part.type === 'document') {
          // Convert document to text part for API
          const docText =
            `Document: ${part.document.metadata.fileName}\n` +
            `Type: ${part.document.metadata.mimeType}\n` +
            `Size: ${(part.document.metadata.fileSize / 1024 / 1024).toFixed(2)} MB\n` +
            `Words: ${part.document.metadata.wordCount.toLocaleString()}\n\n` +
            `Content:\n${part.document.text}`;

          return {
            type: 'text' as const,
            text: docText,
          };
        }
        return part;
      });

      if (apiContentParts.length === 0) {
        const messageId = 'id' in message ? message.id : 'system';
        console.warn(
          `Message ${messageId} has no valid content parts, using empty string`,
        );
        return {
          role: message.role,
          content: '',
        };
      }

      return {
        role: message.role,
        content: apiContentParts,
      };
    }

    const messageId = 'id' in message ? message.id : 'system';
    console.warn(
      `Unexpected content type for message ${messageId}:`,
      typeof message.content,
    );
    return {
      role: message.role,
      content: '',
    };
  });
};
```

### 11.2 Update Chat Stream Types

```typescript
// Update src/features/chat-stream/types.ts
export interface DocumentStreamContentPart {
  type: 'document';
  document: {
    text: string;
    metadata: {
      fileName: string;
      fileSize: number;
      mimeType: string;
      wordCount: number;
      pageCount?: number;
      title?: string;
      author?: string;
    };
  };
}

export type StreamMessageContentPart =
  | TextStreamContentPart
  | ImageStreamContentPart
  | AudioStreamContentPart
  | DocumentStreamContentPart;
```

## Phase 12: Token Counting & Usage Tracking

### 12.1 Update Usage Info for Documents

```typescript
// Update src/features/usage-info/utils.ts
const estimateTokensFromContent = (
  content: string | MessageContentPart[],
): number => {
  if (typeof content === 'string') {
    return estimateTokens(content);
  }

  if (Array.isArray(content)) {
    return content.reduce((total, part) => {
      switch (part.type) {
        case 'text':
          return total + estimateTokens(part.text);
        case 'image_url':
          return total + 85; // Standard token cost for images
        case 'input_audio':
          return total + 50; // Estimated token cost for audio
        case 'document':
          // Count tokens from document text
          return total + estimateTokens(part.document.text);
        case 'generated_image':
          return total + 0; // Generated images don't consume input tokens
        default:
          return total;
      }
    }, 0);
  }

  return 0;
};

const calculateDocumentStorageSize = (messages: Message[]): number => {
  return messages.reduce((total, message) => {
    let messageSize = JSON.stringify({
      id: message.id,
      role: message.role,
      timestamp: message.timestamp,
      isEdited: message.isEdited,
    }).length;

    // Add content size
    if (typeof message.content === 'string') {
      messageSize += message.content.length * 2; // UTF-16 encoding
    } else if (Array.isArray(message.content)) {
      messageSize += message.content.reduce((contentSize, part) => {
        if (part.type === 'text') {
          return contentSize + part.text.length * 2;
        } else if (part.type === 'document') {
          return contentSize + part.document.text.length * 2;
        } else if (
          part.type === 'image_url' &&
          part.image_url.url.startsWith('data:')
        ) {
          return contentSize + part.image_url.url.length;
        } else if (part.type === 'input_audio') {
          return contentSize + part.input_audio.data.length;
        }
        return contentSize;
      }, 0);
    }

    // Add attachment metadata size (not the full extracted text if chunked)
    if (message.attachments) {
      messageSize += message.attachments.reduce((attSize, att) => {
        return (
          attSize +
          JSON.stringify({
            id: att.id,
            type: att.type,
            fileName: att.fileName,
            mimeType: att.mimeType,
            size: att.size,
            metadata: att.metadata,
          }).length
        );
      }, 0);
    }

    return total + messageSize;
  }, 0);
};
```

## Phase 13: Chat History Search Enhancement

### 13.1 Update Chat History Search

```typescript
// Update src/features/chat-history/lib.ts
export const searchInMessage = (message: Message, query: string): boolean => {
  const lowerQuery = query.toLowerCase();

  // Search in message content
  if (typeof message.content === 'string') {
    if (message.content.toLowerCase().includes(lowerQuery)) {
      return true;
    }
  } else if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (
        part.type === 'text' &&
        part.text.toLowerCase().includes(lowerQuery)
      ) {
        return true;
      }
      if (part.type === 'document') {
        // Search in document content
        if (part.document.text.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        // Search in document metadata
        if (
          part.document.metadata.fileName.toLowerCase().includes(lowerQuery)
        ) {
          return true;
        }
        if (part.document.metadata.title?.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        if (part.document.metadata.author?.toLowerCase().includes(lowerQuery)) {
          return true;
        }
      }
    }
  }

  // Search in attachments
  if (message.attachments) {
    for (const attachment of message.attachments) {
      if (attachment.fileName.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      if (attachment.type === 'document' && attachment.extractedText) {
        if (attachment.extractedText.toLowerCase().includes(lowerQuery)) {
          return true;
        }
      }
    }
  }

  return false;
};

export const getSearchResultPreview = (
  message: Message,
  query: string,
): string => {
  const lowerQuery = query.toLowerCase();

  // Check document content first for better previews
  if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part.type === 'document') {
        const docText = part.document.text;
        const index = docText.toLowerCase().indexOf(lowerQuery);
        if (index !== -1) {
          const start = Math.max(0, index - 50);
          const end = Math.min(docText.length, index + query.length + 50);
          return `...${docText.substring(start, end)}...`;
        }
      }
    }
  }

  // Fallback to existing preview logic
  const text = typeof message.content === 'string' ? message.content : '';
  const index = text.toLowerCase().indexOf(lowerQuery);
  if (index !== -1) {
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + query.length + 50);
    return `...${text.substring(start, end)}...`;
  }

  return text.substring(0, 100) + '...';
};
```

## Phase 14: Storage Optimization

### 14.1 Document Storage Management

```typescript
// src/features/document-processing/utils/storage-optimizer.ts
import localforage from 'localforage';

export class DocumentStorageOptimizer {
  private static readonly CACHE_PREFIX = 'doc_cache_';
  private static readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB cache limit

  static async cacheProcessingResult(
    file: File,
    result: DocumentProcessingResult,
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(file);
    const cacheData = {
      result,
      timestamp: Date.now(),
      fileHash: await this.generateFileHash(file),
    };

    try {
      await localforage.setItem(this.CACHE_PREFIX + cacheKey, cacheData);
      await this.cleanupOldCache();
    } catch (error) {
      console.warn('Failed to cache document processing result:', error);
    }
  }

  static async getCachedResult(
    file: File,
  ): Promise<DocumentProcessingResult | null> {
    const cacheKey = this.generateCacheKey(file);

    try {
      const cacheData = await localforage.getItem<{
        result: DocumentProcessingResult;
        timestamp: number;
        fileHash: string;
      }>(this.CACHE_PREFIX + cacheKey);

      if (!cacheData) return null;

      // Verify file hasn't changed
      const currentHash = await this.generateFileHash(file);
      if (cacheData.fileHash !== currentHash) {
        await localforage.removeItem(this.CACHE_PREFIX + cacheKey);
        return null;
      }

      // Check if cache is still valid (7 days)
      const isExpired =
        Date.now() - cacheData.timestamp > 7 * 24 * 60 * 60 * 1000;
      if (isExpired) {
        await localforage.removeItem(this.CACHE_PREFIX + cacheKey);
        return null;
      }

      return cacheData.result;
    } catch (error) {
      console.warn('Failed to retrieve cached document result:', error);
      return null;
    }
  }

  private static generateCacheKey(file: File): string {
    return `${file.name}_${file.size}_${file.lastModified}`;
  }

  private static async generateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private static async cleanupOldCache(): Promise<void> {
    try {
      const keys = await localforage.keys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.CACHE_PREFIX));

      if (cacheKeys.length > 50) {
        // Limit to 50 cached documents
        // Remove oldest entries
        const cacheData = await Promise.all(
          cacheKeys.map(async (key) => ({
            key,
            data: await localforage.getItem<{ timestamp: number }>(key),
          })),
        );

        cacheData
          .filter((item) => item.data)
          .sort((a, b) => a.data!.timestamp - b.data!.timestamp)
          .slice(0, cacheKeys.length - 50)
          .forEach(async (item) => {
            await localforage.removeItem(item.key);
          });
      }
    } catch (error) {
      console.warn('Failed to cleanup document cache:', error);
    }
  }
}

// Optimize message storage for large documents
export const optimizeMessageForStorage = (message: Message): Message => {
  if (!message.attachments) return message;

  return {
    ...message,
    attachments: message.attachments.map((attachment) => {
      if (attachment.type === 'document' && attachment.extractedText) {
        // For large documents, only store chunks and metadata
        if (attachment.extractedText.length > 10000) {
          return {
            ...attachment,
            extractedText: undefined, // Remove full text to save space
            metadata: {
              ...attachment.metadata,
              isChunked: true, // Flag to indicate text was chunked
            },
          };
        }
      }
      return attachment;
    }),
  };
};
```

## Phase 15: Security Enhancements

### 15.1 Comprehensive Content Sanitization

```typescript
// src/features/document-processing/utils/security.ts
import DOMPurify from 'dompurify';

export class DocumentSecurity {
  private static readonly MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly MAX_TEXT_LENGTH = 1000000; // 1M characters
  private static readonly DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi, // Event handlers
  ];

  static validateFile(file: File): { isValid: boolean; error?: string } {
    // File size check
    if (file.size > this.MAX_DOCUMENT_SIZE) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed size of ${this.MAX_DOCUMENT_SIZE / 1024 / 1024}MB`,
      };
    }

    // File type validation
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'application/x-markdown',
      'text/html',
      'application/xhtml+xml',
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed`,
      };
    }

    return { isValid: true };
  }

  static sanitizeDocumentContent(content: string, mimeType: string): string {
    // Length check
    if (content.length > this.MAX_TEXT_LENGTH) {
      content =
        content.substring(0, this.MAX_TEXT_LENGTH) +
        '\n\n[Content truncated due to length limit]';
    }

    // HTML content sanitization
    if (mimeType.includes('html')) {
      content = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [
          'p',
          'br',
          'strong',
          'em',
          'u',
          'i',
          'b',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'ul',
          'ol',
          'li',
          'blockquote',
          'pre',
          'code',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
          'a',
          'img',
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
        ALLOWED_URI_REGEXP:
          /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      });
    }

    // Remove dangerous patterns from all content types
    for (const pattern of this.DANGEROUS_PATTERNS) {
      content = content.replace(
        pattern,
        '[REMOVED_POTENTIALLY_DANGEROUS_CONTENT]',
      );
    }

    // Remove null bytes and control characters
    content = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Normalize line endings
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    return content.trim();
  }

  static detectSuspiciousContent(content: string): string[] {
    const warnings: string[] = [];

    // Check for base64 encoded content (potential data exfiltration)
    if (/[A-Za-z0-9+/]{50,}={0,2}/.test(content)) {
      warnings.push('Document contains base64-encoded content');
    }

    // Check for URLs
    if (/https?:\/\/[^\s]+/.test(content)) {
      warnings.push('Document contains external URLs');
    }

    // Check for email addresses
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(content)) {
      warnings.push('Document contains email addresses');
    }

    // Check for potential credentials
    if (
      /(?:password|token|key|secret|api[_-]?key)\s*[:=]\s*\S+/i.test(content)
    ) {
      warnings.push('Document may contain credentials or API keys');
    }

    return warnings;
  }
}
```

## Phase 16: Performance Monitoring

### 16.1 Document Processing Metrics

```typescript
// src/features/document-processing/utils/performance-monitor.ts
interface ProcessingMetrics {
  fileName: string;
  fileSize: number;
  fileType: string;
  processingTime: number;
  extractedTextLength: number;
  chunkCount: number;
  errorCount: number;
  cacheHit: boolean;
}

export class PerformanceMonitor {
  private static metrics: ProcessingMetrics[] = [];
  private static readonly MAX_METRICS = 100;

  static startProcessing(file: File): { stopTimer: () => ProcessingMetrics } {
    const startTime = performance.now();

    return {
      stopTimer: () => {
        const processingTime = performance.now() - startTime;

        const metrics: ProcessingMetrics = {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          processingTime,
          extractedTextLength: 0, // Will be updated
          chunkCount: 0, // Will be updated
          errorCount: 0,
          cacheHit: false,
        };

        this.recordMetrics(metrics);
        return metrics;
      },
    };
  }

  static updateMetrics(
    fileName: string,
    updates: Partial<ProcessingMetrics>,
  ): void {
    const metric = this.metrics.find((m) => m.fileName === fileName);
    if (metric) {
      Object.assign(metric, updates);
    }
  }

  static recordMetrics(metrics: ProcessingMetrics): void {
    this.metrics.push(metrics);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Log performance insights
    this.logPerformanceInsights(metrics);
  }

  private static logPerformanceInsights(metrics: ProcessingMetrics): void {
    const { fileName, fileSize, processingTime, fileType } = metrics;
    const processingSpeed = fileSize / processingTime; // bytes per ms

    console.log(`Document Processing Metrics:`, {
      file: fileName,
      size: `${(fileSize / 1024 / 1024).toFixed(2)} MB`,
      time: `${processingTime.toFixed(2)}ms`,
      speed: `${(processingSpeed / 1024).toFixed(2)} KB/ms`,
      type: fileType,
    });

    // Warn about slow processing
    if (processingTime > 5000) {
      // 5 seconds
      console.warn(
        `Slow document processing detected: ${fileName} took ${processingTime.toFixed(2)}ms`,
      );
    }

    // Track error rates
    const recentMetrics = this.metrics.slice(-10);
    const errorRate =
      recentMetrics.filter((m) => m.errorCount > 0).length /
      recentMetrics.length;
    if (errorRate > 0.2) {
      // 20% error rate
      console.warn(
        `High document processing error rate: ${(errorRate * 100).toFixed(1)}%`,
      );
    }
  }

  static getPerformanceStats(): {
    averageProcessingTime: number;
    averageFileSize: number;
    successRate: number;
    cacheHitRate: number;
    topFileTypes: Array<{ type: string; count: number }>;
  } {
    if (this.metrics.length === 0) {
      return {
        averageProcessingTime: 0,
        averageFileSize: 0,
        successRate: 1,
        cacheHitRate: 0,
        topFileTypes: [],
      };
    }

    const totalProcessingTime = this.metrics.reduce(
      (sum, m) => sum + m.processingTime,
      0,
    );
    const totalFileSize = this.metrics.reduce((sum, m) => sum + m.fileSize, 0);
    const successfulProcessing = this.metrics.filter(
      (m) => m.errorCount === 0,
    ).length;
    const cacheHits = this.metrics.filter((m) => m.cacheHit).length;

    // Count file types
    const typeCount = this.metrics.reduce(
      (acc, m) => {
        acc[m.fileType] = (acc[m.fileType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topFileTypes = Object.entries(typeCount)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      averageProcessingTime: totalProcessingTime / this.metrics.length,
      averageFileSize: totalFileSize / this.metrics.length,
      successRate: successfulProcessing / this.metrics.length,
      cacheHitRate: cacheHits / this.metrics.length,
      topFileTypes,
    };
  }
}
```

## Phase 17: Update Integration Points

### 17.1 Update Chat Model with Caching

```typescript
// Update the processFilesFx in src/features/chat/model.ts
import {
  DocumentStorageOptimizer,
  PerformanceMonitor,
} from '@/features/document-processing/utils';

const processFilesFx = chatDomain.effect<File[], Message[]>({
  name: 'processFilesFx',
  handler: async (files: File[]) => {
    // ... existing image/audio logic ...

    // Process documents with caching
    if (documentFiles.length > 0) {
      const processingResults: DocumentProcessingResult[] = [];

      for (const file of documentFiles) {
        const timer = PerformanceMonitor.startProcessing(file);

        try {
          // Check cache first
          let result = await DocumentStorageOptimizer.getCachedResult(file);
          const metrics = timer.stopTimer();

          if (result) {
            PerformanceMonitor.updateMetrics(file.name, {
              cacheHit: true,
              extractedTextLength: result.extractedText.length,
              chunkCount: result.chunks?.length || 0,
            });
          } else {
            // Process document
            processDocuments([file]);

            // Wait for processing
            result = await new Promise((resolve, reject) => {
              const unsubscribe = $processingResults.watch((results) => {
                const fileResult = results.find(
                  (r) => r.metadata.fileName === file.name,
                );
                if (fileResult) {
                  unsubscribe();
                  resolve(fileResult);
                }
              });

              setTimeout(() => {
                unsubscribe();
                reject(new Error('Document processing timeout'));
              }, 30000);
            });

            // Cache the result
            if (result) {
              await DocumentStorageOptimizer.cacheProcessingResult(
                file,
                result,
              );
              PerformanceMonitor.updateMetrics(file.name, {
                extractedTextLength: result.extractedText.length,
                chunkCount: result.chunks?.length || 0,
              });
            }
          }

          if (result) {
            processingResults.push(result);
          }
        } catch (error) {
          const metrics = timer.stopTimer();
          PerformanceMonitor.updateMetrics(file.name, { errorCount: 1 });
          throw error;
        }
      }

      // Create messages for processed documents
      for (let i = 0; i < documentFiles.length; i++) {
        const file = documentFiles[i];
        const result = processingResults[i];

        // Create document content part
        const documentContent: DocumentContentPart = {
          type: 'document',
          document: {
            text: result.extractedText,
            metadata: {
              fileName: result.metadata.fileName,
              fileSize: result.metadata.fileSize,
              mimeType: result.metadata.mimeType,
              wordCount: result.metadata.wordCount,
              pageCount: result.metadata.pageCount,
              title: result.metadata.title,
              author: result.metadata.author,
            },
          },
        };

        const content: MessageContentPart[] = [documentContent];

        const attachment: Attachment = {
          id: crypto.randomUUID(),
          type: 'document',
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          extractedText: result.extractedText,
          chunks: result.chunks,
          metadata: {
            wordCount: result.metadata.wordCount,
            pageCount: result.metadata.pageCount,
            title: result.metadata.title,
            author: result.metadata.author,
          },
        };

        const message: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          timestamp: Date.now(),
          status: 'pending',
          attachments: [attachment],
        };

        messages.push(message);
      }
    }

    return messages;
  },
});
```

## Phase 18: Enhanced Error Handling

### 18.1 Comprehensive Error Recovery

```typescript
// src/features/document-processing/utils/error-recovery.ts
export class DocumentProcessingError extends Error {
  constructor(
    message: string,
    public readonly fileName: string,
    public readonly fileType: string,
    public readonly errorCode: string,
    public readonly isRecoverable: boolean = false,
    public readonly suggestedAction?: string,
  ) {
    super(message);
    this.name = 'DocumentProcessingError';
  }
}

export class ErrorRecoveryManager {
  static handleProcessingError(
    error: Error,
    file: File,
  ): DocumentProcessingError {
    const fileName = file.name;
    const fileType = file.type;

    // PDF-specific errors
    if (error.message.includes('Invalid PDF')) {
      return new DocumentProcessingError(
        'The PDF file appears to be corrupted or password-protected',
        fileName,
        fileType,
        'PDF_INVALID',
        false,
        "Try opening the PDF in a PDF reader to verify it's not corrupted",
      );
    }

    if (error.message.includes('PasswordException')) {
      return new DocumentProcessingError(
        'The PDF file is password-protected',
        fileName,
        fileType,
        'PDF_PASSWORD_PROTECTED',
        false,
        'Remove the password protection from the PDF and try again',
      );
    }

    // DOCX-specific errors
    if (error.message.includes('Invalid DOCX')) {
      return new DocumentProcessingError(
        'The DOCX file appears to be corrupted',
        fileName,
        fileType,
        'DOCX_INVALID',
        false,
        "Try opening the document in Word to verify it's not corrupted",
      );
    }

    // Memory errors
    if (
      error.message.includes('out of memory') ||
      error.message.includes('Maximum call stack')
    ) {
      return new DocumentProcessingError(
        'The document is too large to process in the browser',
        fileName,
        fileType,
        'MEMORY_ERROR',
        true,
        'Try reducing the document size or splitting it into smaller files',
      );
    }

    // Network errors (for worker loading)
    if (
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError')
    ) {
      return new DocumentProcessingError(
        'Network error while loading processing libraries',
        fileName,
        fileType,
        'NETWORK_ERROR',
        true,
        'Check your internet connection and try again',
      );
    }

    // Generic timeout
    if (error.message.includes('timeout')) {
      return new DocumentProcessingError(
        'Document processing timed out',
        fileName,
        fileType,
        'TIMEOUT',
        true,
        'The document may be too complex. Try again or use a simpler document',
      );
    }

    // Generic error
    return new DocumentProcessingError(
      `Failed to process document: ${error.message}`,
      fileName,
      fileType,
      'UNKNOWN_ERROR',
      true,
      'Try again or contact support if the problem persists',
    );
  }

  static async retryWithRecovery<T>(
    operation: () => Promise<T>,
    file: File,
    maxRetries: number = 2,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        const processedError = this.handleProcessingError(error as Error, file);

        // Don't retry non-recoverable errors
        if (!processedError.isRecoverable || attempt === maxRetries) {
          throw processedError;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        console.warn(
          `Retrying document processing for ${file.name} (attempt ${attempt + 2}/${maxRetries + 1})`,
        );
      }
    }

    throw this.handleProcessingError(lastError!, file);
  }
}
```

This comprehensive addendum addresses all the missing critical components while
excluding mini-chat integration and accessibility features as requested. The
plan now includes proper PDF.js integration, security enhancements, performance
monitoring, caching, enhanced error handling, and complete integration with the
existing chat system.
