<script lang="ts">
  import { setContext, type Snippet } from 'svelte'
  import { pan, type GestureCustomEvent } from 'svelte-gestures'
  import { MOUSE_BUTTON_LEFT } from '$lib/constants.js'

  let {
    width,
    height,
    children,
  }: {
    width?: number
    height?: number
    children?: Snippet
  } = $props()

  let position = $state([0, 0])
  let scale = $state(1)
  let rotation = $state(0)

  // Grab motion
  let grabbing = $state(false)
  let grabOffset: number[] = []

  const scaleFactor = 1 / 1_000

  function onMouseWheel(event: WheelEvent) {
    event.preventDefault()

    // Get the current cursor position relative to the wrapper
    const rect = boardContainer.getBoundingClientRect()
    const cursorX = (event.clientX - rect.left - position[0]) / scale
    const cursorY = (event.clientY - rect.top - position[1]) / scale

    // Exponential scaling
    const zoomFactor = Math.exp(-event.deltaY * scaleFactor)
    const previousScale = scale
    scale = Math.max(0.1, scale * zoomFactor)

    position = [
      position[0] + cursorX * (previousScale - scale),
      position[1] + cursorY * (previousScale - scale),
    ]
  }

  // Disable context menu
  function onContextMenu(event: MouseEvent) {
    event.preventDefault()
  }

  let boardContainer: HTMLDivElement

  class Transform {
    get position() {
      return position
    }

    get scale() {
      return scale
    }
  }

  setContext('globalTransform', new Transform())

  function onPanDown(event: GestureCustomEvent) {
    const { event: srcEvent } = event.detail
    srcEvent.preventDefault()

    if (srcEvent.button === MOUSE_BUTTON_LEFT) {
      grabbing = true
      grabOffset = [event.detail.x - position[0], event.detail.y - position[1]]
    }

    return false
  }

  function onPanMove(event: GestureCustomEvent) {
    if (grabbing) {
      position = [
        event.detail.x - grabOffset[0],
        event.detail.y - grabOffset[1],
      ]
    }
  }

  function onPanUp(event: GestureCustomEvent) {
    const { event: srcEvent } = event.detail

    if (srcEvent.button === MOUSE_BUTTON_LEFT) {
      grabbing = false
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  bind:this={boardContainer}
  class="board"
  role="region"
  style:width
  style:height
  oncontextmenu={onContextMenu}
  onwheel={onMouseWheel}
  use:pan={() => ({})}
  onpandown={onPanDown}
  onpanmove={onPanMove}
  onpanup={onPanUp}
  style:cursor={grabbing ? 'move' : undefined}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="camera"
    style:scale
    style:translate={`${position[0]}px ${position[1]}px`}
    style:rotate={`${rotation}deg`}
  >
    {@render children?.()}
  </div>
</div>

<style>
  .board {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    user-select: none;
  }

  .camera {
    transform-origin: 0 0;
    will-change: scale, translate, rotate;
    width: 100%;
    height: 100%;
  }
</style>
