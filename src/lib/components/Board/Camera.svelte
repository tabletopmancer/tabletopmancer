<script lang="ts">
  import { getContext, onMount } from 'svelte'
  import { onRender } from './canvas.js'

  const canvas = getContext<HTMLCanvasElement>('canvas')

  let {
    children,
    position = $bindable([0, 0]),
    scale = $bindable(1),
  } = $props()

  // Grab motion
  let grabbing = $state(false)
  let grabStart: number[] = []
  let origPosition: number[] = []

  const scaleFactor = 1 / 1_000

  const MOUSE_BUTTON_LEFT = 0
  const MOUSE_BUTTON_WHEEL = 1
  const MOUSE_BUTTON_RIGHT = 2

  // TODO: Scale from the cursor position
  function onMouseWheel(event: WheelEvent) {
    scale += event.deltaY * scaleFactor
  }

  function onMouseDown(event: MouseEvent) {
    event.preventDefault()

    if (grabbing) {
      return
    }

    if (event.button === MOUSE_BUTTON_WHEEL) {
      grabbing = true
      grabStart = [event.clientX, event.clientY]
      origPosition = [...position]
      return
    }
  }

  function onMouseMove(event: MouseEvent) {
    if (grabbing) {
      position = [
        origPosition[0] - (grabStart[0] - event.clientX),
        origPosition[1] - (grabStart[1] - event.clientY),
      ]
    }
  }

  function onMouseUp(event: MouseEvent) {
    event.preventDefault()

    if (event.button === MOUSE_BUTTON_WHEEL) {
      grabbing = false
      return
    }
  }

  // Disable context menu
  function onContextMenu(event: MouseEvent) {
    event.preventDefault()
  }

  onMount(() => {
    canvas.addEventListener('wheel', onMouseWheel)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('contextmenu', onContextMenu)

    return () => {
      canvas.removeEventListener('wheel', onMouseWheel)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('contextmenu', onContextMenu)
    }
  })

  $effect(() => {
    canvas.style.cursor = grabbing ? 'move' : 'default'
  })

  onRender(({ context, next }) => {
    context.save()
    context.translate(position[0], position[1])
    context.scale(scale, scale)
    next()
    context.restore()
  })
</script>

{@render children()}
