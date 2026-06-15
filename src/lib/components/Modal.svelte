<script>
  let { open = false, onclose = () => {}, labelledBy = undefined, children } = $props();

  function onBackdropClick(event) {
    if (event.target === event.currentTarget) onclose();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') onclose();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="kita-modal-backdrop"
    role="presentation"
    onclick={onBackdropClick}
    onkeydown={onKeydown}
  >
    <div class="kita-modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      {@render children?.()}
    </div>
  </div>
{/if}

<style>
  .kita-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--kita-space-4);
    background: var(--kita-scrim);
    backdrop-filter: blur(4px);
  }

  .kita-modal {
    max-width: min(92vw, 760px);
    max-height: 92vh;
    overflow: auto;
    border: 1px solid var(--kita-border-emphasis);
    border-radius: var(--kita-radius-panel);
    background: var(--kita-bg-card);
    box-shadow: var(--kita-shadow-modal);
  }
</style>
