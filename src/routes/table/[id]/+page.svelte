<script lang="ts">
  import { page } from "$app/state";
  import { Rss, UserCog, UserPlus } from "@lucide/svelte";
  import AssetDrawer from "$lib/components/AssetDrawer.svelte";
  import Table from "$lib/components/Table.svelte";
  import { applyDelta } from "$lib/apply-delta.js";
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
