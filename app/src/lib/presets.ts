// Saved presets for the "Other Services" custom items (e.g. "Light Bill" with its usual amount).
// They are kept on this device, like the estimate draft.

export type OtherPreset = { id: string; name: string; amount: number };

export const PRESETS_STORAGE_KEY = 'swagattam-other-presets';

export function loadPresets(): OtherPreset[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PRESETS_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p.name === 'string' && p.name.trim())
      .map((p) => ({ id: String(p.id ?? newId('preset')), name: String(p.name).trim().slice(0, 80), amount: Math.max(0, Number(p.amount) || 0) }));
  } catch {
    return [];
  }
}

export function savePresets(presets: OtherPreset[]) {
  try {
    window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // The estimator keeps working without browser storage.
  }
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
