# Mini-Chat Feature Implementation Plan

## Overview

Implement floating mini-chat assistant triggered by text selection in main chat messages. Provides Ask/Explain functionality in a draggable dialog.

## Core Requirements

1. Text selection toolbar with Ask/Explain buttons
2. Minimalist input-first flow for Ask
3. Immediate explanation dialog for Explain
4. Draggable dialog using react-draggable
5. Temporary session storage
6. Expand to full chat functionality

## State Management Changes

### New State Structure

```typescript
interface MiniChatState {
  messages: MiniChatMessage[];
  isOpen: boolean;
  isInputVisible: boolean;
  showOnlyInput: boolean;
  initialPrompt: string | null;
  position: { x: number; y: number };
}
```

### Key Events

```typescript
// Updated events
miniChatOpened(payload: {
  showOnlyInput?: boolean;
  initialPrompt?: string;
  position?: { x: number; y: number };
});

// New events
miniChatInputSubmitted();
```

## Component Modifications

### MiniChatDialog.tsx

1. Add conditional rendering:

```tsx
{
  showOnlyInput ? (
    <InputOnlyView position={position} />
  ) : (
    <FullDialogView messages={messages} />
  );
}
```

2. Enhanced draggable behavior:

```tsx
<Draggable
  bounds="parent"
  handle=".drag-handle"
  position={position}
  onStop={(e, data) => updatePosition(data)}
>
```

## Integration Points

### MessageItem.tsx

Add text selection handler:

```typescript
const handleSelection = () => {
  const selection = window.getSelection();
  if (selection?.toString().trim()) {
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    showMiniChatToolbar({
      selectedText: selection.toString(),
      position: { top: rect.bottom, left: rect.left },
    });
  }
};
```

## Testing Plan

1. State transitions:

```typescript
test("Ask flow transitions correctly", () => {
  miniChatOpened({ showOnlyInput: true });
  expect($miniChat.getState()).toMatchObject({
    showOnlyInput: true,
    isInputVisible: true,
  });

  miniChatMessageSent("Test message");
  expect($miniChat.getState()).toMatchObject({
    showOnlyInput: false,
    messages: [{ content: "Test message" }],
  });
});
```

## Implementation Phases

1. **Phase 1**: State management updates

   - Add new state fields
   - Update event payloads
   - Modify effects

2. **Phase 2**: Component updates

   - Dialog conditional rendering
   - Toolbar positioning
   - Input-first flow

3. **Phase 3**: Integration
   - Text selection handling
   - Model selection
   - Session management
