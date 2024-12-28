<script lang="ts">
  import { Plus, Settings } from 'lucide-svelte'
  let { data } = $props()
</script>

<svelte:head>
  <title>Tabletopmancer - ALPHA</title>
</svelte:head>

<main
  class="min-h-screen bg-gradient-to-br from-blue-800 via-violet-900 to-gray-800 p-4 text-gray-100"
>
  <ul class="mb-6 flex justify-end gap-4" role="navigation">
    <li><Plus aria-label="Create new table" /></li>
    <li><Settings aria-label="Settings" /></li>
  </ul>

  <ul class="grid grid-cols-1 gap-4">
    {#each data.tables as table}
      <a
        class="space-y-2 rounded bg-neutral-50 p-4 text-blue-800"
        href="/table/{table.id}"
      >
        <h2 class="text-lg">{table.name}</h2>
        <p class="text-right text-xs">{table.lastPlayed}</p>
      </a>
    {/each}
  </ul>
</main>
