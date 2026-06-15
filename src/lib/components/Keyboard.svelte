<script>
  import Modal from './Modal.svelte';

  let {
    open = false,
    label = '',
    currentValue = '',
    onaccept = () => {},
    onclose = () => {},
  } = $props();

  let entry = $state('');
  let shift = $state(false);
  let caps = $state(false);

  $effect(() => {
    if (open) entry = currentValue ?? '';
  });

  const rows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ];
  const symbolRow = ['-', '_', '.', ',', '/', '(', ')'];
  const isUpper = $derived(shift || caps);

  function press(key) {
    entry += isUpper ? key.toUpperCase() : key;
    if (shift && !caps) shift = false;
  }

  function accept() {
    onaccept(entry);
    onclose();
  }
</script>

<Modal {open} {onclose} labelledBy="keyboard-title">
  <div class="keyboard">
    <header>
      <h3 id="keyboard-title">{label}</h3>
      <div class="current">
        <span>Current</span>
        <strong>{currentValue || '-'}</strong>
      </div>
    </header>

    <output class="entry" aria-live="polite">{entry}<span class="cursor">|</span></output>

    <div class="rows">
      {#each rows as row, index}
        <div class="key-row">
          {#if index === 3}
            <button
              class:active={shift || caps}
              class="key function"
              type="button"
              onclick={() => (shift = !shift)}
            >
              Shift
            </button>
          {/if}
          {#each row as key}
            <button class="key" type="button" onclick={() => press(key)}>
              {isUpper ? key.toUpperCase() : key}
            </button>
          {/each}
          {#if index === 3}
            <button class="key function" type="button" onclick={() => (entry = entry.slice(0, -1))}>
              Back
            </button>
          {/if}
        </div>
      {/each}

      <div class="key-row">
        <button
          class:active={caps}
          class="key function"
          type="button"
          onclick={() => (caps = !caps)}
        >
          Caps
        </button>
        {#each symbolRow as key}
          <button class="key symbol" type="button" onclick={() => press(key)}>{key}</button>
        {/each}
        <button class="key function" type="button" onclick={() => (entry = '')}>Clear</button>
      </div>
      <button class="key space" type="button" onclick={() => (entry += ' ')}>Space</button>
    </div>

    <footer>
      <button class="kita-button secondary" type="button" onclick={onclose}>Cancel</button>
      <button class="kita-button" type="button" onclick={accept}>Accept</button>
    </footer>
  </div>
</Modal>

<style>
  .keyboard {
    width: min(760px, 88vw);
    display: flex;
    flex-direction: column;
    gap: var(--kita-space-3);
    padding: var(--kita-space-4);
  }

  header {
    display: grid;
    gap: var(--kita-space-2);
  }

  h3 {
    margin: 0;
    color: var(--kita-text-primary);
    text-align: center;
    text-transform: uppercase;
  }

  .current,
  .entry {
    border-radius: var(--kita-radius-control);
    padding: var(--kita-space-2) var(--kita-space-3);
  }

  .current {
    display: flex;
    justify-content: space-between;
    background: var(--kita-bg-inset);
  }

  .current span {
    color: var(--kita-text-muted);
    font-size: var(--kita-font-xs);
    font-weight: 800;
    text-transform: uppercase;
  }

  .current strong,
  .entry {
    color: var(--kita-text-primary);
  }

  .entry {
    min-height: 48px;
    display: flex;
    align-items: center;
    border: 1px solid var(--kita-border-emphasis);
    background: var(--kita-bg-page);
    font-weight: 800;
  }

  .cursor {
    color: var(--kita-text-action);
  }

  .rows {
    display: grid;
    gap: var(--kita-space-2);
  }

  .key-row {
    display: flex;
    justify-content: center;
    gap: var(--kita-space-2);
  }

  .key {
    flex: 1;
    min-height: 48px;
    border: 1px solid var(--kita-border);
    border-radius: var(--kita-radius-control);
    background: var(--kita-bg-inset);
    color: var(--kita-text-primary);
    font: inherit;
    font-weight: 800;
    cursor: pointer;
  }

  .key.function {
    flex: 1.45;
    color: var(--kita-text-muted);
    font-size: var(--kita-font-sm);
  }

  .key.active {
    background: var(--kita-chip-transitioning-bg);
    color: var(--kita-chip-fg);
  }

  .key.space {
    width: 100%;
    color: var(--kita-text-muted);
    text-transform: uppercase;
  }

  footer {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--kita-space-2);
  }
</style>
