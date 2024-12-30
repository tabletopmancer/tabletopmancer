<script lang="ts">
  import { onMount } from 'svelte'
  import { dropzone } from '$lib/actions/drag-n-drop.js'
  import Canvas from './Board/Canvas.svelte'
  import Camera from './Board/Camera.svelte'
  import AssetComponent from './Board/Asset.svelte'

  type View = {
    position?: Point
    map?: string
  }

  type Point = {
    x: number
    y: number
  }

  // TODO: Set the current map in a store so it can be shown in the assets drawer
  let view = $state<View>({})

  // List of the loaded assets
  // TODO: Implement a mechanism to remove from the table
  let assets = $state<Asset[]>([])

  function onDrop(asset: Asset) {
    if (asset.mimetype === 'application/vnd.universal.vtt') {
      assets.push(asset)
    }

    if (asset.mimetype === 'application/json') {
      // TODO: Create token if character/monster sheet
    }

    if (asset.mimetype === 'application/schema+json') {
      // TODO: Create a new instance of the template (opens a popup?)
    }
  }

  // Set the canvas dimensions to fit the screen
  let canvasWidth = $state(0)
  let canvasHeight = $state(0)

  function onWindowResize() {
    canvasWidth = window.innerWidth
    canvasHeight = window.innerHeight
  }

  onMount(() => {
    onWindowResize()
  })
</script>

<svelte:window onresize={onWindowResize} />

<div
  role="region"
  aria-roledescription="Game board"
  class="absolute left-0 top-0"
  use:dropzone={onDrop}
>
  <Canvas width={canvasWidth} height={canvasHeight}>
    <Camera>
      {#each assets as asset}
        <AssetComponent data={asset} />
      {/each}
    </Camera>
  </Canvas>
</div>
