<script lang="ts">
  let { content }: { content: string | undefined } = $props();
</script>

<div class="rounded-sm bg-neutral-700 p-1 text-xs text-white">
  {content}
</div>
