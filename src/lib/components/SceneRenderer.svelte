<script lang="ts">
  import { dropzone } from '$lib/actions/drag-n-drop.js'

  type UVTT = {
    image: string
  }

  // TODO: Set the current map in a store so it can be shown in the assets drawer
  let map = $state<UVTT | null>(null)

  // TODO: Handle all the assets possibilites
  async function onDrop(asset: Asset) {
    if (asset.mimetype === 'application/vnd.universal.vtt') {
      const req = await fetch(asset.url)
      map = await req.json()
    }

    if (asset.mimetype === 'application/json') {
      // TODO: Create token if character/monster sheet
    }
  }
</script>

<div
  class="absolute left-0 top-0 h-screen w-screen"
  use:dropzone={onDrop}
  role="region"
  aria-roledescription="Scene"
></div>

{#if map}
  <img src="data:image/png;base64,{map.image}" alt="" />
{/if}
