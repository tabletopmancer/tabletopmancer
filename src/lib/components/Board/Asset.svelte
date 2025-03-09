<script lang="ts">
  import Map from './Map.svelte'
  import Node from './Node.svelte'

  let { data }: { data: Asset } = $props()
</script>

{#if data.mimetype === 'application/vnd.universal.vtt'}
  <Node>
    <Map src={data.url} />
  </Node>
{/if}
