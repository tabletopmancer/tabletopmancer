<script lang="ts">
  import { Music, Square, Volume2 } from "@lucide/svelte";

  let {
    audio,
    volume,
    loop = $bindable(),
    onstop,
    onvolume,
  }: {
    audio: AudioState | null;
    volume: number;
    loop: boolean;
    onstop: () => void;
    onvolume: (value: number) => void;
  } = $props();

  let open = $state(false);
</script>

<li class="relative">
  <button
    class="cursor-pointer {audio ? 'text-violet-300' : 'text-zinc-300 hover:text-zinc-100'}"
    aria-label="Audio controls"
    onclick={() => (open = !open)}
  >
    <Music size={20} />
  </button>
  {#if open}
    <div
      class="absolute top-full right-0 mt-2 w-56 rounded-xl bg-zinc-900 p-3 shadow-xl"
      role="dialog"
      aria-label="Audio controls"
    >
      <p class="mb-2 truncate text-sm font-semibold text-zinc-100">
        {audio?.name ?? "No track playing"}
      </p>
      <div class="mb-3 flex gap-2">
        <button
          class="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs {audio
            ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
            : 'cursor-not-allowed bg-white/5 text-zinc-500'}"
          disabled={!audio}
          onclick={onstop}
        >
          <Square size={12} /> Stop
        </button>
        <button
          class="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs {loop
            ? 'bg-violet-500/20 text-violet-200'
            : 'bg-white/10 text-zinc-300 hover:bg-white/20'}"
          onclick={() => (loop = !loop)}
        >
          Loop {loop ? "on" : "off"}
        </button>
      </div>
      <label class="flex items-center gap-2 text-xs text-zinc-400">
        <Volume2 size={14} />
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          oninput={(e) => onvolume(parseFloat((e.target as HTMLInputElement).value))}
          class="w-full accent-violet-400"
        />
      </label>
    </div>
  {/if}
</li>
