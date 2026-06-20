<script lang="ts">
  import { Dices } from "@lucide/svelte";
  import { rollDice } from "$lib/table.remote";
  import { MAX_DICE_COUNT } from "$lib/dice";

  let {
    tableId,
    role,
  }: {
    tableId: string;
    role: "DM" | "PLAYER";
  } = $props();

  const DICE = [4, 6, 8, 10, 12, 20] as const;

  let formula = $state("");
  let isPrivate = $state(true);
  let rolling = $state(false);
  let counts = $state<Record<number, number>>(Object.fromEntries(DICE.map((s) => [s, 1])));

  async function roll(f: string) {
    if (!f || rolling) return;
    rolling = true;
    try {
      await rollDice({ tableId, formula: f, private: isPrivate });
      if (f === formula.trim()) formula = "";
    } finally {
      rolling = false;
    }
  }

  function adjustCount(sides: number, e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    counts[sides] = Math.min(MAX_DICE_COUNT, Math.max(1, counts[sides] + delta));
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") roll(formula.trim());
  }
</script>

<div class="flex items-center gap-2">
  <div class="flex items-center gap-0.5">
    {#each DICE as sides}
      <button
        onclick={() => roll(`${counts[sides]}d${sides}`)}
        onwheel={(e) => adjustCount(sides, e)}
        disabled={rolling}
        aria-label="Roll {counts[sides]}d{sides}"
        title="Scroll to change number of dice"
        class="cursor-pointer rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 disabled:opacity-40"
      >
        {counts[sides] > 1 ? counts[sides] : ""}d{sides}
      </button>
    {/each}
  </div>

  <div class="h-4 w-px shrink-0 bg-zinc-700/60"></div>

  <div class="flex items-center gap-1">
    <input
      type="text"
      bind:value={formula}
      onkeydown={handleKeydown}
      placeholder="2d6+3"
      aria-label="Custom dice formula"
      class="w-16 rounded bg-white/10 px-2 py-0.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-400"
    />
    <button
      onclick={() => roll(formula.trim())}
      disabled={rolling}
      aria-label="Roll custom formula"
      class="cursor-pointer text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-40"
    >
      <Dices size={14} />
    </button>
    {#if role === "DM"}
      <label class="flex cursor-pointer items-center gap-1 text-xs text-zinc-400 select-none">
        <input type="checkbox" bind:checked={isPrivate} class="accent-violet-400" />
        Private
      </label>
    {/if}
  </div>
</div>
