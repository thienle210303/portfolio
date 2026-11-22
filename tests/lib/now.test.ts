import { describe, expect, it } from "vitest";
import { now } from "@/content/portfolio";
import { answer } from "@/lib/answers";
import { nowAsOfLabel } from "@/lib/now";

describe("what I am doing now (round 30: the hero's receipt)", () => {
  it("is brief: a few words a line, no sentence, no figure", () => {
    for (const item of now.items) {
      expect(item.line.split(/\s+/).length, item.line).toBeLessThanOrEqual(3);
      expect(item.line).not.toMatch(/[.!?]$/);
      expect(`${item.name} ${item.line}`).not.toMatch(/\d+\s*(%|→|M\+)/);
    }
  });

  it("dates itself for the chat", () => {
    expect(nowAsOfLabel("2026-11")).toBe("Nov 2026");
    expect(() => nowAsOfLabel("Nov 2026")).toThrow();
  });

  it("the chat answers what I am doing now, citing the receipt", () => {
    const texts = now.items.map((item) => `${item.name}, ${item.status}: ${item.line}`);
    for (const question of ["What are you doing lately?", "Tell me about TradeCorps"]) {
      const [top] = answer(question);
      expect(top?.sectionId, question).toBe("about");
      expect(texts, question).toContain(top?.text);
    }
  });
});
