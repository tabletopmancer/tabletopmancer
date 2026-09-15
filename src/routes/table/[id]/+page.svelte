<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import AssetDrawer from "$lib/components/AssetDrawer.svelte";
  import { playAudio, stopAudio } from "$lib/audio.remote";
  import DiceAnimation from "$lib/components/DiceAnimation.svelte";
  import InitiativeTracker from "$lib/components/InitiativeTracker.svelte";
  import PlayerHud from "$lib/components/PlayerHud.svelte";
  import RollHistory from "$lib/components/RollHistory.svelte";
  import SettingsModal from "$lib/components/SettingsModal.svelte";
  import Table from "$lib/components/Table.svelte";
  import DmToolbar from "$lib/components/Toolbar/DmToolbar.svelte";
  import { applyTableEvent } from "$lib/apply-table-event.js";
  import { pingTable } from "$lib/table.remote";
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
    audio: null,
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

  // Audio playback
  let audioEl: HTMLAudioElement | undefined = $state();
  let audioVolume = $state(1.0);
  let audioLoop = $state(true);
  let audioBlocked = $state(false);

  onMount(() => {
    const saved = localStorage.getItem("audio_volume");
    if (saved !== null) audioVolume = parseFloat(saved);
  });

  function setAudioVolume(v: number) {
    audioVolume = v;
    localStorage.setItem("audio_volume", String(v));
  }

  $effect(() => {
    if (!audioEl) return;
    const audio = boardState.audio;
    if (audio) {
      const targetSrc = new URL(audio.url, location.href).href;
      if (audioEl.src !== targetSrc) {
        audioEl.src = audio.url;
        audioEl.play().catch(() => {
          audioBlocked = true;
        });
      }
    } else {
      audioBlocked = false;
      audioEl.pause();
      audioEl.src = "";
    }
  });

  $effect(() => {
    if (audioEl) audioEl.volume = audioVolume;
  });

  $effect(() => {
    if (audioEl) audioEl.loop = audioLoop;
  });

  function enableAudio() {
    audioBlocked = false;
    audioEl?.play().catch(() => {
      audioBlocked = true;
    });
  }

  async function handlePlayAudio(asset: Asset) {
    await playAudio({ tableId: data.tableId, url: asset.url, name: asset.name });
  }

  async function handleStopAudio() {
    await stopAudio({ tableId: data.tableId });
  }

  let fogToolActive = $state(false);
  let brushMode = $state<"reveal" | "hide">("reveal");
  let brushSize = $state(50);

  const inviteUrl = $derived(
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${data.tableId}`
      : `/join/${data.tableId}`,
  );

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

<svelte:head>
  <title>{data.tableId} - Tabletopmancer</title>
</svelte:head>

<main
  class="h-screen w-screen bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 text-zinc-100"
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
    <DmToolbar
      {boardState}
      tableId={data.tableId}
      role={data.role}
      {audioVolume}
      bind:audioLoop
      bind:fogToolActive
      bind:brushMode
      bind:brushSize
      onstopaudio={handleStopAudio}
      onvolume={setAudioVolume}
      ontogglesettings={() => (showSettings = !showSettings)}
      ontogglerollhistory={() => (showRollHistory = !showRollHistory)}
      ontoggleinitiative={() => (showInitiative = !showInitiative)}
    />

    {#if showSettings}
      <SettingsModal
        tableId={data.tableId}
        players={boardState.players}
        open={boardState.open}
        {inviteUrl}
        onclose={() => (showSettings = false)}
      />
    {/if}

    <AssetDrawer assets={data.assets} onplayaudio={handlePlayAudio} />
  {/if}

  {#if data.role === "PLAYER"}
    {#if boardState.paused}
      <div
        class="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-lg"
      >
        Game paused by DM
      </div>
    {/if}

    <PlayerHud
      {boardState}
      tableId={data.tableId}
      role={data.role}
      {audioVolume}
      {audioBlocked}
      {showInitiative}
      onenableaudio={enableAudio}
      onvolume={setAudioVolume}
      ontogglerollhistory={() => (showRollHistory = !showRollHistory)}
      ontoggleinitiative={() => (showInitiative = !showInitiative)}
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

  <audio bind:this={audioEl}></audio>

  <DiceAnimation roll={animRoll} />
</main>
