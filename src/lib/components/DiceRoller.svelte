<script lang="ts">
  import { Dices } from "@lucide/svelte";
  import { rollDice } from "$lib/table.remote";

  let {
    tableId,
    role,
  }: {
    tableId: string;
    role: "DM" | "PLAYER";
  } = $props();

  let formula = $state("");
  let isPrivate = $state(true); // DM rolls private by default
  let rolling = $state(false);

  async function roll() {
    const f = formula.trim();
    if (!f || rolling) return;
    rolling = true;
    try {
      await rollDice({ tableId, formula: f, private: isPrivate });
      formula = "";
    } finally {
      rolling = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") roll();
  }
</script>

<div class="flex items-center gap-1">
  <input
    type="text"
    bind:value={formula}
    onkeydown={handleKeydown}
    placeholder="2d6+3"
    aria-label="Dice formula"
    class="w-20 rounded bg-white/10 px-2 py-1 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-400"
  />
  {#if role === "DM"}
    <label class="flex cursor-pointer items-center gap-1 text-xs text-gray-400 select-none">
      <input type="checkbox" bind:checked={isPrivate} class="accent-violet-400" />
      Private
    </label>
  {/if}
  <button
    onclick={roll}
    disabled={rolling}
    aria-label="Roll dice"
    class="cursor-pointer text-gray-300 hover:text-gray-100 disabled:opacity-50"
  >
    <Dices size={18} />
  </button>
</div>
