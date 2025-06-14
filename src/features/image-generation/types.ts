// Image generation types and interfaces

export interface ImageGenerationParams {
  prompt: string;
  model: string;
  size?: string;
  quality?: string;
  style?: string;
  n?: number;
}

export interface ImageGenerationResult {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}

export interface ImageGenerationResponse {
  created: number;
  data: ImageGenerationResult[];
  usage?: {
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
}

export type ImageGenerationStatus = 'pending' | 'generating' | 'completed' | 'error';

export interface GeneratedImage {
  id: string;
  url?: string;
  b64_json?: string;
  prompt: string;
  model: string;
  parameters: ImageGenerationParams;
  timestamp: number;
  status: ImageGenerationStatus;
  error?: string; // Error message if status is 'error'
  progress?: number; // Progress percentage if supported by API
}

// Image generation models with their capabilities
export interface ImageGenerationModelInfo {
  id: string;
  name: string;
  provider: string;
  supportedSizes: string[];
  supportedQualities: string[];
  supportedStyles?: string[];
  maxPromptLength: number;
  maxImages: number;
  supportsEditing?: boolean;
  supportsVariations?: boolean;
}

export const IMAGE_GENERATION_MODELS: ImageGenerationModelInfo[] = [
  // OpenAI Models
  {
    id: "gpt-image-1",
    name: "GPT Image 1",
    provider: "openai",
    supportedSizes: ["1024x1024", "1536x1024", "1024x1536", "auto"],
    supportedQualities: ["auto", "high", "medium", "low"],
    maxPromptLength: 32000,
    maxImages: 1,
    supportsEditing: true,
  },
  {
    id: "dall-e-3",
    name: "DALL-E 3",
    provider: "openai",
    supportedSizes: ["1024x1024", "1792x1024", "1024x1792"],
    supportedQualities: ["standard", "hd"],
    supportedStyles: ["vivid", "natural"],
    maxPromptLength: 4000,
    maxImages: 1,
  },
  {
    id: "dall-e-2",
    name: "DALL-E 2", 
    provider: "openai",
    supportedSizes: ["1024x1024", "1024x1792", "1792x1024"],
    supportedQualities: ["standard"],
    maxPromptLength: 1000,
    maxImages: 10,
    supportsEditing: true,
    supportsVariations: true,
  },
  // Google Models
  {
    id: "imagen-3.0-generate-002",
    name: "Imagen 3.0 Generate 002",
    provider: "google",
    supportedSizes: ["1024x1024", "1536x1024", "1024x1536"],
    supportedQualities: ["standard", "hd"],
    maxPromptLength: 2000,
    maxImages: 1,
  },
  {
    id: "imagen-3.0-generate-001",
    name: "Imagen 3.0 Generate 001",
    provider: "google",
    supportedSizes: ["1024x1024", "1536x1024", "1024x1536"],
    supportedQualities: ["standard", "hd"],
    maxPromptLength: 2000,
    maxImages: 1,
  },
  {
    id: "imagen-3.0-fast-generate-001",
    name: "Imagen 3.0 Fast Generate",
    provider: "google",
    supportedSizes: ["1024x1024", "1536x1024", "1024x1536"],
    supportedQualities: ["standard"],
    maxPromptLength: 2000,
    maxImages: 1,
  },
  {
    id: "imagen-4.0-ultra-generate-exp-05-20",
    name: "Imagen 4.0 Ultra Generate",
    provider: "google",
    supportedSizes: ["1024x1024", "1536x1024", "1024x1536", "2048x2048"],
    supportedQualities: ["standard", "hd", "ultra"],
    maxPromptLength: 2000,
    maxImages: 1,
  },
  // Black Forest Labs (FLUX)
  {
    id: "FLUX.1 [dev]",
    name: "FLUX.1 Dev",
    provider: "black-forest-labs",
    supportedSizes: ["2752x1536", "1536x2752", "2048x2048", "3136x1344", "2496x1664", "1664x2496", "1856x2304", "2304x1856", "1344x3136"],
    supportedQualities: ["standard", "hd"],
    maxPromptLength: 1000,
    maxImages: 1,
  },
  {
    id: "FLUX.1 [schnell]",
    name: "FLUX.1 Schnell",
    provider: "black-forest-labs",
    supportedSizes: ["2752x1536", "1536x2752", "2048x2048", "3136x1344", "2496x1664", "1664x2496", "1856x2304", "2304x1856", "1344x3136"],
    supportedQualities: ["standard"],
    maxPromptLength: 1000,
    maxImages: 1,
  },
  {
    id: "FLUX.1 [pro]",
    name: "FLUX.1 Pro",
    provider: "black-forest-labs",
    supportedSizes: ["2752x1536", "1536x2752", "2048x2048", "3136x1344", "2496x1664", "1664x2496", "1856x2304", "2304x1856", "1344x3136"],
    supportedQualities: ["standard", "hd"],
    maxPromptLength: 1000,
    maxImages: 1,
  },
  {
    id: "FLUX 1.1 [pro] ultra raw",
    name: "FLUX 1.1 Pro Ultra Raw",
    provider: "black-forest-labs", 
    supportedSizes: ["2752x1536", "1536x2752", "2048x2048", "3136x1344", "2496x1664", "1664x2496", "1856x2304", "2304x1856", "1344x3136"],
    supportedQualities: ["standard", "hd", "ultra"],
    maxPromptLength: 1000,
    maxImages: 1,
  },
  // Stability AI
  {
    id: "stable-diffusion-3",
    name: "Stable Diffusion 3",
    provider: "stabilityai",
    supportedSizes: ["1024x1024", "1536x1024", "1024x1536"],
    supportedQualities: ["standard", "hd"],
    maxPromptLength: 1000,
    maxImages: 1,
  },
];

// Helper function to get model info
export const getImageGenerationModelInfo = (modelId: string): ImageGenerationModelInfo | undefined => {
  return IMAGE_GENERATION_MODELS.find(model => model.id === modelId);
};

// Helper to check if a string is an image generation command
export const isImageGenerationCommand = (text: string): boolean => {
  return /^\/imagine\s+.+/i.test(text.trim());
};

// Helper to extract prompt from command
export const extractImagePrompt = (command: string): string => {
  const match = command.match(/^\/imagine\s+(.+)/i);
  return match ? match[1].trim() : "";
};

// Helper to parse image generation parameters from command
export const parseImageGenerationCommand = (command: string): { prompt: string; params: Partial<ImageGenerationParams> } => {
  const prompt = extractImagePrompt(command);
  
  // Simple parameter parsing (can be enhanced later)
  const params: Partial<ImageGenerationParams> = {};
  
  // Extract --size parameter
  const sizeMatch = prompt.match(/--size\s+(\w+x\w+)/i);
  if (sizeMatch) {
    params.size = sizeMatch[1];
  }
  
  // Extract --quality parameter
  const qualityMatch = prompt.match(/--quality\s+(\w+)/i);
  if (qualityMatch) {
    params.quality = qualityMatch[1];
  }
  
  // Extract --style parameter
  const styleMatch = prompt.match(/--style\s+(\w+)/i);
  if (styleMatch) {
    params.style = styleMatch[1];
  }
  
  // Extract --n parameter
  const nMatch = prompt.match(/--n\s+(\d+)/i);
  if (nMatch) {
    params.n = parseInt(nMatch[1], 10);
  }
  
  // Clean prompt of parameters
  const cleanPrompt = prompt
    .replace(/--size\s+\w+x\w+/gi, "")
    .replace(/--quality\s+\w+/gi, "")
    .replace(/--style\s+\w+/gi, "")
    .replace(/--n\s+\d+/gi, "")
    .trim();
  
  return { prompt: cleanPrompt, params };
};