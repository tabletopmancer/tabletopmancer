<script lang="ts">
  let { position }: { position: Position } = $props();
</script>

<div class="ping" style:left="{position.x}px" style:top="{position.y}px">
  <div class="ring"></div>
  <div class="ring ring-delayed"></div>
</div>

<style>
  .ping {
    position: absolute;
    pointer-events: none;
  }

  .ring {
    position: absolute;
    width: 48px;
    height: 48px;
    margin-left: -24px;
    margin-top: -24px;
    border-radius: 50%;
    border: 3px solid rgba(250, 204, 21, 0.9);
    animation: ping-ripple 1.8s ease-out forwards;
  }

  .ring-delayed {
    animation-delay: 0.25s;
  }

  @keyframes ping-ripple {
    0% {
      transform: scale(0.1);
      opacity: 1;
    }
    100% {
      transform: scale(3.5);
      opacity: 0;
    }
  }
</style>
