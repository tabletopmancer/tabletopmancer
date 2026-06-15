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
    label: string;
    shape: DieShape;
    bounces: number;
  };

  // Orthographic top-down view: camera at +Y looking down the -Y axis.
  // World X → screen X, World Z → screen Y, World Y → depth.
  const HALF = 32; // die render radius in pixels
  const FRICTION = 0.9; // linear velocity decay per second
  const SPIN_FRICTION = 0.15; // angular velocity decay per second (ambient)
  const RESTITUTION = 0.7; // wall bounce coefficient
  const WALL = HALF + 10; // clearance from canvas edge
  const SETTLE_START = 1600; // ms when settling begins
  const ANIM_END = 2800; // ms total animation duration
  const LIGHT: Vec3 = vnorm([0.3, 1.0, 0.4]); // mostly from above, slightly angled
  const FACE_BASE: Vec3 = [232, 213, 183];

  function integrateRotation(die: AnimDie, dt: number): void {
    const wmag = Math.hypot(die.w[0], die.w[1], die.w[2]);
    if (wmag <= 1e-6) return;
    const axis: Vec3 = [die.w[0] / wmag, die.w[1] / wmag, die.w[2] / wmag];
    die.q = qNormalize(qMul(qFromAxisAngle(axis, wmag * dt), die.q));
  }

  // Slide the die across the table with friction; bounce off all four walls.
  function applyPhysics(die: AnimDie, dt: number, W: number, H: number): void {
    const linDecay = Math.max(0, 1 - FRICTION * dt);
    die.vx *= linDecay;
    die.vy *= linDecay;
    die.px += die.vx * dt;
    die.py += die.vy * dt;

    const spinDecay = Math.max(0, 1 - SPIN_FRICTION * dt);
    die.w = [die.w[0] * spinDecay, die.w[1] * spinDecay, die.w[2] * spinDecay];

    if (die.px < WALL) {
      die.px = WALL;
      die.vx = Math.abs(die.vx) * RESTITUTION;
      die.w = [die.w[0] * 0.6, die.w[1] * 0.6, die.w[2] * 0.6];
      die.bounces++;
    } else if (die.px > W - WALL) {
      die.px = W - WALL;
      die.vx = -Math.abs(die.vx) * RESTITUTION;
      die.w = [die.w[0] * 0.6, die.w[1] * 0.6, die.w[2] * 0.6];
      die.bounces++;
    }
    if (die.py < WALL) {
      die.py = WALL;
      die.vy = Math.abs(die.vy) * RESTITUTION;
      die.w = [die.w[0] * 0.6, die.w[1] * 0.6, die.w[2] * 0.6];
      die.bounces++;
    } else if (die.py > H - WALL) {
      die.py = H - WALL;
      die.vy = -Math.abs(die.vy) * RESTITUTION;
      die.w = [die.w[0] * 0.6, die.w[1] * 0.6, die.w[2] * 0.6];
      die.bounces++;
    }

    integrateRotation(die, dt);
  }

  // Damp spin and steer orientation toward the target face during the settle phase.
  function applySettle(die: AnimDie, dt: number, settleT: number): void {
    const decayRate = 2.8 + settleT * 9;
    const f = Math.max(0, 1 - decayRate * dt);
    die.w = [die.w[0] * f, die.w[1] * f, die.w[2] * f];
    if (settleT > 0.25) {
      const progress = Math.min(1, (settleT - 0.25) / 0.75);
      die.q = qSlerp(die.q, die.targetQ, progress * progress * 0.12);
      const extraDecay = Math.max(0, 1 - progress * 3 * dt);
      die.vx *= extraDecay;
      die.vy *= extraDecay;
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
    return (Math.random() - 0.5) * 18;
  }

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

  function createDie(spec: Spec, px: number, py: number, angle: number): AnimDie {
    const speed = 500 + Math.random() * 320;
    return {
      px,
      py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
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

    visible = true;
    canvas!.width = window.innerWidth;
    canvas!.height = window.innerHeight;
    const W = canvas!.width;
    const H = canvas!.height;

    // Spawn dice near center with evenly-distributed launch angles so they scatter nicely.
    const dice = specs.map((spec, idx) => {
      const angle = (idx / specs.length) * Math.PI * 2 + Math.random() * 0.8;
      return createDie(
        spec,
        W / 2 + (Math.random() - 0.5) * 50,
        H / 2 + (Math.random() - 0.5) * 50,
        angle,
      );
    });

    let startTs = 0;
    let lastTs = 0;

    function frame(ts: number) {
      const elapsed = ts - startTs;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      const ctx = canvas!.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);

      // Dark table overlay
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(0, 0, W, H);

      // Decorative border frame
      const bw = 8;
      ctx.strokeStyle = "rgba(140,95,35,0.92)";
      ctx.lineWidth = bw;
      ctx.strokeRect(bw / 2, bw / 2, W - bw, H - bw);
      ctx.strokeStyle = "rgba(215,170,80,0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(bw + 3, bw + 3, W - bw * 2 - 6, H - bw * 2 - 6);

      const settleT = Math.min(1, Math.max(0, elapsed - SETTLE_START) / (ANIM_END - SETTLE_START));

      for (const die of dice) {
        applyPhysics(die, dt, W, H);
        if (settleT > 0) applySettle(die, dt, settleT);
        drawDie(ctx, die);
      }

      if (elapsed < ANIM_END) {
        rafId = requestAnimationFrame(frame);
      } else {
        visible = false;
        rafId = 0;
      }
    }

    rafId = requestAnimationFrame((ts) => {
      startTs = ts;
      lastTs = ts;
      rafId = requestAnimationFrame(frame);
    });
  }

  function dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function drawDie(ctx: CanvasRenderingContext2D, die: AnimDie): void {
    const shape = die.shape;

    // Rotate vertices to world orientation.
    const wverts = shape.verts.map((v) => qRotate(die.q, v));

    // Orthographic top-down projection: drop Y, map world (X, Z) → screen (X, Y).
    const pverts = wverts.map(
      (v) => [v[0] * HALF + die.px, v[2] * HALF + die.py] as [number, number],
    );

    // Sort faces by world Y ascending — lower Y = further from camera = drawn first.
    const sorted = shape.faces
      .map((face) => {
        const avgY = face.vi.reduce((sum, idx) => sum + wverts[idx][1], 0) / face.vi.length;
        return { face, avgY };
      })
      .toSorted((a, b) => a.avgY - b.avgY);

    // Soft drop shadow beneath the die.
    const grd = ctx.createRadialGradient(
      die.px + 5,
      die.py + 7,
      0,
      die.px + 5,
      die.py + 7,
      HALF * 1.3,
    );
    grd.addColorStop(0, "rgba(0,0,0,0.42)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(die.px + 5, die.py + 7, HALF * 1.15, HALF * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    for (const { face, avgY } of sorted) {
      const pts = face.vi.map((idx) => pverts[idx]);
      // World-space normal for flat shading — light is mostly from above.
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

      // Draw the result label on faces clearly pointing toward the camera (+Y).
      if (avgY > 0.2) {
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
