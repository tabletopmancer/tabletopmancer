<script lang="ts">
  import { Clock } from "@lucide/svelte";

  let {
    table,
  }: {
    table: { id: string; name: string; lastPlayed: Date | string | number };
  } = $props();

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
