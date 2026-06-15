<script>
  import { onMount } from 'svelte';
  import Activity from '@lucide/svelte/icons/activity';
  import AlarmClock from '@lucide/svelte/icons/alarm-clock';
  import Bell from '@lucide/svelte/icons/bell';
  import Gauge from '@lucide/svelte/icons/gauge';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Network from '@lucide/svelte/icons/network';
  import PanelTop from '@lucide/svelte/icons/panel-top';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
  import Wifi from '@lucide/svelte/icons/wifi';
  import WifiOff from '@lucide/svelte/icons/wifi-off';
  import Wrench from '@lucide/svelte/icons/wrench';
  import ParamInput from '$lib/components/ParamInput.svelte';
  import ParamRow from '$lib/components/ParamRow.svelte';
  import StateMachineChip from '$lib/components/StateMachineChip.svelte';
  import StatusBanner from '$lib/components/StatusBanner.svelte';
  import { firstPassSymbols } from '$lib/connections.js';
  import { getStatus, getValues, subscribe } from '$lib/adsStore.svelte.js';

  const status = getStatus();
  const values = getValues();
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'recipe', label: 'Recipe', icon: SlidersHorizontal },
    { id: 'diagnostics', label: 'Diagnostics', icon: Wrench },
    { id: 'events', label: 'Events', icon: Bell },
  ];
  const subscriptions = [
    ...new Set([
      ...firstPassSymbols.map((item) => item.key),
      'recipe.selectedIndex',
      'pattern.index',
      'mode.dryCycleEnable',
      'metrics.lastCycleTimeMs',
    ]),
  ];
  const overviewRows = [
    { key: 'runtime.initialized', label: 'PLC initialized', group: 'Runtime' },
    { key: 'safety.controlPower', label: 'Control power', group: 'Safety' },
    { key: 'safety.circuitOk', label: 'Safety circuit', group: 'Safety' },
    { key: 'input.cycleSwitch', label: 'Cycle switch', group: 'Operator' },
    { key: 'input.startButton', label: 'Start button', group: 'Operator' },
    { key: 'input.hopperNotEmpty', label: 'Hopper stock', group: 'Material' },
    { key: 'input.trayPicked', label: 'Tray picked', group: 'Material' },
    { key: 'input.outfeedSensor', label: 'Outfeed sensor', group: 'Outfeed' },
  ];
  const metrics = [
    { key: 'metrics.trayCount', label: 'Tray count', unit: '' },
    { key: 'metrics.traysPerMinute', label: 'Trays/min', unit: '' },
    { key: 'metrics.traysLastMinute', label: 'Last minute', unit: '' },
    { key: 'metrics.traysLastHour', label: 'Last hour', unit: '' },
  ];
  const machineStateCards = [
    {
      key: 'recipe.activeIndex',
      label: 'Active recipe',
      icon: PanelTop,
    },
    {
      key: 'recipe.selectedIndex',
      label: 'Selected recipe',
      icon: SlidersHorizontal,
    },
    {
      key: 'pattern.index',
      label: 'Pattern',
      icon: Gauge,
    },
    {
      key: 'mode.dryCycleEnable',
      label: 'Dry cycle',
      icon: Activity,
      booleanText: ['Disabled', 'Enabled'],
    },
  ];

  let activeView = $state('overview');
  let previewPattern = $state(1);
  let previewRecipe = $state(1);

  onMount(() => {
    for (const key of subscriptions) {
      subscribe(key, key.startsWith('metrics.') ? 1000 : 250);
    }
  });

  function formatValue(value, fallback = 'Waiting') {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'boolean') return value ? 'On' : 'Off';
    if (typeof value === 'number')
      return Number.isInteger(value) ? String(value) : value.toFixed(2);
    return String(value);
  }

  function booleanState(key) {
    const value = values[key];
    if (value === undefined || value === null) return 'unknown';
    return value ? 'true' : 'false';
  }

  function readinessText() {
    if (!status.gateway) return 'Gateway offline';
    if (status.mode === 'ads' && !status.ads) return 'ADS offline';
    if (!values['runtime.initialized']) return 'PLC not initialized';
    if (!values['safety.controlPower'] || !values['safety.circuitOk']) return 'Safety open';
    return 'Ready';
  }

  function readinessTone() {
    const text = readinessText();
    if (text === 'Ready') return 'ready';
    if (text.includes('offline')) return 'offline';
    return 'hold';
  }

  function pageTitle() {
    return navItems.find((item) => item.id === activeView)?.label ?? 'Overview';
  }

  function connectionOnline() {
    return status.gateway && (status.ads || status.mode === 'mock');
  }
</script>

<main class="app-shell">
  <header class="topbar">
    <div class="brand">
      <span class="brand-mark">SH</span>
      <div>
        <h1>SvelteHMI</h1>
        <p>KITA Ipak Retrofit</p>
      </div>
    </div>

    <div class="top-status" aria-label="Gateway and ADS status">
      <span class:ok={status.gateway}>
        {#if status.gateway}<Wifi size={18} />{:else}<WifiOff size={18} />{/if}
        Gateway
      </span>
      <span class:ok={status.ads || status.mode === 'mock'}>
        <Network size={18} />
        {status.mode}
      </span>
      <strong class={readinessTone()}>{readinessText()}</strong>
    </div>
  </header>

  <div class="shell-grid">
    <nav class="rail" aria-label="HMI views">
      {#each navItems as item}
        <button
          type="button"
          class:active={activeView === item.id}
          aria-label={item.label}
          title={item.label}
          onclick={() => (activeView = item.id)}
        >
          <item.icon size={22} />
          <span>{item.label}</span>
        </button>
      {/each}
    </nav>

    <section class="workspace" aria-label={pageTitle()}>
      <div class="status-strip">
        <div>
          <span>Message</span>
          <strong>{status.message}</strong>
        </div>
        <div>
          <span>Panel</span>
          <strong>{location.host}</strong>
        </div>
        <div>
          <span>Cycle</span>
          <strong>{formatValue(values['input.cycleSwitch'])}</strong>
        </div>
      </div>

      {#if activeView === 'overview'}
        <section class="overview-layout">
          <div class="run-summary">
            <div class="summary-copy">
              <span class="eyebrow">Overview</span>
              <h2>Run Screen</h2>
              <p>{readinessText()}</p>
              <div class="summary-chips" aria-label="Machine states">
                <StateMachineChip state={readinessTone() === 'ready' ? 4 : 3} />
                <StateMachineChip state={values['mode.dryCycleEnable'] ? 5 : 0} />
              </div>
            </div>

            <div class="readiness-meter {readinessTone()}">
              <ShieldCheck size={34} />
              <strong>{readinessText()}</strong>
              <span>{formatValue(values['runtime.initialized'], 'PLC state unknown')}</span>
            </div>
          </div>

          <section class="machine-state">
            {#each machineStateCards as card}
              <article class="state-card">
                <div>
                  <card.icon size={22} />
                  <span>{card.label}</span>
                </div>
                <strong>
                  {#if card.booleanText}
                    {values[card.key] ? card.booleanText[1] : card.booleanText[0]}
                  {:else}
                    {formatValue(values[card.key])}
                  {/if}
                </strong>
              </article>
            {/each}
          </section>

          <section class="sensor-board">
            {#each overviewRows as row}
              <article class="sensor-row" data-state={booleanState(row.key)}>
                <div>
                  <span>{row.label}</span>
                  <small>{row.group}</small>
                </div>
                <strong>{formatValue(values[row.key])}</strong>
              </article>
            {/each}
          </section>

          <section class="metric-board">
            {#each metrics as metric}
              <article class="metric">
                <span>{metric.label}</span>
                <strong>{formatValue(values[metric.key])}{metric.unit}</strong>
              </article>
            {/each}
            <article class="metric">
              <span>Last cycle ms</span>
              <strong>{formatValue(values['metrics.lastCycleTimeMs'])}</strong>
            </article>
          </section>
        </section>
      {:else}
        <section class="page-placeholder">
          <span class="eyebrow">{pageTitle()}</span>
          <h2>{pageTitle()}</h2>
          <div class="foundation-layout">
            <StatusBanner
              online={connectionOnline()}
              label={connectionOnline() ? 'PLC Connected' : 'PLC Disconnected'}
              detail={status.message}
            />
            <div class="state-chip-row" aria-label="Machine state examples">
              <StateMachineChip state={0} />
              <StateMachineChip state={3} />
              <StateMachineChip state={4} />
              <StateMachineChip state={7} />
            </div>
            <ParamRow label="Pattern">
              <ParamInput
                title="Index"
                value={previewPattern}
                min={1}
                max={8}
                onchange={(value) => (previewPattern = value)}
              />
              <ParamInput
                title="Recipe"
                value={previewRecipe}
                min={0}
                max={20}
                onchange={(value) => (previewRecipe = value)}
              />
            </ParamRow>
          </div>
          <div class="placeholder-grid">
            <article>
              <AlarmClock size={24} />
              <strong>{formatValue(values['metrics.lastCycleTimeMs'])}</strong>
              <span>Last cycle ms</span>
            </article>
            <article>
              <Gauge size={24} />
              <strong>{formatValue(values['pattern.index'])}</strong>
              <span>Pattern</span>
            </article>
            <article>
              <Activity size={24} />
              <strong>{formatValue(values['metrics.traysPerMinute'])}</strong>
              <span>Trays/min</span>
            </article>
          </div>
        </section>
      {/if}
    </section>
  </div>
</main>
