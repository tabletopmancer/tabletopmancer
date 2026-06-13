<script lang="ts">
  import { parseFormula } from "$lib/dice.js";
  import {
    getDieShape,
    qFromAxisAngle,
    qMul,
    qNormalize,
    qRotate,
    qSlerp,
    settleQuat,
    splitPercentile,
    vnorm,
    type DieShape,
    type Quat,
    type Vec3,
  } from "$lib/dice-shapes.js";

  type AnimDie = {
    px: number;
    py: number;
    vx: number;
    vy: number;
    q: Quat; // current orientation
    w: Vec3; // angular velocity (world space, rad/s)
    targetQ: Quat; // orientation that lands the rolled face up
    label: string; // text drawn on the visible faces
    shape: DieShape;
    bounces: number;
  };

  const FOCAL = 5;
  const HALF = 30;
  const VIEW_RX = -0.45;
  const GRAVITY = 1100;
  const RESTITUTION = 0.45;
  const SETTLE_START = 1700;
  const ANIM_END = 2800;
  const LIGHT: Vec3 = vnorm([0.4, 1.0, 0.6]);
  const FACE_BASE: Vec3 = [232, 213, 183];

  // Physics helpers at module level to keep the animation loop simple. They are
  // shape-independent: they move the die, bounce it, and steer its orientation
  // toward the settle target.

  // Advance the orientation by the current angular velocity.
  function integrateRotation(die: AnimDie, dt: number): void {
    const wmag = Math.hypot(die.w[0], die.w[1], die.w[2]);
    if (wmag <= 1e-6) return;
    const axis: Vec3 = [die.w[0] / wmag, die.w[1] / wmag, die.w[2] / wmag];
    die.q = qNormalize(qMul(qFromAxisAngle(axis, wmag * dt), die.q));
  }

  // Keep the die inside the side walls, reflecting its horizontal velocity.
  function applyWalls(die: AnimDie, width: number): void {
    const wall = HALF + 10;
    if (die.px < wall) {
      die.px = wall;
      die.vx = Math.abs(die.vx) * 0.7;
    } else if (die.px > width - wall) {
      die.px = width - wall;
      die.vx = -Math.abs(die.vx) * 0.7;
    }
  }

  function applyFloorBounce(die: AnimDie, dt: number, floor: number, width: number): void {
    die.vy += GRAVITY * dt;
    die.px += die.vx * dt;
    die.py += die.vy * dt;
    if (die.py >= floor) {
      die.py = floor;
      const rest = Math.max(0.08, RESTITUTION - die.bounces * 0.12);
      die.vy = -Math.abs(die.vy) * rest;
      die.vx *= 0.82;
      die.w = [die.w[0] * 0.5, die.w[1] * 0.5, die.w[2] * 0.5];
      die.bounces++;
    }
    integrateRotation(die, dt);
    applyWalls(die, width);
  }

  function applySettle(die: AnimDie, dt: number, settleT: number, floor: number): void {
    const decayRate = 2.8 + settleT * 9;
    const f = Math.max(0, 1 - decayRate * dt);
    die.w = [die.w[0] * f, die.w[1] * f, die.w[2] * f];
    if (settleT > 0.25) {
      const progress = Math.min(1, (settleT - 0.25) / 0.75);
      const lerpRate = progress * progress * 0.12;
      die.q = qSlerp(die.q, die.targetQ, lerpRate);
      if (die.py >= floor - 2) {
        die.vy *= Math.max(0, 1 - progress * 0.3);
        die.vx *= Math.max(0, 1 - progress * 0.15);
      }
    }
  }

  let { roll }: { roll: DiceRoll | null } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let visible = $state(false);
  let rafId = 0;

  $effect(() => {
    if (roll) trigger(roll);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  });

  function randomQuat(): Quat {
    const axis: Vec3 = [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1];
    return qFromAxisAngle(axis, Math.random() * Math.PI * 2);
  }

  function randomSpin(): number {
    return (Math.random() - 0.5) * 22;
  }

  // A render spec is one drawn die. Most rolls map a result to a single die;
  // a d100 splits each result into a tens + units pair of d10s.
  type Spec = { shape: DieShape; label: string; faceNum: number };

  function buildSpecs(sides: number, results: number[]): Spec[] {
    if (sides === 100) {
      const d10 = getDieShape(10);
      return results.flatMap((result) => {
        const { tens, units } = splitPercentile(result);
        return [
          { shape: d10, label: String(tens * 10).padStart(2, "0"), faceNum: tens + 1 },
          { shape: d10, label: String(units), faceNum: units + 1 },
        ];
      });
    }
    const shape = getDieShape(sides);
    return results.map((result) => ({
      shape,
      label: String(result),
      faceNum: ((result - 1) % shape.sides) + 1,
    }));
  }

  function createDie(spec: Spec, px: number): AnimDie {
    return {
      px,
      py: -50 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 120,
      vy: 220 + Math.random() * 160,
      q: randomQuat(),
      w: [randomSpin(), randomSpin(), randomSpin()],
      targetQ: settleQuat(spec.shape, spec.faceNum),
      label: spec.label,
      shape: spec.shape,
      bounces: 0,
    };
  }

  function trigger(r: DiceRoll) {
    if (rafId) cancelAnimationFrame(rafId);

    const sides = parseFormula(r.formula)?.sides ?? 6;
    const specs = buildSpecs(sides, r.dice.slice(0, 5));
    const spacing = window.innerWidth / (specs.length + 1);
    const dice = specs.map((spec, idx) => createDie(spec, spacing * (idx + 1)));

    let startTs = 0;
    let lastTs = 0;

    // canvas is always in the DOM (hidden attribute), so it's safe to size it now
    visible = true;
    canvas!.width = window.innerWidth;
    canvas!.height = window.innerHeight;

    function frame(ts: number) {
      const elapsed = ts - startTs;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      const { width: W, height: H } = canvas!;
      const FLOOR = H * 0.6;
      const settleT = Math.min(1, Math.max(0, elapsed - SETTLE_START) / (ANIM_END - SETTLE_START));

      const ctx = canvas!.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, W, H);

      for (const die of dice) {
        applyFloorBounce(die, dt, FLOOR, W);
        applySettle(die, dt, settleT, FLOOR);
        drawDie(ctx, die);
      }

      if (elapsed < ANIM_END) {
        rafId = requestAnimationFrame(frame);
      } else {
        visible = false;
        rafId = 0;
      }
    }

    // Seed timestamps on the first tick, then hand off to the main loop
    rafId = requestAnimationFrame((ts) => {
      startTs = ts;
      lastTs = ts;
      rafId = requestAnimationFrame(frame);
    });
  }

  function rotX(v: Vec3, angle: number): Vec3 {
    const c = Math.cos(angle),
      s = Math.sin(angle);
    return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
  }

  function dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function drawDie(ctx: CanvasRenderingContext2D, die: AnimDie) {
    const shape = die.shape;
    // Die-rotated vertices (no view tilt) — face normals come from these.
    const dverts = shape.verts.map((v) => qRotate(die.q, v));
    // View-tilted vertices — used for projection.
    const tverts = dverts.map((v) => rotX(v, VIEW_RX));

    const pverts = tverts.map((v) => {
      const dz = FOCAL - v[2];
      const scale = (FOCAL / dz) * HALF;
      return [v[0] * scale + die.px, -v[1] * scale + die.py] as [number, number];
    });

    const sorted = shape.faces
      .map((face) => {
        const avgZ = face.vi.reduce((sum, idx) => sum + tverts[idx][2], 0) / face.vi.length;
        return { face, avgZ };
      })
      .toSorted((a, b) => a.avgZ - b.avgZ);

    for (const { face, avgZ } of sorted) {
      const pts = face.vi.map((idx) => pverts[idx]);
      // World-space normal (orientation only, no view tilt) for flat shading.
      const n = qRotate(die.q, face.normal);
      const brightness = 0.42 + 0.58 * Math.max(0, dot(n, LIGHT));
      const red = Math.round(FACE_BASE[0] * brightness);
      const grn = Math.round(FACE_BASE[1] * brightness);
      const blu = Math.round(FACE_BASE[2] * brightness);

      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
      ctx.closePath();
      ctx.fillStyle = `rgb(${red},${grn},${blu})`;
      ctx.fill();
      ctx.strokeStyle = "rgba(80,40,10,0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Show the result on clearly front-facing faces.
      if (avgZ > 0.1) {
        const cx = pts.reduce((sum, pt) => sum + pt[0], 0) / pts.length;
        const cy = pts.reduce((sum, pt) => sum + pt[1], 0) / pts.length;
        ctx.fillStyle = "rgba(60,20,0,0.85)";
        ctx.font = `bold ${Math.round(HALF * 0.9)}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(die.label, cx, cy);
      }
    }
  }
</script>

<canvas bind:this={canvas} hidden={!visible} class="pointer-events-none fixed inset-0 z-50"
></canvas>
