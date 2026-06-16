<script>
  import { setContext } from 'svelte';

  let { label, children } = $props();

  setContext('paramRowLabel', () => label);
</script>

<div class="param-row">
  <span class="param-label">{label}</span>
  <div class="param-inputs">
    {@render children?.()}
  </div>
</div>

<style>
  .param-row {
    min-width: 0;
    display: flex;
    align-items: flex-end;
    gap: 16px;
    padding: 6px 0;
  }

  .param-label {
    min-width: 142px;
    padding-bottom: 6px;
    color: var(--kita-text-primary);
    font-size: 13px;
    font-weight: 800;
  }

  .param-inputs {
    min-width: 0;
    display: flex;
    align-items: end;
    gap: 8px;
  }

  @media (max-width: 560px) {
    .param-row {
      grid-template-columns: 1fr;
    }
  }
</style>
