<script lang="ts">
  import { addNpcEntry, deactivateInitiative } from "$lib/initiative.remote";

  let { tableId, onclose }: { tableId: string; onclose: () => void } = $props();

  let npcName = $state("");
  let npcInitiative = $state("");
  let showAddNpc = $state(false);

  async function addNpc() {
    const initiative = parseInt(npcInitiative);
    if (!npcName.trim() || isNaN(initiative)) return;
    await addNpcEntry({ tableId, name: npcName.trim(), initiative });
    npcName = "";
    npcInitiative = "";
    showAddNpc = false;
  }

  async function deactivate() {
    await deactivateInitiative(tableId);
    onclose();
  }
</script>

<div class="space-y-2 border-t border-white/10 p-2">
  {#if showAddNpc}
    <div class="flex gap-2">
      <input
        bind:value={npcName}
        placeholder="NPC name"
        class="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-xs text-zinc-100 placeholder-zinc-500 outline-none"
      />
      <input
        bind:value={npcInitiative}
        type="number"
        placeholder="Init"
        class="w-12 rounded bg-white/10 px-2 py-1 text-xs text-zinc-100 placeholder-zinc-500 outline-none"
      />
      <button
        onclick={addNpc}
        class="rounded bg-violet-700 px-2 py-1 text-xs font-medium hover:bg-violet-600"
      >
        Add
      </button>
    </div>
    <button
      onclick={() => (showAddNpc = false)}
      class="w-full text-xs text-zinc-500 hover:text-zinc-300"
    >
      Cancel
    </button>
  {:else}
    <button
      onclick={() => (showAddNpc = true)}
      class="w-full rounded bg-white/5 py-1.5 text-xs text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
    >
      + Add NPC
    </button>
  {/if}

  <button
    onclick={deactivate}
    class="w-full rounded bg-red-900/50 py-1.5 text-xs text-red-300 hover:bg-red-900 hover:text-red-100"
  >
    Deactivate &amp; Reset
  </button>
</div>
