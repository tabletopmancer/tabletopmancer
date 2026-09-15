<script lang="ts">
  import { Trash2 } from "@lucide/svelte";
  import { removeInitiativeEntry } from "$lib/initiative.remote";

  let {
    entry,
    tableId,
    role,
  }: {
    entry: InitiativeEntry;
    tableId: string;
    role: "DM" | "PLAYER";
  } = $props();
</script>

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
      <span class="font-mono text-lg font-bold text-violet-300">{entry.initiative}</span>
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
