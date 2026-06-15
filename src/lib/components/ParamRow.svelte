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
    display: grid;
    grid-template-columns: minmax(130px, 180px) minmax(0, 1fr);
    align-items: end;
    gap: var(--kita-space-3);
    padding: var(--kita-space-2) 0;
  }

  .param-label {
    padding-bottom: var(--kita-space-2);
    color: var(--kita-text-primary);
    font-weight: 850;
  }

  .param-inputs {
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: var(--kita-space-2);
  }

  @media (max-width: 560px) {
    .param-row {
      grid-template-columns: 1fr;
    }
  }
</style>
