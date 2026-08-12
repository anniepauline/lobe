import {
  DEFAULT_EXTENSION_SETTINGS,
  extensionSettingsSchema,
  type ExtensionSettings,
} from "@lobe/shared";

const SETTINGS_KEY = "lobe:settings";
const defaultSettings: ExtensionSettings = {
  ...DEFAULT_EXTENSION_SETTINGS,
  apiUrl:
    import.meta.env.WXT_PUBLIC_API_URL ?? DEFAULT_EXTENSION_SETTINGS.apiUrl,
};

export async function loadSettings(): Promise<ExtensionSettings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  const parsed = extensionSettingsSchema.safeParse(stored[SETTINGS_KEY]);
  return parsed.success ? parsed.data : defaultSettings;
}

export async function saveSettings(
  value: ExtensionSettings,
): Promise<ExtensionSettings> {
  const settings = extensionSettingsSchema.parse(value);
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
  return settings;
}

export function isConfigured(settings: ExtensionSettings): boolean {
  return settings.apiToken.trim().length > 0;
}
