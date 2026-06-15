<script>
  import Modal from './Modal.svelte';

  let {
    open = false,
    label = '',
    currentValue = 0,
    min = undefined,
    max = undefined,
    onaccept = () => {},
    onclose = () => {},
  } = $props();

  let entry = $state('');

  $effect(() => {
    if (open) entry = '';
  });

  const rows = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['+/-', '0', '.'],
  ];

  const displayValue = $derived(entry === '' ? '-' : entry);

  function press(key) {
    if (key === 'backspace') {
      entry = entry.slice(0, -1);
      return;
    }
    if (key === 'clear') {
      entry = '';
      return;
    }
    if (key === '.' && entry.includes('.')) return;
    if (key === '+/-') {
      entry = entry.startsWith('-') ? entry.slice(1) : `-${entry}`;
      return;
    }
    entry += key;
  }

  function bounded(value) {
    if (min !== undefined && value < min) return min;
    if (max !== undefined && value > max) return max;
    return value;
  }

  function accept() {
    const parsed = entry === '' || entry === '-' ? Number(currentValue) : Number(entry);
    if (Number.isFinite(parsed)) onaccept(bounded(parsed));
    onclose();
  }
</script>

<Modal {open} {onclose} labelledBy="numpad-title">
  <div class="numpad">
    <header>
      <h3 id="numpad-title">{label}</h3>
      <div class="current">
        <span>Current</span>
        <strong>{currentValue}</strong>
      </div>
    </header>

    <output class="entry" aria-live="polite">{displayValue}</output>

    <div class="keys">
      {#each rows as row}
        {#each row as key}
          <button class="key" type="button" onclick={() => press(key)}>{key}</button>
        {/each}
      {/each}
      <button class="key utility" type="button" onclick={() => press('clear')}>C</button>
      <button
        class="key utility"
        type="button"
        aria-label="Backspace"
        onclick={() => press('backspace')}
      >
        Back
      </button>
      <div></div>
    </div>

    <footer>
      <button class="kita-button secondary" type="button" onclick={onclose}>Cancel</button>
      <button class="kita-button" type="button" onclick={accept}>Accept</button>
    </footer>
  </div>
</Modal>

<style>
  .numpad {
    width: min(320px, 82vw);
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
    font-size: var(--kita-font-md);
    text-align: center;
    text-transform: uppercase;
  }

  .current {
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--kita-space-3);
    border-radius: var(--kita-radius-control);
    padding: 0 var(--kita-space-3);
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
    font-family: var(--kita-font-mono);
  }

  .entry {
    min-height: 58px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    border: 1px solid var(--kita-border-emphasis);
    border-radius: var(--kita-radius-control);
    padding: 0 var(--kita-space-4);
    background: var(--kita-bg-page);
    color: var(--kita-text-primary);
    font-size: var(--kita-font-xxl);
    font-weight: 800;
  }

  .keys {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--kita-space-2);
  }

  .key {
    min-height: 56px;
    border: 1px solid var(--kita-border);
    border-radius: var(--kita-radius-control);
    background: var(--kita-bg-inset);
    color: var(--kita-text-primary);
    font: inherit;
    font-size: var(--kita-font-xl);
    font-weight: 800;
    cursor: pointer;
  }

  .key:active {
    background: var(--kita-bg-header);
  }

  .key.utility {
    color: var(--kita-text-muted);
    font-size: var(--kita-font-md);
  }

  footer {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--kita-space-2);
  }
</style>
