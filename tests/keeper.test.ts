import { beforeEach, describe, expect, it } from "vitest";
import { addJournalEntry, DEVICE_KEY, JOURNAL_KEY, readJournal, saveDeviceLabel } from "../src/keeper";

describe("Keeper local features", () => {
  beforeEach(() => localStorage.clear());

  it("@claim:keeper-local-features keeps device labels and the latest 100 journal entries on this device", () => {
    expect(saveDeviceLabel("  Travel laptop  ")).toBe("Travel laptop");
    expect(localStorage.getItem(DEVICE_KEY)).toBe("Travel laptop");

    for (let index = 0; index < 105; index += 1) {
      addJournalEntry(
        { action: index % 2 ? "restore" : "bundle", count: index + 1, location: `/local/${index}` },
        localStorage,
        new Date(Date.UTC(2026, 0, 1, 0, index))
      );
    }

    const journal = readJournal();
    expect(journal).toHaveLength(100);
    expect(journal[0]).toMatchObject({ count: 105, location: "/local/104", device: "Travel laptop" });
    expect(journal[99].count).toBe(6);
    expect(Object.keys(localStorage).sort()).toEqual([DEVICE_KEY, JOURNAL_KEY].sort());
  });
});
