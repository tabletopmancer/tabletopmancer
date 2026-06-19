<script lang="ts">
  import { Link, Radio, Users, X } from "@lucide/svelte";
  import { actOnPlayer, closeTable, openTable } from "$lib/table.remote";

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

  type Tab = "general" | "players";
  let tab = $state<Tab>("general");

  const TABS: Array<{ id: Tab; label: string; icon: typeof Radio }> = [
    { id: "general", label: "General", icon: Radio },
    { id: "players", label: "Players", icon: Users },
  ];

  let inviteCopied = $state(false);

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
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
  role="dialog"
  aria-modal="true"
  aria-label="Settings"
>
  <div class="flex h-[28rem] w-full max-w-2xl overflow-hidden rounded-xl bg-zinc-900 shadow-xl">
    <nav class="flex w-40 shrink-0 flex-col gap-1 border-r border-white/10 bg-black/20 p-3">
      <h2 class="mb-2 px-2 text-sm font-semibold text-zinc-100">Settings</h2>
      {#each TABS as t (t.id)}
        <button
          onclick={() => (tab = t.id)}
          class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm {tab === t.id
            ? 'bg-violet-700 text-violet-100'
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
