# Component Refactoring Plan: Moving from `/src/components/` to Feature-Based Organization

## Overview

This plan will systematically move all components from the global
`/src/components/` folder to their appropriate feature directories, following
the existing feature-based architecture pattern. This will improve code
organization, reduce coupling, and make the codebase more maintainable.

## Current Component Analysis

### Components to Move (18 total):

1. **ApiKeyMissingDialog.tsx** → `chat-settings` feature
2. **AttachmentMenu.tsx** → `chat` feature (core input functionality)
3. **ChatHistoryContent.tsx** → `chat-history` feature
4. **ChatSettingsContent.tsx** → `chat-settings` feature
5. **EmotionCache.tsx** → `ui-core` feature (new, for shared UI utilities)
6. **FileAttachmentWrapper.tsx** → `document-processing` feature
7. **ImageGenerationDialog.tsx** → `image-generation` feature
8. **ImageGenerationModelSelector.tsx** → `image-generation` feature
9. **MarkdownRenderer.tsx** → `ui-core` feature (new, for shared rendering)
10. **MessageItem.tsx** → `chat` feature (core chat display)
11. **MobileUnifiedDrawer.tsx** → `ui-layout` feature (new, for layout
    components)
12. **ModelInfoAlert.tsx** → `models-select` feature
13. **ModelInfoDrawer.tsx** → `models-select` feature
14. **ModelSelector.tsx** → `models-select` feature
15. **ProviderUrlTest.tsx** → `chat-settings` feature
16. **ThemeRegistry.tsx** → `ui-core` feature (new, for shared UI utilities)
17. **UsageInfoContent.tsx** → `usage-info` feature
18. **UsageInfoDialog.tsx** → `usage-info` feature

## New Feature Directories Needed

### 1. `ui-core` feature

**Purpose**: Shared UI utilities and components that don't belong to specific
business features

- Components: `EmotionCache.tsx`, `MarkdownRenderer.tsx`, `ThemeRegistry.tsx`
- Creates: `/src/features/ui-core/components/`

### 2. `ui-layout` feature

**Purpose**: Layout-specific components for different screen sizes and
navigation

- Components: `MobileUnifiedDrawer.tsx`
- Creates: `/src/features/ui-layout/components/`

## Feature Renames for Better Organization

### Consider renaming existing features:

1. **`usage-info`** → **`analytics`** (broader scope for future usage analytics)
2. **`ui-state`** → **`ui-state`** (keep as-is, already well named)
3. **`models-select`** → **`model-selection`** (more descriptive)

## Implementation Phases

### Phase 1: Create New Features and Move Shared Components (Week 1)

1. Create `ui-core` feature with proper structure
2. Create `ui-layout` feature with proper structure
3. Move and reorganize shared UI components
4. Update imports for shared components

### Phase 2: Move Business Feature Components (Week 1-2)

1. Move components to existing features (`chat-settings`, `chat-history`, etc.)
2. Update feature exports in `index.ts` files
3. Update all import statements across the codebase

### Phase 3: Feature Renames (Optional - Week 2)

1. Rename `usage-info` → `analytics` (if desired)
2. Rename `models-select` → `model-selection` (if desired)
3. Update all imports and references

### Phase 4: Cleanup (Week 2)

1. Remove empty `/src/components/` directory
2. Update any remaining references
3. Update TypeScript path mappings if needed
4. Test entire application

## Detailed Component Mapping

### Chat-related components → `chat` feature:

- `AttachmentMenu.tsx` → `/src/features/chat/components/AttachmentMenu.tsx`
- `MessageItem.tsx` → `/src/features/chat/components/MessageItem.tsx`

### Settings-related → `chat-settings` feature:

- `ApiKeyMissingDialog.tsx` →
  `/src/features/chat-settings/components/ApiKeyMissingDialog.tsx`
- `ChatSettingsContent.tsx` →
  `/src/features/chat-settings/components/ChatSettingsContent.tsx`
- `ProviderUrlTest.tsx` →
  `/src/features/chat-settings/components/ProviderUrlTest.tsx`

### History-related → `chat-history` feature:

- `ChatHistoryContent.tsx` →
  `/src/features/chat-history/components/ChatHistoryContent.tsx`

### Document processing → `document-processing` feature:

- `FileAttachmentWrapper.tsx` →
  `/src/features/document-processing/components/FileAttachmentWrapper.tsx`

### Image generation → `image-generation` feature:

- `ImageGenerationDialog.tsx` →
  `/src/features/image-generation/components/ImageGenerationDialog.tsx`
- `ImageGenerationModelSelector.tsx` →
  `/src/features/image-generation/components/ImageGenerationModelSelector.tsx`

### Model selection → `models-select` feature:

- `ModelInfoAlert.tsx` →
  `/src/features/models-select/components/ModelInfoAlert.tsx`
- `ModelInfoDrawer.tsx` →
  `/src/features/models-select/components/ModelInfoDrawer.tsx`
- `ModelSelector.tsx` →
  `/src/features/models-select/components/ModelSelector.tsx`

### Usage/Analytics → `usage-info` feature:

- `UsageInfoContent.tsx` →
  `/src/features/usage-info/components/UsageInfoContent.tsx`
- `UsageInfoDialog.tsx` →
  `/src/features/usage-info/components/UsageInfoDialog.tsx`

### New UI Core feature → `ui-core` feature:

- `EmotionCache.tsx` → `/src/features/ui-core/components/EmotionCache.tsx`
- `MarkdownRenderer.tsx` →
  `/src/features/ui-core/components/MarkdownRenderer.tsx`
- `ThemeRegistry.tsx` → `/src/features/ui-core/components/ThemeRegistry.tsx`

### New UI Layout feature → `ui-layout` feature:

- `MobileUnifiedDrawer.tsx` →
  `/src/features/ui-layout/components/MobileUnifiedDrawer.tsx`

## Import Updates Required

### Main files that import from `/src/components/`:

1. `/src/app/page.tsx` - 11 component imports
2. `/src/app/layout.tsx` - 1 component import
3. `/src/components/MobileUnifiedDrawer.tsx` - 4 component imports
4. `/src/components/MessageItem.tsx` - 1 component import

### All imports will change from:

```typescript
import ComponentName from '@/components/ComponentName';
```

### To:

```typescript
import { ComponentName } from '@/features/feature-name';
// or
import { ComponentName } from '@/features/feature-name/components';
```

## Detailed Implementation Steps

### Step 1: Create new feature directories

```bash
mkdir -p /src/features/ui-core/components
mkdir -p /src/features/ui-layout/components
```

### Step 2: Create index.ts files for new features

```typescript
// /src/features/ui-core/index.ts
export { default as EmotionCache } from './components/EmotionCache';
export { default as MarkdownRenderer } from './components/MarkdownRenderer';
export { default as ThemeRegistry } from './components/ThemeRegistry';

// /src/features/ui-layout/index.ts
export { default as MobileUnifiedDrawer } from './components/MobileUnifiedDrawer';
```

### Step 3: Move components systematically

1. Move files from `/src/components/` to appropriate feature `/components/`
   directories
2. Update imports within moved files if they reference other components
3. Update feature index.ts files to export new components

### Step 4: Update all import statements

Update imports in these key files:

- `/src/app/page.tsx`
- `/src/app/layout.tsx`
- Any moved components that import other moved components

### Step 5: Create components directories in existing features

```bash
mkdir -p /src/features/chat/components
mkdir -p /src/features/chat-settings/components
mkdir -p /src/features/chat-history/components
mkdir -p /src/features/models-select/components
mkdir -p /src/features/usage-info/components
# image-generation and document-processing already have components directories
```

## Benefits

1. **Better Code Organization**: Components grouped by business logic
2. **Improved Maintainability**: Easier to find and modify related components
3. **Reduced Coupling**: Features become more self-contained
4. **Consistent Architecture**: Follows existing feature-based pattern
5. **Clearer Dependencies**: Import paths indicate feature relationships

## Risks and Mitigation

- **Risk**: Breaking existing imports during refactor
- **Mitigation**: Systematic phase-by-phase approach with testing after each
  phase

- **Risk**: Potential circular dependencies
- **Mitigation**: Careful planning of shared components in `ui-core` feature

- **Risk**: Complex import chains between features
- **Mitigation**: Clear feature boundaries and minimal cross-feature
  dependencies

## Testing Strategy

1. After each major move, run `npm run build` to check for compilation errors
2. Test application functionality after each phase
3. Use TypeScript compiler to catch import issues early
4. Manual testing of key user flows

## Success Criteria

- [ ] All components moved from `/src/components/` to appropriate features
- [ ] All imports updated and working
- [ ] Application builds and runs without errors
- [ ] No circular dependencies introduced
- [ ] Feature boundaries respected and logical
- [ ] TypeScript compilation passes
- [ ] All existing functionality preserved

## Timeline

- **Day 1**: Create new features, move shared components (ui-core, ui-layout)
- **Day 2**: Move business feature components and update exports
- **Day 3**: Update all imports and test application
- **Day 4**: Cleanup and final testing

## Draft to-do's

Todos ⎿ ☐ Create ui-core feature directory structure with components folder and
index.ts ☐ Create ui-layout feature directory structure with components folder
and index.ts ☐ Move EmotionCache, MarkdownRenderer, ThemeRegistry to ui-core
feature ☐ Move MobileUnifiedDrawer to ui-layout feature ☐ Update all import
statements in main application files (page.tsx, layout.tsx, etc.) ☐ Update
index.ts files in all features to export moved components ☐ Test that
application builds and runs correctly after refactoring ☐ Move AttachmentMenu
and MessageItem to chat feature ☐ Move ApiKeyMissingDialog, ChatSettingsContent,
ProviderUrlTest to chat-settings feature ☐ Move ChatHistoryContent to
chat-history feature ☐ Move ModelInfoAlert, ModelInfoDrawer, ModelSelector to
models-select feature ☐ Move UsageInfoContent, UsageInfoDialog to usage-info
feature ☐ Move FileAttachmentWrapper to document-processing feature ☐ Move
ImageGenerationDialog, ImageGenerationModelSelector to image-generation feature
☐ Remove empty src/components directory

## Rollback Plan

If issues arise:

1. Keep git commits small and focused for easy rollback
2. Each phase should be a separate commit
3. Can rollback individual moves if needed
4. Maintain backup of original structure until completion

## Post-Refactoring Opportunities

1. Consider further feature renames for clarity
2. Evaluate if any features can be merged or split
3. Establish coding standards for feature organization
4. Update documentation and onboarding materials
