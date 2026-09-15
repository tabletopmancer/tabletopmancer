<script lang="ts">
  import "./context-menu.css";

  let {
    token,
    x,
    y,
    approvedPlayers,
    onclose,
    onassign,
    onremove,
  }: {
    token: Token;
    x: number;
    y: number;
    approvedPlayers: Player[];
    onclose: () => void;
    onassign: (ownerId: string | null) => void;
    onremove: () => void;
  } = $props();

  let showAssign = $state(false);

  function toggleAssign() {
    showAssign = !showAssign;
  }
</script>

<div
  class="context-overlay"
  role="button"
  tabindex="-1"
  aria-label="Close menu"
  onclick={onclose}
  onkeydown={(e) => e.key === "Escape" && onclose()}
></div>

<div class="context-menu" style:left="{x}px" style:top="{y}px">
  <div
    class="context-item"
    role="button"
    tabindex="0"
    onmouseenter={() => (showAssign = true)}
    onmouseleave={() => (showAssign = false)}
    onclick={toggleAssign}
    onkeydown={(e) => e.key === "Enter" && toggleAssign()}
  >
    Assign to player
    <span class="context-arrow">▶</span>

    {#if showAssign}
      <div class="context-submenu">
        {#if approvedPlayers.length === 0}
          <p class="context-empty">No players connected</p>
        {/if}
        {#each approvedPlayers as p}
          <button
            class="context-item"
            class:context-active={token.owner === p.id}
            onclick={() => onassign(p.id)}
          >
            {p.name}
          </button>
        {/each}
        {#if token.owner}
          <hr class="context-divider" />
          <button class="context-item context-muted" onclick={() => onassign(null)}>
            Unassign
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <button class="context-item context-danger" onclick={onremove}> Remove </button>
</div>
