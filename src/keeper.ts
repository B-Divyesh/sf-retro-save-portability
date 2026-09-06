export const JOURNAL_KEY = "rsp:keeper-journal";
export const DEVICE_KEY = "rsp:keeper-device";

export interface JournalEntry {
  date: string;
  action: "bundle" | "restore";
  count: number;
  location: string;
  device: string;
}

export function readJournal(storage: Storage = localStorage): JournalEntry[] {
  try {
    const value = JSON.parse(storage.getItem(JOURNAL_KEY) || "[]");
    return Array.isArray(value) ? value as JournalEntry[] : [];
  } catch {
    return [];
  }
}

export function saveDeviceLabel(label: string, storage: Storage = localStorage): string {
  const saved = label.trim() || "This device";
  storage.setItem(DEVICE_KEY, saved);
  return saved;
}

export function addJournalEntry(
  entry: Omit<JournalEntry, "date" | "device">,
  storage: Storage = localStorage,
  now = new Date()
): void {
  const current = readJournal(storage);
  current.unshift({
    ...entry,
    date: now.toISOString(),
    device: storage.getItem(DEVICE_KEY) || "Unlabelled device"
  });
  storage.setItem(JOURNAL_KEY, JSON.stringify(current.slice(0, 100)));
}
