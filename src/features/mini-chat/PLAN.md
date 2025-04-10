# Implementation Plan: Inline Mini Chat Assistant with Draggable Dialog

---

### 1. Objectives Summary

Deliver an inline, contextual AI mini-chat with draggable panel, invoked seamlessly during message reading, supporting rapid ephemeral queries without disrupting the main chat session, bound strictly to **only one ephemeral mini chat active at any time**.

---

### 2. System Architecture Outline

**Core components:**

- **MiniChatToolbar**  
  Contextual overlay on text selection inside chat messages, offering _Ask_ & _Explain_ actions.

- **Effector state modules:**

  - `$miniChatToolbar` for toolbar visibility and positions
  - `$miniChat` for current ephemeral mini chat data (singleton global).
  - Events/effects: open, update input, send, receive, close, expand.

- **MiniChatDialog**  
  Draggable ephemeral chat UI reusing `$miniChat` store state, with input, bubbles, expand/discard flows.

- **API Layer:**  
  Async calls to assistant LLM via REST endpoint (OpenRouter or similar).

- **Optional:** Settings integration for lightweight assistant model choice.

---

### 3. Technology Stack

- **React** (Next.js)
- **Effector** (state management, event-driven)
- **TypeScript** (typed safety)
- **Material UI (MUI)** for UI components
- **`react-draggable`** (or custom hooks) for movable dialogs
- **IndexedDB** via existing chat-history models for expanded chat saves
- **Fetch API** for backend LLM calls
- **Testing:** Vitest / Jest, React Testing Library, Effector unit tests

---

### 4. Development Roadmap: Phased Tasks

---

#### Phase 1 – Infrastructure Setup (~2 days)

- [ ] **Design precise Effector contracts:**  
      Events/stores mirroring updated singleton ephemeral behavior.  
      Add event: `updateMiniChatInput(draft: string)`  
      Modify `miniChatOpened`, `miniChatClosed`, existing as needed.

- [ ] **Prepare mocks of API layer** for offline development/testing.

- [ ] Create minimal **MiniChatDialog** scaffold with draggable UX and dummy input.

---

#### Phase 2 – Text Selection + Toolbar (~2 days)

- [ ] Implement text selection detection ONLY inside chat message bodies (use event listeners + bounding rect).
- [ ] On selection, show `MiniChatToolbar` positioned beneath selection.
- [ ] Style toolbar with MUI Paper + buttons.
- [ ] Wire toolbar to emit `showMiniChatToolbar` with selected text and position.
- [ ] Handle toolbar close on deselect/click away.

---

#### Phase 3 – Core Chat Open/Insert Logic (~3 days)

- [ ] Implement `Ask` button:
  - If **no mini chat open,** open input inline with prefilled selected text (no send).
  - If **mini chat open,** paste selection into existing chat's input (via `updateMiniChatInput`).
- [ ] Implement `Explain` button:

  - If mini chat **not open**, open AND auto-send `"Please explain this to me: {selection}"`.
  - If open, insert & auto-send this phrased message to current mini chat directly.

- [ ] Ensure toolbar closes on any Ask/Explain use.

---

#### Phase 4 – Chat UI + LLM Calls (~3 days)

- [ ] Expand **MiniChatDialog**:

  - Display ephemeral chat bubbles, minimal styling.
  - Textarea input, Send button; submit triggers API call.
  - Show loader state during fetch.

- [ ] Implement effect chain from send → fetch → display assistant reply.

- [ ] Implement draggable behavior robustly (use existing hook or wrap with `react-draggable`).

---

#### Phase 5 – Expand to Full Chat (~2 days)

- [ ] Add Expand button to mini chat header.
- [ ] Expand triggers create new saved chat entry with current mini chat messages.
- [ ] Reset ephemeral mini chat state post-expansion.

---

#### Phase 6 – Settings Integration (~1 day)

- [ ] Add model selector in App Settings for mini chat assistant.
- [ ] Wire selected model to API call parameters.

---

#### Phase 7 – Testing & Polish (~3 days)

- [ ] Unit tests for Effector stores + events.
- [ ] Component tests for Toolbar, MiniChatDialog behaviors (Ask/Explain flows).
- [ ] Integration test: selection → toolbar → chat open/send → expand → persistence.

- [ ] Style fixes, accessibility (focus traps, aria labels).
- [ ] Responsiveness checks (draggable on small screens, no overflow issues).
- [ ] Cleanup ephemeral state on closing.

---

### 5. Testing Strategies

- **Unit Tests:**  
  Effector logic, API functions (mocked).

- **Component Tests:**  
  Toolbar open/close + button click flows  
  Mini chat panel input/send behavior
- **E2E Flow Tests:**  
  Selection → Ask → chat interaction loop  
  Selection → Explain → sent immediate response  
  Expand → verifying saved chat creation
- **Manual QA:**  
  Drag UI usability  
  Performance on slow networks  
  Non-blocking main chat use during mini chat session

---

### 6. Risks & Mitigations

| Risk                                          | Mitigation                                           |
| --------------------------------------------- | ---------------------------------------------------- |
| Drag conflicts with chat scroll               | Use fixed overlays, adjust z-index carefully         |
| Toolbar misplacement / selection complexities | Robust bounding rect + event coordinate calculations |
| API delays or failures                        | Add spinners, error toasts, retries                  |
| Losing unsent ephemeral mini chat state       | Confirm close/discard warning if input not empty     |
| Assistant model switch sync issues            | Decouple mini chat settings cleanly                  |
| Accidental multiple mini chats open           | Enforce singleton logic on open/toolbar flows        |

---

### 7. Estimated Timelines

Total: ~14 working days (~3 weeks with buffer)

| Phase                    | Time |
| ------------------------ | ---- |
| Infra design             | 2 d  |
| Selection + Toolbar      | 2 d  |
| Core chat input flows    | 3 d  |
| Chat UI + backend calls  | 3 d  |
| Expand/save system       | 2 d  |
| Settings hook-in         | 1 d  |
| Testing + Polishing      | 3 d  |
| **Buffer / Integration** | 2 d  |

---

### 8. Maintenance Considerations

- Modular Effector events/effects for easy future multi-chat migration.
- Design toolbar + dialog as **independent pure components**.
- Add clear comments around ephemeral chat discard logic.
- Use feature folder isolation `/src/features/mini-chat/` for all relevant files.
- Use FRD spec as acceptance criteria + onboarding doc.

---

### 9. Deliverables

- Full code in `/src/features/mini-chat/`
- FRD.md + PLAN.md as living docs
- 95%+ test coverage for stores, critical UI paths
- E2E test run successful
- UI/UX polished as per spec acceptance criteria.

---

Prepared meticulously for the Inline Mini Chat Assistant feature,  
**Chat-UI Team, 2025**
