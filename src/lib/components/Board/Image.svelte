<script lang="ts">
  import { onRender } from './canvas.js'

  let {
    src,
    width,
    height,
    position = [0, 0],
    scale = 1,
  }: {
    src: string
    width?: number
    height?: number
    position?: number[]
    scale?: number
  } = $props()

  // TODO: Add position + scale + rotation

  // Load the image from the url
  // TODO: What happen when the props changes?
  const image = new Image()
  image.src = src

  if (width) {
    image.width = width
  }

  if (height) {
    image.height = height
  }

  onRender(({ context, next }) => {
    if (image.complete) {
      context.save()
      // TODO: Load correct width and height
      context.drawImage(image, position[0], position[1])
      context.scale(scale, scale)
      context.restore()
    }
    next()
  })
</script>
