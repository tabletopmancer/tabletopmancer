import { describe, expect, it } from "vitest";
import { MAX_DICE_COUNT, MAX_DICE_SIDES, parseFormula } from "./dice.js";

describe("parseFormula", () => {
  it("parses a simple formula", () => {
    expect(parseFormula("2d6")).toEqual({ count: 2, sides: 6, modifier: 0 });
  });

  it("parses a positive modifier", () => {
    expect(parseFormula("2d6+3")).toEqual({ count: 2, sides: 6, modifier: 3 });
  });

  it("parses a negative modifier", () => {
    expect(parseFormula("1d20-2")).toEqual({ count: 1, sides: 20, modifier: -2 });
  });

  it("is case insensitive", () => {
    expect(parseFormula("2D6")).toEqual({ count: 2, sides: 6, modifier: 0 });
  });

  it("trims surrounding whitespace", () => {
    expect(parseFormula("  1d8  ")).toEqual({ count: 1, sides: 8, modifier: 0 });
  });

  it("accepts the upper bounds", () => {
    expect(parseFormula(`${MAX_DICE_COUNT}d${MAX_DICE_SIDES}`)).toEqual({
      count: MAX_DICE_COUNT,
      sides: MAX_DICE_SIDES,
      modifier: 0,
    });
  });

  it("rejects zero dice", () => {
    expect(parseFormula("0d6")).toBeNull();
  });

  it("rejects too many dice", () => {
    expect(parseFormula(`${MAX_DICE_COUNT + 1}d6`)).toBeNull();
  });

  it("rejects huge dice counts that could exhaust memory", () => {
    expect(parseFormula("999999999d6")).toBeNull();
  });

  it("rejects one-sided dice", () => {
    expect(parseFormula("1d1")).toBeNull();
  });

  it("rejects too many sides", () => {
    expect(parseFormula(`1d${MAX_DICE_SIDES + 1}`)).toBeNull();
  });

  it("rejects malformed input", () => {
    for (const input of ["", "d6", "2d", "2d6+", "2d6+2+3", "-1d6", "2 d 6", "abc", "2d6.5"]) {
      expect(parseFormula(input), `input: ${JSON.stringify(input)}`).toBeNull();
    }
  });
});
