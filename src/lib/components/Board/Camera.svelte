<script lang="ts">
  import { getContext, onMount } from 'svelte'
  import { onRender } from './canvas.js'

  let {
    children,
    position = $bindable([0, 0]),
    scale = $bindable(1),
  } = $props()

  // TODO: Add grab motion

  const scaleFactor = 1 / 1_000
  const canvas = getContext<HTMLCanvasElement>('canvas')

  // TODO: Scale from the cursor position
  function onMouseWheel(event: WheelEvent) {
    scale += event.deltaY * scaleFactor
  }

  onMount(() => {
    canvas.addEventListener('wheel', onMouseWheel)

    return () => {
      canvas.removeEventListener('wheel', onMouseWheel)
    }
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
