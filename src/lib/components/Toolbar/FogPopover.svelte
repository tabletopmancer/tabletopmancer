<script lang="ts">
  import { Cloud, Eye, EyeOff } from "@lucide/svelte";

  let {
    active = $bindable(),
    brushMode = $bindable(),
    brushSize = $bindable(),
  }: {
    active: boolean;
    brushMode: "reveal" | "hide";
    brushSize: number;
  } = $props();

  let open = $state(false);

  const BRUSH_SIZES: Array<{ label: string; value: number }> = [
    { label: "S", value: 25 },
    { label: "M", value: 50 },
    { label: "L", value: 100 },
    { label: "XL", value: 150 },
    { label: "XXL", value: 200 },
  ];

  const SELECTED = "bg-violet-500/20 text-violet-200";
  const UNSELECTED = "bg-white/10 text-zinc-300 hover:bg-white/20";

  function modeClass(mode: "reveal" | "hide"): string {
    return brushMode === mode ? SELECTED : UNSELECTED;
  }

  function sizeClass(value: number): string {
    return brushSize === value ? SELECTED : UNSELECTED;
  }
</script>

<li class="relative">
  <button
    class="cursor-pointer {active ? 'text-violet-300' : 'text-zinc-300 hover:text-zinc-100'}"
    aria-label="Fog controls"
    onclick={() => (open = !open)}
  >
    <Cloud size={20} />
  </button>
  {#if open}
    <div
      class="absolute top-full right-0 mt-2 w-44 rounded-xl bg-zinc-900 p-3 shadow-xl"
      role="dialog"
      aria-label="Fog controls"
    >
      <label
        class="flex cursor-pointer items-center justify-between text-sm font-semibold text-zinc-100 select-none"
      >
        Fog brush
        <input type="checkbox" bind:checked={active} class="accent-violet-400" />
      </label>
      {#if active}
        <div class="mt-3 flex gap-1">
          <button
            class="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs {modeClass(
              'reveal',
            )}"
            onclick={() => (brushMode = "reveal")}
          >
            <Eye size={14} /> Reveal
          </button>
          <button
            class="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs {modeClass(
              'hide',
            )}"
            onclick={() => (brushMode = "hide")}
          >
            <EyeOff size={14} /> Hide
          </button>
        </div>
        <div class="mt-2 flex flex-wrap gap-1">
          {#each BRUSH_SIZES as s}
            <button
              class="flex-1 rounded px-2 py-1 text-xs {sizeClass(s.value)}"
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
