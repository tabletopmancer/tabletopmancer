<script lang="ts">
  import { onMount, setContext } from 'svelte'
  import { REGISTER_RENDER_KEY, type RenderFunction } from './canvas.js'

  let { children, width, height, ...rest } = $props()

  let canvasElement: HTMLCanvasElement
  let initialized = $state(false)

  onMount(() => {
    setContext('canvas', canvasElement)
    setContext(REGISTER_RENDER_KEY, registerRenderFunction)

    initialized = true
    renderStart()

    return () => renderEnd()
  })

  $effect(() => {
    canvasElement.width = width
    canvasElement.height = height
  })

  let renderFunctions: RenderFunction[] = []

  // Push a render function into the stack
  // Returns an anonymous fn for cleanup
  function registerRenderFunction(renderFn: RenderFunction) {
    renderFunctions.push(renderFn)
    return () => {
      renderFunctions = renderFunctions.filter((fn) => fn !== renderFn)
    }
  }

  let animationFrameId: number

  function renderStart() {
    const ctx = canvasElement.getContext('2d')!

    const loop = () => {
      ctx.clearRect(0, 0, canvasElement!.width, canvasElement!.height)
      ctx.save()

      // Use a counter-based `next` approach to ensure isolation
      let i = 0
      const next = () => {
        if (i < renderFunctions.length) {
          renderFunctions[i++]({ canvas: canvasElement, context: ctx, next })
        }
      }

      next()
      ctx.restore()
      animationFrameId = requestAnimationFrame(loop)
    }

    animationFrameId = requestAnimationFrame(loop)
  }

  function renderEnd() {
    cancelAnimationFrame(animationFrameId)
  }
</script>

<canvas bind:this={canvasElement} {...rest}>
  {#if initialized}
    {@render children()}
  {/if}
</canvas>
