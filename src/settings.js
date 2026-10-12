// Shared settings helpers. Loaded by the content script and the options page.

const TTP_DEFAULTS = {
  enabled: true,
  headline: "Trust the process",
  subtitle: "Use your agents",
  // Empty list = block every Gmail account. Otherwise only these addresses are blocked.
  blockedAccounts: [],
  // Durations (minutes) offered after clicking "Open email anyway".
  snoozeOptions: [5, 15, 30],
  shortcuts: {
    chat: true,
    calendar: true,
    meet: true,
    drive: true,
    admin: true,
  },
};

const TTP_STORAGE_KEYS = {
  settings: "settings",
  snoozeUntil: "snoozeUntil",
};

async function ttpGetSettings() {
  const { [TTP_STORAGE_KEYS.settings]: stored = {} } = await chrome.storage.sync.get(
    TTP_STORAGE_KEYS.settings
  );
  return {
    ...TTP_DEFAULTS,
    ...stored,
    shortcuts: { ...TTP_DEFAULTS.shortcuts, ...(stored.shortcuts || {}) },
  };
}

async function ttpSaveSettings(settings) {
  await chrome.storage.sync.set({ [TTP_STORAGE_KEYS.settings]: settings });
}

async function ttpGetSnoozeUntil() {
  const { [TTP_STORAGE_KEYS.snoozeUntil]: until = 0 } = await chrome.storage.local.get(
    TTP_STORAGE_KEYS.snoozeUntil
  );
  return until;
}

async function ttpSetSnoozeUntil(timestamp) {
  await chrome.storage.local.set({ [TTP_STORAGE_KEYS.snoozeUntil]: timestamp });
}
