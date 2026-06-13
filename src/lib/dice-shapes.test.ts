import { describe, expect, it } from "vitest";
import { getDieShape, qRotate, settleQuat, splitPercentile, type DieShape } from "./dice-shapes.js";

const STANDARD_SIDES = [2, 4, 6, 8, 10, 12, 20];

function shapes(): Array<[number, DieShape]> {
  return STANDARD_SIDES.map((sides) => [sides, getDieShape(sides)]);
}

function radius(shape: DieShape): number {
  return Math.max(...shape.verts.map((v) => Math.hypot(v[0], v[1], v[2])));
}

describe("die shapes", () => {
  it("numbers exactly `sides` value faces per die", () => {
    for (const [sides, shape] of shapes()) {
      expect(shape.sides, `d${sides}`).toBe(sides);
      const valueFaces = shape.faces.filter((f) => f.num > 0);
      expect(valueFaces.length, `d${sides} value faces`).toBe(sides);
      const nums = new Set(valueFaces.map((f) => f.num));
      expect(nums.size, `d${sides} unique nums`).toBe(sides);
      expect(Math.min(...nums), `d${sides} min num`).toBe(1);
      expect(Math.max(...nums), `d${sides} max num`).toBe(sides);
    }
  });

  it("references only valid vertices", () => {
    for (const [sides, shape] of shapes()) {
      for (const face of shape.faces) {
        expect(face.vi.length, `d${sides} face size`).toBeGreaterThanOrEqual(3);
        for (const idx of face.vi) {
          expect(idx, `d${sides} vertex index`).toBeGreaterThanOrEqual(0);
          expect(idx, `d${sides} vertex index`).toBeLessThan(shape.verts.length);
        }
      }
    }
  });

  it("scales every die to a shared circumradius", () => {
    const target = radius(getDieShape(6));
    for (const [sides, shape] of shapes()) {
      expect(radius(shape), `d${sides} radius`).toBeCloseTo(target, 5);
    }
  });
});

describe("settleQuat", () => {
  it("lands the requested face pointing up for every die", () => {
    for (const [sides, shape] of shapes()) {
      for (let num = 1; num <= sides; num++) {
        const q = settleQuat(shape, num);
        const face = shape.faces.find((f) => f.num === num)!;
        const up = qRotate(q, face.normal);
        // The chosen face's normal points straight up...
        expect(up[1], `d${sides} face ${num} up.y`).toBeCloseTo(1, 5);
        // ...and is the highest of all faces.
        for (const other of shape.faces) {
          const oy = qRotate(q, other.normal)[1];
          expect(oy, `d${sides} face ${num} vs ${other.num}`).toBeLessThanOrEqual(up[1] + 1e-6);
        }
      }
    }
  });
});

describe("getDieShape fallback", () => {
  it("returns the nearest supported die for unusual sizes", () => {
    expect(getDieShape(7).sides).toBe(6);
    expect(getDieShape(3).sides).toBe(2);
    expect(getDieShape(1000).sides).toBe(20);
    expect(getDieShape(18).sides).toBe(20);
  });
});

describe("splitPercentile", () => {
  it("splits a result into tens and units digits", () => {
    expect(splitPercentile(75)).toEqual({ tens: 7, units: 5 });
    expect(splitPercentile(5)).toEqual({ tens: 0, units: 5 });
    expect(splitPercentile(40)).toEqual({ tens: 4, units: 0 });
    // 100 reads as "00" + "0".
    expect(splitPercentile(100)).toEqual({ tens: 0, units: 0 });
  });
});
