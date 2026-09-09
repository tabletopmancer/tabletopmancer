<script lang="ts">
  import { Cloud, Dices, History, Music, Pause, Play, Settings, Swords } from "@lucide/svelte";
  import DiceRoller from "$lib/components/DiceRoller.svelte";
  import AudioPanel from "$lib/components/Toolbar/AudioPanel.svelte";
  import FogPanel from "$lib/components/Toolbar/FogPanel.svelte";
  import { activateInitiative } from "$lib/initiative.remote";
  import { pauseBoard, unpauseBoard } from "$lib/table.remote";

  let {
    tableId,
    role,
    boardState,
    audioVolume,
    audioLoop = $bindable(),
    fogToolActive = $bindable(),
    brushMode = $bindable(),
    brushSize = $bindable(),
    showRollHistory = $bindable(),
    showInitiative = $bindable(),
    showSettings = $bindable(),
    onvolumechange,
    onstopaudio,
  }: {
    tableId: string;
    role: "DM" | "PLAYER";
    boardState: BoardState;
    audioVolume: number;
    audioLoop: boolean;
    fogToolActive: boolean;
    brushMode: "reveal" | "hide";
    brushSize: number;
    showRollHistory: boolean;
    showInitiative: boolean;
    showSettings: boolean;
    onvolumechange: (volume: number) => void;
    onstopaudio: () => void;
  } = $props();

  let showAudio = $state(false);
  let showFog = $state(false);
  let showDice = $state(false);

  const pendingCount = $derived(boardState.players.filter((p) => p.status === "pending").length);

  async function togglePause() {
    if (boardState.paused) {
      await unpauseBoard(tableId);
    } else {
      await pauseBoard(tableId);
    }
  }

  async function toggleInitiative() {
    if (!boardState.initiative) {
      await activateInitiative(tableId);
    }
    showInitiative = !showInitiative;
  }

  const activeIcon = "text-violet-300";
  const idleIcon = "text-zinc-300 hover:text-zinc-100";
</script>

<ul class="fixed top-0 z-30 mb-6 flex w-full items-center justify-end gap-4 p-4" role="navigation">
  <li class="relative">
    <button
      class="cursor-pointer {boardState.audio ? activeIcon : idleIcon}"
      aria-label="Audio controls"
      onclick={() => (showAudio = !showAudio)}
    >
      <Music size={20} />
    </button>
    {#if showAudio}
      <AudioPanel
        audio={boardState.audio}
        {audioVolume}
        bind:audioLoop
        {onvolumechange}
        {onstopaudio}
      />
    {/if}
  </li>
  <li class="relative">
    <button
      class="cursor-pointer {fogToolActive ? activeIcon : idleIcon}"
      aria-label="Fog controls"
      onclick={() => (showFog = !showFog)}
    >
      <Cloud size={20} />
    </button>
    {#if showFog}
      <FogPanel bind:fogToolActive bind:brushMode bind:brushSize />
    {/if}
  </li>
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
        class="absolute right-0 top-full mt-2 rounded-xl bg-zinc-900 p-3 shadow-xl"
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
      onclick={() => (showRollHistory = !showRollHistory)}
    >
      <History size={20} />
    </button>
  </li>
  <li>
    <button
      class="cursor-pointer {boardState.initiative ? activeIcon : idleIcon}"
      aria-label="Toggle initiative tracker"
      onclick={toggleInitiative}
    >
      <Swords size={20} />
    </button>
  </li>
  <li>
    <button
      class="cursor-pointer {boardState.paused ? activeIcon : idleIcon}"
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
      onclick={() => (showSettings = !showSettings)}
    >
      <Settings size={20} />
    </button>
    {#if pendingCount > 0}
      <span
        class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-zinc-900"
      >
        {pendingCount}
      </span>
    {/if}
  </li>
</ul>
