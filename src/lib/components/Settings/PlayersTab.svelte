<script lang="ts">
  import { Link } from "@lucide/svelte";
  import { actOnPlayer } from "$lib/table.remote";
  import { colorForPlayer } from "$lib/player-colors.js";

  let {
    tableId,
    players,
    inviteUrl,
  }: {
    tableId: string;
    players: Player[];
    inviteUrl: string;
  } = $props();

  let inviteCopied = $state(false);

  async function copyInviteLink() {
    await navigator.clipboard.writeText(inviteUrl);
    inviteCopied = true;
    setTimeout(() => {
      inviteCopied = false;
    }, 2000);
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

<div class="space-y-4">
  <div>
    <h3 class="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">Invite link</h3>
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
          <li class="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
            <span class="flex min-w-0 items-center gap-2 text-zinc-100">
              <span
                class="h-3 w-3 shrink-0 rounded-full"
                style="background: {colorForPlayer(player)}"
              ></span>
              <span class="truncate">{player.name}</span>
            </span>
            <div class="flex shrink-0 items-center gap-2">
              <span class="rounded px-2 py-0.5 text-xs font-medium {STATUS_STYLES[player.status]}">
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
