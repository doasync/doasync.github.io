# Phase 9: Effector Model Refactoring Plan

**Goal:** Refactor the existing Effector models from `src/model/*` into a feature-based directory structure under `src/features/` to improve code organization, maintainability, and scalability.

**Proposed Target Structure:**

```mermaid
graph TD
    subgraph src
        features[features]
        components[components]
        app[app]
        %% shared[shared] %% Optional, create if needed
    end

    subgraph features
        chat[chat]
        chat_history[chat-history]
        chat_settings[chat-settings]
        models_select[models-select]
        ui_state[ui-state]
    end

    chat --> chat_model(model.ts)
    chat --> chat_index(index.ts)
    chat_history --> history_model(model.ts)
    chat_history --> history_index(index.ts)
    chat_settings --> settings_model(model.ts)
    chat_settings --> settings_index(index.ts)
    models_select --> models_model(model.ts)
    models_select --> models_index(index.ts)
    ui_state --> ui_model(model.ts)
    ui_state --> ui_index(index.ts)

    app --> page(page.tsx)
    components --> Comp1(...)
    components --> Comp2(...)

    page --> chat_index
    page --> history_index
    page --> settings_index
    page --> models_index
    page --> ui_index

    Comp1 --> chat_index %% Example component dependency
    Comp2 --> history_index %% Example component dependency

    %% Optional cross-feature dependencies (illustrative)
    %% chat_model --> history_index %% e.g., chat triggers history save
```

**Refactoring Steps:**

1.  **Create Directory Structure:** Create `src/features/` and subdirectories: `chat/`, `chat-history/`, `chat-settings/`, `models-select/`, `ui-state/`.
2.  **Move Model Logic:** Move content from `src/model/*.ts` to the corresponding `src/features/*/model.ts` file.
3.  **Create `index.ts` Exports:** Create `index.ts` in each feature directory, exporting only the necessary public Effector units.
4.  **Update Imports:** Update all imports across the project (`src/app/page.tsx`, `src/components/*`, and within feature models) to use the new feature paths (e.g., `@/features/chat`).
5.  **Remove Old `src/model` Directory:** Delete the `src/model/` directory.
6.  **Verification (Manual):** Basic functional testing.

**Next Steps (Post-Phase 9):**

- **Phase 10:** Advanced Features (Responsiveness Polish, Error Display Improvements)
- **Phase 11:** Testing & Refinement
