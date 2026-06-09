<script lang="ts">
  import { getContext, untrack } from "svelte";
  import { usePan, type GestureCustomEvent } from "svelte-gestures";
  import { MOUSE_BUTTON_LEFT } from "$lib/constants.js";

  let {
    map,
    tableId,
    role,
    fogToolActive = false,
    brushSize = 50,
    brushMode = "reveal" as "reveal" | "hide",
  }: {
    map: BoardMap;
    tableId: string;
    role: "DM" | "PLAYER";
    fogToolActive?: boolean;
    brushSize?: number;
    brushMode?: "reveal" | "hide";
  } = $props();

  const globalTransform = getContext<{ position: number[]; scale: number }>("globalTransform");

  let mapData = $state<{ image: string } | null>(null);
  let imgEl: HTMLImageElement | undefined = $state();
  let canvasEl: HTMLCanvasElement | undefined = $state();
  let imgLoaded = $state(false);

  let localX = $state(untrack(() => map.position.x));
  let localY = $state(untrack(() => map.position.y));
  let dragging = $state(false);
  let pendingMove = $state(false);
  let savedX = 0;
  let savedY = 0;
  let globalOffset = [0, 0];

  let painting = $state(false);
  let lastSendTime = 0;

  $effect(() => {
    const sx = map.position.x;
    const sy = map.position.y;
    if (!dragging && !pendingMove) {
      localX = sx;
      localY = sy;
    }
  });

  $effect(() => {
    fetch(map.assetUrl)
      .then((r) => r.json())
      .then((data: { image: string }) => {
        mapData = data;
      });
  });

  $effect(() => {
    void (map.fog ?? []).length;
    if (!canvasEl || !imgLoaded) return;
    redrawFog();
  });

  function onImgLoad() {
    if (!canvasEl || !imgEl) return;
    canvasEl.width = imgEl.naturalWidth;
    canvasEl.height = imgEl.naturalHeight;
    imgLoaded = true;
  }

  function fogFill(): string {
    return role === "DM" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,1)";
  }

  function redrawFog() {
    const ctx = canvasEl!.getContext("2d")!;
    ctx.clearRect(0, 0, canvasEl!.width, canvasEl!.height);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = fogFill();
    ctx.fillRect(0, 0, canvasEl!.width, canvasEl!.height);
    for (const patch of map.fog ?? []) {
      drawPatch(ctx, patch);
    }
  }

  function drawPatch(ctx: CanvasRenderingContext2D, patch: FogPatch) {
    ctx.beginPath();
    ctx.arc(patch.x, patch.y, patch.radius, 0, Math.PI * 2);
    if (patch.mode === "reveal") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = fogFill();
    }
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  const globalX = $derived(localX * globalTransform.scale + globalTransform.position[0]);
  const globalY = $derived(localY * globalTransform.scale + globalTransform.position[1]);

  function onPanDown(event: GestureCustomEvent) {
    if (role !== "DM" || fogToolActive) return;
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
    const res = await fetch(`/table/${tableId}/map/${map.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position: { x: localX, y: localY } }),
    });
    if (!res.ok) {
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

  function toCanvasCoords(event: MouseEvent): { x: number; y: number } {
    const rect = canvasEl!.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvasEl!.width / rect.width),
      y: (event.clientY - rect.top) * (canvasEl!.height / rect.height),
    };
  }

  function onCanvasMouseDown(event: MouseEvent) {
    if (!fogToolActive || role !== "DM") return;
    event.stopPropagation();
    event.preventDefault();
    painting = true;
    sendPaint(event, true);
  }

  function onCanvasMouseMove(event: MouseEvent) {
    if (!painting) return;
    event.stopPropagation();
    sendPaint(event, false);
  }

  function stopPainting() {
    painting = false;
  }

  async function sendPaint(event: MouseEvent, force: boolean) {
    const now = Date.now();
    if (!force && now - lastSendTime < 50) return;
    lastSendTime = now;

    const { x, y } = toCanvasCoords(event);
    const patch: FogPatch = { mode: brushMode, x, y, radius: brushSize };

    if (canvasEl) drawPatch(canvasEl.getContext("2d")!, patch);

    await fetch(`/table/${tableId}/map/${map.id}/fog`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patch }),
    });
  }
</script>

{#if mapData}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    role="region"
    {...panProps}
    style:translate={`${localX}px ${localY}px`}
    class="map-node"
    class:dragging
    style:cursor={role === "DM" && !fogToolActive ? (dragging ? "grabbing" : "grab") : "default"}
  >
    <!-- svelte-ignore a11y_missing_attribute -->
    <img
      bind:this={imgEl}
      src={`data:image/png;base64,${mapData.image}`}
      alt=""
      onload={onImgLoad}
      draggable="false"
    />
    <canvas
      bind:this={canvasEl}
      class="fog-canvas"
      style:pointer-events={fogToolActive && role === "DM" ? "auto" : "none"}
      style:cursor={fogToolActive && role === "DM"
        ? brushMode === "reveal"
          ? "crosshair"
          : "cell"
        : "default"}
      onmousedown={onCanvasMouseDown}
      onmousemove={onCanvasMouseMove}
      onmouseup={stopPainting}
      onmouseleave={stopPainting}
    ></canvas>
  </div>
{/if}

<style>
  .map-node {
    position: absolute;
    top: 0;
    left: 0;
    will-change: translate;
    user-select: none;
  }

  .dragging {
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
    z-index: 9999;
  }

  .fog-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
</style>
