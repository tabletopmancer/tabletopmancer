<script lang="ts">
  import { Grid2x2, Image, FileJson, Box, Music, Map } from 'lucide-svelte'
  import tooltip from '$lib/actions/tooltip.js'
  import { draggable } from '$lib/actions/drag-n-drop.js'

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
      title: 'Objects',
      icon: Box,
    },
    {
      filter: /^application\/vnd\.universal\.vtt$/,
      title: 'Maps',
      icon: Map,
    },
    {
      filter: /^image\//,
      title: 'Images',
      icon: Image,
    },
    {
      filter: /^audio\//,
      title: 'Audio',
      icon: Music,
    },
    {
      filter: /^application\/schema\+json$/,
      title: 'Templates',
      icon: FileJson,
    },
  ]

  let active = $state<string | RegExp | null>(null)

  let filtered = $derived(
    active ? assets.filter((a) => a.mimetype.match(active!)) : assets
  )
</script>

<div
  class="fixed bottom-4 left-0 w-full px-4"
  role="region"
  aria-roledescription="Assets"
>
  <div class="container mx-auto rounded-lg bg-neutral-800 p-4 shadow-lg">
    <div class="mb-4 flex justify-center gap-4">
      {#each categories as cat}
        {@const CategoryIcon = cat.icon}
        <button
          class="flex cursor-pointer items-center gap-2"
          class:text-violet-400={active === cat.filter}
          onclick={() => (active = cat.filter === active ? null : cat.filter)}
          aria-label={cat.title}
          use:tooltip={cat.title}
        >
          {#if cat.icon}
            <CategoryIcon />
          {/if}
        </button>
      {/each}
    </div>

    <div
      class="scrollbar-none flex min-h-20 w-full items-center gap-4 overflow-x-scroll py-1"
    >
      {#each filtered as asset}
        <div
          class="relative flex aspect-square h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-neutral-500 text-center break-all select-none *:pointer-events-none"
          use:tooltip={asset.name}
          use:draggable={asset}
        >
          {#if asset.thumbnail}
            <img
              class="h-full w-full rounded-full object-cover"
              src={asset.thumbnail}
              alt=""
            />
          {:else}
            <p class="p-2 text-xs">{asset.name}</p>
          {/if}
          {#if asset.codex.icon}
            <img
              class="absolute right-[-10px] bottom-[-10px] h-12 w-12"
              src={asset.codex.icon}
              alt=""
            />
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>
