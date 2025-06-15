# Feature Requirements Document: Chat Settings

**Version:** 1.1  
**Date:** 2025-06-15  
**Status:** Implemented  
**Implementation Status:** ⚠️ PARTIALLY IMPLEMENTED (85%)

## Implementation Summary

### ✅ Fully Implemented Features
- API key management with LocalStorage persistence
- Provider URL configuration with defaults
- Temperature control (0-2 range)
- System prompt configuration
- Settings dialog with tabbed interface
- API key missing dialog
- Mini chat model selector
- Free models toggle

### ⚠️ Partially Implemented
- Provider URL testing (basic configuration only, missing real-time validation)
- API key encryption (currently stored in plain text)

### 🎯 Implementation Quality
- **Completeness**: 85% of requirements met
- **Code Quality**: Clean Effector patterns
- **User Experience**: Intuitive settings management
- **Security**: Needs encryption for API keys

## 1. Feature Overview

The **chat-settings** feature manages user preferences and API configuration for the chat application. It handles API key storage, provider URL configuration, default chat parameters (temperature, system prompt), and provides UI components for settings management.

### Purpose
- Manage user API credentials securely in LocalStorage
- Configure chat behavior defaults (temperature, system prompt)
- Provide settings UI for user configuration
- Handle API key validation and missing key scenarios
- Support provider URL customization for different API endpoints

### Key Capabilities
- API key management with LocalStorage persistence
- Provider URL configuration with default fallback
- Temperature and system prompt defaults
- Settings dialog UI
- API key missing dialog
- Provider URL testing functionality
- Legacy API key migration

## 2. Functional Requirements

### 2.1 Settings Storage
All settings are persisted in LocalStorage with the following keys:
- `provider_api_key`: User's API key
- `provider_api_url`: API endpoint URL (default: https://api.voidai.app/v1)
- `default_temperature`: Temperature setting (0-2, default: 0.7)
- `default_system_prompt`: System prompt text (default: empty)

### 2.2 API Key Management
- Store API key securely in LocalStorage
- Provide dialog for entering missing API key
- Migrate from legacy key format (`voidai_api_key`)
- Clear sensitive data when needed
- Validate API key presence before operations

### 2.3 Provider URL Configuration
- Support custom API endpoints
- Default to VoidAI unified API
- Test endpoint connectivity
- Display test results to user

### 2.4 Chat Parameters
- **Temperature**: Controls response randomness (0-2)
- **System Prompt**: Default instructions for the AI

## 3. Technical Implementation

### 3.1 State Management (Effector)

#### Stores
- `$apiKey`: Current API key
- `$providerApiUrl`: API endpoint URL
- `$temperature`: Default temperature value
- `$systemPrompt`: Default system prompt
- `$settingsLoaded`: Loading state flag
- `$isApiKeyDialogOpen`: API key dialog visibility

#### Events
- `loadSettings`: Trigger settings load from LocalStorage
- `apiKeyChanged`: Update API key
- `providerApiUrlChanged`: Update provider URL
- `temperatureChanged`: Update temperature
- `systemPromptChanged`: Update system prompt
- `apiKeyMissing`: Signal missing API key
- `showApiKeyDialog`: Open API key dialog
- `hideApiKeyDialog`: Close API key dialog

#### Effects
- `loadSettingsFx`: Load all settings from LocalStorage
- `saveSettingsFx`: Persist settings to LocalStorage
- `testProviderUrlFx`: Test API endpoint connectivity

### 3.2 Component Structure
```
chat-settings/
├── components/
│   ├── api-key-missing-dialog.tsx    # Dialog for missing API key
│   ├── chat-settings-content.tsx     # Main settings UI
│   ├── mini-chat-model-selector.tsx  # Compact model selector
│   └── provider-url-test.tsx         # URL testing component
├── model.ts                           # Effector state management
└── index.ts                           # Public exports
```

### 3.3 UI Components

#### ChatSettingsContent
Main settings interface with:
- API key input field
- Provider URL input with test button
- Temperature slider (0-2)
- System prompt textarea
- Save/cancel actions

#### ApiKeyMissingDialog
Modal dialog shown when API key is required:
- Explanation of why API key is needed
- Input field for API key
- Link to API key acquisition
- Save button

#### ProviderUrlTest
- Test button to verify endpoint
- Loading state during test
- Success/failure feedback
- Model count display on success

## 4. Integration Points

### 4.1 Dependencies
- LocalStorage for persistence
- Material UI for components
- Effector for state management

### 4.2 Consumed By
- **chat**: Uses API key and settings for requests
- **chat-stream**: Needs API configuration
- **models-select**: Requires API key for fetching models
- **image-generation**: Uses API settings
- **audio-chat**: Needs API configuration for TTS/STT

## 5. Data Flow

```
User Input → Settings Components → Effector Events
                                         ↓
                                   State Updates
                                         ↓
                                   LocalStorage
                                         ↓
                              Other Features (via stores)
```

## 6. Error Handling

### 6.1 Missing API Key
- Show API key dialog automatically
- Block operations requiring API key
- Provide clear user guidance

### 6.2 Invalid Settings
- Validate temperature range (0-2)
- Validate URL format
- Show error messages for invalid inputs

### 6.3 Storage Failures
- Graceful fallback to defaults
- Console error logging
- User notification for critical failures

## 7. Security Considerations

### 7.1 API Key Storage
- Store in LocalStorage (client-side only)
- Never send to external services except configured API
- No logging of API keys
- Clear option for security-conscious users

### 7.2 URL Validation
- Validate URL format before saving
- Test connectivity before accepting
- Prevent XSS through URL manipulation

## 8. Performance Considerations

- Settings loaded once on app start
- Debounced saves to prevent excessive writes
- Minimal re-renders through Effector optimization
- Lazy loading of settings UI components

## 9. User Experience

### 9.1 First-Time Setup
- Automatic API key dialog on first use
- Clear instructions for obtaining API key
- Default settings work out-of-the-box

### 9.2 Settings Access
- Settings drawer accessible from main UI
- Keyboard shortcuts for quick access
- Mobile-responsive design

### 9.3 Feedback
- Loading states during operations
- Success/error messages
- Real-time validation feedback

## 10. Testing Strategy

### 10.1 Unit Tests
- Settings persistence/retrieval
- Validation logic
- Legacy migration
- Default value handling

### 10.2 Integration Tests
- LocalStorage operations
- API endpoint testing
- Settings propagation to other features

### 10.3 E2E Tests
- Complete settings flow
- API key entry and validation
- Provider URL testing

## 11. Accessibility

- Proper ARIA labels for all inputs
- Keyboard navigation support
- Screen reader friendly dialogs
- High contrast mode support

## 12. Migration Path

### 12.1 Legacy API Key
- Automatic migration from `voidai_api_key` to `provider_api_key`
- One-time migration on load
- Cleanup of legacy key after migration

### 12.2 Future Migrations
- Version tracking for settings schema
- Backward compatibility for settings format
- Non-breaking updates to defaults