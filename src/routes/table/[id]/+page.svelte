<script lang="ts">
  import { UserCog, UserPlus } from 'lucide-svelte'
  let { data } = $props()
</script>

<main
  class="min-h-screen bg-gradient-to-br from-blue-800 via-violet-900 to-gray-800 p-4 text-gray-100"
>
  {#if data.role === 'DM'}
    <ul class="mb-6 flex justify-end gap-4" role="navigation">
      <li><UserPlus aria-label="Invite players" /></li>
      <li><UserCog aria-label="Manage players" /></li>
    </ul>
  {/if}

  <div aria-label="Maps and tokens renderer"></div>

  <ul aria-label="Assets">
    {#each data.assets as asset}
      <li>{asset}</li>
    {/each}
  </ul>
</main>
