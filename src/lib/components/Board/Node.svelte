<script lang="ts">
  import { getContext, type Snippet } from 'svelte'
  import { pan, type GestureCustomEvent } from 'svelte-gestures'
  import { MOUSE_BUTTON_LEFT } from '$lib/constants.js'

  let {
    position = [0, 0],
    scale = 1,
    rotation = 0,
    origin = [0, 0],
    draggable = false,
    children,
  }: {
    position?: number[]
    scale?: number
    rotation?: number
    origin?: number[]
    draggable?: boolean
    children?: Snippet
  } = $props()

  const globalTransform = getContext<{
    position: number[]
    scale: number
  }>('globalTransform')

  // Calc the global position according to the parent transformation
  const globalPosition = $derived([
    position[0] * globalTransform.scale + globalTransform.position[0],
    position[1] * globalTransform.scale + globalTransform.position[1],
  ])

  let dragging = $state(false)
  let globalOffset = [0, 0]

  function onPanDown(event: GestureCustomEvent) {
    if (!draggable) {
      return
    }

    const { event: srcEvent } = event.detail
    srcEvent.preventDefault()

    if (srcEvent.button === MOUSE_BUTTON_LEFT) {
      srcEvent.stopPropagation()
      dragging = true
      globalOffset = [
        srcEvent.clientX - globalPosition[0],
        srcEvent.clientY - globalPosition[1],
      ]
    }
  }

  function onPanMove(event: GestureCustomEvent) {
    if (dragging) {
      const { event: srcEvent } = event.detail

      const offset = [
        srcEvent.clientX - globalOffset[0],
        srcEvent.clientY - globalOffset[1],
      ]

      position = [
        (offset[0] - globalTransform.position[0]) / globalTransform.scale,
        (offset[1] - globalTransform.position[1]) / globalTransform.scale,
      ]
    }
  }

  function onPanUp(event: GestureCustomEvent) {
    const { event: srcEvent } = event.detail

    if (srcEvent.button === MOUSE_BUTTON_LEFT) {
      dragging = false
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  role="region"
  use:pan={() => ({})}
  onpandown={onPanDown}
  onpanmove={onPanMove}
  onpanup={onPanUp}
  style:transform-origin={origin.join(' ')}
  style:scale
  style:translate={`${position[0]}px ${position[1]}px`}
  style:rotate={`${rotation}deg`}
  style:cursor={draggable ? (dragging ? 'grabbing' : 'grab') : null}
  style:z-index={dragging ? Number.MAX_SAFE_INTEGER : undefined}
  class:dragging
>
  {@render children?.()}
</div>

<style>
  div {
    position: absolute;
    top: 0;
    left: 0;
    transition: box-shadow 200ms ease;
    will-change: scale, translate, rotate;
    width: fit-content;
    height: fit-content;
  }

  .dragging {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
</style>
