# VoidAI Full Integration Plan

## Executive Summary

This document outlines a comprehensive plan to fully integrate VoidAI's capabilities into the chat application, covering all multimodal features including vision, audio (TTS/STT), image generation, moderation, and advanced model features. The plan follows a phased approach to ensure stability while progressively adding functionality.

## Integration Architecture Overview

```mermaid
graph TB
    subgraph "Client-Side SPA"
        UI[React UI Components]
        EM[Effector Models]
        CS[Chat Stream Feature]
        
        subgraph "New Features"
            VF[Vision Feature]
            AF[Audio Feature]
            IG[Image Gen Feature]
            MF[Moderation Feature]
            EF[Embeddings Feature]
        end
    end
    
    subgraph "VoidAI API Endpoints"
        CC[/v1/chat/completions]
        AT[/v1/audio/transcriptions]
        AS[/v1/audio/speech]
        IG_API[/v1/images/generate]
        MOD[/v1/moderations]
        EMB[/v1/embeddings]
    end
    
    UI --> EM
    EM --> CS
    CS --> CC
    VF --> CC
    AF --> AT
    AF --> AS
    IG --> IG_API
    MF --> MOD
    EF --> EMB
```

## Phase 1: Core Multimodal Chat (Vision + Audio)

### 1.1 Vision-Enabled Chat (Image Uploads)
**Status**: Partially planned in existing documents

#### Implementation Steps:
1. **Model Discovery & Validation**
   - Validate vision-capable models: `gpt-4-1106-vision-preview`, `gpt-4o`, `grok-2-vision-1212`, `pixtral-large-latest`, `Qwen/Qwen2.5-VL-72B-Instruct`
   - Test OpenAI-compatible format with each model
   - Document model-specific behaviors and limits

2. **Enhanced Model Metadata**
   ```typescript
   interface ModelInfo {
     id: string;
     name: string;
     provider: string;
     capabilities: {
       vision: boolean;
       audio: boolean;
       audioGeneration: boolean;
       streaming: boolean;
       functionCalling: boolean;
     };
     limits: {
       maxImageSize?: number;
       supportedImageFormats?: string[];
       maxTokens: number;
       contextWindow: number;
     };
   }
   ```

3. **Smart Model Selection**
   - Auto-switch to vision model when image is attached
   - Show capability badges in model selector
   - Warn user if selected model doesn't support attached content

### 1.2 Audio-Enabled Chat
**New Feature**: Native audio support in chat.completions

#### Implementation for Audio Chat Models:
```typescript
// For models like gpt-4o-audio-preview
interface AudioChatMessage {
  role: "user" | "assistant";
  content: string;
  audio?: {
    id?: string;
    data?: string; // Base64 audio for sending
  };
}

// Extend chat-stream to support audio responses
interface StreamChatParams {
  // ... existing params
  modalities?: ("text" | "audio")[];
  audio?: {
    voice: "alloy" | "echo" | "fable" | "nova" | "shimmer";
    format: "wav" | "mp3" | "opus";
  };
}
```

## Phase 2: Speech Integration (TTS/STT)

### 2.1 Speech-to-Text (Transcription)
**Models**: `whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`

#### New Feature: Voice Input Button
```typescript
// src/features/audio-input/model.ts
export const $isRecording = createStore(false);
export const $audioBlob = createStore<Blob | null>(null);
export const recordingStarted = createEvent();
export const recordingStopped = createEvent();

export const transcribeAudioFx = createEffect<
  { blob: Blob; model: string },
  string
>(async ({ blob, model }) => {
  const formData = new FormData();
  formData.append("file", blob, "recording.webm");
  formData.append("model", model);
  
  const response = await fetch("https://api.voidai.app/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}` },
    body: formData
  });
  
  const result = await response.json();
  return result.text;
});
```

### 2.2 Text-to-Speech
**Models**: `tts-1`, `tts-1-hd`, `gpt-4o-mini-tts`

#### Implementation:
```typescript
// src/features/audio-player/model.ts
export const $playingMessageId = createStore<string | null>(null);
export const $audioCache = createStore<Map<string, ArrayBuffer>>(new Map());

export const generateSpeechFx = createEffect<
  { text: string; voice: string; model: string },
  ArrayBuffer
>(async ({ text, voice, model }) => {
  const response = await fetch("https://api.voidai.app/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: text,
      voice,
      response_format: "mp3"
    })
  });
  
  return response.arrayBuffer();
});
```

## Phase 3: Image Generation

### 3.1 In-Chat Image Generation
**Models**: `gpt-image-1`, `dall-e-3`, `dall-e-2`, `imagen-3.0-generate-001`, `FLUX` variants

#### Command-Based Implementation:
```typescript
// Detect image generation commands
const IMAGE_GEN_PATTERN = /^\/imagine\s+(.+)$/i;

// src/features/image-generation/model.ts
export const generateImageFx = createEffect<
  { prompt: string; model: string; size?: string; quality?: string },
  { url: string }
>(async (params) => {
  const response = await fetch("https://api.voidai.app/v1/images/generate", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: params.model,
      prompt: params.prompt,
      size: params.size || "1024x1024",
      quality: params.quality || "standard",
      n: 1
    })
  });
  
  const result = await response.json();
  return { url: result.data[0].url };
});
```

### 3.2 Image Generation UI
- Add dedicated image generation mode toggle
- Show generation parameters (size, quality, style)
- Preview generated images inline
- Allow saving/downloading generated images

## Phase 4: Content Moderation

### 4.1 Message Moderation
**Models**: `omni-moderation-latest`, `text-moderation-latest`, `mistral-moderation-latest`

#### Implementation:
```typescript
// src/features/moderation/model.ts
export const moderateContentFx = createEffect<
  { text?: string; imageUrl?: string },
  ModerationResult
>(async ({ text, imageUrl }) => {
  const input = imageUrl 
    ? [{ type: "image_url", image_url: { url: imageUrl } }]
    : text;
    
  const response = await fetch("https://api.voidai.app/v1/moderations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "omni-moderation-latest",
      input
    })
  });
  
  return response.json();
});

// Auto-moderate before sending
sample({
  clock: messageSent,
  source: combine($messageText, $pendingAttachment),
  target: moderateContentFx
});
```

## Phase 5: Advanced Features

### 5.1 Multi-File Support
Extend attachment system to support multiple files:
```typescript
interface Attachment {
  id: string;
  type: "image" | "audio" | "document";
  file: File;
  dataUrl?: string;
  extractedText?: string; // For documents
  metadata: {
    mimeType: string;
    size: number;
    dimensions?: { width: number; height: number };
    duration?: number; // For audio
  };
}

export const $pendingAttachments = createStore<Attachment[]>([]);
```

### 5.2 Document Processing
Support for PDF, DOCX, TXT, MD files:
```typescript
// Client-side text extraction
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

export const extractTextFx = createEffect<File, string>(async (file) => {
  const type = file.type;
  
  if (type === 'application/pdf') {
    // Use pdf.js
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ');
    }
    
    return text;
  } else if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // Use mammoth for DOCX
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } else {
    // Plain text files
    return file.text();
  }
});
```

### 5.3 Enhanced Mini Chat
Extend mini chat with multimodal capabilities:
- Voice input for mini chat
- Image paste/drop support
- Quick image generation commands

## Phase 6: Model-Specific Optimizations

### 6.1 Provider-Specific Features
```typescript
interface ProviderConfig {
  openai: {
    supportsFunctions: true;
    supportsTools: true;
    visionModels: ["gpt-4o", "gpt-4-vision-preview"];
  };
  anthropic: {
    supportsCaching: true;
    supportsXML: true;
    visionModels: ["claude-3-opus", "claude-3-sonnet"];
  };
  google: {
    supportsCodeExecution: true;
    visionModels: ["gemini-1.5-pro", "gemini-2.0-flash"];
  };
  xai: {
    supportsRealtimeWeb: true;
    visionModels: ["grok-2-vision-1212"];
  };
}
```

### 6.2 Adaptive Prompting
Different providers may need adjusted prompts:
```typescript
const adaptPromptForProvider = (prompt: string, provider: string): string => {
  switch (provider) {
    case 'anthropic':
      // Claude prefers XML tags for structure
      return `<task>${prompt}</task>`;
    case 'google':
      // Gemini works well with markdown structure
      return `## Task\n${prompt}`;
    default:
      return prompt;
  }
};
```

## Implementation Timeline

### Week 1-2: Foundation
- [ ] Complete Phase 1.1 (Vision-enabled chat)
- [ ] Test with all vision models
- [ ] Update model selector with capabilities

### Week 3-4: Audio Features
- [ ] Implement Phase 2.1 (Speech-to-text)
- [ ] Implement Phase 2.2 (Text-to-speech)
- [ ] Add audio UI components

### Week 5-6: Generation & Moderation
- [ ] Implement Phase 3 (Image generation)
- [ ] Implement Phase 4 (Content moderation)
- [ ] Add safety controls

### Week 7-8: Advanced Features
- [ ] Multi-file support
- [ ] Document processing
- [ ] Provider optimizations

## Testing Strategy

### 1. Model Compatibility Matrix
Create comprehensive tests for each model:
```typescript
const MODEL_TESTS = {
  'gpt-4o': {
    vision: true,
    audio: true,
    streaming: true,
    maxImageSize: 20 * 1024 * 1024 // 20MB
  },
  'claude-3-opus-20240229': {
    vision: true,
    audio: false,
    streaming: true,
    maxImageSize: 5 * 1024 * 1024 // 5MB
  }
  // ... more models
};
```

### 2. Feature Detection
Implement runtime feature detection:
```typescript
const detectModelCapabilities = async (modelId: string) => {
  // Try vision
  try {
    await testVisionCapability(modelId);
    capabilities.vision = true;
  } catch (e) {
    capabilities.vision = false;
  }
  
  // Similar tests for other features
  return capabilities;
};
```

## Error Handling & Fallbacks

### 1. Graceful Degradation
```typescript
// If vision model fails, fallback to text description
if (!modelSupportsVision && hasImageAttachment) {
  const description = await generateImageDescription(image);
  messages.push({
    role: "system",
    content: `User attached an image: ${description}`
  });
}
```

### 2. Provider-Specific Error Handling
```typescript
const handleProviderError = (error: any, provider: string) => {
  switch (provider) {
    case 'openai':
      if (error.code === 'invalid_image_format') {
        return 'Please use JPEG, PNG, GIF, or WebP format';
      }
      break;
    case 'anthropic':
      if (error.type === 'invalid_request' && error.message.includes('vision')) {
        return 'This Claude model does not support images';
      }
      break;
  }
  return 'An error occurred processing your request';
};
```

## Performance Optimizations

### 1. Lazy Loading
```typescript
// Load heavy libraries only when needed
const loadPdfLibrary = () => import('pdfjs-dist');
const loadAudioLibrary = () => import('wavesurfer.js');
```

### 2. Caching Strategy
```typescript
// Cache model capabilities
const MODEL_CAPABILITY_CACHE = new Map<string, ModelCapabilities>();

// Cache generated audio
const AUDIO_CACHE = new Map<string, ArrayBuffer>();

// Cache transcriptions
const TRANSCRIPTION_CACHE = new Map<string, string>();
```

## Security Considerations

1. **File Validation**
   - Validate file types and sizes before processing
   - Scan for potentially malicious content
   - Limit total attachment size per message

2. **API Key Management**
   - Never send API key to untrusted endpoints
   - Implement rate limiting for expensive operations
   - Monitor usage to prevent abuse

3. **Content Filtering**
   - Use moderation API before sending sensitive content
   - Implement client-side content warnings
   - Allow users to configure safety levels

## Conclusion

This comprehensive plan ensures full utilization of VoidAI's capabilities while maintaining a clean, modular architecture. The phased approach allows for incremental testing and validation, reducing risk while progressively enhancing functionality. Each phase builds upon the previous, creating a robust multimodal chat experience that leverages the best of what VoidAI offers.