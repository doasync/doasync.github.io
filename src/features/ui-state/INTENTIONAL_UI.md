### Revised Plan: **Long-Press Delete & Retry Safeguard** with Delay-aware UI Logic

---

## **1. Overview**

Incorporate the **newly implemented long-press detection** and **adjusted action delays** into chat message interaction features.

- **Long press (press-and-hold) gesture** as the **confirmation** for destructive actions (delete, retry)
- **Snackbar warnings** on quick taps, instructing user to long press
- **Effector-powered Snackbar system** for global feedback
- Explicit **delay thresholds** to prevent accidental actions

---

## **2. Delete Action Logic**

- **Delete triggers ONLY after a long press (~400ms)**
- **Quick taps** on delete icon **show a warning Snackbar**:
  - _"Long press to delete a message."_
- Leverages `useLongPress` hook with:
  - `threshold: 400ms`
  - `detect: LongPressEventType.Pointer`
  - `captureEvent: true`, `cancelOnMovement: false`
- **No reliance on keyboard modifiers**, fully mobile-friendly
- **No accidental deletes** on fast clicks/taps

---

## **3. Retry Action Logic (implemented similarly)**

- Prevent accidental retries which can consume tokens/credits:
  - **Long press** triggers **actual retry/resend**
  - **Quick tap** shows Snackbar
- Uses a similar `useLongPress` setup with its own callback
- Ensures **intentional** user interaction before resending

---

## **4. Effector Snackbar System**

- Fully migrated Snackbar to global Effector-based handling
- Supports warning/info/error levels
- Used to show **confirmation instructions** for both delete and retry
- Global, so **any component** can dispatch messages

---

## **5. User Experience Flow**

```mermaid
flowchart TD
    Click[User taps delete/retry button] --> Check{Press duration >= 400ms?}
    Check -- No --> Warn[Show Snackbar: "Long press to confirm"]
    Check -- Yes --> Confirm[Perform destructive action]
```

- **Short Tap:** _"Long press to delete this message."_ (or retry)
- **Long Press:** actually deletes or retries

---

## **6. Timing Adjustments**

- The **threshold** balances responsiveness and safety:
  - Short enough not to frustrate
  - Long enough to prevent accidental activations
- Configurable globally via `useLongPress` options
- Matches the example you provided and industry best practices

---

## **7. Visual Feedback (Optional Enhancements)**

- During **long press hold**:
  - Change icon/button color (e.g., fade to red)
  - Show progress indicator (press duration)
- On **done**, revert to normal styling

---
