// Geometry and orientation math for the 3D dice roll animation.
//
// Each standard tabletop die is described by a `DieShape`: a set of vertices and
// faces for a polyhedron centered at the origin. The renderer in
// `DiceAnimation.svelte` projects these and the settle logic uses `settleQuat`
// to land the rolled face pointing up.
//
// Orientation is represented as a quaternion `[w, x, y, z]`, which lets us land
// arbitrary (non-axis-aligned) faces up — a pair of Euler angles is not enough
// for the octahedron/trapezohedron/icosahedron.

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number]; // [w, x, y, z]

export type DieFace = { vi: number[]; num: number; normal: Vec3 };
export type DieShape = { sides: number; verts: Vec3[]; faces: DieFace[] };

const UP: Vec3 = [0, 1, 0];
// All shapes are scaled to this circumradius so they share an on-screen size.
// The reference cube's vertices already sit at this radius, so the d6 is
// untouched and renders exactly as before.
const TARGET_R = Math.sqrt(3);

// --- vector helpers ---------------------------------------------------------

function vadd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vsub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vscale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function vdot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function vcross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function vlen(a: Vec3): number {
  return Math.sqrt(vdot(a, a));
}

export function vnorm(a: Vec3): Vec3 {
  const len = vlen(a);
  return len > 1e-9 ? [a[0] / len, a[1] / len, a[2] / len] : [0, 1, 0];
}

function centroid(points: Vec3[]): Vec3 {
  const sum = points.reduce<Vec3>((acc, p) => vadd(acc, p), [0, 0, 0]);
  return vscale(sum, 1 / points.length);
}

// --- quaternion helpers -----------------------------------------------------

export const QUAT_IDENTITY: Quat = [1, 0, 0, 0];

export function qMul(a: Quat, b: Quat): Quat {
  const [aw, ax, ay, az] = a;
  const [bw, bx, by, bz] = b;
  return [
    aw * bw - ax * bx - ay * by - az * bz,
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
  ];
}

export function qNormalize(q: Quat): Quat {
  const len = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
  if (len < 1e-9) return QUAT_IDENTITY;
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

export function qFromAxisAngle(axis: Vec3, angle: number): Quat {
  const a = vnorm(axis);
  const half = angle / 2;
  const s = Math.sin(half);
  return [Math.cos(half), a[0] * s, a[1] * s, a[2] * s];
}

// Rotate a vector by a unit quaternion.
export function qRotate(q: Quat, v: Vec3): Vec3 {
  const [w, x, y, z] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}

// Shortest-arc rotation taking unit vector `from` onto unit vector `to`.
export function qBetween(from: Vec3, to: Vec3): Quat {
  const f = vnorm(from);
  const t = vnorm(to);
  const d = vdot(f, t);
  if (d > 0.999999) return QUAT_IDENTITY;
  if (d < -0.999999) {
    // Antiparallel: rotate 180° about any axis perpendicular to `from`.
    let axis = vcross([1, 0, 0], f);
    if (vlen(axis) < 1e-6) axis = vcross([0, 1, 0], f);
    return qFromAxisAngle(axis, Math.PI);
  }
  const c = vcross(f, t);
  return qNormalize([1 + d, c[0], c[1], c[2]]);
}

// Spherical linear interpolation from `a` toward `b` by `t` in [0, 1].
export function qSlerp(a: Quat, b: Quat, t: number): Quat {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let target = b;
  if (dot < 0) {
    target = [-b[0], -b[1], -b[2], -b[3]];
    dot = -dot;
  }
  if (dot > 0.9995) {
    // Nearly aligned — normalized lerp avoids division by ~zero.
    return qNormalize([
      a[0] + (target[0] - a[0]) * t,
      a[1] + (target[1] - a[1]) * t,
      a[2] + (target[2] - a[2]) * t,
      a[3] + (target[3] - a[3]) * t,
    ]);
  }
  const theta0 = Math.acos(dot);
  const sinTheta0 = Math.sin(theta0);
  const s0 = Math.cos(theta0 * t) - (dot * Math.sin(theta0 * t)) / sinTheta0;
  const s1 = Math.sin(theta0 * t) / sinTheta0;
  return [
    a[0] * s0 + target[0] * s1,
    a[1] * s0 + target[1] * s1,
    a[2] * s0 + target[2] * s1,
    a[3] * s0 + target[3] * s1,
  ];
}

// --- shape construction -----------------------------------------------------

// Scale vertices to the shared circumradius and derive each face's outward
// normal from its centroid (exact for the origin-centered, symmetric solids we
// use, and good enough for the trapezohedron's kites).
//
// The first `sides` faces carry the die's values (num 1..sides); any extra
// faces (the d2 coin's rim) are unnumbered (num 0) and never settled toward.
function makeShape(sides: number, rawVerts: Vec3[], faceVi: number[][]): DieShape {
  const maxR = Math.max(...rawVerts.map(vlen));
  const scale = maxR > 1e-9 ? TARGET_R / maxR : 1;
  const verts = rawVerts.map((v) => vscale(v, scale));
  const faces: DieFace[] = faceVi.map((vi, i) => ({
    vi,
    num: i < sides ? i + 1 : 0,
    normal: vnorm(centroid(vi.map((idx) => verts[idx]))),
  }));
  return { sides, verts, faces };
}

function buildCube(): DieShape {
  const verts: Vec3[] = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ];
  const faces: number[][] = [
    [7, 6, 2, 3], // +Y
    [0, 1, 5, 4], // -Y
    [4, 5, 6, 7], // +Z
    [3, 2, 1, 0], // -Z
    [5, 1, 2, 6], // +X
    [0, 4, 7, 3], // -X
  ];
  return makeShape(6, verts, faces);
}

function buildTetrahedron(): DieShape {
  const verts: Vec3[] = [
    [1, 1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
  ];
  // Each face omits one vertex.
  const faces = [
    [1, 2, 3],
    [0, 3, 2],
    [0, 1, 3],
    [0, 2, 1],
  ];
  return makeShape(4, verts, faces);
}

function buildOctahedron(): DieShape {
  const verts: Vec3[] = [
    [1, 0, 0], // 0 +X
    [-1, 0, 0], // 1 -X
    [0, 1, 0], // 2 +Y
    [0, -1, 0], // 3 -Y
    [0, 0, 1], // 4 +Z
    [0, 0, -1], // 5 -Z
  ];
  const faces = [
    [0, 2, 4],
    [2, 1, 4],
    [1, 3, 4],
    [3, 0, 4],
    [2, 0, 5],
    [1, 2, 5],
    [3, 1, 5],
    [0, 3, 5],
  ];
  return makeShape(8, verts, faces);
}

// All triangles of three mutually adjacent vertices are faces of the
// icosahedron (its surface is a triangulation with no internal chords).
function buildIcosahedron(): DieShape {
  const phi = (1 + Math.sqrt(5)) / 2;
  const verts: Vec3[] = [
    [0, 1, phi],
    [0, -1, phi],
    [0, 1, -phi],
    [0, -1, -phi],
    [1, phi, 0],
    [-1, phi, 0],
    [1, -phi, 0],
    [-1, -phi, 0],
    [phi, 0, 1],
    [phi, 0, -1],
    [-phi, 0, 1],
    [-phi, 0, -1],
  ];
  const edge2 = 4; // squared edge length for these coordinates
  const adjacent = (a: number, b: number) =>
    Math.abs(vdot(vsub(verts[a], verts[b]), vsub(verts[a], verts[b])) - edge2) < 1e-6;

  const faces: number[][] = [];
  for (let a = 0; a < verts.length; a++) {
    for (let b = a + 1; b < verts.length; b++) {
      if (!adjacent(a, b)) continue;
      for (let c = b + 1; c < verts.length; c++) {
        if (adjacent(a, c) && adjacent(b, c)) faces.push([a, b, c]);
      }
    }
  }
  return makeShape(20, verts, faces);
}

// The dodecahedron is the dual of the icosahedron: its vertices are the
// icosahedron's face centroids and its faces ring the icosahedron's vertices.
function buildDodecahedron(): DieShape {
  const icosa = buildIcosahedron();
  const dualVerts: Vec3[] = icosa.faces.map((f) => centroid(f.vi.map((i) => icosa.verts[i])));

  const faces: number[][] = [];
  for (let v = 0; v < icosa.verts.length; v++) {
    const incident = icosa.faces
      .map((f, i) => ({ i, f }))
      .filter(({ f }) => f.vi.includes(v))
      .map(({ i }) => i);

    // Order the ring of dual vertices by angle around the icosahedron vertex.
    const axis = vnorm(icosa.verts[v]);
    const ref = vnorm(
      vsub(dualVerts[incident[0]], vscale(axis, vdot(dualVerts[incident[0]], axis))),
    );
    const refCross = vcross(axis, ref);
    const ordered = incident.toSorted((p, q) => {
      const angle = (di: number) => {
        const proj = vsub(dualVerts[di], vscale(axis, vdot(dualVerts[di], axis)));
        return Math.atan2(vdot(proj, refCross), vdot(proj, ref));
      };
      return angle(p) - angle(q);
    });
    faces.push(ordered);
  }
  return makeShape(12, dualVerts, faces);
}

// Pentagonal trapezohedron: two apexes and two offset rings of five vertices,
// joined into ten congruent kite faces. Used for the d10 (and the d100 pair).
function buildD10(): DieShape {
  const n = 5;
  const ringY = 0.45;
  const apexY = 1.4;
  const verts: Vec3[] = [
    [0, apexY, 0], // 0 north apex
    [0, -apexY, 0], // 1 south apex
  ];
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    verts.push([Math.cos(a), ringY, Math.sin(a)]); // upper ring: 2..6
  }
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n + Math.PI / n;
    verts.push([Math.cos(a), -ringY, Math.sin(a)]); // lower ring: 7..11
  }
  const upper = (i: number) => 2 + (i % n);
  const lower = (i: number) => 7 + (i % n);
  const faces: number[][] = [];
  for (let i = 0; i < n; i++) {
    faces.push([0, upper(i), lower(i), upper(i + 1)]);
  }
  for (let i = 0; i < n; i++) {
    faces.push([1, lower(i + 1), upper(i + 1), lower(i)]);
  }
  return makeShape(10, verts, faces);
}

// d2 as a thin octagonal coin: large faces show 1 and 2, thin rim faces fill in.
function buildD2(): DieShape {
  const n = 8;
  const r = 1;
  const t = 0.18;
  const top: number[] = [];
  const bottom: number[] = [];
  const verts: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    verts.push([Math.cos(a) * r, t, Math.sin(a) * r]);
    top.push(verts.length - 1);
  }
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    verts.push([Math.cos(a) * r, -t, Math.sin(a) * r]);
    bottom.push(verts.length - 1);
  }
  // Face 1 (top) and face 2 (bottom) must come first so num 1/2 are targetable.
  const faces: number[][] = [top, bottom.toReversed()];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([top[i], top[j], bottom[j], bottom[i]]);
  }
  return makeShape(2, verts, faces);
}

const SHAPES: Record<number, DieShape> = {
  2: buildD2(),
  4: buildTetrahedron(),
  6: buildCube(),
  8: buildOctahedron(),
  10: buildD10(),
  12: buildDodecahedron(),
  20: buildIcosahedron(),
};

const SUPPORTED_SIDES = Object.keys(SHAPES).map(Number);

// Return the shape for `sides`, falling back to the nearest supported die so an
// unusual size (d7, d1000, …) still renders something sensible.
export function getDieShape(sides: number): DieShape {
  const exact = SHAPES[sides];
  if (exact) return exact;
  const nearest = SUPPORTED_SIDES.reduce((best, s) =>
    Math.abs(s - sides) < Math.abs(best - sides) ? s : best,
  );
  return SHAPES[nearest];
}

// Orientation that lands the face numbered `num` pointing up (+Y).
export function settleQuat(shape: DieShape, num: number): Quat {
  const face = shape.faces.find((f) => f.num === num) ?? shape.faces[0];
  return qBetween(face.normal, UP);
}

// Split a 1..100 percentile result into the tens and units digits shown on the
// two d10s (100 reads as "00" + "0").
export function splitPercentile(result: number): { tens: number; units: number } {
  const r = result % 100;
  return { tens: Math.floor(r / 10), units: r % 10 };
}
