<script lang="ts">
  import { page } from "$app/state";
  import { Rss, UserCog, UserPlus } from "@lucide/svelte";
  import AssetDrawer from "$lib/components/AssetDrawer.svelte";
  import Table from "$lib/components/Table.svelte";
  import { boardLive } from "./board.remote";

  let { data } = $props();

  let boardState = $state<BoardState>({
    tokens: [],
    maps: [],
    initiative: null,
    rollHistory: [],
    players: [],
  });

  $effect(() => {
    const id = page.params.id!;
    const lq = boardLive(id);
    const iter = lq[Symbol.asyncIterator]();

    (async () => {
      while (true) {
        const { value, done } = await iter.next();
        if (done) break;
        if (!("type" in value)) {
          boardState = value;
        } else {
          applyDelta(boardState, value);
        }
      }
    })();

    return () => {
      iter.return?.();
    };
  });

  function applyDelta(state: BoardState, delta: DeltaEvent): void {
    switch (delta.type) {
      case "token:placed":
        state.tokens.push(delta.token);
        break;
      case "token:moved": {
        const t = state.tokens.find((t) => t.id === delta.id);
        if (t) t.position = delta.position;
        break;
      }
      case "token:removed":
        state.tokens = state.tokens.filter((t) => t.id !== delta.id);
        break;
      case "token:owner-assigned": {
        const t = state.tokens.find((t) => t.id === delta.id);
        if (t) t.owner = delta.owner;
        break;
      }
      case "map:placed":
        state.maps.push(delta.map);
        break;
      case "map:removed":
        state.maps = state.maps.filter((m) => m.id !== delta.id);
        break;
      case "fog:updated": {
        const m = state.maps.find((m) => m.id === delta.mapId);
        if (m) {
          m.fog ??= {};
          for (const cell of delta.patch.cells) {
            m.fog[`${cell.x},${cell.y}`] = cell.visible;
          }
        }
        break;
      }
      case "dice:rolled":
        state.rollHistory.push(delta.roll);
        break;
      case "ping":
        break;
      case "initiative:updated":
        state.initiative = delta.tracker;
        break;
      case "player:joined":
        if (!state.players.find((p) => p.id === delta.player.id)) {
          state.players.push(delta.player);
        }
        break;
      case "player:approved": {
        const idx = state.players.findIndex((p) => p.id === delta.player.id);
        if (idx >= 0) state.players[idx] = delta.player;
        else state.players.push(delta.player);
        break;
      }
      case "player:revoked":
        state.players = state.players.filter((p) => p.id !== delta.playerId);
        break;
    }
  }
</script>

<main
  class="h-screen w-screen bg-gradient-to-br from-blue-800 via-violet-900 to-gray-800 text-gray-100"
>
  <Table {boardState} />

  {#if data.role === "DM"}
    <ul class="fixed top-0 mb-6 flex w-full justify-end gap-4 p-4" role="navigation">
      <li>
        <button class="cursor-pointer" aria-label="Open the session">
          <Rss />
        </button>
      </li>
      <li>
        <button class="cursor-pointer" aria-label="Invite players">
          <UserPlus />
        </button>
      </li>
      <li>
        <button class="cursor-pointer" aria-label="Manage players">
          <UserCog />
        </button>
      </li>
    </ul>
  {/if}

  {#if data.role === "DM"}
    <AssetDrawer assets={data.assets} />
  {/if}
</main>
