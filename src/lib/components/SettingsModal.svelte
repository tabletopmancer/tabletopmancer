<script lang="ts">
  import { Clock, Radio, Users, X } from "@lucide/svelte";
  import GeneralTab from "$lib/components/Settings/GeneralTab.svelte";
  import HistoryTab from "$lib/components/Settings/HistoryTab.svelte";
  import PlayersTab from "$lib/components/Settings/PlayersTab.svelte";

  let {
    tableId,
    players,
    open,
    inviteUrl,
    onclose,
  }: {
    tableId: string;
    players: Player[];
    open: boolean;
    inviteUrl: string;
    onclose: () => void;
  } = $props();

  type Tab = "general" | "players" | "history";
  let tab = $state<Tab>("general");

  const TABS: Array<{ id: Tab; label: string; icon: typeof Radio }> = [
    { id: "general", label: "General", icon: Radio },
    { id: "players", label: "Players", icon: Users },
    { id: "history", label: "History", icon: Clock },
  ];
</script>

<div
  class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
  role="dialog"
  aria-modal="true"
  aria-label="Settings"
>
  <div
    class="flex w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-zinc-900 shadow-xl sm:h-[36rem] sm:max-h-[90vh] sm:flex-row"
  >
    <nav
      class="flex shrink-0 flex-row items-center gap-1 border-b border-white/10 bg-black/20 p-3 sm:w-44 sm:flex-col sm:items-stretch sm:border-b-0 sm:border-r"
    >
      <h2
        class="hidden px-2 font-display text-sm font-semibold tracking-wide text-zinc-100 sm:mb-2 sm:block"
      >
        Settings
      </h2>
      {#each TABS as t (t.id)}
        <button
          onclick={() => (tab = t.id)}
          class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm {tab === t.id
            ? 'bg-violet-500/20 text-violet-200'
            : 'text-zinc-300 hover:bg-white/5 hover:text-zinc-100'}"
        >
          <t.icon size={16} />
          {t.label}
        </button>
      {/each}
    </nav>

    <div class="flex flex-1 flex-col">
      <div class="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <span class="text-sm font-semibold text-zinc-100">
          {TABS.find((t) => t.id === tab)?.label}
        </span>
        <button onclick={onclose} aria-label="Close" class="text-zinc-400 hover:text-zinc-100">
          <X size={20} />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-5">
        {#if tab === "general"}
          <GeneralTab {tableId} {open} />
        {:else if tab === "history"}
          <HistoryTab {tableId} {players} />
        {:else if tab === "players"}
          <PlayersTab {tableId} {players} {inviteUrl} />
        {/if}
      </div>
    </div>
  </div>
</div>
