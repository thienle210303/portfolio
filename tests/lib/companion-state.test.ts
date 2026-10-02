import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  migrateCompanionMode,
  useCompanionMode,
} from "@/components/companion/companion-state";

/** jsdom here has no `localStorage` of its own, so each test gets a fresh,
 *  plain in-memory one with every method `Storage` has. */
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => Array.from(items.keys())[index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

/**
 * The stored companion mode, and the one value this build no longer writes.
 *
 * `wander` was a mode of its own until the explorers made exploring the
 * default: there is nothing left for it to switch to, so a browser still
 * carrying it — under either key it was ever written to — has to land on the
 * default rather than on a state this build cannot draw.
 */
describe("companion mode storage", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { value: memoryStorage(), configurable: true });
  });

  it("reads a saved wander mode as roam", () => {
    window.localStorage.setItem("companion", "wander");
    window.localStorage.setItem("companion-roam", "wander");

    const { result } = renderHook(() => useCompanionMode());
    expect(result.current).toBe("roam");
  });

  it("retires the stored wander value under both keys, without throwing", () => {
    window.localStorage.setItem("companion", "wander");
    window.localStorage.setItem("companion-roam", "wander");

    expect(() => migrateCompanionMode()).not.toThrow();
    expect(window.localStorage.getItem("companion")).toBeNull();
    expect(window.localStorage.getItem("companion-roam")).toBeNull();
  });

  it("still reads resting, and the retired off, as the bed", () => {
    window.localStorage.setItem("companion", "resting");
    expect(renderHook(() => useCompanionMode()).result.current).toBe("resting");

    window.localStorage.setItem("companion", "off");
    expect(renderHook(() => useCompanionMode()).result.current).toBe("resting");
    migrateCompanionMode();
    expect(window.localStorage.getItem("companion")).toBe("resting");
  });

  it("leaves a resting visitor's bed alone while retiring the old roam key", () => {
    window.localStorage.setItem("companion", "resting");
    window.localStorage.setItem("companion-roam", "wander");

    migrateCompanionMode();
    expect(window.localStorage.getItem("companion")).toBe("resting");
    expect(window.localStorage.getItem("companion-roam")).toBeNull();
    expect(renderHook(() => useCompanionMode()).result.current).toBe("resting");
  });
});
