<script lang="ts">
  import { getContext, onMount } from 'svelte'
  import { Vector2 } from 'three'

  let { children } = $props()

  // TODO: Add grab motion
  let position = new Vector2()

  let scale = 1.0
  const scaleFactor = 1 / 1_000

  const canvas = getContext<HTMLCanvasElement>('canvas')
  const ctx = getContext<CanvasRenderingContext2D>('2d')

  // TODO: Refresh the ctx on zoom
  function onMouseWheel(event: WheelEvent) {
    scale += event.deltaZ * scaleFactor
  }

  onMount(() => {
    canvas.addEventListener('wheel', onMouseWheel)

    return () => {
      canvas.removeEventListener('wheel', onMouseWheel)
    }
  })
</script>

{@render children()}
