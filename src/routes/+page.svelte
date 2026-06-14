<script lang="ts">
  import { createTable } from "./tables.remote.js";
  import { goto } from "$app/navigation";
  import { Plus, Settings } from "@lucide/svelte";

  let { data } = $props();
  let creating = $state(false);
  let tableName = $state("");

  async function handleCreate() {
    const name = tableName.trim();
    if (!name) return;
    const id = await createTable(name);
    goto(`/table/${encodeURIComponent(id)}`);
  }
</script>

<svelte:head>
  <title>Tabletopmancer - ALPHA</title>
</svelte:head>

<main
  class="min-h-screen bg-gradient-to-br from-blue-800 via-violet-900 to-gray-800 p-4 text-gray-100"
>
  <ul class="mb-6 flex justify-end gap-4" role="navigation">
    <li>
      <button onclick={() => (creating = !creating)} aria-label="Create new table">
        <Plus />
      </button>
    </li>
    <li><Settings aria-label="Settings" /></li>
  </ul>

  {#if creating}
    <form
      class="mb-6 flex gap-2"
      onsubmit={(e) => {
        e.preventDefault();
        handleCreate();
      }}
    >
      <input
        class="flex-1 rounded border border-gray-400 bg-white/10 px-3 py-1 text-gray-100 placeholder-gray-400 focus:outline-none"
        type="text"
        placeholder="Table name"
        bind:value={tableName}
      />
      <button
        class="rounded bg-violet-600 px-4 py-1 font-semibold hover:bg-violet-500"
        type="submit"
      >
        Create
      </button>
    </form>
  {/if}

  <ul class="grid grid-cols-1 gap-4">
    {#each data.tables as table}
      <a class="space-y-2 rounded bg-neutral-50 p-4 text-blue-800" href="/table/{table.id}">
        <h2 class="text-lg">{table.name}</h2>
        <p class="text-right text-xs">{table.lastPlayed}</p>
      </a>
    {/each}
  </ul>
</main>
