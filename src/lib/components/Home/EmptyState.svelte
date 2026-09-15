<script lang="ts">
  import { Plus, Sparkles } from "@lucide/svelte";

  let { oncreate }: { oncreate: () => void } = $props();
</script>

<div
  class="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-20 text-center"
>
  <Sparkles class="mb-4 text-violet-400" size={40} />
  <h2 class="font-display text-xl font-semibold">No campaigns yet</h2>
  <p class="mt-2 max-w-sm text-sm text-zinc-400">
    Create your first table to start placing maps, tokens, and rolling dice with your party.
  </p>
  <button
    onclick={oncreate}
    class="mt-6 flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold shadow transition hover:bg-violet-500"
  >
    <Plus size={16} />Create a table
  </button>
</div>
