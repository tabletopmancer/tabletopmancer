<script lang="ts">
  let { files }: { files: string[] } = $props()

  type Tree = {
    [key: string]: Tree
  }

  function filesToTree(paths: string[]): Tree {
    const tree: Tree = {}

    for (const path of paths) {
      const parts = path.split('/')
      let current = tree

      for (const part of parts) {
        if (!current[part]) {
          current[part] = {}
        }
        current = current[part]
      }
    }

    return tree
  }
</script>

{#snippet directory(tree: Tree, sub: boolean = false)}
  <ul class="block" class:pl-4={sub}>
    {#each Object.entries(tree) as [entry, children]}
      <li>
        <p>{entry}</p>
        {#if Object.keys(children).length > 0}
          {@render directory(children, true)}
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

{@render directory(filesToTree(files))}
