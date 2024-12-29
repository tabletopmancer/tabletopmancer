<script lang="ts">
  import {
    Grid2x2,
    Image,
    FileJson,
    Box,
    Music,
  } from 'lucide-svelte'

  let { assets }: { assets: Asset[] } = $props()

  // TODO: Render as tabs
  const categories = [
    {
      filter: null,
      title: 'All',
      icon: Grid2x2,
    },
    {
      filter: /^application\/json$/,
      title: 'Data',
      icon: Box,
    },
    {
      filter: /^image\//,
      title: 'Image',
      icon: Image,
    },
    {
      filter: /^audio\//,
      title: 'Audio',
      icon: Music,
    },
    {
      filter: /^application\/schema\+json$/,
      title: 'Template',
      icon: FileJson,
    },
  ]

  let active = $state<string | RegExp | null>(null)

  let filtered = $derived(
    active ? assets.filter((a) => a.mimetype.match(active!)) : assets
  )
</script>

<div class="fixed bottom-4 left-0 w-full px-4">
  <div class="container mx-auto rounded-lg bg-neutral-800 p-4">
    <div class="mb-4 flex justify-center gap-4">
      {#each categories as cat}
        {@const CategoryIcon = cat.icon}
        <button
          class="flex items-center gap-2"
          class:text-violet-400={active === cat.filter}
          onclick={() => (active = cat.filter === active ? null : cat.filter)}
          title={cat.title}
        >
          {#if cat.icon}
            <CategoryIcon />
          {/if}
        </button>
      {/each}
    </div>

    <div
      class="flex min-h-20 w-full items-center gap-4 overflow-x-scroll py-1 scrollbar-none"
    >
      {#each filtered as asset}
        <div
          class="flex aspect-square h-16 w-16 cursor-pointer items-center justify-center break-all rounded-full bg-neutral-500 p-2 text-center text-xs"
          title={asset.name}
        >
          <p>{asset.name}</p>
        </div>
      {/each}
    </div>
  </div>
</div>
