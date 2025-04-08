# Refactoring Plan: Consolidate Chat History & Settings Components

---

## Context & Goals

- Avoid code duplication between **desktop drawers** and **mobile bottom drawer tabs**.
- Have **only one source of UI** for Chat History and Chat Settings each.
- Eliminate redundant files like `ChatHistoryDrawer.tsx` and `ChatSettingsDrawer.tsx`.
- Simplify layout by **wrapping content in `<Drawer>` directly inside `src/app/page.tsx`**.
- Rename components to avoid "Drawer" or "Panel" suffixes, reflecting pure content.

---

## Step-by-step Plan

### 1. Rename Content Components

- Rename:
  - `ChatHistoryPanel.tsx` → `ChatHistoryContent.tsx`
  - `ChatSettingsPanel.tsx` → `ChatSettingsContent.tsx`
- These become the **only UI components** for each feature.
- They **accept props** but **do not contain any Drawer logic**.

---

### 2. Delete Drawer Components

- Delete:
  - `ChatHistoryDrawer.tsx`
  - `ChatSettingsDrawer.tsx`
- They are no longer needed.

---

### 3. Update Desktop Layout in `src/app/page.tsx`

- Import the renamed components:

```tsx
import ChatHistoryContent from "@/components/ChatHistoryContent";
import ChatSettingsContent from "@/components/ChatSettingsContent";
```

- Replace previous drawer components with **inline Drawer + content**:

```tsx
{
  !isMobile && (
    <>
      <Drawer
        open={isHistoryDrawerOpen}
        onClose={closeHistoryDrawer}
        anchor="left"
      >
        <ChatHistoryContent {...historyProps} />
      </Drawer>
      <Drawer
        open={isSettingsDrawerOpen}
        onClose={closeSettingsDrawer}
        anchor="right"
      >
        <ChatSettingsContent {...settingsProps} />
      </Drawer>
    </>
  );
}
```

- This way, **desktop drawers** wrap the **same content components** as mobile.

---

### 4. Mobile Unified Drawer Tabs

- Continue to embed **the same `ChatHistoryContent` and `ChatSettingsContent`** inside the bottom drawer tabs:

```tsx
<Tabs>
  <Tab label="History" />
  <Tab label="Settings" />
</Tabs>;
{
  activeTab === "history" && <ChatHistoryContent {...historyProps} />;
}
{
  activeTab === "settings" && <ChatSettingsContent {...settingsProps} />;
}
```

---

### 5. Props Management

- Lift all necessary Effector stores, events, and local UI state **up to `src/app/page.tsx`**.
- Pass them **once** to both desktop and mobile content components.
- This avoids duplication of logic/state.

---

### 6. Summary Diagram

```mermaid
graph TD
  subgraph Desktop
    Drawer1[Drawer (anchor=left)]
    Drawer2[Drawer (anchor=right)]
    Drawer1 --> ChatHistoryContent
    Drawer2 --> ChatSettingsContent
  end

  subgraph Mobile
    BottomDrawer[Bottom Drawer with Tabs]
    BottomDrawer -->|Tab: History| ChatHistoryContent
    BottomDrawer -->|Tab: Settings| ChatSettingsContent
  end
```

---

### 7. Benefits

- **Single source of UI truth** for each feature.
- No code duplication.
- Easier to maintain, style, and extend.
- Layout container logic is **centralized in page.tsx**.
- Clean, predictable architecture.

---

## Next Steps

- Rename files accordingly.
- Delete old drawer components.
- Refactor `src/app/page.tsx` to wrap content components in `<Drawer>` inline.
- Test on desktop and mobile breakpoints.
- Adjust styling as needed.

---
