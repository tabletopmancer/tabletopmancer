<script lang="ts">
  import "./context-menu.css";

  let {
    x,
    y,
    onclose,
    onremove,
  }: {
    x: number;
    y: number;
    onclose: () => void;
    onremove: () => void;
  } = $props();
</script>

<div
  class="context-overlay"
  role="button"
  tabindex="-1"
  aria-label="Close menu"
  onclick={onclose}
  onkeydown={(e) => e.key === "Escape" && onclose()}
></div>

<div class="context-menu" style:left="{x}px" style:top="{y}px">
  <button class="context-item context-danger" onclick={onremove}> Remove </button>
</div>
