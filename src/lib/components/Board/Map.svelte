<script lang="ts">
  import { onMount } from 'svelte'

  let { src }: { src: string } = $props()

  let mapData = $state<{ image: string } | null>(null)

  onMount(async () => {
    const req = await fetch(src)
    mapData = await req.json()
    console.log(mapData)
  })
</script>

{#if mapData}
  <img src={`data:image/png;base64,${mapData.image}`} alt="" />
{/if}
