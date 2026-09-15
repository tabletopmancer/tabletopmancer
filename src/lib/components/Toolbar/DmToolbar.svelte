<script lang="ts">
  import { Dices, History, Pause, Play, Settings, Swords } from "@lucide/svelte";
  import DiceRoller from "$lib/components/DiceRoller.svelte";
  import { activateInitiative } from "$lib/initiative.remote";
  import { pauseBoard, unpauseBoard } from "$lib/table.remote";
  import AudioPopover from "./AudioPopover.svelte";
  import FogPopover from "./FogPopover.svelte";

  let {
    boardState,
    tableId,
    role,
    audioVolume,
    audioLoop = $bindable(),
    fogToolActive = $bindable(),
    brushMode = $bindable(),
    brushSize = $bindable(),
    onstopaudio,
    onvolume,
    ontogglesettings,
    ontogglerollhistory,
    ontoggleinitiative,
  }: {
    boardState: BoardState;
    tableId: string;
    role: "DM" | "PLAYER";
    audioVolume: number;
    audioLoop: boolean;
    fogToolActive: boolean;
    brushMode: "reveal" | "hide";
    brushSize: number;
    onstopaudio: () => void;
    onvolume: (value: number) => void;
    ontogglesettings: () => void;
    ontogglerollhistory: () => void;
    ontoggleinitiative: () => void;
  } = $props();

  let showDice = $state(false);

  const pendingCount = $derived(boardState.players.filter((p) => p.status === "pending").length);

  async function toggleInitiative() {
    if (!boardState.initiative) {
      await activateInitiative(tableId);
    }
    ontoggleinitiative();
  }

  async function togglePause() {
    if (boardState.paused) {
      await unpauseBoard(tableId);
    } else {
      await pauseBoard(tableId);
    }
  }
</script>

<ul class="fixed top-0 z-30 mb-6 flex w-full items-center justify-end gap-4 p-4" role="navigation">
  <AudioPopover
    audio={boardState.audio}
    volume={audioVolume}
    bind:loop={audioLoop}
    onstop={onstopaudio}
    {onvolume}
  />

  <FogPopover bind:active={fogToolActive} bind:brushMode bind:brushSize />

  <li class="relative">
    <button
      class="cursor-pointer text-zinc-300 hover:text-zinc-100"
      aria-label="Roll dice"
      onclick={() => (showDice = !showDice)}
    >
      <Dices size={20} />
    </button>
    {#if showDice}
      <div
        class="absolute top-full right-0 mt-2 rounded-xl bg-zinc-900 p-3 shadow-xl"
        role="dialog"
        aria-label="Dice roller"
      >
        <DiceRoller {tableId} {role} />
      </div>
    {/if}
  </li>

  <li>
    <button
      class="cursor-pointer text-zinc-300 hover:text-zinc-100"
      aria-label="Toggle roll history"
      onclick={ontogglerollhistory}
    >
      <History size={20} />
    </button>
  </li>

  <li>
    <button
      class="cursor-pointer {boardState.initiative
        ? 'text-violet-300'
        : 'text-zinc-300 hover:text-zinc-100'}"
      aria-label="Toggle initiative tracker"
      onclick={toggleInitiative}
    >
      <Swords size={20} />
    </button>
  </li>

  <li>
    <button
      class="cursor-pointer {boardState.paused
        ? 'text-violet-300'
        : 'text-zinc-300 hover:text-zinc-100'}"
      aria-label={boardState.paused ? "Unpause game" : "Pause game"}
      onclick={togglePause}
    >
      {#if boardState.paused}
        <Play size={20} />
      {:else}
        <Pause size={20} />
      {/if}
    </button>
  </li>

  <li class="relative">
    <button
      class="cursor-pointer text-zinc-300 hover:text-zinc-100"
      aria-label="Settings"
      onclick={ontogglesettings}
    >
      <Settings size={20} />
    </button>
    {#if pendingCount > 0}
      <span
        class="pointer-events-none absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-zinc-900"
      >
        {pendingCount}
      </span>
    {/if}
  </li>
</ul>
