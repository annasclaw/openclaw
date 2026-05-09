import { describe, expect, it } from "vitest";
import { resolveMemorySessionSyncPlan } from "./manager-session-sync-state.js";

function transcriptLocator(sessionId: string): string {
  return `sqlite-transcript://main/${sessionId}`;
}

describe("memory session sync state", () => {
  it("tracks active transcript locators and bulk hashes for full scans", () => {
    const plan = resolveMemorySessionSyncPlan({
      needsFullReindex: false,
      files: [transcriptLocator("a"), transcriptLocator("b")],
      targetSessionTranscripts: null,
      dirtySessionTranscripts: new Set(),
      existingRows: [
        { path: "sessions/a", hash: "hash-a" },
        { path: "sessions/b", hash: "hash-b" },
      ],
      sessionPathForTranscript: (file) => `sessions/${file.split("/").at(-1)}`,
    });

    expect(plan.indexAll).toBe(true);
    expect(plan.activePaths).toEqual(new Set(["sessions/a", "sessions/b"]));
    expect(plan.existingRows).toEqual([
      { path: "sessions/a", hash: "hash-a" },
      { path: "sessions/b", hash: "hash-b" },
    ]);
    expect(plan.existingHashes).toEqual(
      new Map([
        ["sessions/a", "hash-a"],
        ["sessions/b", "hash-b"],
      ]),
    );
  });

  it("treats targeted session syncs as refresh-only and skips unrelated pruning", () => {
    const plan = resolveMemorySessionSyncPlan({
      needsFullReindex: false,
      files: [transcriptLocator("targeted-first")],
      targetSessionTranscripts: new Set([transcriptLocator("targeted-first")]),
      dirtySessionTranscripts: new Set([transcriptLocator("targeted-first")]),
      existingRows: [
        { path: "sessions/targeted-first", hash: "hash-first" },
        { path: "sessions/targeted-second", hash: "hash-second" },
      ],
      sessionPathForTranscript: (file) => `sessions/${file.split("/").at(-1)}`,
    });

    expect(plan.indexAll).toBe(true);
    expect(plan.activePaths).toBeNull();
    expect(plan.existingRows).toBeNull();
    expect(plan.existingHashes).toBeNull();
  });

  it("keeps dirty-only incremental mode when no targeted sync is requested", () => {
    const plan = resolveMemorySessionSyncPlan({
      needsFullReindex: false,
      files: [transcriptLocator("incremental")],
      targetSessionTranscripts: null,
      dirtySessionTranscripts: new Set([transcriptLocator("incremental")]),
      existingRows: [],
      sessionPathForTranscript: (file) => `sessions/${file.split("/").at(-1)}`,
    });

    expect(plan.indexAll).toBe(false);
    expect(plan.activePaths).toEqual(new Set(["sessions/incremental"]));
  });
});
