<script lang="ts">
  import { closeTable, openTable } from "$lib/table.remote";

  let { tableId, open }: { tableId: string; open: boolean } = $props();

  async function toggleOpen() {
    if (open) {
      await closeTable(tableId);
    } else {
      await openTable(tableId);
    }
  }
</script>

<label
  class="flex cursor-pointer items-center justify-between rounded-lg bg-white/5 px-4 py-3 select-none"
>
  <span class="flex flex-col">
    <span class="text-sm font-semibold text-zinc-100">Online</span>
    <span class="text-xs text-zinc-400"> When online, new players can join the table. </span>
  </span>
  <input type="checkbox" checked={open} onchange={toggleOpen} class="h-4 w-4 accent-violet-400" />
</label>
