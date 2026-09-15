<script lang="ts">
  import { getHistory } from "$lib/table.remote";

  let { tableId, players }: { tableId: string; players: Player[] } = $props();

  type HistoryEntry = { id: number; type: string; payload: any; timestamp: number };

  let history = $state<HistoryEntry[]>([]);
  let historyLoading = $state(false);

  $effect(() => {
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
</script>

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
