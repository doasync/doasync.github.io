# Project Plan: LLM Chat Interface (v1.0)

**1. Goals Recap:**

*   Build a static, responsive React/Next.js web app using TypeScript, MUI, Effector, and fetch API.
*   Interface with OpenRouter API for LLM interactions using user-provided keys (stored locally).
*   Support multiple chat histories (IndexedDB), model selection, message editing/deletion/retry, basic settings (LocalStorage), and file attachments (text/image).

**2. Core Technologies & Setup:**

*   **Framework:** Next.js (App Router likely suitable for SPA structure)
*   **Language:** TypeScript
*   **UI:** React, Material UI (MUI) v5+
*   **State Management:** Effector, effector-react
*   **Data Fetching/Caching:** Effector Effects, fetch API
*   **Local Storage:**
    *   IndexedDB (via `idb` library or similar wrapper) for chat history.
    *   LocalStorage for global settings (API Key, default temperature/system prompt).
*   **Initial Setup:**
    *   Initialize Next.js project: `npx create-next-app@latest --ts`
    *   Install dependencies: `@mui/material @emotion/react @emotion/styled @mui/icons-material effector effector-react idb`

**3. Architecture Overview:**

The application will be a client-side Single Page Application (SPA).

```mermaid
graph TD
    User --> BrowserUI[Browser UI (React/MUI)];
    BrowserUI -- Interacts --> StateMgmt[State Management (Effector)];
    BrowserUI -- Triggers Fetch --> APIInteraction[API Interaction (Effector Effects)];

    StateMgmt -- Updates --> BrowserUI;
    StateMgmt -- Reads/Writes --> LocalPersistence[Local Persistence];
    StateMgmt -- Triggers --> APIInteraction;

    APIInteraction -- Fetches Models --> OpenRouterModels[OpenRouter API /models];
    APIInteraction -- Sends Chat Request --> OpenRouterChat[OpenRouter API /chat/completions];

    LocalPersistence --> IndexedDB[(IndexedDB - Chat History)];
    LocalPersistence --> LocalStorage[(LocalStorage - Settings)];

    subgraph Client-Side Application
        BrowserUI
        StateMgmt
        APIInteraction
        LocalPersistence
    end

    subgraph External Services
        OpenRouterModels
        OpenRouterChat
    end
```

**4. Component Structure:**

```mermaid
graph TD
    App[App Root] --> Layout{Main Layout (Responsive)};
    Layout --> Header[Header Bar];
    Layout --> ChatArea[Chat Area];
    Layout --> InputArea[Message Input Area];
    Layout --> HistoryDrawer[Chat History Drawer (MUI Drawer)];
    Layout --> SettingsDrawer[Chat Settings Drawer (MUI Drawer)];
    Layout --> ErrorDisplay[Error Display (MUI Alert)];

    Header --> HistoryButton(History Icon Button);
    Header --> ModelSelector[Model Selector Dropdown];
    Header --> NewChatButton(New Chat Icon Button);
    Header --> SettingsButton(Settings Icon Button);

    ChatArea --> MessageList[Scrollable Message List];
    MessageList --> MessageItem[Message Item];
    MessageItem --> MessageActions[Message Action Icons (Copy, Edit, Delete, Retry) (Not Implemented)];

    InputArea --> TextInput(Text Input Field);
    InputArea --> AttachButton(Attach File Icon Button)  -- "(Not Implemented)";
    InputArea --> SendButton(Send Icon Button);

    HistoryDrawer --> SearchInput(Chat Search Input);
    HistoryDrawer --> ChatList[Chat List View];
    ChatList --> ChatListItem[Chat List Item (Title, Timestamp)];

    SettingsDrawer --> APIKeyInput(API Key Input);
    SettingsDrawer --> TokenCount(Token Count Display);
    SettingsDrawer --> TempSlider(Temperature Slider);
    SettingsDrawer --> SystemPromptInput(System Prompt Input);

    %% Styling / Interactions
    HistoryButton --> HistoryDrawer;
    SettingsButton --> SettingsDrawer;
    ModelSelector --> Header;
    MessageItem -- Click --> MessageActions;
    ChatListItem -- Click --> App; %% Loads chat
    SendButton --> App; %% Triggers send logic
    NewChatButton --> App; %% Triggers new chat logic
    AttachButton --> App; %% Triggers file logic
```

**5. State Management (Effector):**

*   **Stores:**
    *   `$modelsList`: Stores the array of models fetched from OpenRouter.
    *   `$currentChat`: Holds the state of the active chat (ID, title, messages array, settings).
    *   `$chatsHistory`: An array or map holding summaries (ID, title, timestamp) of all saved chats.
    *   `$globalSettings`: Holds API key, default temperature, default system prompt.
    *   `$uiState`: Holds UI-related state (e.g., drawer open/closed, loading indicators, current error).
*   **Events:**
    *   `appStarted`: Triggered on initial load.
    *   `fetchModels`: Initiates fetching the model list.
    *   `loadChat`: Loads a specific chat from history.
    *   `newChat`: Clears the current chat state for a new session.
    *   `selectModel`: User selects a model from the dropdown.
    *   `updateGlobalSetting`: User changes API key, default temp, etc.
    *   `updateChatSetting`: User changes temp/system prompt for the *current* chat.
    *   `sendMessage`: User submits a message.
    *   `editMessage`: User confirms editing a message.
    *   `deleteMessage`: User confirms deleting a message.
    *   `retryMessage`: User clicks retry on a message.
    *   `attachFile`: User selects a file.
    *   `fileRead`: File content successfully read.
    *   `showError`: An error occurred (API, file, etc.).
    *   `dismissError`: User closes the error dialog.
    *   `toggleHistoryDrawer`, `toggleSettingsDrawer`.
*   **Effects:**
    *   `loadGlobalSettingsFx`: Load settings from LocalStorage.
    *   `saveGlobalSettingsFx`: Save settings to LocalStorage.
    *   `loadChatHistoryIndexFx`: Load chat list/index from IndexedDB.
    *   `loadSpecificChatFx`: Load full message history for a selected chat from IndexedDB.
    *   `saveChatFx`: Save/update a chat (messages, title, settings) to IndexedDB.
    *   `deleteChatFx`: Delete a chat from IndexedDB.
    *   `fetchModelsFx`: Fetch model list from OpenRouter API (using Effector Effects).
    *   `sendApiRequestFx`: Send chat completion request to OpenRouter.
    *   `generateTitleFx`: Send request to OpenRouter (`google/gemma-3-27b-it`) to generate chat title.
    *   `readFileFx`: Read file content client-side.
*   **Flow Example (Sending Message):**
    ```mermaid
    graph LR
        A[User Clicks Send] --> B(sendMessage Event);
        B --> C{Format Request Data};
        C -- Uses --> D1[$currentChat Store];
        C -- Uses --> D2[$globalSettings Store];
        C --> E(sendApiRequestFx Effect);
        E -- Sends --> F[OpenRouter API];
        F -- Returns --> E;
        subgraph Effector Logic
            B; C; D1; D2; E; G; H; I; J; K; L; M;
        end
        E -- Success --> G(Update $currentChat Store - Add User/Assistant Msg);
        E -- Success --> H(Update Token Count in $currentChat);
        E -- Failure --> I(showError Event);
        G --> J(saveChatFx Effect);
        J -- Saves --> K[(IndexedDB)];
        I --> L(Update $uiState Store - Show Error);
        L --> M[Error Display (MUI Alert) Component];
    ```

**6. API Interaction (OpenRouter):**

*   **Model List:** Use Effector Effects, triggered on app load, to fetch `https://openrouter.ai/api/v1/models`. Cache the result. Store in `$modelsList`.
*   **Chat Completions:**
    *   Create `sendApiRequestFx` effect.
    *   Input: `{ messages: FormattedMessage[], apiKey: string, model: string, temperature: number, systemPrompt?: string }`.
    *   Format `messages` according to OpenRouter spec, including handling edited history and multimodal content (`content: [{ type: 'text', text: '...' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }]`).
    *   Use `fetch` API with `Authorization: Bearer ${apiKey}` header.
    *   On success: Return response data (including `usage.total_tokens`).
    *   On failure: Throw error to be caught by `.fail` or `sample`.
*   **Title Generation:**
    *   Create `generateTitleFx` effect.
    *   Input: `{ messages: FormattedMessage[], apiKey: string }`.
    *   Hardcode model to `google/gemma-3-27b-it:free`.
    *   Use a simple summarization prompt (e.g., "Summarize this conversation in 5 words or less:").
    *   Call OpenRouter API similar to `sendApiRequestFx`.
    *   Return the generated title string.

**7. Data Persistence:**

*   **IndexedDB (`idb` library):**
    *   **Store Name:** `chats`
    *   **Key:** `id` (auto-incrementing or UUID string)
    *   **Object Structure:** `{ id: string | number, title: string, createdAt: number, lastModified: number, messages: Message[], settings: { model: string, temperature: number, systemPrompt: string } }` (where `Message` includes role, content, timestamp, potentially edited flag).
    *   **Index:** Create an index on `lastModified` for sorting the history list.
    *   Implement `loadChatHistoryIndexFx`, `loadSpecificChatFx`, `saveChatFx`, `deleteChatFx` using `idb` methods (`getAll`, `get`, `put`, `delete`).
*   **LocalStorage:**
    *   **Keys:** `openrouter_api_key`, `default_temperature`, `default_system_prompt`.
    *   Implement `loadGlobalSettingsFx` and `saveGlobalSettingsFx` using `localStorage.getItem()` and `localStorage.setItem()`. Handle potential null values on load.

**8. Key Feature Implementation Notes:**

*   **Responsiveness:** Use MUI's `useMediaQuery` hook or theme breakpoints to conditionally render Drawer variants (permanent/persistent on desktop, temporary/bottom on mobile) and adjust layouts (e.g., Stack direction). Handle mobile drawer switching via header icons *and* tabs within the drawer.
*   **Message Edits/Deletes:** Update the `$currentChat.messages` array directly in the Effector store reducer. Trigger `saveChatFx`. Ensure `sendApiRequestFx` always reads the latest state from `$currentChat`.
*   **Retry:** Get the relevant message index. Slice `$currentChat.messages` up to that point (or the preceding user message for LLM retry). Trigger `sendApiRequestFx` with the sliced history. Update the specific assistant message upon success.
*   **File Attachments:** Use `<input type="file">`. Use `FileReader` API (`readAsDataURL` for images, `readAsText` for text). Check `$modelsList` for `architecture.input_modalities` of the selected model before allowing image attachment/sending. Show loading/preview state. Handle `FileReader` errors. Limit file size client-side (~20MB check).
*   **Error Handling:** User-facing errors (API, network, file) communicated via MUI Alert components. A dedicated Error Dialog component might be considered for future enhancement. Trigger `showError` event with an error object/message. An Effector `sample` or `forward` updates `$uiState.error`. A React component reads this state and displays a responsive MUI Alert when an error is present. Include a dismiss button triggering `dismissError`.

**9. Development Phasing (Suggested):**

1.  **Foundation:** Project setup, MUI theme, basic layout components (Header, ChatArea, InputArea), static display.
2.  **Settings:** Settings Drawer UI, LocalStorage persistence for API key/defaults (`load/saveGlobalSettingsFx`).
3.  **Core Chat:** Basic message sending (no API yet), display in ChatArea, Effector state for current chat.
4.  **API Integration:** `sendApiRequestFx`, connect to OpenRouter, display real responses, handle token count.
5.  **Model Selection:** Fetch models (`fetchModelsFx`), Model Selector dropdown UI, update chat settings.
6.  **History Persistence:** IndexedDB setup (`idb`), `saveChatFx`, `loadChatHistoryIndexFx`, History Drawer UI, `loadSpecificChatFx`.
7.  **Message Actions:** Implement Edit, Delete, Retry logic in Effector and UI.
8.  **File Attachments:** File input, `readFileFx`, base64 encoding, multimodal check, update API request format.
9.  **Advanced Features:** Auto title generation (`generateTitleFx`) - Partially implemented, might have issues, responsiveness polish and basic error display (MUI Alert).
10. **Testing & Refinement:** Unit/integration tests (using Effector's scope for isolation), UI testing, bug fixing.

---