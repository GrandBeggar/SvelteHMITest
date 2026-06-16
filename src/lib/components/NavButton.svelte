<script>
  let { label, active = false, onclick = () => {} } = $props();
</script>

<button class="nav-btn" class:active type="button" {onclick}>
  {label}
</button>

<style>
  .nav-btn {
    min-height: 42px;
    border: 0;
    border-bottom: 2px solid transparent;
    padding: 0 18px;
    background: transparent;
    color: var(--kita-text-secondary);
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .nav-btn:active,
  .nav-btn.active {
    color: var(--kita-text-primary);
  }

  .nav-btn.active {
    border-bottom-color: var(--kita-text-action);
  }
</style>
