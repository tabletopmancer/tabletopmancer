<script lang="ts">
  let { content }: { content: string | undefined } = $props();
</script>

<div class="rounded-sm bg-zinc-700 p-1 text-xs text-white">
  {content}
</div>
