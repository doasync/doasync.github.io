import { createDomain, createEvent, createStore } from 'effector';

const uiDomain = createDomain('ui');

// --- Events ---
export const openSettingsDrawer = uiDomain.event('openSettingsDrawer');
export const closeSettingsDrawer = uiDomain.event('closeSettingsDrawer');
// TODO: Add events for History Drawer later

// --- Stores ---
export const $isSettingsDrawerOpen = uiDomain.store<boolean>(false, { name: 'isSettingsDrawerOpen' })
    .on(openSettingsDrawer, () => true)
    .on(closeSettingsDrawer, () => false);

// TODO: Add store for History Drawer open state later