<script lang="ts">
  import { dropzone } from "$lib/actions/drag-n-drop.js";
  import Board from "./Board.svelte";
  import AssetNode from "./Board/Asset.svelte";
  import FogMap from "./Board/FogMap.svelte";
  import PingRipple from "./Board/Ping.svelte";
  import TokenNode from "./Board/Token.svelte";

  let {
    boardState,
    role,
    player,
    tableId,
    pings = [],
    onping,
  }: {
    boardState: BoardState;
    role: "DM" | "PLAYER";
    player: Player | null;
    tableId: string;
    pings?: Array<{ id: string; position: Position }>;
    onping?: (position: Position) => void;
  } = $props();

  let fogToolActive = $state(false);
  let brushMode = $state<"reveal" | "hide">("reveal");
  let brushSize = $state(50);

  const BRUSH_SIZES: Array<{ label: string; value: number }> = [
    { label: "S", value: 25 },
    { label: "M", value: 50 },
    { label: "L", value: 100 },
    { label: "XL", value: 150 },
    { label: "XXL", value: 200 },
  ];

  let board = $state<{ screenToBoard: (clientX: number, clientY: number) => Position } | null>(
    null,
  );

  type ContextMenu = {
    token: Token;
    x: number;
    y: number;
    showAssign: boolean;
  };

  let contextMenu = $state<ContextMenu | null>(null);

  const approvedPlayers = $derived(boardState.players.filter((p) => p.status === "approved"));

  async function resolveTokenData(asset: Asset): Promise<{ name: string; imageUrl?: string }> {
    let name = asset.name;
    let imageUrl: string | undefined;
    try {
      const data = await fetch(asset.url).then((r) => r.json());
      if (data.name) name = data.name;
      if (data.image) {
        imageUrl = new URL(data.image, new URL(asset.url, window.location.href)).pathname;
      }
    } catch {
      // use asset name as fallback
    }
    return { name, imageUrl };
  }

  async function onDrop(asset: Asset, event: DragEvent) {
    if (asset.mimetype === "application/vnd.universal.vtt") {
      const pos = board?.screenToBoard(event.clientX, event.clientY) ?? { x: 0, y: 0 };
      await fetch(`/table/${tableId}/map`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetUrl: asset.url, position: pos }),
      });
      return;
    }

    if (asset.mimetype === "application/json") {
      const pos = board?.screenToBoard(event.clientX, event.clientY) ?? { x: 0, y: 0 };
      const { name, imageUrl } = await resolveTokenData(asset);
      await fetch(`/table/${tableId}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, imageUrl, position: pos }),
      });
    }
  }

  function handleTokenRightClick(token: Token, clientX: number, clientY: number) {
    contextMenu = { token, x: clientX, y: clientY, showAssign: false };
  }

  function closeMenu() {
    contextMenu = null;
  }

  async function removeToken(tokenId: string) {
    closeMenu();
    await fetch(`/table/${tableId}/token/${tokenId}`, { method: "DELETE" });
  }

  async function assignOwner(tokenId: string, ownerId: string | null) {
    closeMenu();
    await fetch(`/table/${tableId}/token/${tokenId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: ownerId }),
    });
  }

  function handleBoardClick(event: MouseEvent) {
    if (!event.altKey) return;
    event.preventDefault();
    const pos = board?.screenToBoard(event.clientX, event.clientY);
    if (pos) onping?.(pos);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  role="region"
  aria-roledescription="Game board"
  class="h-full w-full"
  use:dropzone={onDrop}
  onclick={handleBoardClick}
>
  <Board bind:this={board}>
    {#each boardState.maps as map (map.id)}
      <FogMap {map} {tableId} {role} {fogToolActive} {brushSize} {brushMode} />
    {/each}
    {#each boardState.tokens as token (token.id)}
      <TokenNode {token} {tableId} {role} {player} onrightclick={handleTokenRightClick} />
    {/each}
    {#each pings as ping (ping.id)}
      <PingRipple position={ping.position} />
    {/each}
  </Board>
</div>

{#if role === "DM"}
  <div class="fog-toolbar">
    <button
      class="fog-mode-btn"
      class:fog-active={fogToolActive}
      onclick={() => (fogToolActive = !fogToolActive)}
      title="Toggle fog brush"
    >
      <span class="fog-icon">{fogToolActive ? "🌑" : "🌕"}</span>
      Fog
    </button>

    {#if fogToolActive}
      <div class="fog-divider"></div>
      <button
        class="fog-mode-btn"
        class:fog-active={brushMode === "reveal"}
        onclick={() => (brushMode = "reveal")}
        title="Reveal fog"
      >
        ☀
      </button>
      <button
        class="fog-mode-btn"
        class:fog-active={brushMode === "hide"}
        onclick={() => (brushMode = "hide")}
        title="Hide fog"
      >
        ✦
      </button>
      <div class="fog-divider"></div>
      {#each BRUSH_SIZES as s}
        <button
          class="fog-size-btn"
          class:fog-active={brushSize === s.value}
          onclick={() => (brushSize = s.value)}
        >
          {s.label}
        </button>
      {/each}
    {/if}
  </div>
{/if}

{#if contextMenu}
  <div
    class="context-overlay"
    role="button"
    tabindex="-1"
    aria-label="Close menu"
    onclick={closeMenu}
    onkeydown={(e) => e.key === "Escape" && closeMenu()}
  ></div>

  <div class="context-menu" style:left="{contextMenu.x}px" style:top="{contextMenu.y}px">
    <div
      class="context-item"
      role="button"
      tabindex="0"
      onmouseenter={() => {
        if (contextMenu) contextMenu.showAssign = true;
      }}
      onmouseleave={() => {
        if (contextMenu) contextMenu.showAssign = false;
      }}
      onclick={() => {
        if (contextMenu) contextMenu.showAssign = !contextMenu.showAssign;
      }}
      onkeydown={(e) =>
        e.key === "Enter" && contextMenu && (contextMenu.showAssign = !contextMenu.showAssign)}
    >
      Assign to player
      <span class="context-arrow">▶</span>

      {#if contextMenu.showAssign}
        <div class="context-submenu">
          {#if approvedPlayers.length === 0}
            <p class="context-empty">No players connected</p>
          {/if}
          {#each approvedPlayers as p}
            <button
              class="context-item"
              class:context-active={contextMenu.token.owner === p.id}
              onclick={() => assignOwner(contextMenu!.token.id, p.id)}
            >
              {p.name}
            </button>
          {/each}
          {#if contextMenu.token.owner}
            <hr class="context-divider" />
            <button
              class="context-item context-muted"
              onclick={() => assignOwner(contextMenu!.token.id, null)}
            >
              Unassign
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <button class="context-item context-danger" onclick={() => removeToken(contextMenu!.token.id)}>
      Remove
    </button>
  </div>
{/if}

<style>
  .context-overlay {
    position: fixed;
    inset: 0;
    z-index: 40;
  }

  .context-menu {
    position: fixed;
    z-index: 50;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    padding: 4px 0;
    min-width: 160px;
    font-size: 0.875rem;
    color: #f3f4f6;
  }

  .context-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 16px;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
    user-select: none;
  }

  .context-item:hover {
    background: #374151;
  }

  .context-arrow {
    font-size: 0.6rem;
    margin-left: 8px;
  }

  .context-submenu {
    position: absolute;
    left: 100%;
    top: 0;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    padding: 4px 0;
    min-width: 140px;
  }

  .context-active {
    color: #a78bfa;
  }

  .context-danger {
    color: #f87171;
  }

  .context-muted {
    color: #9ca3af;
  }

  .context-empty {
    padding: 8px 16px;
    color: #6b7280;
    font-size: 0.75rem;
  }

  .context-divider {
    border-color: #374151;
    margin: 4px 0;
  }

  .fog-toolbar {
    position: fixed;
    bottom: 16px;
    left: 50%;
    translate: -50% 0;
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 4px;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 10px;
    padding: 6px 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }

  .fog-mode-btn,
  .fog-size-btn {
    background: none;
    border: none;
    border-radius: 6px;
    color: #9ca3af;
    cursor: pointer;
    font-size: 0.8rem;
    padding: 4px 8px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .fog-mode-btn:hover,
  .fog-size-btn:hover {
    background: #374151;
    color: #f3f4f6;
  }

  .fog-active {
    background: #4c1d95 !important;
    color: #ddd6fe !important;
  }

  .fog-divider {
    width: 1px;
    height: 20px;
    background: #374151;
    margin: 0 4px;
  }
</style>
