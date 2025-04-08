# Model Selection Improvements Plan

## Goals

1. **Remove provider prefix** from the selected model display in the header (e.g., show "Llama 4 Scout (free)" instead of "Meta: Llama 4 Scout (free)").
2. **Add a toggle switch** in Settings to filter the dropdown list to only free models, determined by `pricing.prompt === "0"` and `pricing.completion === "0"`.

---

## Technical Breakdown

### 1. Extend ModelInfo Type

- Update `src/features/models-select/model.ts`:
  - Extend `ModelInfo` interface to include:
    ```ts
    pricing?: {
      prompt: string;
      completion: string;
      [key: string]: string;
    };
    ```
- The fetch handler already returns the full API response, so pricing info is available.

---

### 2. Effector State

- Create a new store `$showFreeOnly: Store<boolean>` with default `false`.
- Persist `$showFreeOnly` in LocalStorage (similar to API key, temperature).
- Load saved value on app start.

---

### 3. Filtering Logic

- In `ModelSelector.tsx`, update `filteredModels`:
  - If `$showFreeOnly` is true, filter models where:
    ```ts
    model.pricing?.prompt === "0" && model.pricing?.completion === "0";
    ```
  - Then apply search term filter as currently implemented.

---

### 4. Selected Model Display

- In `ModelSelector.tsx`, update `selectedModelName`:
  - Strip provider prefix using regex:
    ```ts
    model.name.replace(/^[^:]+:\s*/, "");
    ```
  - If no colon, leave as is.
  - Fallback to `selectedModelId` if model not found.

---

### 5. UI Changes

#### Settings Drawer (`ChatSettingsContent.tsx`)

- Add a new section with:
  - MUI `FormControlLabel`
  - MUI `Switch`
  - Label: **"Show only free models"**
- Connect switch to `$showFreeOnly` store.

#### Model Selector (`ModelSelector.tsx`)

- Use updated `filteredModels` for dropdown list.
- Display cleaned `selectedModelName` in header button.

---

## Data Flow Diagram

```mermaid
flowchart TD
    subgraph Effector Stores
        modelsList[$modelsList (all models)]
        showFreeOnly[$showFreeOnly (bool)]
        filteredModels[$filteredModels (derived)]
        selectedModelId[$selectedModelId (string)]
        selectedModelName[$selectedModelName (derived)]
    end

    modelsList --> filteredModels
    showFreeOnly --> filteredModels
    filteredModels --> ModelSelector
    selectedModelId --> selectedModelName
    modelsList --> selectedModelName

    subgraph UI Components
        ModelSelector
        SettingsPanel
    end

    filteredModels --> ModelSelector
    selectedModelName --> ModelSelector
    showFreeOnly <--> SettingsPanel
```

---

## Summary

- Extend model typing to include pricing info.
- Add `$showFreeOnly` store, persisted in LocalStorage.
- Filter dropdown list based on toggle and search term.
- Clean up selected model name display.
- Add toggle switch UI in Settings drawer.

---

## Next Step

Switch to **Code Mode** to implement this plan.
