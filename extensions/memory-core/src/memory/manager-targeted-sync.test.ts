import { describe, expect, it, vi } from "vitest";
import {
  clearMemorySyncedSessionTranscripts,
  runMemoryTargetedSessionSync,
} from "./manager-targeted-sync.js";

describe("memory targeted session sync", () => {
  it("preserves unrelated dirty sessions after targeted cleanup", () => {
    const firstSessionLocator = "sqlite-transcript://main/targeted-dirty-first";
    const secondSessionLocator = "sqlite-transcript://main/targeted-dirty-second";
    const dirtySessionTranscripts = new Set([firstSessionLocator, secondSessionLocator]);

    const sessionsDirty = clearMemorySyncedSessionTranscripts({
      dirtySessionTranscripts,
      targetSessionTranscripts: [firstSessionLocator],
    });

    expect(dirtySessionTranscripts.has(secondSessionLocator)).toBe(true);
    expect(sessionsDirty).toBe(true);
  });

  it("runs a full reindex after fallback activates during targeted sync", async () => {
    const activateFallbackProvider = vi.fn(async () => true);
    const runSafeReindex = vi.fn(async () => {});
    const runUnsafeReindex = vi.fn(async () => {});

    await runMemoryTargetedSessionSync({
      hasSessionSource: true,
      targetSessionTranscripts: new Set(["sqlite-transcript://main/targeted-fallback"]),
      reason: "post-compaction",
      progress: undefined,
      useUnsafeReindex: false,
      dirtySessionTranscripts: new Set(),
      syncSessionTranscripts: async () => {
        throw new Error("embedding backend failed");
      },
      shouldFallbackOnError: () => true,
      activateFallbackProvider,
      runSafeReindex,
      runUnsafeReindex,
    });

    expect(activateFallbackProvider).toHaveBeenCalledWith("embedding backend failed");
    expect(runSafeReindex).toHaveBeenCalledWith({
      reason: "post-compaction",
      force: true,
      progress: undefined,
    });
    expect(runUnsafeReindex).not.toHaveBeenCalled();
  });

  it("uses the unsafe reindex path when enabled", async () => {
    const runSafeReindex = vi.fn(async () => {});
    const runUnsafeReindex = vi.fn(async () => {});

    await runMemoryTargetedSessionSync({
      hasSessionSource: true,
      targetSessionTranscripts: new Set(["sqlite-transcript://main/targeted-fallback"]),
      reason: "post-compaction",
      progress: undefined,
      useUnsafeReindex: true,
      dirtySessionTranscripts: new Set(),
      syncSessionTranscripts: async () => {
        throw new Error("embedding backend failed");
      },
      shouldFallbackOnError: () => true,
      activateFallbackProvider: async () => true,
      runSafeReindex,
      runUnsafeReindex,
    });

    expect(runUnsafeReindex).toHaveBeenCalledWith({
      reason: "post-compaction",
      force: true,
      progress: undefined,
    });
    expect(runSafeReindex).not.toHaveBeenCalled();
  });
});
