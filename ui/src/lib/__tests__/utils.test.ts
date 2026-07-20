import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("deduplicates conflicting tailwind classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles falsy values", () => {
    expect(cn("foo", false, null, undefined, "")).toBe("foo");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});
