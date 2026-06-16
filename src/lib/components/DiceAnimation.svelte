<script lang="ts">
  import { onMount } from "svelte";
  import type DiceBox from "@3d-dice/dice-box-threejs";
  import { parseFormula } from "$lib/dice.js";

  let { roll }: { roll: DiceRoll | null } = $props();

  // Dice the library can render faithfully. Anything else falls back to the
  // nearest of these, with the rolled value clamped onto its faces.
  const SUPPORTED = [2, 3, 4, 6, 8, 10, 12, 20];
  const MAX_VISIBLE_DICE = 50; // keep big rolls readable and the sim cheap
  const SETTLE_FADE_DELAY = 10_000; // ms the result lingers before fading out
  const FADE_MS = 1000; // opacity transition duration

  let container: HTMLDivElement | undefined = $state();
  let visible = $state(false);
  let box: DiceBox | null = null;
  let ready: Promise<void> | null = null;
  let lastRolledId: string | null = null;
  let fadeTimer: ReturnType<typeof setTimeout> | undefined;
  let clearTimer: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
    // Imported lazily so the WebGL/three.js bundle never runs during SSR.
    ready = (async () => {
      const { default: DiceBoxCtor } = await import("@3d-dice/dice-box-threejs");
      box = new DiceBoxCtor("#dice-overlay", {
        assetPath: "/", // base for any textures/sounds, served from static/ root
        sounds: false,
        shadows: true,
        theme_surface: "green-felt", // invisible (transparent floor); just a valid key
        theme_customColorset: {
          // Purple dice, echoing the app's violet accent (the fog brush controls).
          name: "tabletopmancer",
          foreground: "#ede9fe", // violet-100 — near-white numerals for contrast
          background: "#7c3aed", // violet-600 — the dice body
          outline: "none",
          texture: "none", // solid colour, lit by the spotlight (no env map needed)
          material: "plastic",
        },
      });
      await box.initialize();
    })();
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(clearTimer);
    };
  });

  $effect(() => {
    // Trigger once per distinct roll; ignore unrelated reactive churn.
    if (roll && roll.id !== lastRolledId) {
      lastRolledId = roll.id;
      void trigger(roll);
    }
  });

  function nearest(value: number): number {
    return SUPPORTED.reduce((best, n) => (Math.abs(n - value) < Math.abs(best - value) ? n : best));
  }

  // A d100 is shown as the classic percentile pair: a tens d10 + a units d10.
  // The tens die takes the tens digit (0 renders as "00"); the units die takes
  // the units digit (0 renders as the "0"-labelled face, value 10).
  function percentileNotation(result: number): string {
    const r = result % 100;
    const tens = Math.floor(r / 10);
    const units = r % 10;
    return `1d100@${tens}+1d10@${units === 0 ? 10 : units}`;
  }

  function buildNotation(sides: number, dice: number[]): string {
    if (sides === 100) return dice.map(percentileNotation).join("+");
    const type = SUPPORTED.includes(sides) ? sides : nearest(sides);
    // For supported sides this is the value verbatim; for a fallback die it
    // wraps the value onto the available faces so the roll still animates.
    const faces = dice.map((v) => ((v - 1) % type) + 1);
    return `${dice.length}d${type}@${faces.join(",")}`;
  }

  async function trigger(r: DiceRoll) {
    if (!ready) return;
    await ready;
    if (!box) return;

    clearTimeout(fadeTimer);
    clearTimeout(clearTimer);

    const sides = parseFormula(r.formula)?.sides ?? 6;
    const dice = r.dice.slice(0, MAX_VISIBLE_DICE);
    if (dice.length === 0) return;

    visible = true;
    await box.roll(buildNotation(sides, dice));

    // Let the result rest, then fade the overlay and drop the dice.
    fadeTimer = setTimeout(() => {
      visible = false;
      clearTimer = setTimeout(() => box?.clear(), FADE_MS);
    }, SETTLE_FADE_DELAY);
  }
</script>

<div
  bind:this={container}
  id="dice-overlay"
  class="pointer-events-none fixed inset-0 z-20 transition-opacity"
  class:opacity-0={!visible}
  class:opacity-100={visible}
  style="transition-duration: {FADE_MS}ms"
></div>
