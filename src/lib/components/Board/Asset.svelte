<script lang="ts">
  import { onMount } from 'svelte'
  import Image from './Image.svelte'

  let { data }: { data: Asset } = $props()

  let imageSrc = $state<string | null>(null)

  // TODO: Handle other kind of assets
  onMount(async () => {
    if (data.mimetype === 'application/vnd.universal.vtt') {
      const req = await fetch(data.url)
      const map = (await req.json()) as { image: string }
      imageSrc = `data:image/png;base64,${map.image}`
    }
  })
</script>

{#if imageSrc}
  <Image src={imageSrc} />
{/if}
