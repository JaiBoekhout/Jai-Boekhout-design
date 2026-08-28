import { describe, it, expect } from "vitest";
import { deepMerge } from "./contentStore";

// deepMerge()'s declared signature takes `Partial<T>`, which — like the built-in Partial —
// only makes top-level keys optional, not nested ones. Every real call site satisfies that by
// casting its patch upstream rather than relying on structural inference; these tests build
// nested partial patches as plain object literals, so they're cast the same way at the call
// site below. This is a type-level gap only — deepMerge()'s actual runtime behavior on nested
// partials is exactly what's under test here.
type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

// Regression coverage for the bug found during the CMS assessment: deepMerge() was silently
// dropping any field a patch explicitly set to `undefined`, which meant every "Reset to
// Accent," "Reset to Default," and image "Remove" action in the Design System tab was quietly
// a no-op — the UI showed the change, but nothing was actually cleared once it round-tripped
// through updateContent()/persistContent(). See WF-5 in the CMS assessment.
describe("deepMerge", () => {
  it("overrides a target value with a source value", () => {
    const result = deepMerge({ a: 1, b: 2 }, { b: 5 });
    expect(result).toEqual({ a: 1, b: 5 });
  });

  it("recursively merges nested objects instead of replacing them wholesale", () => {
    const target = { colors: { accentDark: "#111", accentLight: "#eee" } };
    const source: DeepPartial<typeof target> = { colors: { accentDark: "#222" } };
    const result = deepMerge(target, source as Partial<typeof target>);
    expect(result).toEqual({ colors: { accentDark: "#222", accentLight: "#eee" } });
  });

  it("explicitly clears a field when the patch sets it to undefined (the regression)", () => {
    const target = { buttonDark: "#ff00aa", buttonLight: "#0b9aa2" };
    const source: DeepPartial<typeof target> = { buttonDark: undefined };
    const result = deepMerge(target, source);
    expect(result.buttonDark).toBeUndefined();
    expect(result.buttonLight).toBe("#0b9aa2");
  });

  it("clears a nested field to undefined without disturbing its siblings", () => {
    const target = { componentColors: { buttonDark: "#ff00aa", linkDark: "#14adb5" } };
    const source: DeepPartial<typeof target> = { componentColors: { buttonDark: undefined } };
    const result = deepMerge(target, source as Partial<typeof target>);
    expect(result.componentColors.buttonDark).toBeUndefined();
    expect(result.componentColors.linkDark).toBe("#14adb5");
  });

  it("replaces arrays wholesale rather than merging them element-by-element", () => {
    const target = { tags: ["a", "b", "c"] };
    const source = { tags: ["x"] };
    const result = deepMerge(target, source);
    expect(result.tags).toEqual(["x"]);
  });

  it("leaves target values untouched when a key is absent from the source entirely", () => {
    const target = { a: 1, b: { c: 2, d: 3 } };
    const source: DeepPartial<typeof target> = { b: { c: 9 } };
    const result = deepMerge(target, source as Partial<typeof target>);
    expect(result).toEqual({ a: 1, b: { c: 9, d: 3 } });
  });
});
