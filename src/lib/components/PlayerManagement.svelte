<script lang="ts">
  import { X } from "@lucide/svelte";

  let { tableId, players, onclose }: { tableId: string; players: Player[]; onclose: () => void } =
    $props();

  const pending = $derived(players.filter((p) => p.status === "pending"));
  const approved = $derived(players.filter((p) => p.status === "approved"));
  const others = $derived(players.filter((p) => p.status === "denied" || p.status === "revoked"));

  async function act(playerId: string, action: "approve" | "deny" | "revoke") {
    await fetch(`/table/${tableId}/players/${playerId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
  role="dialog"
  aria-modal="true"
  aria-label="Manage players"
>
  <div class="w-full max-w-md space-y-4 rounded-xl bg-gray-900 p-6 shadow-xl">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-100">Players</h2>
      <button onclick={onclose} aria-label="Close" class="text-gray-400 hover:text-gray-100">
        <X size={20} />
      </button>
    </div>

    {#if pending.length > 0}
      <section>
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Pending ({pending.length})
        </h3>
        <ul class="space-y-1">
          {#each pending as player (player.id)}
            <li class="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span class="text-gray-100">{player.name}</span>
              <div class="flex gap-2">
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
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if approved.length > 0}
      <section>
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Approved ({approved.length})
        </h3>
        <ul class="space-y-1">
          {#each approved as player (player.id)}
            <li class="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span class="text-gray-100">{player.name}</span>
              <button
                onclick={() => act(player.id, "revoke")}
                class="rounded bg-red-700 px-2 py-0.5 text-xs font-medium hover:bg-red-600"
              >
                Revoke
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if others.length > 0}
      <section>
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">History</h3>
        <ul class="space-y-1">
          {#each others as player (player.id)}
            <li class="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span class="text-gray-100">{player.name}</span>
              <span
                class="rounded px-2 py-0.5 text-xs font-medium {player.status === 'denied'
                  ? 'bg-amber-700 text-amber-100'
                  : 'bg-gray-700 text-gray-300'}"
              >
                {player.status}
              </span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if players.length === 0}
      <p class="text-center text-sm text-gray-500">No players yet.</p>
    {/if}
  </div>
</div>
