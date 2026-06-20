<script lang="ts">
  import { Clock, Link, Radio, Users, X } from "@lucide/svelte";
  import { actOnPlayer, closeTable, getHistory, openTable } from "$lib/table.remote";

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

  let inviteCopied = $state(false);

  type HistoryEntry = { id: number; type: string; payload: any; timestamp: number };
  let history = $state<HistoryEntry[]>([]);
  let historyLoading = $state(false);

  $effect(() => {
    if (tab !== "history") return;
    let cancelled = false;
    historyLoading = true;
    getHistory(tableId)
      .then((entries) => {
        if (cancelled) return;
        history = entries as HistoryEntry[];
        historyLoading = false;
      })
      .catch(() => {
        if (cancelled) return;
        historyLoading = false;
      });
    return () => {
      cancelled = true;
    };
  });

  function findPlayer(id: string): string {
    return players.find((p) => p.id === id)?.name ?? id;
  }

  const EVENT_LABELS: Record<string, string | ((p: any) => string)> = {
    "token:placed": (p) => `Token "${p.token?.name}" placed`,
    "token:removed": "Token removed",
    "token:owner-assigned": (p) =>
      p.owner ? `Token assigned to ${findPlayer(p.owner)}` : "Token unassigned",
    "map:placed": "Map placed",
    "map:removed": "Map removed",
    "dice:rolled": (p) => `${p.roll?.player} rolled ${p.roll?.formula} → ${p.roll?.total}`,
    "initiative:updated": (p) =>
      p.tracker ? "Initiative tracker updated" : "Initiative tracker cleared",
    "player:joined": (p) => `${p.player?.name} joined the table`,
    "player:approved": (p) => `${findPlayer(p.playerId)} approved`,
    "player:denied": (p) => `${findPlayer(p.playerId)} denied`,
    "player:revoked": (p) => `${findPlayer(p.playerId)} access revoked`,
    "board:paused": "Table paused",
    "board:unpaused": "Table unpaused",
    "board:opened": "Table opened to new players",
    "board:closed": "Table closed to new players",
  };

  function describeEvent(type: string, payload: any): string {
    const label = EVENT_LABELS[type];
    if (!label) return type;
    return typeof label === "function" ? label(payload) : label;
  }

  const EVENT_COLORS: Record<string, string> = {
    "token:placed": "bg-violet-500",
    "token:removed": "bg-violet-500",
    "token:owner-assigned": "bg-violet-500",
    "map:placed": "bg-emerald-500",
    "map:removed": "bg-emerald-500",
    "dice:rolled": "bg-amber-400",
    "initiative:updated": "bg-orange-500",
    "player:joined": "bg-teal-500",
    "player:approved": "bg-teal-500",
    "player:denied": "bg-teal-500",
    "player:revoked": "bg-teal-500",
    "board:paused": "bg-zinc-400",
    "board:unpaused": "bg-zinc-400",
    "board:opened": "bg-zinc-400",
    "board:closed": "bg-zinc-400",
  };

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
  }

  async function copyInviteLink() {
    await navigator.clipboard.writeText(inviteUrl);
    inviteCopied = true;
    setTimeout(() => {
      inviteCopied = false;
    }, 2000);
  }

  async function toggleOpen() {
    if (open) {
      await closeTable(tableId);
    } else {
      await openTable(tableId);
    }
  }

  async function act(playerId: string, action: "approve" | "deny" | "revoke") {
    await actOnPlayer({ tableId, playerId, action });
  }

  const STATUS_STYLES: Record<Player["status"], string> = {
    approved: "bg-green-700 text-green-100",
    pending: "bg-violet-700 text-violet-100",
    denied: "bg-amber-700 text-amber-100",
    revoked: "bg-zinc-700 text-zinc-300",
  };
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
          <label
            class="flex cursor-pointer items-center justify-between rounded-lg bg-white/5 px-4 py-3 select-none"
          >
            <span class="flex flex-col">
              <span class="text-sm font-semibold text-zinc-100">Online</span>
              <span class="text-xs text-zinc-400">
                When online, new players can join the table.
              </span>
            </span>
            <input
              type="checkbox"
              checked={open}
              onchange={toggleOpen}
              class="h-4 w-4 accent-violet-400"
            />
          </label>
        {:else if tab === "history"}
          {#if historyLoading}
            <p class="text-center text-sm text-zinc-500">Loading…</p>
          {:else if history.length === 0}
            <p class="text-center text-sm text-zinc-500">No events recorded yet.</p>
          {:else}
            <ul class="space-y-px">
              {#each history as entry (entry.id)}
                {@const color = EVENT_COLORS[entry.type] ?? "bg-zinc-500"}
                <li class="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-white/5">
                  <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full {color}"></span>
                  <span class="min-w-0 flex-1 text-sm text-zinc-200">
                    {describeEvent(entry.type, entry.payload)}
                  </span>
                  <span class="shrink-0 text-right text-xs text-zinc-500">
                    <span class="block">{formatDate(entry.timestamp)}</span>
                    <span class="block">{formatTime(entry.timestamp)}</span>
                  </span>
                </li>
              {/each}
            </ul>
            {#if history.length === 200}
              <p class="mt-3 text-center text-xs text-zinc-500">Showing last 200 events.</p>
            {/if}
          {/if}
        {:else if tab === "players"}
          <div class="space-y-4">
            <div>
              <h3 class="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Invite link
              </h3>
              <div class="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
                <span class="flex-1 truncate text-xs text-zinc-300">{inviteUrl}</span>
                <button
                  onclick={copyInviteLink}
                  aria-label="Copy link"
                  class="shrink-0 text-zinc-400 hover:text-zinc-100"
                >
                  <Link size={14} />
                </button>
              </div>
              {#if inviteCopied}
                <p class="mt-1 text-xs text-green-400">Copied!</p>
              {/if}
            </div>

            <div>
              <h3 class="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Players ({players.length})
              </h3>
              {#if players.length === 0}
                <p class="text-center text-sm text-zinc-500">No players yet.</p>
              {:else}
                <ul class="space-y-1">
                  {#each players as player (player.id)}
                    <li
                      class="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2"
                    >
                      <span class="truncate text-zinc-100">{player.name}</span>
                      <div class="flex shrink-0 items-center gap-2">
                        <span
                          class="rounded px-2 py-0.5 text-xs font-medium {STATUS_STYLES[
                            player.status
                          ]}"
                        >
                          {player.status}
                        </span>
                        {#if player.status === "pending"}
                          <button
                            onclick={() => act(player.id, "approve")}
                            class="rounded bg-green-600 px-2 py-0.5 text-xs font-medium hover:bg-green-500"
                          >
                            Approve
                          </button>
                          <button
                            onclick={() => act(player.id, "deny")}
                            class="rounded bg-red-700 px-2 py-0.5 text-xs font-medium hover:bg-red-600"
                          >
                            Deny
                          </button>
                        {:else if player.status === "approved"}
                          <button
                            onclick={() => act(player.id, "revoke")}
                            class="rounded bg-red-700 px-2 py-0.5 text-xs font-medium hover:bg-red-600"
                          >
                            Revoke
                          </button>
                        {/if}
                      </div>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
