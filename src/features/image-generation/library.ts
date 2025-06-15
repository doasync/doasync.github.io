import { IDBPDatabase, openDB } from 'idb';

import { GeneratedImage, ImageGenerationStatus } from './types';

// Type guard to validate GeneratedImage objects
const isValidGeneratedImage = (item: unknown): item is GeneratedImage =>
  item !== null &&
  typeof item === 'object' &&
  typeof (item as GeneratedImage).id === 'string' &&
  typeof (item as GeneratedImage).prompt === 'string' &&
  typeof (item as GeneratedImage).model === 'string' &&
  typeof (item as GeneratedImage).timestamp === 'number' &&
  typeof (item as GeneratedImage).status === 'string' &&
  typeof (item as GeneratedImage).parameters === 'object';

// Type safe parser for localStorage data
const parseStoredImages = (stored: string): unknown[] => {
  try {
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// --- IndexedDB Setup ---

export const DB_NAME = 'ImageGenerationDB';
export const DB_VERSION = 1;
export const STORE_NAME = 'generatedImages';

let databasePromise: Promise<IDBPDatabase<ImageGenerationDB>> | null = null;

export interface ImageGenerationDB {
  [STORE_NAME]: {
    key: string;
    value: GeneratedImage;
    indexes: { timestamp: number };
  };
}

/**
 * Gets the IndexedDB database instance, initializing it if necessary.
 */
export const getDatabase = (): Promise<IDBPDatabase<ImageGenerationDB>> => {
  if (!databasePromise) {
    databasePromise = openDB<ImageGenerationDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        // Check if the store already exists before creating it
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, {
            keyPath: 'id',
          });
          // Check if the index already exists before creating it
          if (!store.indexNames.contains('timestamp')) {
            store.createIndex('timestamp', 'timestamp');
          }
        }
      },
    });
  }
  return databasePromise;
};

// --- Effect Handlers ---

/**
 * Loads all generated images from IndexedDB.
 */
export const loadGeneratedImagesHandler = async (): Promise<
  GeneratedImage[]
> => {
  try {
    const database = await getDatabase();
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const allImages = (await store.getAll()) as unknown[];
    await tx.done;

    // Sort by timestamp descending (newest first) and validate data
    const validImages: GeneratedImage[] = allImages
      .filter((item): item is GeneratedImage => isValidGeneratedImage(item))
      .map((item): GeneratedImage => {
        // Only mark as completed if image has actual data (url or b64_json)
        const hasImageData = Boolean(item.url || item.b64_json);
        const status: ImageGenerationStatus =
          item.status || (hasImageData ? 'completed' : 'error');

        // Debug logging to understand what's being loaded
        if (!hasImageData && item.status !== 'error') {
          console.warn(`Image ${item.id} loaded without image data:`, {
            id: item.id,
            hasUrl: Boolean(item.url),
            hasB64: Boolean(item.b64_json),
            originalStatus: item.status,
            newStatus: status,
          });
        }

        return {
          ...item,
          status,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    return validImages;
  } catch (error) {
    console.warn('Failed to load generated images from IndexedDB:', error);
    return [];
  }
};

/**
 * Saves all generated images to IndexedDB.
 */
export const saveGeneratedImagesHandler = async (
  images: GeneratedImage[],
): Promise<void> => {
  try {
    const database = await getDatabase();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Clear existing data and save new data
    await store.clear();

    // Save all images in parallel
    await Promise.all(images.map((image) => store.put(image)));

    await tx.done;
  } catch (error) {
    console.warn('Failed to save generated images to IndexedDB:', error);

    // Check if it's a quota exceeded error
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new Error(
        'Storage quota exceeded. Please delete some old images or clear browser storage.',
      );
    }

    throw error;
  }
};

/**
 * Saves a single generated image to IndexedDB.
 */
export const saveGeneratedImageHandler = async (
  image: GeneratedImage,
): Promise<void> => {
  try {
    const database = await getDatabase();
    await database.put(STORE_NAME, image);
  } catch (error) {
    console.warn('Failed to save generated image to IndexedDB:', error);

    // Check if it's a quota exceeded error
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new Error(
        'Storage quota exceeded. Please delete some old images or clear browser storage.',
      );
    }

    throw error;
  }
};

/**
 * Removes a specific generated image from IndexedDB.
 */
export const removeGeneratedImageHandler = async (
  imageId: string,
): Promise<void> => {
  try {
    const database = await getDatabase();
    await database.delete(STORE_NAME, imageId);
  } catch (error) {
    console.warn('Failed to remove generated image from IndexedDB:', error);
    throw error;
  }
};

/**
 * Clears all generated images from IndexedDB.
 */
export const clearGeneratedImagesHandler = async (): Promise<void> => {
  try {
    const database = await getDatabase();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await store.clear();
    await tx.done;
  } catch (error) {
    console.warn('Failed to clear generated images from IndexedDB:', error);
    throw error;
  }
};

/**
 * Migrates existing data from localStorage to IndexedDB (one-time operation).
 */
export const migrateFromLocalStorageHandler = async (): Promise<
  GeneratedImage[]
> => {
  try {
    // Check if localStorage has data
    const stored = localStorage.getItem('generatedImagesHistory');
    if (!stored) {
      return [];
    }

    const parsed = parseStoredImages(stored);
    if (parsed.length === 0) {
      // Clean up empty localStorage entry
      localStorage.removeItem('generatedImagesHistory');
      return [];
    }

    // Validate and filter the data
    const validImages: GeneratedImage[] = parsed
      .filter((item): item is GeneratedImage => isValidGeneratedImage(item))
      .map((item): GeneratedImage => {
        const hasImageData = Boolean(item.url || item.b64_json);
        const status: ImageGenerationStatus =
          item.status || (hasImageData ? 'completed' : 'error');

        return {
          ...item,
          status,
        };
      });

    if (validImages.length > 0) {
      // Save to IndexedDB
      await saveGeneratedImagesHandler(validImages);
      console.log(
        `Migrated ${validImages.length} images from localStorage to IndexedDB`,
      );
    }

    // Remove from localStorage after successful migration
    localStorage.removeItem('generatedImagesHistory');

    return validImages;
  } catch (error) {
    console.warn(
      'Failed to migrate images from localStorage to IndexedDB:',
      error,
    );
    return [];
  }
};
