<script lang="ts">
  import { getContext, untrack } from "svelte";
  import { usePan, type GestureCustomEvent } from "svelte-gestures";
  import { MOUSE_BUTTON_LEFT } from "$lib/constants.js";

  let {
    token,
    tableId,
    role,
    player,
    onrightclick,
  }: {
    token: Token;
    tableId: string;
    role: "DM" | "PLAYER";
    player: Player | null;
    onrightclick?: (token: Token, clientX: number, clientY: number) => void;
  } = $props();

  const globalTransform = getContext<{ position: number[]; scale: number }>("globalTransform");

  const canDrag = $derived(
    role === "DM" || (player !== null && token.owner === player.id),
  );

  let localX = $state(untrack(() => token.position.x));
  let localY = $state(untrack(() => token.position.y));
  let dragging = $state(false);
  let pendingMove = $state(false);
  let savedX = 0;
  let savedY = 0;
  let globalOffset = [0, 0];

  // Sync from server position when not dragging and no pending move
  $effect(() => {
    const sx = token.position.x;
    const sy = token.position.y;
    if (!dragging && !pendingMove) {
      localX = sx;
      localY = sy;
    }
  });

  const globalX = $derived(localX * globalTransform.scale + globalTransform.position[0]);
  const globalY = $derived(localY * globalTransform.scale + globalTransform.position[1]);

  const tokenSize = $derived((token.size ?? 1) * 64);

  function onPanDown(event: GestureCustomEvent) {
    if (!canDrag) return;
    const { event: srcEvent } = event.detail;
    srcEvent.preventDefault();
    if (srcEvent.button !== MOUSE_BUTTON_LEFT) return;
    srcEvent.stopPropagation();
    dragging = true;
    savedX = localX;
    savedY = localY;
    globalOffset = [srcEvent.clientX - globalX, srcEvent.clientY - globalY];
  }

  function onPanMove(event: GestureCustomEvent) {
    if (!dragging) return;
    const { event: srcEvent } = event.detail;
    const ox = srcEvent.clientX - globalOffset[0];
    const oy = srcEvent.clientY - globalOffset[1];
    localX = (ox - globalTransform.position[0]) / globalTransform.scale;
    localY = (oy - globalTransform.position[1]) / globalTransform.scale;
  }

  async function onPanUp(event: GestureCustomEvent) {
    const { event: srcEvent } = event.detail;
    if (srcEvent.button !== MOUSE_BUTTON_LEFT || !dragging) return;
    dragging = false;
    pendingMove = true;

    const response = await fetch(`/table/${tableId}/token/${token.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position: { x: localX, y: localY } }),
    });

    if (!response.ok) {
      localX = savedX;
      localY = savedY;
    }

    pendingMove = false;
  }

  const panProps = usePan(
    () => {},
    () => ({}),
    {
      onpandown: onPanDown,
      onpanmove: onPanMove,
      onpanup: onPanUp,
    },
  );

  function onContextMenu(event: MouseEvent) {
    if (role !== "DM") return;
    event.preventDefault();
    event.stopPropagation();
    onrightclick?.(token, event.clientX, event.clientY);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  role="img"
  aria-label={token.name}
  {...panProps}
  oncontextmenu={onContextMenu}
  style:translate={`${localX}px ${localY}px`}
  style:width={`${tokenSize}px`}
  style:height={`${tokenSize}px`}
  style:cursor={canDrag ? (dragging ? "grabbing" : "grab") : "default"}
  class="token"
  class:dragging
>
  {#if token.imageUrl}
    <img class="token-img" src={token.imageUrl} alt={token.name} />
  {:else}
    <div class="token-fallback">
      <span>{token.name[0]?.toUpperCase()}</span>
    </div>
  {/if}
  <span class="token-label">{token.name}</span>
</div>

<style>
  .token {
    position: absolute;
    top: 0;
    left: 0;
    user-select: none;
    will-change: translate;
  }

  .dragging {
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
    z-index: 9999;
  }

  .token-img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.4);
    display: block;
  }

  .token-fallback {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #7c3aed;
    border: 2px solid rgba(255, 255, 255, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 1.5rem;
  }

  .token-label {
    position: absolute;
    bottom: -20px;
    left: 50%;
    translate: -50% 0;
    font-size: 0.7rem;
    color: white;
    white-space: nowrap;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
    pointer-events: none;
  }
</style>
