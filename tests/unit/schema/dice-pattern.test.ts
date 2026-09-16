import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseFormula } from "$lib/dice.js";

const schema = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, "../../../schema/dice.json"), "utf8"),
) as { pattern: string; examples: string[] };

const pattern = new RegExp(schema.pattern);

describe("schema/dice.json pattern", () => {
  it.each(["1d4", "1d20", "10d6", "1d8+2", "2d6-1", "1D8"])("accepts %s", (formula) => {
    expect(pattern.test(formula)).toBe(true);
  });

  it.each(["junk1d4junk", "1d4junk", "junk1d4", "d6", "1d", "1d6+", "1d6++2", " 1d6 ", ""])(
    "rejects %s",
    (formula) => {
      expect(pattern.test(formula)).toBe(false);
    },
  );

  it.each(schema.examples)("parses its own example %s", (formula) => {
    expect(pattern.test(formula)).toBe(true);
    expect(parseFormula(formula)).not.toBeNull();
  });

  it("agrees with the runtime parser", () => {
    const formulas = ["1d6", "1d6+2", "1d6-2", "2D10", "1d6*2", "1d6 +2", "abc", "1d6+2+3"];
    for (const formula of formulas) {
      expect(pattern.test(formula)).toBe(parseFormula(formula) !== null);
    }
  });
});
