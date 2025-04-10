import { DBSchema } from "idb";
import { Message } from "@/features/chat"; // Import Message type
import { ModelInfo } from "@/features/models-select";

// Settings specific to a chat session
export interface MinimalModelInfo {
  pricing: {
    prompt: number;
    completion: number;
  };
  context_length: number;
}

export interface ChatSettings {
  model: MinimalModelInfo;
  temperature: number;
  systemPrompt: string;
}

// Represents a full chat session stored in IndexedDB
export interface ChatSession {
  id: string; // Using string UUIDs for IDs
  title: string;
  createdAt: number; // Timestamp
  lastModified: number; // Timestamp
  messages: Message[];
  settings: ChatSettings;
  totalTokens: number; // Store the token count with the chat
  draft?: string; // <-- Optional draft input
  modelInfo?: ModelInfo | null;
}

// Represents the summarized data shown in the history list
export interface ChatHistoryIndex {
  id: string;
  title: string;
  lastModified: number;
}

// Schema definition for the IndexedDB database
export interface ChatDB extends DBSchema {
  chats: {
    // STORE_NAME is 'chats'
    key: string; // Use 'id' as the key path
    value: ChatSession;
    indexes: { lastModified: number }; // Index for sorting
  };
}

// Parameters for the title generation effect
export interface GenerateTitleParams {
  chatId: string;
  messages: Message[];
  apiKey: string;
  modelId: string;
}

// Result from the title generation effect
export interface GenerateTitleResult {
  chatId: string;
  generatedTitle: string;
}

// Parameters for the title editing effect
export interface EditTitleParams {
  id: string;
  newTitle: string;
}
