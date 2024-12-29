<script lang="ts">
  import { getContext } from 'svelte'

  let { src }: { src: string } = $props()

  const ctx = getContext<CanvasRenderingContext2D>('2d')

  // TODO: Add position + scale + rotation

  // Load the image from the url
  // TODO: What happen when the props changes?
  const image = new Image()
  image.src = src

  // TODO: Load correct width and height
  // TODO: Render with transformations
  image.onload = () => {
    ctx.drawImage(image, 0, 0, 100, 100)
  }
</script>
