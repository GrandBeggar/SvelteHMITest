<script>
  import { onMount } from 'svelte';
  import Activity from '@lucide/svelte/icons/activity';
  import AlarmClock from '@lucide/svelte/icons/alarm-clock';
  import Bell from '@lucide/svelte/icons/bell';
  import Gauge from '@lucide/svelte/icons/gauge';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Network from '@lucide/svelte/icons/network';
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
  import Wifi from '@lucide/svelte/icons/wifi';
  import WifiOff from '@lucide/svelte/icons/wifi-off';
  import Wrench from '@lucide/svelte/icons/wrench';
  import ParamInput from '$lib/components/ParamInput.svelte';
  import ParamRow from '$lib/components/ParamRow.svelte';
  import SensorChip from '$lib/components/SensorChip.svelte';
  import StateMachineChip from '$lib/components/StateMachineChip.svelte';
  import StatusBanner from '$lib/components/StatusBanner.svelte';
  import ValueDisplay from '$lib/components/ValueDisplay.svelte';
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
    'runtime.initialized',
    'safety.controlPower',
    'safety.circuitOk',
    'input.cycleSwitch',
    'input.startButton',
    'input.hopperNotEmpty',
    'input.trayPicked',
    'input.outfeedSensor',
    'recipe.activeIndex',
    'recipe.selectedIndex',
    'pattern.index',
    'mode.dryCycleEnable',
    'metrics.trayCount',
    'metrics.lastCycleTimeMs',
    'metrics.traysPerMinute',
    'metrics.traysLastMinute',
    'metrics.traysLastHour',
  ];
  const machineStates = [
    { key: 'runtime.initialized', label: 'PLC initialized', activeLabel: 'Ready' },
    {
      key: 'input.cycleSwitch',
      label: 'Cycle switch',
      activeLabel: 'Active',
      inactiveLabel: 'Idle',
    },
    {
      key: 'input.startButton',
      label: 'Start button',
      activeLabel: 'Pressed',
      inactiveLabel: 'Idle',
    },
    {
      key: 'mode.dryCycleEnable',
      label: 'Dry cycle',
      activeLabel: 'Enabled',
      inactiveLabel: 'Disabled',
    },
    {
      key: 'input.hopperNotEmpty',
      label: 'Hopper status',
      activeLabel: 'Stock',
      inactiveLabel: 'Empty',
    },
  ];
  const safetyStates = [
    { key: 'safety.controlPower', label: 'Control power', activeLabel: 'On', inactiveLabel: 'Off' },
    { key: 'safety.circuitOk', label: 'Safety circuit', activeLabel: 'OK', inactiveLabel: 'Open' },
  ];
  const materialStates = [
    {
      key: 'input.trayPicked',
      label: 'Tray picked',
      activeLabel: 'Picked',
      inactiveLabel: 'Clear',
    },
    {
      key: 'input.outfeedSensor',
      label: 'Outfeed sensor',
      activeLabel: 'Blocked',
      inactiveLabel: 'Clear',
    },
  ];
  const runReadouts = [
    { key: 'recipe.activeIndex', label: 'Active recipe' },
    { key: 'recipe.selectedIndex', label: 'Selected recipe' },
    { key: 'pattern.index', label: 'Pattern' },
    { key: 'metrics.lastCycleTimeMs', label: 'Last cycle', unit: 'ms' },
  ];
  const performanceReadouts = [
    { key: 'metrics.traysLastMinute', label: 'Trays this min' },
    { key: 'metrics.traysLastHour', label: 'Trays this hour' },
    { key: 'metrics.trayCount', label: 'Trays total' },
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

  function valueQuality(key) {
    if (values[key] === undefined || values[key] === null) return 'unknown';
    return connectionOnline() ? 'live' : 'stale';
  }

  function groupTone(keys, dangerOnFalse = false) {
    if (keys.some((key) => valueQuality(key) === 'unknown')) return 'waiting';
    if (keys.some((key) => valueQuality(key) === 'stale')) return 'paused';
    if (dangerOnFalse && keys.some((key) => !values[key])) return 'faulted';
    return keys.every((key) => Boolean(values[key])) ? 'running' : 'inactive';
  }

  function headlineText() {
    if (!connectionOnline()) return 'Connection Hold';
    if (readinessText() === 'Ready') return 'Machine Ready';
    return 'Machine Hold';
  }

  function headlineDetail() {
    if (!connectionOnline()) return 'Showing stale or unknown values';
    if (readinessText() === 'Ready') return 'Press Button to Begin Cycling';
    return readinessText();
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
        <section class="overview-layout" aria-label="Overview run screen">
          <section class="run-banner {readinessTone()}" aria-labelledby="run-screen-title">
            <div>
              <span class="eyebrow">Overview</span>
              <h2 id="run-screen-title">Run Screen</h2>
            </div>
            <div class="run-banner-state">
              <strong>{headlineText()}</strong>
              <span>{headlineDetail()}</span>
            </div>
          </section>

          <section class="run-readouts" aria-label="Run setpoints and counters">
            {#each runReadouts as readout}
              <ValueDisplay
                label={readout.label}
                value={values[readout.key]}
                unit={readout.unit}
                quality={valueQuality(readout.key)}
              />
            {/each}
          </section>

          <section class="run-group state-{groupTone(machineStates.map((item) => item.key))}">
            <span class="run-group-label">Machine States</span>
            <div class="run-group-pocket">
              {#each machineStates as item}
                <SensorChip
                  label={item.label}
                  value={values[item.key]}
                  quality={valueQuality(item.key)}
                  activeLabel={item.activeLabel}
                  inactiveLabel={item.inactiveLabel}
                />
              {/each}
            </div>
          </section>

          <section
            class="run-group state-{groupTone(
              safetyStates.map((item) => item.key),
              true,
            )}"
          >
            <span class="run-group-label">Safety</span>
            <div class="run-group-pocket">
              {#each safetyStates as item}
                <SensorChip
                  label={item.label}
                  value={values[item.key]}
                  quality={valueQuality(item.key)}
                  activeLabel={item.activeLabel}
                  inactiveLabel={item.inactiveLabel}
                />
              {/each}
            </div>
          </section>

          <section class="run-group state-{groupTone(materialStates.map((item) => item.key))}">
            <span class="run-group-label">Material</span>
            <div class="run-group-pocket">
              {#each materialStates as item}
                <SensorChip
                  label={item.label}
                  value={values[item.key]}
                  quality={valueQuality(item.key)}
                  activeLabel={item.activeLabel}
                  inactiveLabel={item.inactiveLabel}
                />
              {/each}
            </div>
          </section>

          <section class="performance">
            <span class="performance-label">Performance</span>
            <div class="performance-values">
              {#each performanceReadouts as readout}
                <ValueDisplay
                  label={readout.label}
                  value={values[readout.key]}
                  quality={valueQuality(readout.key)}
                />
              {/each}
              <ValueDisplay
                label="Trays/min"
                value={values['metrics.traysPerMinute']}
                unit="TPM"
                quality={valueQuality('metrics.traysPerMinute')}
              />
            </div>
          </section>

          <section class="run-footer" aria-label="Run status">
            <StatusBanner
              online={connectionOnline()}
              label={connectionOnline() ? 'PLC Connected' : 'PLC Disconnected'}
              detail={status.message}
            />
            <div class="footer-chips">
              <StateMachineChip
                label={headlineText()}
                state={readinessTone() === 'ready' ? 4 : 5}
              />
              <StateMachineChip
                label={formatValue(values['input.hopperNotEmpty'], 'Hopper Unknown')}
                state={valueQuality('input.hopperNotEmpty') === 'live' &&
                values['input.hopperNotEmpty']
                  ? 4
                  : valueQuality('input.hopperNotEmpty') === 'stale'
                    ? 5
                    : 1}
              />
              <StateMachineChip
                label={formatValue(values['input.trayPicked'], 'Tray Unknown')}
                state={valueQuality('input.trayPicked') === 'live' && values['input.trayPicked']
                  ? 4
                  : 1}
              />
              <ValueDisplay
                label="Rate"
                value={values['metrics.traysPerMinute']}
                unit="TPM"
                quality={valueQuality('metrics.traysPerMinute')}
              />
            </div>
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
