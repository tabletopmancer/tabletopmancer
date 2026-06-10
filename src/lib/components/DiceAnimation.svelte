<script lang="ts">
  type Vec3 = [number, number, number];

  type AnimDie = {
    px: number;
    py: number;
    vx: number;
    vy: number;
    rx: number;
    ry: number;
    rz: number;
    wrx: number;
    wry: number;
    wrz: number;
    targetRx: number;
    targetRz: number;
    result: number;
    bounces: number;
  };

  // Cube vertices: [x, y, z] with half-size 1
  const VERTS: Vec3[] = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ];

  // Faces: vertex indices + face number (standard d6 layout)
  // face 1=top(+Y), 6=bottom(-Y), 2=front(+Z), 5=back(-Z), 3=right(+X), 4=left(-X)
  const FACES: { vi: number[]; num: number }[] = [
    { vi: [7, 6, 2, 3], num: 1 },
    { vi: [0, 1, 5, 4], num: 6 },
    { vi: [4, 5, 6, 7], num: 2 },
    { vi: [3, 2, 1, 0], num: 5 },
    { vi: [5, 1, 2, 6], num: 3 },
    { vi: [0, 4, 7, 3], num: 4 },
  ];

  // (rx, rz) rotation to put face N on top
  const FACE_UP: Record<number, [number, number]> = {
    1: [0, 0],
    2: [-Math.PI / 2, 0],
    3: [0, -Math.PI / 2],
    4: [0, Math.PI / 2],
    5: [Math.PI / 2, 0],
    6: [Math.PI, 0],
  };

  const FOCAL = 5;
  const HALF = 30;
  const VIEW_RX = -0.45;
  const GRAVITY = 1100;
  const RESTITUTION = 0.45;
  const SETTLE_START = 1700;
  const ANIM_END = 2800;
  const LIGHT: Vec3 = normalize([0.4, 1.0, 0.6]);
  const FACE_BASE: Vec3 = [232, 213, 183];

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

  function trigger(r: DiceRoll) {
    if (rafId) cancelAnimationFrame(rafId);
    visible = true;

    const MAX = Math.min(r.dice.length, 5);
    const spacing = window.innerWidth / (MAX + 1);

    const dice: AnimDie[] = r.dice.slice(0, MAX).map((result, i) => {
      const faceTarget = ((result - 1) % 6) + 1;
      const [targetRx, targetRz] = FACE_UP[faceTarget];
      return {
        px: spacing * (i + 1),
        py: -50 - Math.random() * 80,
        vx: (Math.random() - 0.5) * 120,
        vy: 220 + Math.random() * 160,
        rx: Math.random() * Math.PI * 2,
        ry: Math.random() * Math.PI * 2,
        rz: Math.random() * Math.PI * 2,
        wrx: (Math.random() - 0.5) * 22,
        wry: (Math.random() - 0.5) * 22,
        wrz: (Math.random() - 0.5) * 22,
        targetRx,
        targetRz,
        result,
        bounces: 0,
      };
    });

    let startTs = 0;
    let lastTs = 0;
    let dimsSet = false;

    function frame(ts: number) {
      if (!startTs) {
        startTs = ts;
        lastTs = ts;
      }
      const elapsed = ts - startTs;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      if (!canvas) {
        rafId = requestAnimationFrame(frame);
        return;
      }

      if (!dimsSet) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        dimsSet = true;
      }

      const W = canvas.width;
      const H = canvas.height;
      const FLOOR = H * 0.6;

      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, W, H);

      const settleT =
        elapsed >= SETTLE_START
          ? Math.min(1, (elapsed - SETTLE_START) / (ANIM_END - SETTLE_START))
          : 0;

      for (const d of dice) {
        d.vy += GRAVITY * dt;
        d.px += d.vx * dt;
        d.py += d.vy * dt;

        if (d.py >= FLOOR) {
          d.py = FLOOR;
          const rest = Math.max(0.08, RESTITUTION - d.bounces * 0.12);
          d.vy = -Math.abs(d.vy) * rest;
          d.vx *= 0.82;
          d.wrx *= 0.5;
          d.wry *= 0.5;
          d.wrz *= 0.5;
          d.bounces++;
        }

        const wall = HALF + 10;
        if (d.px < wall) {
          d.px = wall;
          d.vx = Math.abs(d.vx) * 0.7;
        }
        if (d.px > W - wall) {
          d.px = W - wall;
          d.vx = -Math.abs(d.vx) * 0.7;
        }

        d.rx += d.wrx * dt;
        d.ry += d.wry * dt;
        d.rz += d.wrz * dt;

        const decayRate = 2.8 + settleT * 9;
        d.wrx *= Math.max(0, 1 - decayRate * dt);
        d.wry *= Math.max(0, 1 - decayRate * dt);
        d.wrz *= Math.max(0, 1 - decayRate * dt);

        if (settleT > 0.25) {
          const st = Math.min(1, (settleT - 0.25) / 0.75);
          const lerpT = st * st * 0.12;
          d.rx += (d.targetRx - d.rx) * lerpT;
          d.rz += (d.targetRz - d.rz) * lerpT;
          if (d.py >= FLOOR - 2) {
            d.vy *= Math.max(0, 1 - st * 0.3);
            d.vx *= Math.max(0, 1 - st * 0.15);
          }
        }

        drawDie(ctx, d);
      }

      if (elapsed < ANIM_END) {
        rafId = requestAnimationFrame(frame);
      } else {
        visible = false;
        rafId = 0;
      }
    }

    rafId = requestAnimationFrame(frame);
  }

  function rotX(v: Vec3, a: number): Vec3 {
    const c = Math.cos(a),
      s = Math.sin(a);
    return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
  }

  function rotY(v: Vec3, a: number): Vec3 {
    const c = Math.cos(a),
      s = Math.sin(a);
    return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
  }

  function rotZ(v: Vec3, a: number): Vec3 {
    const c = Math.cos(a),
      s = Math.sin(a);
    return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
  }

  function dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function normalize(v: Vec3): Vec3 {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 1, 0];
  }

  function faceNormal(fv: Vec3[]): Vec3 {
    const e1: Vec3 = [fv[1][0] - fv[0][0], fv[1][1] - fv[0][1], fv[1][2] - fv[0][2]];
    const e2: Vec3 = [fv[3][0] - fv[0][0], fv[3][1] - fv[0][1], fv[3][2] - fv[0][2]];
    return normalize([
      e1[1] * e2[2] - e1[2] * e2[1],
      e1[2] * e2[0] - e1[0] * e2[2],
      e1[0] * e2[1] - e1[1] * e2[0],
    ]);
  }

  function drawDie(ctx: CanvasRenderingContext2D, d: AnimDie) {
    // Die-rotated vertices (no view tilt) — used for lighting normals
    const dverts = VERTS.map((v) => rotZ(rotY(rotX(v, d.rx), d.ry), d.rz));
    // View-tilted vertices — used for projection
    const tverts = dverts.map((v) => rotX(v, VIEW_RX));

    const pverts = tverts.map((v) => {
      const dz = FOCAL - v[2];
      const scale = (FOCAL / dz) * HALF;
      return [v[0] * scale + d.px, -v[1] * scale + d.py] as [number, number];
    });

    const sorted = FACES.map((f) => {
      const avgZ = f.vi.reduce((s, i) => s + tverts[i][2], 0) / 4;
      return { ...f, avgZ };
    }).sort((a, b) => a.avgZ - b.avgZ);

    for (const f of sorted) {
      const pts = f.vi.map((i) => pverts[i]);
      const n = faceNormal(f.vi.map((i) => dverts[i]));
      const diffuse = Math.max(0, dot(n, LIGHT));
      const brightness = 0.42 + 0.58 * diffuse;
      const r = Math.round(FACE_BASE[0] * brightness);
      const g = Math.round(FACE_BASE[1] * brightness);
      const b = Math.round(FACE_BASE[2] * brightness);

      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
      ctx.closePath();
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fill();
      ctx.strokeStyle = "rgba(80,40,10,0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Show result number on clearly front-facing faces
      if (f.avgZ > 0.1) {
        const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        ctx.fillStyle = "rgba(60,20,0,0.85)";
        ctx.font = `bold ${Math.round(HALF * 0.9)}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(d.result), cx, cy);
      }
    }
  }
</script>

{#if visible}
  <canvas bind:this={canvas} class="pointer-events-none fixed inset-0 z-50"></canvas>
{/if}
