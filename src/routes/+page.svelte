<script lang="ts">
  import { createTable } from "./tables.remote.js";
  import { goto } from "$app/navigation";
  import { Clock, Plus, Search, Sparkles, X } from "@lucide/svelte";

  let { data } = $props();

  let creating = $state(false);
  let tableName = $state("");
  let busy = $state(false);
  let createError = $state("");
  let query = $state("");
  let nameInput = $state<HTMLInputElement | null>(null);

  const filtered = $derived(
    query.trim()
      ? data.tables.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()))
      : data.tables,
  );

  $effect(() => {
    if (creating) nameInput?.focus();
  });

  function createErrorMessage(e: unknown): string {
    const body = (e as { body?: { message?: string } })?.body;
    return body?.message ?? "Could not create table.";
  }

  async function handleCreate() {
    const name = tableName.trim();
    if (!name || busy) return;
    busy = true;
    createError = "";
    try {
      const id = await createTable(name);
      goto(`/table/${encodeURIComponent(id)}`);
    } catch (e) {
      createError = createErrorMessage(e);
      busy = false;
    }
  }

  function toggleCreate() {
    creating = !creating;
    if (!creating) {
      tableName = "";
      createError = "";
    }
  }

  const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];

  function lastPlayedLabel(date: Date | string | number): string {
    const ts = new Date(date).getTime();
    // NaN (invalid date) and the epoch placeholder both fail this guard → "Never played".
    if (!(ts >= 86_400_000)) return "Never played";
    const sec = Math.round((ts - Date.now()) / 1000);
    const abs = Math.abs(sec);
    for (const [unit, s] of UNITS) {
      if (abs >= s) return RTF.format(Math.round(sec / s), unit);
    }
    return "Just now";
  }

  function initial(name: string): string {
    return name.trim().charAt(0).toUpperCase() || "?";
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
      <form
        class="mb-8 rounded-xl border border-violet-400/20 bg-white/5 p-4"
        onsubmit={(e) => {
          e.preventDefault();
          handleCreate();
        }}
      >
        <div class="flex flex-col gap-2 sm:flex-row">
          <input
            bind:this={nameInput}
            class="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-violet-400/60 focus:outline-none"
            type="text"
            placeholder="Campaign name…"
            bind:value={tableName}
            oninput={() => (createError = "")}
          />
          <button
            class="rounded-lg bg-violet-600 px-5 py-2 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={busy || !tableName.trim()}
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
        {#if createError}
          <p class="mt-2 text-sm text-red-400">{createError}</p>
        {/if}
      </form>
    {/if}

    {#if data.tables.length === 0}
      <div
        class="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-20 text-center"
      >
        <Sparkles class="mb-4 text-violet-400" size={40} />
        <h2 class="font-display text-xl font-semibold">No campaigns yet</h2>
        <p class="mt-2 max-w-sm text-sm text-zinc-400">
          Create your first table to start placing maps, tokens, and rolling dice with your party.
        </p>
        <button
          onclick={toggleCreate}
          class="mt-6 flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold shadow transition hover:bg-violet-500"
        >
          <Plus size={16} />Create a table
        </button>
      </div>
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
            <li>
              <a
                class="group flex h-full items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-4 transition hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-white/[0.08]"
                href="/table/{table.id}"
              >
                <div
                  class="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-800 font-display text-xl font-bold text-white shadow-inner"
                >
                  {initial(table.name)}
                </div>
                <div class="min-w-0 flex-1">
                  <h2 class="truncate font-display text-lg font-semibold text-zinc-100">
                    {table.name}
                  </h2>
                  <p class="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
                    <Clock size={12} />
                    {lastPlayedLabel(table.lastPlayed)}
                  </p>
                </div>
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  </div>
</main>
