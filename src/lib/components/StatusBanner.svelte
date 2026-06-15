<script>
  let {
    online = false,
    label = online ? 'PLC Connected' : 'PLC Disconnected',
    detail = '',
  } = $props();
</script>

<div class:online class="status-banner" role="status" aria-live="polite">
  <span class="status-dot" aria-hidden="true"></span>
  <div>
    <strong>{label}</strong>
    {#if detail}
      <span>{detail}</span>
    {/if}
  </div>
</div>

<style>
  .status-banner {
    min-height: 58px;
    display: flex;
    align-items: center;
    gap: var(--kita-space-3);
    border: 1px solid var(--kita-chip-faulted-bg);
    border-radius: var(--kita-radius-panel);
    padding: var(--kita-space-3);
    background: var(--kita-status-offline-bg);
    color: var(--kita-chip-faulted-fg);
  }

  .status-banner.online {
    border-color: var(--kita-chip-running-bg);
    background: var(--kita-status-online-bg);
    color: var(--kita-chip-fg);
  }

  .status-dot {
    width: 14px;
    height: 14px;
    flex: 0 0 auto;
    border-radius: var(--kita-radius-round);
    background: var(--kita-chip-faulted-bg);
  }

  .status-banner.online .status-dot {
    background: var(--kita-chip-running-bg);
  }

  strong,
  span {
    display: block;
  }

  strong {
    font-size: var(--kita-font-sm);
    font-weight: 900;
    text-transform: uppercase;
  }

  span {
    margin-top: var(--kita-space-1);
    color: var(--kita-text-muted);
    font-size: var(--kita-font-xs);
    font-weight: 800;
  }
</style>
