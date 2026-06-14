<script>
  import { onMount } from 'svelte';
  import { firstPassSymbols, writeTestSymbols } from '$lib/connections.js';
  import { getStatus, getValues, subscribe, write } from '$lib/adsStore.svelte.js';

  const status = getStatus();
  const values = getValues();
  let writesEnabled = $state(false);
  let numberDrafts = $state({});

  onMount(() => {
    for (const item of [...firstPassSymbols, ...writeTestSymbols]) {
      subscribe(item.symbol, 250);
    }
  });

  function formatValue(value) {
    if (value === undefined) return 'Waiting...';
    if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
    return JSON.stringify(value);
  }

  function toggleBool(symbol) {
    if (!writesEnabled) return;
    write(symbol, !values[symbol]);
  }

  function writeNumber(item) {
    if (!writesEnabled) return;
    const value = Number(numberDrafts[item.key]);
    if (Number.isFinite(value)) {
      const clamped = Math.min(item.max, Math.max(item.min, value));
      write(item.symbol, clamped);
    }
  }
</script>

<main class="shell">
  <header class="topbar">
    <div>
      <h1>SvelteHMI</h1>
      <p>CX9240 first-pass commissioning panel</p>
    </div>
    <div class="status-cluster">
      <span class:ok={status.gateway}>Gateway</span>
      <span class:ok={status.ads}>ADS</span>
      <strong>{status.mode}</strong>
    </div>
  </header>

  <section class="machine-band">
    <div>
      <span class="eyebrow">Site Test</span>
      <h2>Live PLC symbol check</h2>
      <p>{status.message}</p>
    </div>
    <div class="readout">
      <span>Panel URL</span>
      <strong>{location.host}</strong>
    </div>
  </section>

  <section class="grid">
    {#each firstPassSymbols as item}
      <article class="tile">
        <div class="tile-title">
          <span>{item.label}</span>
          <small>{item.symbol}</small>
        </div>
        <div class="group">{item.group}</div>
        <div class="value">{formatValue(values[item.symbol])}</div>
      </article>
    {/each}
  </section>

  <section class="write-panel">
    <div>
      <span class="eyebrow">Guarded Write Test</span>
      <h2>Existing HMI tags</h2>
    </div>
    <label class="unlock">
      <input type="checkbox" bind:checked={writesEnabled} />
      Enable writes
    </label>
    <div class="write-grid">
      {#each writeTestSymbols as item}
        <article class="tile compact">
          <div class="tile-title">
            <span>{item.label}</span>
            <small>{item.symbol}</small>
          </div>
          <div class="value">{formatValue(values[item.symbol])}</div>

          {#if item.type === 'boolean'}
            <button type="button" disabled={!writesEnabled} onclick={() => toggleBool(item.symbol)}>
              Toggle
            </button>
          {:else}
            <div class="number-write">
              <input
                inputmode="numeric"
                bind:value={numberDrafts[item.key]}
                placeholder={`${item.min}-${item.max}`}
                aria-label={`${item.label} value`}
                disabled={!writesEnabled}
              />
              <button type="button" disabled={!writesEnabled} onclick={() => writeNumber(item)}>
                Write
              </button>
            </div>
          {/if}
        </article>
      {/each}
    </div>
  </section>
</main>
