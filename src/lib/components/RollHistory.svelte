<script lang="ts">
  import { Lock, X } from "@lucide/svelte";
  import { colorForRoll } from "$lib/player-colors.js";

  let {
    rollHistory,
    role,
    onclose,
  }: {
    rollHistory: DiceRoll[];
    role: "DM" | "PLAYER";
    onclose: () => void;
  } = $props();

  const visibleRolls = $derived(
    rollHistory.filter((r) => !r.private || role === "DM").toReversed(),
  );

  function formatBreakdown(roll: DiceRoll): string {
    const parts = roll.dice.join(" + ");
    if (roll.modifier === 0) return parts;
    return roll.modifier > 0
      ? `${parts} + ${roll.modifier}`
      : `${parts} - ${Math.abs(roll.modifier)}`;
  }
</script>

<div
  class="fixed right-4 top-14 z-40 flex w-72 flex-col rounded-xl bg-zinc-900 shadow-xl"
  role="dialog"
  aria-label="Roll history"
>
  <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
    <span class="font-display text-sm font-semibold tracking-wide text-zinc-100">Roll History</span>
    <button onclick={onclose} aria-label="Close" class="text-zinc-400 hover:text-zinc-100">
      <X size={16} />
    </button>
  </div>

  <div class="max-h-96 overflow-y-auto p-2">
    {#if visibleRolls.length === 0}
      <p class="px-3 py-4 text-center text-xs text-zinc-500">No rolls yet.</p>
    {:else}
      {#each visibleRolls as roll (roll.id)}
        <div
          class="mb-1 rounded-lg px-3 py-2 text-sm"
          class:bg-violet-900={roll.private}
          class:bg-white-10={!roll.private}
          style={!roll.private ? "background: rgba(255,255,255,0.05)" : ""}
        >
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1.5 font-medium text-zinc-200">
              <span
                class="h-2.5 w-2.5 shrink-0 rounded-full"
                style="background: {colorForRoll(roll)}"
              ></span>
              {roll.player}
              {#if roll.private}
                <Lock size={10} class="text-violet-400" />
              {/if}
            </span>
            <span class="font-mono text-lg font-bold text-violet-300">{roll.total}</span>
          </div>
          <div class="mt-0.5 text-xs text-zinc-400">
            <span class="font-mono text-zinc-300">{roll.formula}</span>
            {#if roll.dice.length > 1 || roll.modifier !== 0}
              <span class="ml-1">({formatBreakdown(roll)})</span>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
