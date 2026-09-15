<script lang="ts">
  import { Plus, Search, X } from "@lucide/svelte";
  import EmptyState from "$lib/components/Home/EmptyState.svelte";
  import TableCard from "$lib/components/Home/TableCard.svelte";
  import CreateTableForm from "./CreateTableForm.svelte";

  let { data } = $props();

  let creating = $state(false);
  let query = $state("");

  const filtered = $derived(
    query.trim()
      ? data.tables.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()))
      : data.tables,
  );

  function toggleCreate() {
    creating = !creating;
  }
</script>

<svelte:head>
  <title>Tabletopmancer — ALPHA</title>
</svelte:head>

<main
  class="relative min-h-screen overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 px-4 py-8 text-zinc-100 sm:px-6 sm:py-12"
>
  <!-- ambient glow -->
  <div
    class="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-violet-700/20 blur-3xl"
  ></div>

  <div class="relative mx-auto max-w-5xl">
    <header class="mb-10 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <img src="/tabletopmancer.svg" alt="" class="h-11 w-11 drop-shadow" />
        <div>
          <h1 class="flex items-center gap-2 font-display text-2xl font-bold tracking-wide">
            Tabletopmancer
            <span
              class="rounded bg-violet-500/20 px-1.5 py-0.5 font-sans text-[0.6rem] font-semibold tracking-widest text-violet-300 uppercase"
            >
              Alpha
            </span>
          </h1>
          <p class="text-sm text-zinc-400">Your campaigns, ready to run.</p>
        </div>
      </div>

      <button
        onclick={toggleCreate}
        class="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold shadow transition hover:bg-violet-500"
      >
        {#if creating}<X size={16} />Cancel{:else}<Plus size={16} />New table{/if}
      </button>
    </header>

    {#if creating}
      <CreateTableForm />
    {/if}

    {#if data.tables.length === 0}
      <EmptyState oncreate={toggleCreate} />
    {:else}
      {#if data.tables.length > 6}
        <div class="relative mb-5 max-w-xs">
          <Search class="absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500" size={16} />
          <input
            class="w-full rounded-lg border border-white/10 bg-black/20 py-2 pr-3 pl-9 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-400/60 focus:outline-none"
            type="search"
            placeholder="Search campaigns…"
            bind:value={query}
          />
        </div>
      {/if}

      {#if filtered.length === 0}
        <p class="mt-12 text-center text-sm text-zinc-500">
          No campaigns match “{query}”.
        </p>
      {:else}
        <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each filtered as table (table.id)}
            <TableCard {table} />
          {/each}
        </ul>
      {/if}
    {/if}
  </div>
</main>
