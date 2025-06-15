# Feature Requirements Document: UI State

## 1. Feature Overview

The **ui-state** feature manages global UI state including drawer visibility, dialog states, message editing focus, and mobile-specific UI adaptations. It provides centralized state management for UI components across the application, ensuring consistent behavior and proper state persistence.

### Purpose
- Manage drawer states (history, settings, model info)
- Control dialog visibility across features
- Handle message editing focus
- Coordinate mobile UI adaptations
- Persist UI preferences
- Provide snackbar notifications

### Key Capabilities
- Persistent drawer states (desktop)
- Temporary drawer states (mobile)
- Unified mobile drawer with tabs
- Message editing state management
- Snackbar queue system
- LocalStorage persistence for preferences

## 2. Functional Requirements

### 2.1 Drawer Management

#### Desktop Drawers
- **History Drawer**: Chat history sidebar
- **Settings Drawer**: Configuration panel
- **Model Info Drawer**: Model details panel
- Each drawer has persistent open/closed state
- States saved to LocalStorage

#### Mobile Unified Drawer
- Single drawer with tab navigation
- Tabs: History, Settings, Model Info, Usage
- Swipeable tab transitions
- Automatic close on navigation

### 2.2 State Persistence
LocalStorage keys:
- `ui_historyDrawerOpen`: History drawer state
- `ui_settingsDrawerOpen`: Settings drawer state
- States loaded on app start
- Changes saved immediately

### 2.3 Message Editing
- Track currently editing message ID
- Prevent simultaneous edits
- Clear state on chat switch
- Coordinate with chat feature

### 2.4 Snackbar System
- Queue-based notifications
- Auto-dismiss timing
- Action button support
- Error/success/info variants
- Concurrent display limit

## 3. Technical Implementation

### 3.1 State Management (Effector)

#### Stores
- `$isHistoryDrawerPersistentOpen`: Desktop history state
- `$isSettingsDrawerPersistentOpen`: Desktop settings state
- `$isMobileDrawerOpen`: Mobile drawer visibility
- `$mobileDrawerTab`: Current mobile tab
- `$isModelInfoDrawerOpen`: Model info visibility
- `$editingMessageId`: Currently editing message
- `$snackbarsQueue`: Notification queue
- `$isUserDraggingDrawer`: Drag state
- `$temporaryOpenDrawers`: Temporary states

#### Events
- `openSettingsDrawer`: Open settings
- `closeSettingsDrawer`: Close settings
- `toggleSettingsDrawer`: Toggle settings
- `openHistoryDrawer`: Open history
- `closeHistoryDrawer`: Close history
- `toggleHistoryDrawer`: Toggle history
- `openModelInfoDrawer`: Open model info
- `closeModelInfoDrawer`: Close model info
- `openMobileDrawer`: Open with tab
- `closeMobileDrawer`: Close mobile
- `setMobileDrawerTab`: Change tab
- `startEditingMessage`: Begin edit
- `stopEditingMessage`: End edit
- `resetEditingMessage`: Clear edit

#### Effects
- `loadUiSettingsFx`: Load from LocalStorage
- `saveHistoryDrawerStateFx`: Persist history state
- `saveSettingsDrawerStateFx`: Persist settings state

### 3.2 Module Structure
```
ui-state/
├── model.ts      # Main state management
├── snackbar.ts   # Snackbar queue logic
└── index.ts      # Public exports
```

### 3.3 Drawer State Logic

#### Desktop Behavior
```typescript
// Persistent state (survives refresh)
$isHistoryDrawerPersistentOpen

// Temporary state (session only)
$temporaryOpenDrawers.history

// Computed final state
$isHistoryDrawerOpen = persistent || temporary
```

#### Mobile Behavior
- Single drawer instance
- Tab-based navigation
- Auto-close on route change
- Swipe gestures support

## 4. Integration Points

### 4.1 Dependencies
- LocalStorage for persistence
- Effector for state management

### 4.2 Consumed By
- Layout components
- Navigation components
- All features with dialogs
- Chat for editing state
- Mobile UI components

## 5. UI Coordination

### 5.1 Drawer Interactions
- Only one drawer open on mobile
- Multiple drawers allowed on desktop
- Automatic close on navigation
- Keyboard shortcut support

### 5.2 Focus Management
- Trap focus in open drawers
- Restore focus on close
- Manage tab order
- Screen reader announcements

### 5.3 Animation States
- Track drag interactions
- Smooth transitions
- Prevent layout shifts
- Handle interruptions

## 6. Mobile Adaptations

### 6.1 Responsive Behavior
- Breakpoint: 960px
- Drawer becomes full-screen
- Tabs replace separate drawers
- Touch gestures enabled

### 6.2 Mobile-Specific Features
- Swipe to close
- Tab indicators
- Compact layouts
- Bottom sheet option (future)

## 7. Snackbar System

### 7.1 Queue Management
```typescript
interface Snackbar {
  id: string;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  autoHideDuration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
}
```

### 7.2 Display Rules
- Maximum 3 concurrent
- FIFO queue order
- 6-second default duration
- Manual dismiss option
- Persistent errors

## 8. Performance Considerations

### 8.1 Optimization
- Debounced saves
- Lazy component loading
- Minimal re-renders
- Efficient animations

### 8.2 Memory Management
- Clear temporary states
- Limit snackbar queue
- Cleanup on unmount
- Event listener management

## 9. Accessibility

### 9.1 Drawer Accessibility
- ARIA landmarks
- Keyboard navigation
- Focus management
- Screen reader announcements

### 9.2 Snackbar Accessibility
- Live regions
- Polite announcements
- Action focus
- Dismissal options

## 10. Error Handling

### 10.1 Storage Errors
- LocalStorage failures
- Fallback to defaults
- Console warnings
- Graceful degradation

### 10.2 State Conflicts
- Race condition prevention
- State validation
- Recovery mechanisms
- Debug logging

## 11. Testing Strategy

### 11.1 Unit Tests
- State transitions
- Persistence logic
- Event handling
- Computed states

### 11.2 Integration Tests
- Cross-feature coordination
- LocalStorage integration
- Mobile/desktop switching
- Snackbar queue

### 11.3 E2E Tests
- Drawer interactions
- State persistence
- Mobile gestures
- Keyboard navigation

## 12. User Experience

### 12.1 Consistency
- Predictable behavior
- Smooth animations
- Clear visual feedback
- Intuitive controls

### 12.2 Customization
- Persistent preferences
- Keyboard shortcuts
- Gesture controls
- Theme integration

## 13. Future Enhancements

### 13.1 Planned Features
- Drawer resize
- Custom layouts
- More animations
- Gesture customization
- Multi-window support

### 13.2 Advanced Features
- State synchronization
- Undo/redo for UI
- Layout presets
- A/B testing support
- Analytics integration