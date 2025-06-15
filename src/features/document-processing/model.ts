import { sample, createDomain } from 'effector';
import { debug } from 'patronum/debug';
import { PDFProcessor } from './processors/pdf-processor';
import { DOCXProcessor } from './processors/docx-processor';
import { TextProcessor } from './processors/text-processor';
import { HTMLProcessor } from './processors/html-processor';
import type {
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
    // Validate inputs
    if (!files || files.length === 0) {
      throw new Error('No files provided for processing');
    }

    if (files.length > 10) {
      throw new Error(
        'Too many files. Maximum 10 files can be processed at once',
      );
    }

    const processors: DocumentProcessor[] = [
      new PDFProcessor(),
      new DOCXProcessor(),
      new TextProcessor(),
      new HTMLProcessor(),
    ];

    const results: DocumentProcessingResult[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        // Validate file
        if (!file.name || file.name.trim() === '') {
          throw new Error('Invalid file: empty filename');
        }

        if (file.size === 0) {
          throw new Error('Invalid file: empty file');
        }

        if (file.size > 100 * 1024 * 1024) {
          // 100MB absolute limit
          throw new Error(`File is too large. Maximum size: 100MB`);
        }

        const processor = processors.find((p) =>
          p.supportedTypes.includes(file.type),
        );

        if (!processor) {
          throw new Error(
            `Unsupported file type: ${file.type}. Supported types: PDF, DOCX, TXT, MD, HTML`,
          );
        }

        if (file.size > processor.maxFileSize) {
          throw new Error(
            `File is too large for this type. Maximum size: ${Math.round(processor.maxFileSize / 1024 / 1024)}MB`,
          );
        }

        console.log(
          `Processing file: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)`,
        );

        const result = await processor.process(file);

        // Validate result
        if (!result.extractedText || result.extractedText.trim() === '') {
          throw new Error('No text content could be extracted from this file');
        }

        if (result.extractedText.length > 1000000) {
          // 1MB text limit
          console.warn(
            `Large text extracted from ${file.name}: ${result.extractedText.length} characters`,
          );
        }

        results.push(result);
        console.log(`Successfully processed: ${file.name}`);
      } catch (error) {
        const errorMessage = `Failed to process "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMessage, error);
        errors.push(errorMessage);
      }
    }

    // If some files failed but others succeeded, return partial results
    if (errors.length > 0 && results.length > 0) {
      console.warn(
        `Partial success: ${results.length} files processed, ${errors.length} failed`,
      );
      // Could optionally return partial results with warnings
    }

    // If all files failed, throw with detailed error
    if (results.length === 0) {
      throw new Error(`All files failed to process:\n${errors.join('\n')}`);
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
