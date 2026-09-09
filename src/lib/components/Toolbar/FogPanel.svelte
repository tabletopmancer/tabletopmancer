<script lang="ts">
  import { Eye, EyeOff } from "@lucide/svelte";

  let {
    fogToolActive = $bindable(),
    brushMode = $bindable(),
    brushSize = $bindable(),
  }: {
    fogToolActive: boolean;
    brushMode: "reveal" | "hide";
    brushSize: number;
  } = $props();

  const BRUSH_SIZES: Array<{ label: string; value: number }> = [
    { label: "S", value: 25 },
    { label: "M", value: 50 },
    { label: "L", value: 100 },
    { label: "XL", value: 150 },
    { label: "XXL", value: 200 },
  ];
</script>

<div
  class="absolute right-0 top-full mt-2 w-44 rounded-xl bg-zinc-900 p-3 shadow-xl"
  role="dialog"
  aria-label="Fog controls"
>
  <label
    class="flex cursor-pointer items-center justify-between text-sm font-semibold text-zinc-100 select-none"
  >
    Fog brush
    <input type="checkbox" bind:checked={fogToolActive} class="accent-violet-400" />
  </label>
  {#if fogToolActive}
    <div class="mt-3 flex gap-1">
      <button
        class="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs {brushMode ===
        'reveal'
          ? 'bg-violet-500/20 text-violet-200'
          : 'bg-white/10 text-zinc-300 hover:bg-white/20'}"
        onclick={() => (brushMode = "reveal")}
      >
        <Eye size={14} /> Reveal
      </button>
      <button
        class="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs {brushMode ===
        'hide'
          ? 'bg-violet-500/20 text-violet-200'
          : 'bg-white/10 text-zinc-300 hover:bg-white/20'}"
        onclick={() => (brushMode = "hide")}
      >
        <EyeOff size={14} /> Hide
      </button>
    </div>
    <div class="mt-2 flex flex-wrap gap-1">
      {#each BRUSH_SIZES as s}
        <button
          class="flex-1 rounded px-2 py-1 text-xs {brushSize === s.value
            ? 'bg-violet-500/20 text-violet-200'
            : 'bg-white/10 text-zinc-300 hover:bg-white/20'}"
          onclick={() => (brushSize = s.value)}
        >
          {s.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
