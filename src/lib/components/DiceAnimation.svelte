<script lang="ts">
  import { onMount, tick } from "svelte";
  import type DiceBox from "@3d-dice/dice-box-threejs";
  import { parseFormula } from "$lib/dice.js";
  import { colorForRoll, diceForeground } from "$lib/player-colors.js";

  let { roll }: { roll: DiceRoll | null } = $props();

  // Dice the library can render faithfully. Anything else falls back to the
  // nearest of these, with the rolled value clamped onto its faces.
  const SUPPORTED = [2, 3, 4, 6, 8, 10, 12, 20];
  const MAX_VISIBLE_DICE = 50; // keep big rolls readable and the sim cheap
  const SETTLE_FADE_DELAY = 10_000; // ms the result lingers before fading out
  const FADE_MS = 1000; // opacity transition duration

  type DiceBoxCtor = new (selector: string, config: Record<string, unknown>) => DiceBox;

  type DiceBank = {
    key: string; // player name — one dice box per player
    domId: string; // unique element id the DiceBox renders into
    color: string;
    box: DiceBox | null;
    ready: Promise<void> | null;
    visible: boolean;
    fadeTimer?: ReturnType<typeof setTimeout>;
    clearTimer?: ReturnType<typeof setTimeout>;
  };

  // One bank (3D dice box) per player. The library clears a box on every roll,
  // so giving each player their own box means a player's roll only clears and
  // re-rolls their own dice — everyone else's stay on the board.
  let banks = $state<DiceBank[]>([]);
  let boxSeq = 0;
  let lastRolledId: string | null = null;

  let Ctor: DiceBoxCtor | null = null;
  let ctorReady: Promise<void> | null = null;

  onMount(() => {
    // Imported lazily so the WebGL/three.js bundle never runs during SSR.
    ctorReady = (async () => {
      const mod = await import("@3d-dice/dice-box-threejs");
      Ctor = mod.default as unknown as DiceBoxCtor;
    })();
    return () => {
      for (const bank of banks) {
        clearTimeout(bank.fadeTimer);
        clearTimeout(bank.clearTimer);
      }
    };
  });

  $effect(() => {
    // Trigger once per distinct roll; ignore unrelated reactive churn.
    if (roll && roll.id !== lastRolledId) {
      lastRolledId = roll.id;
      void handleRoll(roll);
    }
  });

  async function handleRoll(r: DiceRoll) {
    const bank = await ensureBank(r.player, colorForRoll(r));
    await trigger(bank, r);
  }

  // Find this player's bank, creating (and initializing) it on first use.
  async function ensureBank(key: string, color: string): Promise<DiceBank> {
    const existing = banks.find((b) => b.key === key);
    if (existing) return existing;

    const bank: DiceBank = {
      key,
      domId: `dice-overlay-${boxSeq++}`,
      color,
      box: null,
      ready: null,
      visible: false,
    };
    banks.push(bank);
    await tick(); // let the overlay element render before binding a DiceBox to it
    // Re-read from the reactive array so writes (box/ready/visible) go through
    // the Svelte proxy that the template observes.
    const live = banks.find((b) => b.domId === bank.domId)!;
    initBox(live);
    return live;
  }

  function initBox(bank: DiceBank): void {
    bank.ready = (async () => {
      if (ctorReady) await ctorReady;
      if (!Ctor) return;
      const box = new Ctor(`#${bank.domId}`, {
        assetPath: "/", // base for any textures/sounds, served from static/ root
        sounds: false,
        shadows: true,
        theme_surface: "green-felt", // invisible (transparent floor); just a valid key
        theme_customColorset: {
          // The player's assigned color, so their dice are easy to spot.
          name: `player-${bank.domId}`,
          foreground: diceForeground(bank.color), // contrasting numerals
          background: bank.color, // the dice body
          outline: "none",
          texture: "none", // solid colour, lit by the spotlight (no env map needed)
          material: "plastic",
        },
      });
      await box.initialize();
      bank.box = box;
    })();
  }

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

  function formulaSides(formula: string): number {
    const parsed = parseFormula(formula);
    return parsed ? parsed.sides : 6;
  }

  function scheduleHide(bank: DiceBank): void {
    bank.fadeTimer = setTimeout(() => {
      bank.visible = false;
      bank.clearTimer = setTimeout(() => bank.box?.clear(), FADE_MS);
    }, SETTLE_FADE_DELAY);
  }

  async function trigger(bank: DiceBank, r: DiceRoll): Promise<void> {
    if (!bank.ready) return;
    await bank.ready;
    if (!bank.box) return;

    clearTimeout(bank.fadeTimer);
    clearTimeout(bank.clearTimer);

    const dice = r.dice.slice(0, MAX_VISIBLE_DICE);
    if (dice.length === 0) return;

    bank.visible = true;
    await bank.box.roll(buildNotation(formulaSides(r.formula), dice));
    scheduleHide(bank);
  }
</script>

{#each banks as bank (bank.domId)}
  <div
    id={bank.domId}
    class="pointer-events-none fixed inset-0 z-20 transition-opacity"
    class:opacity-0={!bank.visible}
    class:opacity-100={bank.visible}
    style="transition-duration: {FADE_MS}ms"
  ></div>
{/each}
