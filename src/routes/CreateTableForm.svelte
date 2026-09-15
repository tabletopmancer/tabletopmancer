<script lang="ts">
  import { goto } from "$app/navigation";
  import { createTable } from "./tables.remote.js";

  let tableName = $state("");
  let busy = $state(false);
  let createError = $state("");
  let nameInput = $state<HTMLInputElement | null>(null);

  $effect(() => {
    nameInput?.focus();
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
</script>

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
