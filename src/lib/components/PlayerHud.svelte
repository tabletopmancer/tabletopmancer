<script lang="ts">
  import { History, Music, Swords } from "@lucide/svelte";
  import DiceRoller from "$lib/components/DiceRoller.svelte";

  let {
    boardState,
    tableId,
    role,
    audioVolume,
    audioBlocked,
    showInitiative,
    onenableaudio,
    onvolume,
    ontogglerollhistory,
    ontoggleinitiative,
  }: {
    boardState: BoardState;
    tableId: string;
    role: "DM" | "PLAYER";
    audioVolume: number;
    audioBlocked: boolean;
    showInitiative: boolean;
    onenableaudio: () => void;
    onvolume: (value: number) => void;
    ontogglerollhistory: () => void;
    ontoggleinitiative: () => void;
  } = $props();
</script>

<div
  class="fixed right-4 bottom-4 z-30 flex items-center gap-2 rounded-xl bg-zinc-900/80 px-3 py-2 shadow-lg"
>
  <DiceRoller {tableId} {role} />

  <button
    class="cursor-pointer text-zinc-300 hover:text-zinc-100"
    aria-label="Toggle roll history"
    onclick={ontogglerollhistory}
  >
    <History size={18} />
  </button>

  {#if boardState.initiative}
    <button
      class="cursor-pointer {showInitiative
        ? 'text-violet-300'
        : 'text-zinc-300 hover:text-zinc-100'}"
      aria-label="Toggle initiative tracker"
      onclick={ontoggleinitiative}
    >
      <Swords size={18} />
    </button>
  {/if}

  {#if boardState.audio && audioBlocked}
    <button
      class="cursor-pointer rounded bg-violet-600/80 px-2 py-1 text-xs font-semibold text-white hover:bg-violet-500"
      onclick={onenableaudio}
    >
      ▶ Enable audio
    </button>
  {:else if boardState.audio}
    <span class="text-violet-300" aria-label="Audio playing">
      <Music size={18} />
    </span>
    <input
      type="range"
      min="0"
      max="1"
      step="0.05"
      value={audioVolume}
      oninput={(e) => onvolume(parseFloat((e.target as HTMLInputElement).value))}
      aria-label="Volume"
      class="w-20 accent-violet-400"
    />
  {/if}
</div>
