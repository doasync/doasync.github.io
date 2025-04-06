Okay, here's the extracted information from the provided Effector and OpenRouter documentation, tailored for building the specified chatbot interface:

**I. OpenRouter API Interaction**

1.  **Chat Completions Endpoint:**
    *   **URL:** `https://openrouter.ai/api/v1/chat/completions`
    *   **Method:** `POST`
    *   **Authentication:** `Authorization: Bearer <YOUR_OPENROUTER_API_KEY>` header. The API key needs to be stored (e.g., in LocalStorage) and retrieved for each request.
    *   **Content-Type:** `application/json`
    *   **Request Body Structure:**
        ```json
        {
          "model": "model_id_string", // e.g., "openai/gpt-4o", "google/gemma-3-27b-it"
          "messages": [
            // System Prompt (Optional but recommended)
            { "role": "system", "content": "Your system prompt text..." },
            // Chat History
            { "role": "user", "content": "User message 1" },
            { "role": "assistant", "content": "Model response 1" },
            { "role": "user", "content": "User message 2" }
            // ... potentially include image data if model supports it
          ],
          // Optional Parameters (relevant from PRD)
          "temperature": 0.7 // Number between 0.0 and 2.0
          // "stream": true // If implementing streaming later
        }
        ```
    *   **Image Input (Multimodal):** If attaching images, include them within the `content` array of a *user* message:
        ```json
         {
           "role": "user",
           "content": [
             { "type": "text", "text": "What's in this image?" },
             {
               "type": "image_url",
               "image_url": {
                 // Use data URL for base64 encoded images
                 "url": "data:image/png;base64,iVBORw0KGgo..."
               }
             }
           ]
         }
        ```
    *   **Response Body Structure (Non-streaming):**
        ```json
        {
          "id": "string", // Generation ID
          "model": "string", // Model used
          "choices": [
            {
              "finish_reason": "string", // e.g., "stop", "length"
              "message": {
                "role": "assistant",
                "content": "The model's response text..."
              }
            }
          ],
          "usage": {
            "prompt_tokens": number,
            "completion_tokens": number,
            "total_tokens": number // Use this for token count display
          }
        }
        ```
    *   **Optional Headers:** `HTTP-Referer` and `X-Title` can be sent to identify your app on OpenRouter leaderboards (less critical for core functionality).

2.  **Models Listing Endpoint:**
    *   **URL:** `https://openrouter.ai/api/v1/models`
    *   **Method:** `GET`
    *   **Purpose:** Fetch the list of available models to populate the dropdown.
    *   **Response Body Structure:** An object with a `data` array. Each object in the array represents a model:
        ```json
         {
           "id": "string", // Model ID (e.g., "openai/gpt-4o") - USE THIS
           "name": "string", // Display name (e.g., "OpenAI: GPT-4o") - USE THIS
           "description": "string",
           "context_length": number,
           "architecture": {
             "modality": "string", // e.g., "text->text", "text+image->text"
             "input_modalities": ["text", "image"], // Check this array for image support
             "output_modalities": ["text"]
           },
           "pricing": { ... } // Relevant if displaying costs, otherwise ignore
           // ... other fields
         }
        ```
    *   **Free Models:** Models with IDs ending in `:free` (like `google/gemma-3-27b-it:free`) have specific rate limits (200 requests/day total) but are free to use.

3.  **Error Handling:**
    *   Expect standard HTTP error codes. Key ones include:
        *   `401 Unauthorized`: Invalid or missing API key.
        *   `402 Payment Required`: OpenRouter account issues (unlikely if using own key correctly, but possible if key has limits).
        *   `429 Too Many Requests`: Rate limit exceeded (either OpenRouter's or the underlying provider's).
        *   `5xx`: Server-side errors or provider issues.
    *   Error responses have a JSON body: `{ "error": { "code": number, "message": string } }`.

4.  **Token Counting:** Use the `usage.total_tokens` field from the chat completion response. Sum these values for the current chat session display. Effector doesn't need to estimate tokens client-side.

5.  **Streaming:** Possible by setting `stream: true` in the request. Responses use Server-Sent Events (SSE). Requires different handling logic compared to standard fetch.

**II. Effector for State Management and Logic**

1.  **Core Units:**
    *   **`createEvent<PayloadType>()`:** Defines triggers/actions. Examples:
        *   `sendMessage = createEvent<string>()` // User sends a message text
        *   `messageEdited = createEvent<{ index: number; newText: string }>()`
        *   `messageDeleted = createEvent<number>()` // Index of message to delete
        *   `messageRetry = createEvent<number>()` // Index of user message to retry
        *   `modelSelected = createEvent<string>()` // Model ID
        *   `apiKeyChanged = createEvent<string>()`
        *   `temperatureChanged = createEvent<number>()`
        *   `systemPromptChanged = createEvent<string>()`
        *   `chatHistoryOpened = createEvent()`
        *   `chatSettingsOpened = createEvent()`
        *   `newChatClicked = createEvent()`
        *   `fileAttached = createEvent<{ name: string; content: string; type: 'text' | 'image' }>()` // Client-side content
        *   `chatTitleGenerated = createEvent<{ chatId: string; title: string }>()`
        *   `chatTitleEdited = createEvent<{ chatId: string; newTitle: string }>()`
    *   **`createStore<StateType>(initialState)`:** Holds state. Examples:
        *   `$messages = createStore<Message[]>([]).on(...)`
        *   `$currentChatId = createStore<string | null>(null).on(...)`
        *   `$chatHistory = createStore<Record<string, ChatSession>>({}).on(...)` // Map chat ID to session data (messages, title, settings)
        *   `$selectedModel = createStore<string>('default-model-id').on(...)`
        *   `$availableModels = createStore<ModelInfo[]>([]).on(...)`
        *   `$apiKey = createStore<string>('').on(...)` // Load initial from LocalStorage
        *   `$temperature = createStore<number>(0.7).on(...)`
        *   `$systemPrompt = createStore<string>('').on(...)`
        *   `$isHistoryDrawerOpen = createStore(false).on(...)`
        *   `$isSettingsDrawerOpen = createStore(false).on(...)`
        *   `$chatInputText = createStore('').on(...)`
        *   `$attachedFile = createStore<FileInfo | null>(null).on(...)`
        *   `$isGenerating = createStore(false).on(...)` // For loading indicators
        *   `$currentChatTokens = createStore(0).on(...)`
        *   `$error = createStore<string | null>(null).reset(...)` // For displaying alerts
    *   **`createEffect<Params, Done, Fail>(handler)`:** Wraps async functions (API calls). Examples:
        *   `fetchModelsFx = createEffect(async () => { /* Fetch /v1/models */ })`
        *   `sendMessageFx = createEffect(async (params: { model: string; messages: Message[]; apiKey: string; temperature: number }) => { /* POST /v1/chat/completions */ })`
        *   `generateChatTitleFx = createEffect(async (params: { messages: Message[]; apiKey: string }) => { /* POST /v1/chat/completions with summarization prompt */ })`

2.  **Connecting Units (`sample`):** The primary way to define logic flow declaratively.
    *   **Triggering Effects:**
        ```ts
        // When sendMessage is triggered, get necessary state and call the effect
        sample({
          clock: sendMessage, // User submits input
          source: { // Data needed for the API call
            model: $selectedModel,
            history: $currentChatMessages, // Need a store for messages of the *current* chat
            apiKey: $apiKey,
            temp: $temperature,
            system: $systemPrompt,
            attached: $attachedFile
          },
          fn: ({ model, history, apiKey, temp, system, attached }, userInputText) => {
            // Construct the full messages array for the API
            const messages = [];
            if (system) messages.push({ role: 'system', content: system });
            messages.push(...history);
            // Add current user input, potentially with image data
            const currentUserMessageContent = [];
            currentUserMessageContent.push({ type: 'text', text: userInputText });
            if (attached?.type === 'image') {
                currentUserMessageContent.push({ type: 'image_url', image_url: { url: attached.content } });
            }
            messages.push({ role: 'user', content: currentUserMessageContent });

            return { model, messages, apiKey, temperature: temp };
          },
          target: sendMessageFx,
        });
        ```
    *   **Updating Stores from Effects:**
        ```ts
        // Add user message immediately
        $currentChatMessages.on(sendMessage, (history, userInput) => [...history, { role: 'user', content: userInput }]); // Simplified, needs image handling
        $chatInputText.reset(sendMessage); // Clear input field
        $attachedFile.reset(sendMessage); // Clear attached file

        // Show loading state
        $isGenerating.on(sendMessageFx, () => true).reset(sendMessageFx.finally);

        // Add model response on success
        $currentChatMessages.on(sendMessageFx.doneData, (history, response) => [
          ...history,
          { role: 'assistant', content: response.choices[0].message.content }
        ]);

        // Update token count
        $currentChatTokens.on(sendMessageFx.doneData, (current, response) => current + response.usage.total_tokens);

        // Handle API errors
        $error.on(sendMessageFx.failData, (_, error) => `API Error: ${error.message}`);
        ```
    *   **Updating Stores from Events:**
        ```ts
        $apiKey.on(apiKeyChanged, (_, newKey) => newKey);
        // Persist API key to LocalStorage (can be done via a watch or a dedicated effect)
        $apiKey.watch(key => localStorage.setItem('apiKey', key));
        ```
    *   **Conditional Logic (`filter`):**
        ```ts
        sample({
          clock: someTrigger,
          source: $someStore,
          filter: $someBooleanStore, // Only proceed if this store is true
          // OR
          // filter: (sourceData, clockData) => sourceData > 10, // Only proceed if condition met
          target: someTargetUnit,
        });
        ```

3.  **Specialized Effects (`attach`):** Useful for pre-binding data to effects.
    ```ts
    // Create an effect that always uses the current API key
    const authorizedSendMessageFx = attach({
        effect: sendMessageFx, // The base effect doing the fetch
        source: $apiKey,       // The store providing the key
        mapParams: (params: /* original params */, apiKey) => ({ // Function to merge params
            ...params, // Pass through model, messages, etc.
            apiKey: apiKey // Add the key from the source store
        })
    });

    // Now sample can target authorizedSendMessageFx without explicitly passing the key
    sample({
        clock: sendMessage,
        source: { model: $selectedModel, history: $currentChatMessages, /* ... other needed state */ },
        fn: (sourceData, clockData) => { /* Prepare API params *without* apiKey */ },
        target: authorizedSendMessageFx // Use the attached effect
    });
    ```

4.  **Derived State (`map`, `combine`):**
    *   `$isApiKeySet = $apiKey.map(key => key.length > 0);`
    *   `$chatSettings = combine({ temp: $temperature, sysPrompt: $systemPrompt });`

5.  **Handling Asynchronicity:**
    *   `effect.pending`: A store (`Store<boolean>`) indicating if the effect is running. Use this for loading spinners/disabling buttons.
    *   `effect.doneData`: An event triggered with the successful result.
    *   `effect.failData`: An event triggered with the error object on failure.
    *   `effect.finally`: An event triggered when the effect finishes (either success or failure). Useful for resetting loading states.

6.  **Scope & SSR (Context for Client-Side):**
    *   While the app is static, `effector-react` hooks (`useUnit`) rely on the concept of `Scope` implicitly.
    *   `fork()`: Creates an isolated state instance (mainly for SSR/testing). Not directly used in the client-side runtime logic described.
    *   `serialize()`/`hydrate()`: For transferring state between server/client (not needed here).
    *   `allSettled()`: Waits for effects in a scope to finish (mainly for SSR/testing).
    *   `scopeBind()`: Ensures callbacks (like `setTimeout`) run in the correct scope (might be needed if using such callbacks with Effector units, but often `useUnit` handles this).

**III. Effector-React Integration**

1.  **`useUnit` Hook:** *The primary hook.*
    *   **Reading Stores:** `const count = useUnit($counter);` - Subscribes the component and returns the current store value.
    *   **Getting Event/Effect Triggers:** `const handleClick = useUnit(buttonClicked);` - Returns a function that, when called, triggers the event/effect *bound to the correct scope*. This is why it's preferred over calling the unit directly in event handlers.
    *   **Multiple Units:**
        ```jsx
        // Object form
        const { count, isGenerating, onSend } = useUnit({
            count: $counter,
            isGenerating: $isGenerating,
            onSend: sendMessage // Event
        });

        // Array form
        const [count, isGenerating, onSend] = useUnit([
            $counter,
            $isGenerating,
            sendMessage // Event
        ]);
        ```
        Using the shape forms (`{}` or `[]`) optimizes updates by batching store subscriptions.

2.  **`useList` Hook:** Optimized for rendering lists from a store containing an array.
    ```jsx
    const messageList = useList($messages, (message, index) => (
      <ChatMessage key={message.id || index} message={message} />
    ));
    // Renders each message, memoizing items. `key` is handled internally based on index by default.
    ```
    Can accept a config object `{ store, keys, fn, getKey }` for more complex scenarios (dependencies, custom keys).

3.  **`useStoreMap` Hook:** Selectively subscribe to derived data from a store. Useful if a component only needs a small part of a large store.
    ```jsx
    const userName = useStoreMap({
      store: $userProfileStore,
      keys: [], // No external dependencies needed for this selector
      fn: (profile) => profile.name,
    });
    ```

4.  **`<Provider value={scope}>`:** Component used to provide a specific `Scope` to a subtree. While essential for SSR/testing, in a purely client-side static app, you might not explicitly use it if you're relying on the default global scope that Effector manages. `useUnit` still works correctly in this default scope.

**IV. TypeScript**

*   Effector units are strongly typed: `EventCallable<Payload>`, `StoreWritable<State>`, `Effect<Params, Done, Fail>`.
*   Type inference works well, especially with `sample`.
*   Use utility types like `StoreValue<typeof $store>` if needed to extract types.
*   Pay attention to `null` or `undefined` states, especially when using `filter` or `mapParams`. Type guards (`(x): x is Type => ...`) are useful in `filter`.

This extraction covers the core APIs and concepts from the provided docs relevant to building the specified chatbot application.Okay, here is the extracted information from the Effector and OpenRouter documentation relevant to your project:

**I. OpenRouter API Interaction (for Effector Effects)**

1.  **Chat Completions (`POST /api/v1/chat/completions`)**
    *   **Purpose:** Send chat history and get the next message from the LLM.
    *   **Authentication:** Requires `Authorization: Bearer <YOUR_API_KEY>` header.
    *   **Request Body:** JSON object containing:
        *   `model` (string): The ID of the model to use (e.g., `"openai/gpt-4o"`, `"google/gemma-3-27b-it:free"`).
        *   `messages` (array): An array of message objects `{ role: "user" | "assistant" | "system", content: string | ContentPart[] }`.
            *   Include system prompt first if used: `{ role: "system", content: "..." }`.
            *   Alternate user/assistant messages for history.
            *   For image input, use `content: [{ type: "text", text: "..." }, { type: "image_url", image_url: { url: "data:image/png;base64,..." } }]` in a *user* message.
        *   `temperature` (number, optional): Controls randomness (0.0-2.0).
        *   `stream` (boolean, optional): Set to `true` for streaming responses (requires different handling).
    *   **Response Body (non-streaming):** JSON object containing:
        *   `id` (string): Unique ID for the generation.
        *   `choices[0].message.content` (string): The generated text response.
        *   `usage.total_tokens` (number): **Use this** for tracking token count per request/response cycle.

2.  **Model Listing (`GET /api/v1/models`)**
    *   **Purpose:** Get a list of available models for the selection dropdown.
    *   **Authentication:** None required.
    *   **Response Body:** JSON object with `data` (array). Each item contains:
        *   `id` (string): **Use this** as the value for model selection.
        *   `name` (string): **Use this** for display in the dropdown.
        *   `architecture.input_modalities` (string[]): Array containing `"text"`, `"image"`, etc. **Check this** to see if a model supports image input.

3.  **Error Handling:**
    *   Expect standard HTTP status codes (401, 402, 429, 5xx).
    *   Error responses contain `{ error: { code: number, message: string } }`.

**II. Effector Core Concepts (for State and Logic)**

1.  **`createStore<StateType>(initialValue, { sid?, serialize? })`**
    *   Creates a state container. Use `$` prefix convention (e.g., `$messages`).
    *   Holds the application state (chat history, API key, settings, UI state like drawer open/closed).
    *   `initialValue`: The default state.
    *   `.on(unit, (state, payload) => newState)`: Updates the store when `unit` triggers. Must return a *new* state value (immutability).
    *   `.reset(unit)`: Resets the store to its `initialValue` when `unit` triggers.
    *   `.map(fn)`: Creates a derived, read-only store.
    *   `.getState()`: Gets the current value (mainly for debugging or specific integrations, avoid in typical reactive logic).
    *   `{ serialize: 'ignore' }`: Prevents store from being serialized (useful for server-side rendering, less critical here but good for sensitive data like API key if persistence was server-based).

2.  **`createEvent<PayloadType>(name?)`**
    *   Creates a trigger/action. Represents intentions or happenings (e.g., `buttonClicked`, `messageSent`, `apiKeyChanged`).
    *   Called like a function: `eventName(payload)`. Payload type must match `<PayloadType>`. If `<void>`, call with no arguments.
    *   Can be used as `clock` or `target` in `sample`.
    *   `.watch(fn)`: Subscribe for side effects/logging (use primarily for debugging).
    *   `.prepend(fn)`: Creates a *new callable* event that transforms its payload before triggering the original event.

3.  **`createEffect<Params, Done, Fail>(handler | { handler, name? })`**
    *   Wraps asynchronous functions or functions that can throw (like API calls). Use `Fx` suffix convention (e.g., `sendMessageFx`).
    *   `handler`: The async function to execute. Receives `Params`. Must return `Done` on success or throw `Fail` on error.
    *   `.use(handler)`: Set/change the handler function after creation.
    *   Properties for tracking state:
        *   `.pending`: Store (`Store<boolean>`), true while the effect is running. Use for loading states.
        *   `.done`: Event (`Event<{ params: Params, result: Done }>`), triggers on success.
        *   `.doneData`: Event (`Event<Done>`), triggers with only the success result.
        *   `.fail`: Event (`Event<{ params: Params, error: Fail }>`), triggers on failure.
        *   `.failData`: Event (`Event<Fail>`), triggers with only the error.
        *   `.finally`: Event (`Event<{ status: 'done' | 'fail', ... }>`), triggers on completion (success or fail). Useful for resetting `.pending`.

4.  **`sample({ clock?, source?, filter?, fn?, target?, batch? })`**
    *   **Core mechanism for connecting units.** Defines reactive data flow.
    *   `clock`: (Unit | Unit[]) The trigger. When `clock` fires, `sample` runs. If omitted, `source` acts as the clock (triggers on source update).
    *   `source`: (Unit | StoreShape) The data source(s). Value(s) read when `clock` fires. If omitted, `clock`'s payload is used as the source data. Can be a single store/event/effect, or an object/array of stores (`{ key: $store }` or `[$storeA, $storeB]`).
    *   `filter`: (Store<boolean> | (sourceData, clockData) => boolean) Optional condition. If `false`, the flow stops. Use type guards `(data): data is Type => ...` for type narrowing.
    *   `fn`: ((sourceData, clockData) => result) Optional pure function to transform data before passing to `target`.
    *   `target`: (UnitTargetable | UnitTargetable[]) The destination unit(s) (event, effect, writable store). Receives data processed by `filter` and `fn`.
    *   `batch`: (boolean, default `true`) Controls update batching (rarely need `false`). Replaces deprecated `greedy`.
    *   **Return Value:** If `target` is provided, returns `target`. If `target` is omitted, creates and returns a *new* unit (usually an event, but a store if `clock` and `source` are both stores and `filter` is omitted).

5.  **`attach({ effect, source?, mapParams? })`**
    *   Creates a *new effect* derived from another.
    *   `effect`: The original effect to wrap.
    *   `source`: (Store | StoreShape) Store(s) whose values will be available.
    *   `mapParams`: `(params, sourceData) => originalEffectParams`. Function to transform the *new* effect's params and data from `source` into the params expected by the *original* `effect`.
    *   **Use Case:** Pre-binding context (like API key from `$apiKey`) to an effect. The new attached effect can be called with simplified parameters.
    *   Also supports `attach({ source, async effect(sourceData, params) })` to define the handler inline with access to source data.

6.  **`combine(...stores | [stores] | {stores}, fn?)`**
    *   Creates a derived store based on multiple source stores.
    *   If `fn` is provided, it combines source values into a new state: `(s1, s2, ...) => result` or `([s1, s2], ...) => result` or `({k1, k2}, ...) => result`.
    *   If `fn` is omitted (object/array form only), creates a store holding an object or array of the source store values: `combine([$a, $b])` -> `Store<[A, B]>`, `combine({ a: $a, b: $b })` -> `Store<{ a: A, b: B }>`.

7.  **`split({ source, match, cases })`**
    *   Routes data from `source` to different `cases` based on `match`.
    *   `match`: Can be a store holding a string key, a function returning a string key, or an object mapping keys to boolean stores/functions.
    *   `cases`: An object where keys match the possible outcomes of `match`, and values are the target units (or arrays of units). Use `__` (double underscore) for the default case.

8.  **Scope (`fork`, `allSettled`, `scopeBind`, `serialize`, `hydrate`)**
    *   `fork()`: Creates an isolated state instance. **Crucial for SSR and testing, but less so for static client-side app runtime.**
    *   `allSettled(unit, { scope, params })`: Runs a unit within a scope and waits for effects. **Primarily for SSR/testing.**
    *   `scopeBind(unit, { scope?, safe? })`: Binds a unit or callback to a scope for later execution (e.g., in `setTimeout`). **Needed if manually handling callbacks outside Effector AND using scopes.** `effector-react`'s `useUnit` often makes this unnecessary in components.
    *   `serialize`/`hydrate`: **For SSR state transfer only.** Not applicable for client-side persistence (use browser storage APIs directly, triggered via Effector events/effects/watch).

9.  **`is` Namespace (`is.store`, `is.event`, `is.effect`, `is.attached`, etc.)**
    *   Type guards to check the type of an Effector unit. Useful for utility functions or complex conditional logic. `is.attached(fx)` checks if an effect was created using `attach`.

**III. Effector React Integration**

1.  **`useUnit` Hook:**
    *   **Primary Hook:** Use this to connect components to Effector units.
    *   `const value = useUnit($store)`: Subscribes to `$store` and returns its value.
    *   `const trigger = useUnit(eventOrEffect)`: Returns a stable function reference that triggers the unit *within the correct scope*. **Use this returned function in event handlers (e.g., `onClick={trigger}`), not the original unit.**
    *   `const { val, trigger } = useUnit({ val: $store, trigger: event })`: Object form, batches subscriptions.
    *   `const [val, trigger] = useUnit([$store, event])`: Array form, batches subscriptions.

2.  **`useList(store, (item, index) => <Component />)` Hook:**
    *   Efficiently renders lists from a store containing an array (e.g., `$messages`).
    *   Memoizes list items. Handles keys internally (usually by index).
    *   Configurable via `{ store, keys?, fn, getKey?, placeholder? }` for dependencies, custom keys, etc.

3.  **`useStoreMap({ store, keys, fn, defaultValue? })` Hook:**
    *   Selectively subscribes to a computed value derived from a store.
    *   `fn(state, keys)`: The selector function.
    *   Component only re-renders if the *result* of `fn` changes.
    *   Useful for performance when components only need part of a large store.

4.  **Gate API (`createGate`, `useGate`)**
    *   A way to bridge React component props/lifecycle with Effector units.
    *   `const MyGate = createGate()`
    *   In component: `useGate(MyGate, { propValue: props.value })` - passes props to `MyGate.state`.
    *   `MyGate.open` (event): Fires on mount.
    *   `MyGate.close` (event): Fires on unmount.
    *   `MyGate.state` (store): Holds the latest props passed via `useGate`.
    *   `MyGate.status` (store): `Store<boolean>` indicating if mounted.
    *   **Use Case:** Triggering effects or setting initial state based on component mount/props (e.g., fetching data based on a route parameter passed as a prop). Less common for purely internal state management.

5.  **`<Provider value={scope}>` Component:**
    *   Provides a specific `Scope` to the React component tree below it.
    *   Hooks like `useUnit` will use the scope provided by the nearest `Provider` ancestor.
    *   **Essential for SSR/Testing.** For a static client-side app, you might implicitly use Effector's default global scope without needing an explicit `<Provider>`.

**IV. TypeScript Notes**

*   Units have specific types: `EventCallable<P>`, `StoreWritable<S>`, `Store<S>`, `Effect<Params, Done, Fail>`.
*   Type inference generally works well with `sample`, `attach`, etc.
*   Utility types (`StoreValue`, `EventPayload`, `EffectParams`, etc.) help extract types from units.
*   Use type guards in `sample({ filter: (data): data is Type => ... })` for type narrowing.
*   Explicitly type arguments in `.prepend( (arg: Type) => ... )` and `createApi` reducers `(state, arg: Type) => ...`.
