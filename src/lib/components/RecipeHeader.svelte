<script>
  import SaveIcon from '@lucide/svelte/icons/save';
  import XIcon from '@lucide/svelte/icons/x';

  let {
    name = 'New Recipe',
    selected = 'Select',
    disabled = false,
    onsave = () => {},
    ondiscard = () => {},
    onselect = () => {},
    children,
  } = $props();
</script>

<div class="recipe-header">
  <div class="recipe-controls">
    <button class="recipe-name" type="button" {disabled}>
      {name}
    </button>
    <button class="recipe-select" type="button" {disabled} onclick={onselect}>
      {selected}
    </button>
    <button
      class="recipe-btn save"
      type="button"
      aria-label="Save Recipe"
      title="Save recipe"
      {disabled}
      onclick={onsave}
    >
      <SaveIcon size={22} />
    </button>
    <button
      class="recipe-btn discard"
      type="button"
      aria-label="Discard Recipe"
      title="Discard recipe changes"
      {disabled}
      onclick={ondiscard}
    >
      <XIcon size={24} />
    </button>
  </div>
  {#if children}
    <div class="recipe-persistent">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .recipe-header {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .recipe-controls {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .recipe-name,
  .recipe-select,
  .recipe-btn {
    min-height: 40px;
    border: 1px solid var(--kita-border-emphasis);
    border-radius: 4px;
    background: var(--kita-bg-inset);
    color: var(--kita-text-primary);
    cursor: pointer;
  }

  .recipe-name,
  .recipe-select {
    overflow: hidden;
    padding: 0 12px;
    font-size: 14px;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .recipe-name {
    min-width: 180px;
  }

  .recipe-select {
    min-width: 170px;
    position: relative;
    color: var(--kita-text-primary);
  }

  .recipe-select::after {
    content: '▾';
    color: var(--kita-text-action);
    float: right;
    font-size: 14px;
  }

  .recipe-btn {
    width: 40px;
    flex: 0 0 40px;
    display: grid;
    place-items: center;
  }

  .recipe-btn.save {
    margin-left: auto;
  }

  .recipe-btn:disabled,
  .recipe-name:disabled,
  .recipe-select:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    transform: none;
  }

  .recipe-persistent {
    min-width: 0;
    display: flex;
    align-items: flex-end;
    gap: 12px;
  }
</style>
