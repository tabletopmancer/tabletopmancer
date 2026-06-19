<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import {
    Cloud,
    Dices,
    Eye,
    EyeOff,
    History,
    Pause,
    Play,
    Settings,
    Swords,
  } from "@lucide/svelte";
  import AssetDrawer from "$lib/components/AssetDrawer.svelte";
  import DiceAnimation from "$lib/components/DiceAnimation.svelte";
  import DiceRoller from "$lib/components/DiceRoller.svelte";
  import InitiativeTracker from "$lib/components/InitiativeTracker.svelte";
  import RollHistory from "$lib/components/RollHistory.svelte";
  import SettingsModal from "$lib/components/SettingsModal.svelte";
  import Table from "$lib/components/Table.svelte";
  import { applyTableEvent } from "$lib/apply-table-event.js";
  import { activateInitiative } from "$lib/initiative.remote";
  import { pauseBoard, pingTable, unpauseBoard } from "$lib/table.remote";
  import { boardLive } from "./board.remote";

  let { data } = $props();

  let boardState = $state<BoardState>({
    tokens: [],
    maps: [],
    initiative: null,
    rollHistory: [],
    players: [],
    paused: false,
    open: false,
  });

  let pings = $state<Array<{ id: string; position: Position }>>([]);
  let animRoll = $state<DiceRoll | null>(null);

  function maybeTriggerDiceAnimation(event: TableEvent): void {
    if (event.type === "dice:rolled") {
      animRoll = event.roll;
    }
  }

  function addPing(position: Position) {
    const id = crypto.randomUUID();
    pings.push({ id, position });
    setTimeout(() => {
      pings = pings.filter((p) => p.id !== id);
    }, 2000);
  }

  async function sendPing(position: Position) {
    await pingTable({ tableId: data.tableId, position });
  }

  let showSettings = $state(false);
  let showRollHistory = $state(false);
  let showInitiative = $state(false);
  let showDice = $state(false);
  let showFog = $state(false);

  let fogToolActive = $state(false);
  let brushMode = $state<"reveal" | "hide">("reveal");
  let brushSize = $state(50);

  const BRUSH_SIZES: Array<{ label: string; value: number }> = [
    { label: "S", value: 25 },
    { label: "M", value: 50 },
    { label: "L", value: 100 },
    { label: "XL", value: 150 },
    { label: "XXL", value: 200 },
  ];

  const inviteUrl = $derived(
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${data.tableId}`
      : `/join/${data.tableId}`,
  );

  const pendingCount = $derived(boardState.players.filter((p) => p.status === "pending").length);

  function isFullState(value: BoardState | TableEvent): value is BoardState {
    return !("type" in value);
  }

  function isOwnRevoke(event: TableEvent, player: Player | null): boolean {
    return event.type === "player:revoked" && event.playerId === player?.id;
  }

  async function handleEvent(value: BoardState | TableEvent): Promise<void> {
    if (isFullState(value)) {
      boardState = value;
      return;
    }
    if (value.type === "ping") {
      addPing(value.position);
      return;
    }
    maybeTriggerDiceAnimation(value);
    applyTableEvent(boardState, value);
    if (isOwnRevoke(value, data.player)) {
      await goto(`/join/${data.tableId}`);
    }
  }

  $effect(() => {
    const id = page.params.id!;
    const lq = boardLive(id);
    const iter = lq[Symbol.asyncIterator]();

    (async () => {
      while (true) {
        const { value, done } = await iter.next();
        if (done) break;
        await handleEvent(value);
      }
    })();

    return () => {
      iter.return?.();
    };
  });
</script>

<main
  class="h-screen w-screen bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900 text-gray-100"
>
  <Table
    {boardState}
    role={data.role}
    player={data.player}
    tableId={data.tableId}
    {pings}
    onping={sendPing}
    {fogToolActive}
    {brushMode}
    {brushSize}
  />

  {#if data.role === "DM"}
    <ul
      class="fixed top-0 z-30 mb-6 flex w-full items-center justify-end gap-4 p-4"
      role="navigation"
    >
      <li class="relative">
        <button
          class="cursor-pointer {fogToolActive
            ? 'text-amber-300'
            : 'text-gray-300 hover:text-gray-100'}"
          aria-label="Fog controls"
          onclick={() => (showFog = !showFog)}
        >
          <Cloud size={20} />
        </button>
        {#if showFog}
          <div
            class="absolute right-0 top-full mt-2 w-44 rounded-xl bg-gray-900 p-3 shadow-xl"
            role="dialog"
            aria-label="Fog controls"
          >
            <label
              class="flex cursor-pointer items-center justify-between text-sm font-semibold text-gray-100 select-none"
            >
              Fog brush
              <input type="checkbox" bind:checked={fogToolActive} class="accent-violet-400" />
            </label>
            {#if fogToolActive}
              <div class="mt-3 flex gap-1">
                <button
                  class="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs {brushMode ===
                  'reveal'
                    ? 'bg-violet-700 text-violet-100'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'}"
                  onclick={() => (brushMode = "reveal")}
                >
                  <Eye size={14} /> Reveal
                </button>
                <button
                  class="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs {brushMode ===
                  'hide'
                    ? 'bg-violet-700 text-violet-100'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'}"
                  onclick={() => (brushMode = "hide")}
                >
                  <EyeOff size={14} /> Hide
                </button>
              </div>
              <div class="mt-2 flex flex-wrap gap-1">
                {#each BRUSH_SIZES as s}
                  <button
                    class="flex-1 rounded px-2 py-1 text-xs {brushSize === s.value
                      ? 'bg-violet-700 text-violet-100'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'}"
                    onclick={() => (brushSize = s.value)}
                  >
                    {s.label}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </li>
      <li class="relative">
        <button
          class="cursor-pointer text-gray-300 hover:text-gray-100"
          aria-label="Roll dice"
          onclick={() => (showDice = !showDice)}
        >
          <Dices size={20} />
        </button>
        {#if showDice}
          <div
            class="absolute right-0 top-full mt-2 rounded-xl bg-gray-900 p-3 shadow-xl"
            role="dialog"
            aria-label="Dice roller"
          >
            <DiceRoller tableId={data.tableId} role={data.role} />
          </div>
        {/if}
      </li>
      <li>
        <button
          class="cursor-pointer text-gray-300 hover:text-gray-100"
          aria-label="Toggle roll history"
          onclick={() => (showRollHistory = !showRollHistory)}
        >
          <History size={20} />
        </button>
      </li>
      <li>
        <button
          class="cursor-pointer {boardState.initiative
            ? 'text-amber-300'
            : 'text-gray-300 hover:text-gray-100'}"
          aria-label="Toggle initiative tracker"
          onclick={async () => {
            if (!boardState.initiative) {
              await activateInitiative(data.tableId);
            }
            showInitiative = !showInitiative;
          }}
        >
          <Swords size={20} />
        </button>
      </li>
      <li>
        <button
          class="cursor-pointer {boardState.paused
            ? 'text-amber-300'
            : 'text-gray-300 hover:text-gray-100'}"
          aria-label={boardState.paused ? "Unpause game" : "Pause game"}
          onclick={async () => {
            if (boardState.paused) {
              await unpauseBoard(data.tableId);
            } else {
              await pauseBoard(data.tableId);
            }
          }}
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
          class="cursor-pointer text-gray-300 hover:text-gray-100"
          aria-label="Settings"
          onclick={() => (showSettings = !showSettings)}
        >
          <Settings size={20} />
        </button>
        {#if pendingCount > 0}
          <span
            class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-gray-900"
          >
            {pendingCount}
          </span>
        {/if}
      </li>
    </ul>

    {#if showSettings}
      <SettingsModal
        tableId={data.tableId}
        players={boardState.players}
        open={boardState.open}
        {inviteUrl}
        onclose={() => (showSettings = false)}
      />
    {/if}

    {#if showRollHistory}
      <RollHistory
        rollHistory={boardState.rollHistory}
        role={data.role}
        onclose={() => (showRollHistory = false)}
      />
    {/if}

    {#if showInitiative && boardState.initiative}
      <InitiativeTracker
        tracker={boardState.initiative}
        tableId={data.tableId}
        role={data.role}
        onclose={() => (showInitiative = false)}
      />
    {/if}
  {/if}

  {#if data.role === "PLAYER" && boardState.paused}
    <div
      class="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg"
    >
      Game paused by DM
    </div>
  {/if}

  {#if data.role === "PLAYER"}
    <div
      class="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-xl bg-gray-900/80 px-3 py-2 shadow-lg"
    >
      <DiceRoller tableId={data.tableId} role={data.role} />
      <button
        class="cursor-pointer text-gray-300 hover:text-gray-100"
        aria-label="Toggle roll history"
        onclick={() => (showRollHistory = !showRollHistory)}
      >
        <History size={18} />
      </button>
      {#if boardState.initiative}
        <button
          class="cursor-pointer {showInitiative
            ? 'text-amber-300'
            : 'text-gray-300 hover:text-gray-100'}"
          aria-label="Toggle initiative tracker"
          onclick={() => (showInitiative = !showInitiative)}
        >
          <Swords size={18} />
        </button>
      {/if}
    </div>

    {#if showRollHistory}
      <RollHistory
        rollHistory={boardState.rollHistory}
        role={data.role}
        onclose={() => (showRollHistory = false)}
      />
    {/if}

    {#if showInitiative && boardState.initiative}
      <InitiativeTracker
        tracker={boardState.initiative}
        tableId={data.tableId}
        role={data.role}
        onclose={() => (showInitiative = false)}
      />
    {/if}
  {/if}

  {#if data.role === "DM"}
    <AssetDrawer assets={data.assets} />
  {/if}

  <DiceAnimation roll={animRoll} />
</main>
