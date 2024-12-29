<script lang="ts">
  import { UserCog, UserPlus } from 'lucide-svelte'
  import AssetDrawer from '$lib/components/AssetDrawer.svelte'

  let { data } = $props()
</script>

<main
  class="min-h-screen bg-gradient-to-br from-blue-800 via-violet-900 to-gray-800 p-4 text-gray-100"
>
  {#if data.role === 'DM'}
    <ul class="mb-6 flex justify-end gap-4" role="navigation">
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

  <div aria-label="Maps and tokens renderer"></div>

  {#if data.role === 'DM'}
    <AssetDrawer assets={data.assets} />
  {/if}
</main>
