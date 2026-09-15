<script lang="ts">
  import { Minus, Plus, X } from "@lucide/svelte";
  import { adjustTurn } from "$lib/initiative.remote";
  import DmControls from "./Initiative/DmControls.svelte";
  import EntryRow from "./Initiative/EntryRow.svelte";

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

  const isDm = $derived(role === "DM");
</script>

<div
  class="fixed top-14 right-4 z-40 flex w-72 flex-col rounded-xl bg-zinc-900 shadow-xl"
  role="dialog"
  aria-label="Initiative tracker"
>
  <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
    <div class="flex items-center gap-2">
      <span class="font-display text-sm font-semibold tracking-wide text-zinc-100">Initiative</span>
      <div class="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5">
        {#if isDm}
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
        {#if isDm}
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
        <EntryRow {entry} {tableId} {role} />
      {/each}
    {/if}
  </div>

  {#if isDm}
    <DmControls {tableId} {onclose} />
  {/if}
</div>
