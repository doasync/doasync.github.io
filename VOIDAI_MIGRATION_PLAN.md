# VoidAI API Migration Plan

**Version:** 1.0
**Date:** 2025-06-08
**Author:** Roo (AI Assistant)

## I. Executive Summary

This document outlines the plan for transitioning the LLM Chat Interface application from using the OpenRouter API to exclusively using the VoidAI API for all chat-related functionalities.

The primary finding of the initial analysis is that **the transition is expected to be low-risk for core chat operations due to VoidAI's high compatibility with OpenAI API standards**, which the application currently leverages for OpenRouter. Key areas of change include updating API endpoint configurations, modifying user-facing text and labels from "OpenRouter" to "VoidAI", updating the `localStorage` key for the API key, and revising internal project documentation. Careful verification of the VoidAI `/v1/models` endpoint response schema against our application's expected `ModelInfo` structure will be crucial.

## II. Impact Analysis

### Code Impact

- **`src/features/chat-stream/api.ts`**:
  - **Change:** Modify the `OPENROUTER_API_URL` constant to VoidAI's base URL for chat completions (`https://api.voidai.app/v1/chat/completions`).
  - **Complexity:** Low. A single constant change.
  - **Parsing Logic:** No changes anticipated for SSE parsing logic due to VoidAI's OpenAI compatibility.
- **`src/features/models-select/model.ts`**:
  - **Change:** Update the `fetch` URL in `fetchModelsFx` to VoidAI's model listing endpoint (`https://api.voidai.app/v1/models`).
  - **Verification Needed:** Critically verify if the response structure from VoidAI's `/v1/models` aligns with the application's `ModelInfo` interface. If not, this feature will require more significant changes to adapt or parse the new structure.
  - **Complexity (assuming compatibility):** Low.
  - **Complexity (if incompatible):** Medium to High, depending on the extent of the mismatch.
- **`src/features/chat-settings/model.ts`**:
  - **Change:** Update the `API_KEY_LS_KEY` constant from `"openrouter_api_key"` to `"voidai_api_key"`.
  - **Complexity:** Low.
- **UI Components (e.g., `src/components/ChatSettingsContent.tsx`):**
  - **Change:** Update labels, tooltips, and placeholder text related to the API key input from "OpenRouter" to "VoidAI".
  - **Complexity:** Low. Involves text changes in one or more React components.

### Data Persistence Impact

- **`localStorage`**:
  - The API key storage key will change from `openrouter_api_key` to `voidai_api_key`. Users will need to re-enter their API key, which will then be stored under the new key. Old keys under the OpenRouter key will remain but will no longer be used. No automatic migration is planned.
- **`IndexedDB`**:
  - No direct impact anticipated on chat history or session data stored in IndexedDB, as the core message structures and chat logic are API-agnostic once the stream is established.

### Documentation Impact

The following project documents will require updates:

- **[`PRD.md`](PRD.md:1):** Search and replace "OpenRouter" with "VoidAI" and "openrouter.ai" with "voidai.app". Review for contextual accuracy.
- **[`src/features/chat-stream/FRD.md`](src/features/chat-stream/FRD.md:1):** Extensive updates needed. Search and replace "OpenRouter" with "VoidAI" and adjust descriptions of API interactions to reflect VoidAI as the provider.
- **[`src/features/chat/FRD.md`](src/features/chat/FRD.md:1):** Search and replace "OpenRouter" with "VoidAI". Review for contextual accuracy.
- **[`src/features/mini-chat/FRD.md`](src/features/mini-chat/FRD.md:1):** Search and replace "OpenRouter" with "VoidAI". Review for contextual accuracy.
- Any other developer notes or READMEs that might mention OpenRouter.

### User Impact

- **API Key:** Users will need to obtain a VoidAI API key and enter it into the application's settings. Their existing OpenRouter key will no longer work.
- **UI Text:** Users will see "VoidAI" instead of "OpenRouter" in relevant UI sections (e.g., API key settings).
- **Functionality:** Core chat functionality, model selection (assuming compatibility), and streaming should remain consistent.

## III. Detailed Implementation Plan

### A. Configuration Changes

1.  **Update API Endpoint for Chat Completions:**
    - **File:** [`src/features/chat-stream/api.ts`](src/features/chat-stream/api.ts:1)
    - **Action:** Modify the `OPENROUTER_API_URL` constant.
      - **From:** `const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";`
      - **To:** `const VOIDAI_API_URL = "https://api.voidai.app/v1/chat/completions";` (or simply change the existing constant's value and rename it if preferred). Ensure the `fetch` call on line 55 uses this new constant.
2.  **Update API Endpoint for Model Listing:**
    - **File:** [`src/features/models-select/model.ts`](src/features/models-select/model.ts:1)
    - **Action:** Modify the URL in the `fetchModelsFx` effect's handler.
      - **From (Line 100):** `const response = await fetch("https://openrouter.ai/api/v1/models");`
      - **To:** `const response = await fetch("https://api.voidai.app/v1/models");`
3.  **Update `localStorage` Key for API Key:**

    - **File:** [`src/features/chat-settings/model.ts`](src/features/chat-settings/model.ts:1)
    - **Action:** Modify the `API_KEY_LS_KEY` constant.
      - **From (Line 12):** `const API_KEY_LS_KEY = "openrouter_api_key";`
      - **To:** `const API_KEY_LS_KEY = "voidai_api_key";`

4.  **Update Default Model IDs:**
    - **Action:** Review and update hardcoded default model IDs in the application to valid model identifiers available through VoidAI. This is crucial for ensuring the application initializes and functions correctly after the API switch.
    - **Files & Constants to Check/Update:**
      - [`src/features/models-select/model.ts`](src/features/models-select/model.ts:1):
        - `export const $selectedModelId` (currently defaults to e.g., `"openrouter/quasar-alpha"` around line 40)
        - `export const $autoTitleModelId` (currently defaults to e.g., `"google/gemini-2.0-flash-lite-001"` around line 69)
      - [`src/features/mini-chat/model.ts`](src/features/mini-chat/model.ts:1):
        - `const DEFAULT_MINI_CHAT_MODEL` (currently defaults to e.g., `"openai/gpt-3.5-turbo"` around line 39)
    - **Note:** The selection of appropriate VoidAI default models should be done after verifying the available models from VoidAI's `/v1/models` endpoint during implementation.

### B. Core API Feature (`chat-stream`) Update

1.  **Modify API URL Constant:**
    - **File:** [`src/features/chat-stream/api.ts`](src/features/chat-stream/api.ts:1)
    - **Action:** As detailed in "III.A.1", change `OPENROUTER_API_URL` to point to `https://api.voidai.app/v1/chat/completions`.
    - **Update Error Message (Line 75):** Change "OpenRouter API Error" to "VoidAI API Error".
2.  **Stream Parsing Logic:**
    - **Confirmation:** Based on VoidAI's OpenAI compatibility, no changes are expected for the `eventsource-parser` usage or the SSE event handling logic (`isParsedDataEvent`, `isCompletionEvent`). This should be verified during testing.

### C. Model Selection Feature (`models-select`) Update

1.  **Modify Fetch URL:**
    - **File:** [`src/features/models-select/model.ts`](src/features/models-select/model.ts:1)
    - **Action:** As detailed in "III.A.2", change the `fetch` URL in `fetchModelsFx` to `https://api.voidai.app/v1/models`.
2.  **Verify Response Schema:**
    - **Action:** During development, inspect the actual response from `https://api.voidai.app/v1/models`. Ensure that the fields required by the `ModelInfo` interface ([`src/features/models-select/model.ts:10-26`](src/features/models-select/model.ts:10-26)) are present or can be reasonably derived.
    - **Contingency:** If key fields (`name`, `description`, `context_length`, `pricing`) are missing, the `ModelInfo` interface and dependent UI components (ModelSelector, ModelInfoAlert) will need to be adapted. This might involve showing fewer details or using placeholder values.

### D. UI and User-Facing Text Changes

1.  **API Key Input in Settings:**
    - **File:** [`src/components/ChatSettingsContent.tsx`](src/components/ChatSettingsContent.tsx:1)
    - **Action (Tooltip, Line 141):**
      - Change title from `"Your OpenRouter API Key. Stored locally in your browser."`
      - To: `"Your VoidAI API Key. Stored locally in your browser."`
    - **Action (TextField Label, Line 147):**
      - Change `label="OpenRouter API Key"`
      - To: `label="VoidAI API Key"`
2.  **General Review:**
    - Perform a project-wide search for "OpenRouter" and "openrouter.ai".
    - Review and update any other user-facing text, tooltips, comments, or links that refer to the old provider.

## IV. Documentation Update Plan

1.  **[`PRD.md`](PRD.md:1):**
    - [ ] Perform a global search and replace of "OpenRouter" with "VoidAI".
    - [ ] Perform a global search and replace of "openrouter.ai" (and any specific OpenRouter URLs) with "voidai.app" or the corresponding VoidAI URL.
    - [ ] Review all sections, especially 1 (Introduction), 2 (Goals), 4.2.5 (Model Selection Dropdown), and 5 (Non-Functional Requirements - Technology Stack) for contextual accuracy after replacements.
2.  **[`src/features/chat-stream/FRD.md`](src/features/chat-stream/FRD.md:1):**
    - [ ] Perform a global search and replace of "OpenRouter" with "VoidAI".
    - [ ] Perform a global search and replace of "OpenRouter API" with "VoidAI API".
    - [ ] Update any specific endpoint examples or descriptions (e.g., line 9, 13, 30, 31, 100, 125, 149, 166) to reflect VoidAI.
    - [ ] Review the entire document for contextual accuracy.
3.  **[`src/features/chat/FRD.md`](src/features/chat/FRD.md:1):**
    - [ ] Perform a global search and replace of "OpenRouter" with "VoidAI".
    - [ ] Review sections mentioning API provider (e.g., lines 12, 22, 36) for contextual accuracy.
4.  **[`src/features/mini-chat/FRD.md`](src/features/mini-chat/FRD.md:1):**
    - [ ] Perform a global search and replace of "OpenRouter" with "VoidAI".
    - [ ] Review section 5 (Non-Functional Specifications, e.g., line 233) for contextual accuracy.
5.  **Developer Documentation / READMEs:**
    - [ ] Review any other internal documentation, `README.md` files, or code comments that might reference OpenRouter and update them to VoidAI.

## V. Testing and Verification Plan

1.  **API Key Management:**
    - [ ] Test saving a new VoidAI API key in settings.
    - [ ] Verify the key is persisted in `localStorage` under `voidai_api_key`.
    - [ ] Verify the application loads and uses the saved VoidAI key on startup.
    - [ ] Test behavior with no API key entered (should prompt for key).
2.  **Model Fetching:**
    - [ ] Verify the model list populates correctly from the VoidAI `/v1/models` endpoint.
    - [ ] Confirm that model information (name, description, etc.) displays correctly in the model selector and model info dialog, paying close attention to the `ModelInfo` structure compatibility.
    - [ ] Test filtering models (e.g., "show free only" if applicable to VoidAI models).
3.  **Chat Functionality (Main & Mini Chat):**
    - [ ] Send a message in the main chat and verify a complete, streamed response is received from VoidAI.
    - [ ] Send a message in the mini chat and verify a complete, streamed response is received.
    - [ ] Test with various models available via VoidAI.
4.  **Streaming Control:**
    - [ ] Initiate a message generation in both main and mini chat.
    - [ ] Click the "Stop Generation" button mid-stream.
    - [ ] Verify the stream stops and the message contains content received up to that point.
5.  **Advanced Chat Actions:**
    - [ ] Test the "Retry" functionality for both user and assistant messages in the main chat. Verify VoidAI is used for the new response.
    - [ ] Test the "Generate" functionality in the main chat. Verify VoidAI is used.
6.  **Error Handling:**
    - [ ] Test with an invalid or revoked VoidAI API key. Verify a user-friendly error message is displayed.
    - [ ] Test scenarios that might cause API errors (e.g., requesting a non-existent model, network interruption if possible to simulate) and verify graceful error handling.
7.  **UI Verification:**
    - [ ] Thoroughly check all UI elements (settings panel, tooltips, any informational modals) to confirm all instances of "OpenRouter" have been replaced with "VoidAI".
    - [ ] Confirm any links to API provider documentation now point to VoidAI resources if applicable.

## VI. Out of Scope / Future Work

- **Out of Scope for this Integration:**
  - Integration of VoidAI's non-chat functionalities:
    - Image Generation
    - Audio Generation (audio output from chat completions)
    - Text to Speech (TTS)
    - Speech to Text (STT)
- **Future Work / Follow-up Actions:**
  - Create separate feature requests and/or Feature Requirements Documents (FRDs) for evaluating and potentially integrating VoidAI's Image, Audio, TTS, and STT capabilities.
  - Consider if any specific VoidAI model parameters (beyond standard OpenAI ones) should be exposed in the UI in the future.
  - Evaluate if the application needs to handle a more diverse set of model metadata if VoidAI's `/v1/models` response differs significantly but still provides useful, varied information.
