<script lang="ts">
  import { Minus, Plus, Trash2, X } from "@lucide/svelte";
  import {
    addNpcEntry,
    adjustTurn,
    deactivateInitiative,
    removeInitiativeEntry,
  } from "$lib/initiative.remote";

  let {
    tracker,
    tableId,
    role,
    onclose,
  }: {
    tracker: InitiativeTracker;
    tableId: string;
    role: "DM" | "PLAYER";
    onclose: () => void;
  } = $props();

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
</script>

<div
  class="fixed right-4 top-14 z-40 flex w-72 flex-col rounded-xl bg-zinc-900 shadow-xl"
  role="dialog"
  aria-label="Initiative tracker"
>
  <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
    <div class="flex items-center gap-2">
      <span class="text-sm font-semibold text-zinc-100">Initiative</span>
      <div class="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5">
        {#if role === "DM"}
          <button
            onclick={() => adjustTurn({ tableId, delta: -1 })}
            class="text-zinc-400 hover:text-zinc-100"
            aria-label="Decrement turn"
          >
            <Minus size={12} />
          </button>
        {/if}
        <span class="min-w-5 text-center text-xs font-bold text-amber-300">
          {tracker.turn}
        </span>
        {#if role === "DM"}
          <button
            onclick={() => adjustTurn({ tableId, delta: 1 })}
            class="text-zinc-400 hover:text-zinc-100"
            aria-label="Increment turn"
          >
            <Plus size={12} />
          </button>
        {/if}
      </div>
    </div>
    <button onclick={onclose} aria-label="Close" class="text-zinc-400 hover:text-zinc-100">
      <X size={16} />
    </button>
  </div>

  <div class="max-h-96 overflow-y-auto p-2">
    {#if tracker.entries.length === 0}
      <p class="px-3 py-4 text-center text-xs text-zinc-500">No entries yet.</p>
    {:else}
      {#each tracker.entries as entry (entry.tokenId)}
        <div
          class="mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm"
          style="background: rgba(255,255,255,0.05)"
        >
          <div class="flex min-w-0 items-center gap-2">
            {#if entry.isNPC}
              <span
                class="shrink-0 rounded bg-red-900 px-1.5 py-0.5 text-[10px] font-semibold text-red-200"
              >
                NPC
              </span>
            {/if}
            <span class="truncate text-zinc-200">{entry.name}</span>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            {#if entry.initiative !== null}
              <span class="text-lg font-bold text-violet-300">{entry.initiative}</span>
            {:else}
              <span class="text-sm text-zinc-500">—</span>
            {/if}
            {#if role === "DM"}
              <button
                onclick={() => removeInitiativeEntry({ tableId, tokenId: entry.tokenId })}
                aria-label="Remove entry"
                class="text-zinc-600 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>

  {#if role === "DM"}
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
        onclick={async () => {
          await deactivateInitiative(tableId);
          onclose();
        }}
        class="w-full rounded bg-red-900/50 py-1.5 text-xs text-red-300 hover:bg-red-900 hover:text-red-100"
      >
        Deactivate &amp; Reset
      </button>
    </div>
  {/if}
</div>
