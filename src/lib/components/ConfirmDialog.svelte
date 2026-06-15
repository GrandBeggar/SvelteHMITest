<script>
  import Modal from './Modal.svelte';

  let {
    open = false,
    title = 'Confirm',
    message = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onconfirm = () => {},
    onclose = () => {},
  } = $props();

  const titleId = 'confirm-dialog-title';

  function confirm() {
    onconfirm();
    onclose();
  }
</script>

<Modal {open} {onclose} labelledBy={titleId}>
  <div class="confirm-dialog">
    <h3 id={titleId}>{title}</h3>
    <p>{message}</p>
    <div class="confirm-actions">
      <button class="kita-button secondary" type="button" onclick={onclose}>{cancelLabel}</button>
      <button class="kita-button {variant}" type="button" onclick={confirm}>{confirmLabel}</button>
    </div>
  </div>
</Modal>

<style>
  .confirm-dialog {
    min-width: min(360px, 82vw);
    display: flex;
    flex-direction: column;
    gap: var(--kita-space-3);
    padding: var(--kita-space-5);
  }

  h3 {
    margin: 0;
    color: var(--kita-text-primary);
    font-size: var(--kita-font-lg);
  }

  p {
    margin: 0;
    color: var(--kita-text-secondary);
    line-height: 1.45;
  }

  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--kita-space-2);
    margin-top: var(--kita-space-1);
  }

  .kita-button.warning {
    border-color: var(--kita-chip-paused-bg);
    background: var(--kita-chip-paused-bg);
    color: var(--kita-chip-fg);
  }
</style>
