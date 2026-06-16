<script>
  let { label, active = false, onclick = () => {} } = $props();
</script>

<button class="sub-nav-btn" class:active type="button" {onclick}>
  {label}
</button>

<style>
  .sub-nav-btn {
    min-height: 34px;
    border: 0;
    border-bottom: 2px solid transparent;
    padding: 0 14px;
    background: transparent;
    color: var(--kita-text-secondary);
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .sub-nav-btn:active,
  .sub-nav-btn.active {
    color: var(--kita-text-primary);
  }

  .sub-nav-btn.active {
    border-bottom-color: var(--kita-text-action);
  }
</style>
