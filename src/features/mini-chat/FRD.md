# Feature Requirements Document (FRD): Inline Draggable Mini Chat Assistant

---

## 1. Overview

**Purpose:** Enable a tight, contextual, in-place mini AI chat interface embedded within chat message reading UI that empowers users to rapidly _highlight message text_, invoke _assist_, through a floating ephemeral AI conversation.

Facilitate micro-dialogues _without leaving_ the reading domain, fostering multi-turn assistant reply cycles split away from the main chat, improving knowledge flow, accessibility, hypothesis clarification, or obtaining instant rephrases/explanations with minimal UI disruption.

---

## 2. Scope — Behavioral Paradigm Fit

- **Only one mini chat can be active at a time.**

- When a mini chat is _active_, any new selection of text in chat messages:

  - SHALL reopen the tiny context toolbar inline — augmenting the existing session,

  - _"Ask"_ button must **paste** the selected text into the open mini chat input (without sending), **allowing edit before manual submission**,

  - _"Explain"_ button SHALL **immediately prefix a predefined message** (`"Please explain this to me: ..."`) plus the selected snippet, **send it instantly** to the assistant, and close the toolbar,

  - Without triggering a new mini chat session or resetting the current conversation.

- This supports focused, persistent micro-exchanges, contextually upgraded quickly.

---

## 3. User Stories

- **As a chat user**, I want to highlight text inside messages so that I can invoke quick assistant actions via a floating toolbar without leaving my reading flow.

- **As a user**, I want the mini chat to accept new snippets during an ongoing session, either as editable input (_Ask_) or instant explanation requests (_Explain_).

- **As a user**, I want only one mini chat open at a time to avoid confusion or UI clutter.

---

## 4. Functional Specifications

### 4.1 Context-Based Text Selection

- Selecting text inside chat message bodies triggers a contextual toolbar positioned near the selection.

- Toolbar contains **Ask** and **Explain** buttons.

---

### 4.2 Ask Flow

- If no mini chat is open, clicking **Ask** reveals an inline input to prepare a question, which on submit opens the mini chat panel.

- If a mini chat is already open, clicking **Ask** pastes the selected text into the existing mini chat input **without submitting automatically**.

---

### 4.3 Explain Flow

- If no mini chat is open, clicking **Explain** opens the mini chat panel and immediately sends `"Please explain this to me: {selected text}"`.

- If a mini chat is already open, clicking **Explain** pastes the explanation prompt plus the selected text into the input and **immediately submits** it.

---

### 4.4 Mini Chat Panel

- Draggable floating dialog over the chat UI.

- Displays ephemeral conversation bubbles and input.

- Stores conversation only in memory, discarded on close unless expanded.

---

### 4.5 Expand to Full Chat

- Clicking **Expand** promotes the ephemeral mini chat into a saved, standalone full chat session.

- Migrates all messages, metadata, and settings.

- Closes the mini chat ephemeral panel afterward.

---

### 4.6 Closure & Lifecycle

- Closing the mini chat panel discards ephemeral data permanently.

- After closure, new selections can start a fresh mini chat flow.

---

## 5. Non-Functional Specifications

- Built with React + TypeScript within `/src/features/mini-chat/`.

- Uses Effector for state management.

- UI built with MUI components.

- Implements lightweight, responsive draggable overlay.

- Fully responsive and non-blocking for the main chat experience.

---

## 6. Acceptance Criteria

| No.  | Criteria                                                                              |
| ---- | ------------------------------------------------------------------------------------- |
| A1   | Selecting chat text shows toolbar with Ask and Explain buttons.                       |
| A2   | Clicking Ask with no mini chat open reveals input; submitting opens mini chat.        |
| A3   | Clicking Explain with no mini chat open opens mini chat and sends explanation prompt. |
| A4   | If mini chat is open:                                                                 |
| A4.1 | Clicking Ask pastes selection into input without sending.                             |
| A4.2 | Clicking Explain pastes explanation prompt + selection and immediately sends it.      |
| A5   | Mini chat dialog is draggable, minimal, and overlays chat UI.                         |
| A6   | Expanding mini chat saves conversation as a new full chat session.                    |
| A7   | Closing mini chat discards ephemeral data; no persistence unless expanded.            |

---

## 7. Constraints & Risks

- Only one ephemeral mini chat allowed at a time.

- Toolbar only activates on chat message text selection.

- Must avoid interfering with other UI elements or inputs.

- API latency or failures must be gracefully handled.

- Dragging must not interfere with chat scrolling or selection.

- Responsiveness must be maintained across devices.

---

## 8. Success Metrics / Definition of Done

- Toolbar appears within 1 second of text selection.

- No duplicate or conflicting ephemeral mini chat states occur.

- Expanded chats are reliably saved; ephemeral sessions discarded cleanly on close.

- User feedback confirms the mini chat improves understanding or speeds up workflows.

- Developers can onboard to this feature in under 10 minutes using this FRD.

---

## 9. Out of Scope (v1)

- Multiple simultaneous mini chats.

- Toolbar on non-chat UI elements.

- File attachments or rich input in mini chat.

- Saving ephemeral chats without explicit expansion.
