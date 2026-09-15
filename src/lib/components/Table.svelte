<script lang="ts">
  import { dropzone, type DropPoint } from "$lib/actions/drag-n-drop.js";
  import {
    placeToken,
    placeMap,
    removeToken,
    removeMap,
    assignTokenOwner,
  } from "$lib/table.remote";
  import Board from "./Board.svelte";
  import AssetNode from "./Board/Asset.svelte";
  import FogMap from "./Board/FogMap.svelte";
  import PingRipple from "./Board/Ping.svelte";
  import TokenNode from "./Board/Token.svelte";
  import TokenContextMenu from "./Board/TokenContextMenu.svelte";
  import MapContextMenu from "./Board/MapContextMenu.svelte";

  let {
    boardState,
    role,
    player,
    tableId,
    pings = [],
    onping,
    fogToolActive = false,
    brushMode = "reveal",
    brushSize = 50,
  }: {
    boardState: BoardState;
    role: "DM" | "PLAYER";
    player: Player | null;
    tableId: string;
    pings?: Array<{ id: string; position: Position }>;
    onping?: (position: Position) => void;
    fogToolActive?: boolean;
    brushMode?: "reveal" | "hide";
    brushSize?: number;
  } = $props();

  let board = $state<{ screenToBoard: (clientX: number, clientY: number) => Position } | null>(
    null,
  );

  type ContextMenu = { token: Token; x: number; y: number };

  let contextMenu = $state<ContextMenu | null>(null);

  type MapMenuState = { map: BoardMap; x: number; y: number };
  let mapContextMenu = $state<MapMenuState | null>(null);

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

  async function onDrop(asset: Asset, point: DropPoint) {
    const pos = board?.screenToBoard(point.clientX, point.clientY) ?? { x: 0, y: 0 };

    if (asset.mimetype === "application/vnd.universal.vtt") {
      await placeMap({ tableId, assetUrl: asset.url, position: pos });
      return;
    }

    if (asset.mimetype === "application/json") {
      const { name, imageUrl } = await resolveTokenData(asset);
      await placeToken({ tableId, name, imageUrl, position: pos });
    }
  }

  function handleTokenRightClick(token: Token, clientX: number, clientY: number) {
    contextMenu = { token, x: clientX, y: clientY };
  }

  function closeMenu() {
    contextMenu = null;
  }

  async function handleRemoveToken(tokenId: string) {
    closeMenu();
    await removeToken({ tableId, tokenId });
  }

  async function assignOwner(tokenId: string, ownerId: string | null) {
    closeMenu();
    await assignTokenOwner({ tableId, tokenId, owner: ownerId });
  }

  function handleMapRightClick(map: BoardMap, clientX: number, clientY: number) {
    mapContextMenu = { map, x: clientX, y: clientY };
  }

  function closeMapMenu() {
    mapContextMenu = null;
  }

  async function handleRemoveMap(mapId: string) {
    closeMapMenu();
    await removeMap({ tableId, mapId });
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
      <FogMap
        {map}
        {tableId}
        {role}
        {fogToolActive}
        {brushSize}
        {brushMode}
        onrightclick={handleMapRightClick}
      />
    {/each}
    {#each boardState.tokens as token (token.id)}
      <TokenNode {token} {tableId} {role} {player} onrightclick={handleTokenRightClick} />
    {/each}
    {#each pings as ping (ping.id)}
      <PingRipple position={ping.position} />
    {/each}
  </Board>
</div>

{#if contextMenu}
  <TokenContextMenu
    token={contextMenu.token}
    x={contextMenu.x}
    y={contextMenu.y}
    {approvedPlayers}
    onclose={closeMenu}
    onassign={(ownerId) => assignOwner(contextMenu!.token.id, ownerId)}
    onremove={() => handleRemoveToken(contextMenu!.token.id)}
  />
{/if}

{#if mapContextMenu}
  <MapContextMenu
    x={mapContextMenu.x}
    y={mapContextMenu.y}
    onclose={closeMapMenu}
    onremove={() => handleRemoveMap(mapContextMenu!.map.id)}
  />
{/if}
