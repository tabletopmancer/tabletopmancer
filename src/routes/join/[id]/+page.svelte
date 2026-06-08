<script lang="ts">
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { playerStatus } from "./join.remote";

  let { data } = $props();

  type StatusEvent =
    | { type: "dm:online" }
    | { type: "dm:offline" }
    | { type: "player:approved" }
    | { type: "player:denied" }
    | { type: "player:revoked" };

  let dmOnline = $state(false);
  let playerState = $state<Player | null>(data.player);

  function handleDmStatus(type: StatusEvent["type"]): boolean {
    if (type === "dm:online") {
      dmOnline = true;
      return true;
    }
    if (type === "dm:offline") {
      dmOnline = false;
      return true;
    }
    return false;
  }

  function resolvePlayerStatus(type: string): Player["status"] {
    return type === "player:denied" ? "denied" : "revoked";
  }

  async function handleStatusEvent(ev: StatusEvent, p: Player): Promise<void> {
    if (handleDmStatus(ev.type)) return;
    if (ev.type === "player:approved") {
      await goto(`/table/${data.tableId}`);
      return;
    }
    playerState = { ...p, status: resolvePlayerStatus(ev.type) };
  }

  $effect(() => {
    const p = playerState;
    if (!p || p.status !== "pending") return;

    const lq = playerStatus(`${data.tableId}|${p.id}`);
    const iter = lq[Symbol.asyncIterator]();

    (async () => {
      while (true) {
        const { value, done } = await iter.next();
        if (done) break;
        await handleStatusEvent(value as StatusEvent, p);
      }
    })();

    return () => {
      iter.return?.();
    };
  });
</script>

<main
  class="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-800 via-violet-900 to-gray-800 text-gray-100"
>
  <div class="w-full max-w-sm space-y-6 rounded-xl bg-white/10 p-8 shadow-xl backdrop-blur">
    {#if !playerState}
      <h1 class="text-center text-2xl font-semibold">Join the table</h1>
      <form method="POST" action="?/join" use:enhance class="space-y-4">
        <div>
          <label for="name" class="mb-1 block text-sm font-medium">Your name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autocomplete="off"
            placeholder="Enter your name"
            class="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 placeholder-white/40 outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <button
          type="submit"
          class="w-full rounded-lg bg-violet-600 px-4 py-2 font-semibold hover:bg-violet-500 active:bg-violet-700"
        >
          Request to join
        </button>
      </form>
    {:else if playerState.status === "pending"}
      <div class="space-y-4 text-center">
        <h1 class="text-2xl font-semibold">Waiting room</h1>
        <p class="font-medium">{playerState.name}</p>
        {#if dmOnline}
          <p class="text-white/70">Waiting for the DM to let you in&hellip;</p>
          <div class="mx-auto h-1.5 w-24 overflow-hidden rounded-full bg-white/20">
            <div class="animate-pulse h-full w-full rounded-full bg-violet-400"></div>
          </div>
        {:else}
          <p class="text-amber-300">Table is offline &mdash; try again later.</p>
        {/if}
      </div>
    {:else if playerState.status === "denied"}
      <div class="space-y-4 text-center">
        <h1 class="text-2xl font-semibold">Access denied</h1>
        <p class="text-white/70">The DM did not approve your request.</p>
        <form method="POST" action="?/retry" use:enhance>
          <button
            type="submit"
            class="rounded-lg bg-violet-600 px-4 py-2 font-semibold hover:bg-violet-500"
          >
            Try again
          </button>
        </form>
      </div>
    {:else if playerState.status === "revoked"}
      <div class="space-y-4 text-center">
        <h1 class="text-2xl font-semibold">Access revoked</h1>
        <p class="text-white/70">The DM has removed you from this table.</p>
        <form method="POST" action="?/retry" use:enhance>
          <button
            type="submit"
            class="rounded-lg bg-violet-600 px-4 py-2 font-semibold hover:bg-violet-500"
          >
            Request again
          </button>
        </form>
      </div>
    {/if}
  </div>
</main>
