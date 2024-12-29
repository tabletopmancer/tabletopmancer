<script lang="ts">
  import { onMount, setContext } from 'svelte'

  let { children } = $props()

  let canvasElement: HTMLCanvasElement
  let initialized = $state(false)

  onMount(() => {
    setContext('canvas', canvasElement)
    setContext('2d', canvasElement.getContext('2d'))
    initialized = true
  })
</script>

<canvas
  bind:this={canvasElement}
  class="absolute left-0 top-0 h-screen w-screen"
>
  {#if initialized}
    {@render children()}
  {/if}
</canvas>
