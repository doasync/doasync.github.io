# Feature Requirements Document: Models Select

**Version:** 1.1  
**Date:** 2025-06-15  
**Status:** Implemented  
**Implementation Status:** ✅ FULLY IMPLEMENTED (100%)

## Implementation Summary

### ✅ Fully Implemented Features
- Dynamic model fetching from VoidAI API
- Comprehensive capability detection for 200+ models
- Vision model detection and auto-selection
- Audio model detection and auto-selection
- Free/paid model filtering
- Model information display with pricing
- Search functionality in model selector
- Persistent model selection
- Fallback to default model on errors

### 🎯 Implementation Quality
- **Completeness**: 100% of requirements met
- **Code Quality**: Robust with comprehensive model database
- **User Experience**: Smart auto-selection improves workflow
- **Performance**: Efficient model list handling

## 1. Feature Overview

The **models-select** feature provides comprehensive model selection functionality with automatic capability detection. It fetches available models from the API, categorizes them by capabilities (vision, audio, free tier), and enables intelligent model selection based on user needs.

### Purpose
- Fetch and display available LLM models from the API
- Auto-detect model capabilities (vision, audio, etc.)
- Provide intelligent model selection based on requirements
- Support free-tier filtering for cost-conscious users
- Display detailed model information (context length, pricing)

### Key Capabilities
- Dynamic model list fetching from API
- Comprehensive capability detection (vision, audio)
- Free/paid model filtering
- Auto-selection based on attachments (images, audio)
- Model information display with pricing
- Persistent model selection
- Title generation model selection

## 2. Functional Requirements

### 2.1 Model Fetching
- Fetch models list from `/models` endpoint
- Parse and enrich model data with capabilities
- Handle API failures gracefully
- Cache model list for session

### 2.2 Capability Detection
Models are categorized by capabilities:

#### Vision Models
Comprehensive list including:
- OpenAI GPT-4 vision variants
- Claude 3 series (Opus, Sonnet, Haiku)
- Google Gemini models
- Llama vision models
- Qwen VL models
- And many more...

#### Audio Models
Models supporting audio input:
- GPT-4 audio variants
- Gemini models with audio
- Specific audio-enabled models

### 2.3 Model Selection
- Manual selection via dropdown/search
- Auto-selection when images attached (vision models)
- Auto-selection for audio files
- Preference for free models when filter enabled
- Persistent selection across sessions

### 2.4 Model Information
Display for each model:
- Name and ID
- Context length (tokens)
- Pricing (per 1K tokens for input/output)
- Capability badges (Vision, Audio, Free)
- Provider information

## 3. Technical Implementation

### 3.1 State Management (Effector)

#### Stores
- `$availableModels`: Full list of fetched models
- `$selectedModelId`: Currently selected model ID
- `$isLoadingModels`: Loading state
- `$modelsError`: Error state
- `$showFreeOnly`: Free tier filter toggle
- `$autoTitleModelId`: Model for auto title generation
- `$isModelSelectorActive`: UI focus state
- `$isModelInfoAlertOpen`: Info alert visibility
- `$isTestingUrl`: URL test loading state
- `$urlTestResult`: URL test results

#### Events
- `fetchModels`: Trigger model list fetch
- `modelSelected`: Select a model
- `setShowFreeOnly`: Toggle free tier filter
- `autoSelectModelForCapabilities`: Smart selection
- `modelSelectorFocused`: UI focus tracking
- `autoTitleModelSelected`: Title model selection
- `testProviderUrl`: Test API endpoint
- `openModelInfoAlert`: Show model info
- `closeModelInfoAlert`: Hide model info

#### Effects
- `fetchModelsFx`: Fetch models from API
- `testProviderUrlFx`: Test URL connectivity

### 3.2 Component Structure
```
models-select/
├── components/
│   ├── model-selector.tsx      # Main selection UI
│   ├── model-info-drawer.tsx   # Detailed info panel
│   └── model-info-alert.tsx    # Quick info alert
├── model.ts                     # State management
├── types.ts                     # TypeScript interfaces
└── index.ts                     # Public exports
```

### 3.3 Capability Lists

#### Vision Models (Extensive)
- OpenAI: GPT-4 series with vision
- Anthropic: Claude 3 Opus, Sonnet, Haiku
- Google: Gemini Pro, Flash, Ultra variants
- Meta: Llama 3.2 vision models
- Many more specialized vision models

#### Audio Models
- GPT-4 audio preview variants
- Gemini models with audio support
- Specialized audio processing models

### 3.4 Auto-Selection Logic
```typescript
autoSelectModelForCapabilities({
  vision?: boolean,
  audio?: boolean,
  preferFree?: boolean
})
```

Selection priority:
1. Match required capabilities
2. Prefer free if requested
3. Prefer faster models for simple tasks
4. Fall back to capable paid models

## 4. Integration Points

### 4.1 Dependencies
- **api-config**: For API URL construction
- **chat-settings**: For API key and base URL

### 4.2 Consumed By
- **chat**: Uses selected model for conversations
- **chat-history**: Stores model selection per chat
- **image-generation**: May influence UI based on capabilities
- Main UI components for model selection

## 5. Data Flow

```
API (/models) → Fetch Models → Parse & Enrich → Store
                                      ↓
                              Capability Detection
                                      ↓
                            UI Components ← User Selection
                                      ↓
                              Selected Model → Chat/History
```

## 6. Model Capability Detection

### 6.1 Vision Detection
- Hardcoded comprehensive list
- Pattern matching for new models
- Fallback to model name analysis

### 6.2 Audio Detection
- Specific model ID matching
- Audio-related string detection

### 6.3 Free Tier Detection
- Zero pricing detection
- Specific free model patterns
- Manual free tier list

## 7. Error Handling

### 7.1 Fetch Failures
- Show error message
- Fall back to last known good list
- Allow manual retry
- Continue with cached data if available

### 7.2 Invalid Selection
- Validate model exists
- Fall back to default model
- Show warning for deprecated models

## 8. Performance Considerations

- Models fetched once per session
- Capability detection cached
- Efficient filtering algorithms
- Debounced search in selector
- LocalStorage for persistence

## 9. User Experience

### 9.1 Model Selection UI
- Searchable dropdown
- Clear capability badges
- Pricing information visible
- Context length display
- Grouped by provider/capability

### 9.2 Smart Features
- Auto-selection on file attach
- Free tier toggle
- Recent models section
- Favorites (future enhancement)

### 9.3 Information Display
- Quick info on hover
- Detailed drawer for full specs
- Capability explanations
- Pricing calculator (future)

## 10. Testing Strategy

### 10.1 Unit Tests
- Capability detection accuracy
- Auto-selection logic
- Filter functionality
- Price parsing

### 10.2 Integration Tests
- API fetching
- State persistence
- UI component interaction
- Cross-feature updates

## 11. Accessibility

- Keyboard navigation in selector
- Screen reader announcements
- High contrast capability badges
- Alternative text for icons

## 12. Future Enhancements

### 12.1 Planned Features
- Model favorites
- Usage-based recommendations
- Cost estimation
- Performance benchmarks
- Custom model addition

### 12.2 Capability Extensions
- Function calling detection
- JSON mode support
- Image generation capability
- Embedding model support

## 13. Model Metadata Structure

```typescript
interface ModelInfo {
  id: string;
  name: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
  capabilities: {
    vision?: boolean;
    audio?: boolean;
    free?: boolean;
  };
}
```