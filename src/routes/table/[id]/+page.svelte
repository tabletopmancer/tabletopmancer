<script lang="ts">
  import { Rss, UserCog, UserPlus } from 'lucide-svelte'
  import AssetDrawer from '$lib/components/AssetDrawer.svelte'
  import Table from '$lib/components/Table.svelte'

  let { data } = $props()
</script>

<main
  class="h-screen w-screen bg-gradient-to-br from-blue-800 via-violet-900 to-gray-800 text-gray-100"
>
  {#if data.role === 'DM'}
    <ul
      class="fixed top-0 mb-6 flex w-full justify-end gap-4 p-4"
      role="navigation"
    >
      <li>
        <button class="cursor-pointer" aria-label="Open the session">
          <Rss />
        </button>
      </li>
      <li>
        <button class="cursor-pointer" aria-label="Invite players">
          <UserPlus />
        </button>
      </li>
      <li>
        <button class="cursor-pointer" aria-label="Manage players">
          <UserCog />
        </button>
      </li>
    </ul>
  {/if}

  <Table />

  {#if data.role === 'DM'}
    <AssetDrawer assets={data.assets} />
  {/if}
</main>
