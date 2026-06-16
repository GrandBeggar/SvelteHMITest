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
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import ParamInput from '$lib/components/ParamInput.svelte';
  import ParamRow from '$lib/components/ParamRow.svelte';
  import SensorChip from '$lib/components/SensorChip.svelte';
  import StateMachineChip from '$lib/components/StateMachineChip.svelte';
  import StatusBanner from '$lib/components/StatusBanner.svelte';
  import ValueDisplay from '$lib/components/ValueDisplay.svelte';
  import { deriveEventConditions, eventSummary } from '$lib/eventSurface.js';
  import machineContract from '$lib/machine-contract.json';
  import {
    getStatus,
    getValueMeta,
    getValues,
    subscribe,
    unsubscribe,
    write,
  } from '$lib/adsStore.svelte.js';

  const status = getStatus();
  const values = getValues();
  const valueMeta = getValueMeta();
  const navItems = [
    { id: 'overview', label: 'Overview', menuLabel: 'Home', icon: LayoutDashboard },
    { id: 'recipe', label: 'Recipe', menuLabel: 'Recipes', icon: SlidersHorizontal },
    { id: 'diagnostics', label: 'Diagnostics', menuLabel: 'Diagnostics', icon: Wrench },
    { id: 'events', label: 'Events', menuLabel: 'Events', icon: Bell },
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
    'recipe.maxCount',
    'recipe.activeIndex',
    'recipe.selectedIndex',
    'recipe.hasUnsavedChanges',
    'pattern.index',
    'mode.dryCycleEnable',
    'metrics.trayCount',
    'metrics.lastCycleTimeMs',
    'metrics.traysPerMinute',
    'metrics.traysLastMinute',
    'metrics.traysLastHour',
    'state.machine',
    'state.machine.isIdle',
    'state.machine.cycleActive',
    'state.machine.cycleOn',
    'state.downstream',
    'state.blankPicker',
    'state.gluing',
    'state.backstops',
    'state.forming',
    'state.conveyor',
    'tray.position.picked',
    'tray.position.gluing',
    'tray.position.forming',
    'tray.position.firstCycle',
    'machine.faulted',
    'machine.firstFaultCode',
    'machine.activeFaultCount',
    'parameters.trayDemand.target',
    'parameters.trayDemand.actual',
    'parameters.trayDemand.enabled',
  ];
  const machineStateReadouts = [
    { key: 'state.machine', label: 'Machine', enumName: 'E_MachineStates' },
    { key: 'state.downstream', label: 'Downstream', enumName: 'E_DownStreamStates' },
    { key: 'state.blankPicker', label: 'Blank Picker', enumName: 'E_BlankPickerStates' },
    { key: 'state.gluing', label: 'Gluing', enumName: 'E_GluingStates' },
    { key: 'state.backstops', label: 'Backstops', enumName: 'E_BackstopStates' },
    { key: 'state.forming', label: 'Forming', enumName: 'E_FormingStates' },
    { key: 'state.conveyor', label: 'Conveyor', enumName: 'E_ConveyorStates' },
  ];
  const safetyStates = [
    { key: 'safety.controlPower', label: 'Control power', activeLabel: 'On', inactiveLabel: 'Off' },
    { key: 'safety.circuitOk', label: 'Safety circuit', activeLabel: 'OK', inactiveLabel: 'Open' },
  ];
  const trayPositionStates = [
    {
      key: 'tray.position.picked',
      label: 'Tray picked',
      activeLabel: 'Picked',
      inactiveLabel: 'Clear',
    },
    {
      key: 'tray.position.firstCycle',
      label: 'First cycle',
      activeLabel: 'Active',
      inactiveLabel: 'Clear',
    },
  ];
  const performanceReadouts = [
    { key: 'metrics.traysLastMinute', label: 'Trays this min' },
    { key: 'metrics.traysLastHour', label: 'Trays this hour' },
    { key: 'metrics.trayCount', label: 'Trays total' },
    { key: 'metrics.traysPerMinute', label: 'Rate', unit: 'TPM' },
  ];
  const forceModeLabels = {
    0: 'Auto',
    1: 'Force On',
    2: 'Force Off',
    Auto: 'Auto',
    On: 'Force On',
    Off: 'Force Off',
  };
  const forceStatusLabels = {
    0: 'Inactive',
    1: 'Active',
    2: 'Forced On',
    3: 'Forced Off',
    Inactive: 'Inactive',
    Active: 'Active',
    ForcedOn: 'Forced On',
    ForcedOff: 'Forced Off',
  };
  const diagnosticCoils = machineContract.coilNames.map((coilName) => {
    const keyBase = `manual.coils.${coilName[0].toLowerCase()}${coilName.slice(1)}`;
    return {
      name: coilName,
      label: coilName.replace(/([a-z])([A-Z0-9])/g, '$1 $2'),
      outKey: `${keyBase}.out`,
      statusKey: `${keyBase}.status`,
      forceKey: `${keyBase}.force`,
    };
  });
  const diagnosticSubscriptionKeys = diagnosticCoils.flatMap((coil) => [
    coil.outKey,
    coil.statusKey,
  ]);

  let activeView = $state('overview');
  let recipeDraft = $state(machineContract.constants.recipeDefaultSlot.value);
  let patternDraft = $state(machineContract.constants.recipeDefaultSlot.value);
  let pendingRecipeCommand = $state(null);
  let pendingForce = $state(null);
  let confirmAction = $state(null);
  let recipeMessage = $state('');
  let recipeError = $state('');
  let diagnosticMessage = $state('');
  let diagnosticError = $state('');
  let diagnosticsSubscribed = false;
  let serviceEnabled = $state(false);
  let freshnessTick = $state(Date.now());

  const recipeMax = $derived(
    values['recipe.maxCount'] ?? machineContract.constants.recipeMaxCount.value,
  );
  const patternMax = machineContract.constants.patternCount.value;
  const eventRows = $derived(
    deriveEventConditions({ values, status, valueMeta, now: freshnessTick }),
  );
  const eventStatus = $derived(eventSummary(eventRows));

  onMount(() => {
    for (const key of subscriptions) {
      subscribe(key, key.startsWith('metrics.') ? 1000 : 250);
    }

    const freshnessTimer = setInterval(() => {
      freshnessTick = Date.now();
    }, 500);

    return () => {
      clearInterval(freshnessTimer);
    };
  });

  $effect(() => {
    if (activeView === 'diagnostics' && !diagnosticsSubscribed) {
      for (const key of diagnosticSubscriptionKeys) {
        subscribe(key, 250);
      }
      diagnosticsSubscribed = true;
      return;
    }

    if (activeView !== 'diagnostics' && diagnosticsSubscribed) {
      for (const key of diagnosticSubscriptionKeys) {
        unsubscribe(key);
      }
      diagnosticsSubscribed = false;
      serviceEnabled = false;
    }
  });

  $effect(() => {
    if (pendingRecipeCommand) return;

    if (typeof values['recipe.selectedIndex'] === 'number') {
      recipeDraft = clamp(values['recipe.selectedIndex'], 0, recipeMax);
    }
    if (typeof values['pattern.index'] === 'number') {
      patternDraft = clamp(values['pattern.index'], 1, patternMax);
    }
  });

  $effect(() => {
    if (!pendingRecipeCommand) return;

    if (!connectionOnline()) {
      recipeError = `${pendingRecipeCommand.label} interrupted: gateway or ADS offline`;
      pendingRecipeCommand = null;
      return;
    }

    if (!pendingRecipeCommand.sent) return;

    if (
      pendingRecipeCommand.command === 'Load' &&
      values['recipe.activeIndex'] === pendingRecipeCommand.target
    ) {
      recipeMessage = `Recipe ${pendingRecipeCommand.target} loaded`;
      pendingRecipeCommand = null;
      return;
    }

    if (
      ['Save', 'Discard'].includes(pendingRecipeCommand.command) &&
      values['recipe.hasUnsavedChanges'] === false
    ) {
      recipeMessage =
        pendingRecipeCommand.command === 'Save'
          ? 'Recipe changes saved'
          : 'Recipe changes discarded';
      pendingRecipeCommand = null;
    }
  });

  function formatValue(value, fallback = 'Waiting') {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'boolean') return value ? 'On' : 'Off';
    if (typeof value === 'number')
      return Number.isInteger(value) ? String(value) : value.toFixed(2);
    return String(value);
  }

  function humanizeEnumName(value) {
    return String(value)
      .replace(/^E_/, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ');
  }

  function enumLabel(enumName, value, fallback = 'Unknown') {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'string') return humanizeEnumName(value);

    const enumMap = machineContract.enums?.[enumName] ?? {};
    const match = Object.entries(enumMap).find(([, enumValue]) => enumValue === value);
    return match ? humanizeEnumName(match[0]) : formatValue(value, fallback);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value)));
  }

  function readinessText() {
    if (!status.gateway) return 'Gateway offline';
    if (status.mode === 'ads' && !status.ads) return 'ADS offline';
    if (valueQuality('state.machine') === 'live')
      return enumLabel('E_MachineStates', values['state.machine']);
    if (valueQuality('state.machine') === 'stale') {
      return `${enumLabel('E_MachineStates', values['state.machine'])} stale`;
    }
    if (values['machine.faulted']) return 'Faulted';
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

  function diagnosticQuality(key) {
    if (values[key] === undefined || values[key] === null) return 'unknown';
    if (!connectionOnline()) return 'stale';

    const updatedAt = valueMeta[key]?.updatedAt;
    if (!updatedAt || freshnessTick - updatedAt > 1500) return 'stale';
    return 'live';
  }

  function groupTone(keys, dangerOnFalse = false) {
    if (keys.some((key) => valueQuality(key) === 'unknown')) return 'waiting';
    if (keys.some((key) => valueQuality(key) === 'stale')) return 'paused';
    if (dangerOnFalse && keys.some((key) => !values[key])) return 'faulted';
    return keys.every((key) => Boolean(values[key])) ? 'running' : 'inactive';
  }

  function enumStateTone(key, enumName) {
    const quality = valueQuality(key);
    if (quality === 'unknown') return 'waiting';
    if (quality === 'stale') return 'paused';

    const label = enumLabel(enumName, values[key]);
    if (label.includes('Fault')) return 'faulted';
    if (label.includes('Stopping') || label.includes('Pausing')) return 'soft-fault';
    if (label.includes('Paused')) return 'paused';
    if (label.includes('Starting') || label.includes('Delay')) return 'transitioning';
    if (label.includes('Active') || label.includes('Cycling') || label.includes('Sensor')) {
      return 'running';
    }
    if (label.includes('Ready')) return 'ready';
    return 'inactive';
  }

  function headlineText() {
    if (!connectionOnline()) return 'Connection Hold';
    const stateQuality = valueQuality('state.machine');
    if (stateQuality === 'unknown') return 'Machine State Unknown';
    return `Machine ${enumLabel('E_MachineStates', values['state.machine'])}`;
  }

  function headlineDetail() {
    if (!connectionOnline()) return 'Showing stale or unknown values';
    if (valueQuality('state.machine') === 'unknown') return readinessText();
    const target = formatValue(values['parameters.trayDemand.target'], 'Unknown');
    const actual = formatValue(values['parameters.trayDemand.actual'], 'Unknown');
    return `Tray demand ${actual} / ${target}`;
  }

  function recipeQuality(key) {
    return valueQuality(key);
  }

  function recipePendingText() {
    if (!pendingRecipeCommand) return 'Idle';
    return `${pendingRecipeCommand.label} pending`;
  }

  function diagnosticStatusText() {
    if (pendingForce) return `${pendingForce.label} ${forceModeLabels[pendingForce.mode]} pending`;
    return (
      diagnosticError || diagnosticMessage || (serviceEnabled ? 'Service enabled' : 'Read only')
    );
  }

  function requestRecipeCommand(command) {
    const target = clamp(recipeDraft, 0, recipeMax);
    const messages = {
      Load: `Load recipe ${target}? This writes the selected recipe and sends E_RecipeCommand.Load.`,
      Save: 'Save the current recipe changes?',
      Discard: 'Discard unsaved recipe changes and restore the PLC active recipe?',
    };

    confirmAction = {
      type: 'recipe',
      command,
      target,
      title: `${command} Recipe`,
      message: messages[command],
      confirmLabel: command,
      variant: command === 'Discard' ? 'warning' : 'default',
    };
  }

  function requestPatternWrite() {
    const target = clamp(patternDraft, 1, patternMax);
    confirmAction = {
      type: 'pattern',
      target,
      title: 'Apply Pattern',
      message: `Write pattern index ${target}? This is confirmed by PLC readback.`,
      confirmLabel: 'Apply',
      variant: 'default',
    };
  }

  function requestForce(coil, mode) {
    confirmAction = {
      type: 'force',
      coil,
      mode,
      title: `${forceModeLabels[mode]} ${coil.label}`,
      message: `${forceModeLabels[mode]} ${coil.label}?`,
      confirmLabel: forceModeLabels[mode],
      variant: mode === 'Auto' ? 'warning' : 'default',
    };
  }

  async function confirmPendingAction() {
    const action = confirmAction;
    confirmAction = null;
    if (!action) return;

    if (action.type === 'pattern') {
      await applyPattern(action.target);
      return;
    }

    if (action.type === 'force') {
      await applyForce(action.coil, action.mode);
      return;
    }

    await runRecipeCommand(action.command, action.target);
  }

  async function applyPattern(target) {
    recipeError = '';
    recipeMessage = 'Pattern write pending';

    try {
      await write('pattern.index', target);
      recipeMessage = `Pattern ${target} applied`;
    } catch (error) {
      recipeMessage = '';
      recipeError = error.message;
    }
  }

  async function runRecipeCommand(command, target) {
    recipeError = '';
    recipeMessage = '';
    pendingRecipeCommand = {
      command,
      target,
      label: command === 'Load' ? `Recipe ${target} load` : `Recipe ${command.toLowerCase()}`,
      sent: false,
    };

    try {
      if (command === 'Load') {
        await write('recipe.selectedIndex', target);
      }
      await write('recipe.command', command);
      pendingRecipeCommand = { ...pendingRecipeCommand, sent: true };
    } catch (error) {
      pendingRecipeCommand = null;
      recipeError = error.message;
    }
  }

  async function applyForce(coil, mode) {
    diagnosticError = '';
    diagnosticMessage = '';
    pendingForce = { key: coil.forceKey, label: coil.label, mode };

    try {
      await write(coil.forceKey, mode);
      diagnosticMessage = `${coil.label} ${forceModeLabels[mode]} accepted`;
    } catch (error) {
      diagnosticError = error.message;
    } finally {
      pendingForce = null;
    }
  }

  function forceButtonDisabled(coil) {
    return (
      !serviceEnabled ||
      !connectionOnline() ||
      Boolean(pendingForce) ||
      diagnosticQuality(coil.outKey) === 'unknown' ||
      diagnosticQuality(coil.statusKey) === 'unknown'
    );
  }

  function forceStatus(value) {
    return forceStatusLabels[value] ?? formatValue(value);
  }

  function eventSeverityLabel(severity) {
    const labels = {
      running: 'Normal',
      hold: 'Hold',
      paused: 'Stale',
      waiting: 'Waiting',
      faulted: 'Active',
      offline: 'Offline',
    };
    return labels[severity] ?? severity;
  }
</script>

<main class="app-shell">
  <header class="topbar">
    <div class="brand">
      <span class="brand-mark">SH</span>
      <div>
        <h1>SvelteHMI</h1>
        <p>KITA Packaging Machinery</p>
      </div>
    </div>

    <nav class="top-nav" aria-label="HMI views">
      {#each navItems as item}
        <button
          type="button"
          class:active={activeView === item.id}
          aria-label={item.label}
          title={item.label}
          onclick={() => (activeView = item.id)}
        >
          <item.icon size={18} />
          <span>{item.menuLabel}</span>
        </button>
      {/each}
    </nav>

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
    <section class="workspace" aria-label={pageTitle()}>
      <div class="status-strip">
        <div>
          <span>Machine State</span>
          <strong>{readinessText()}</strong>
        </div>
        <div>
          <span>Tray Demand</span>
          <strong
            >{formatValue(values['parameters.trayDemand.actual'], 'Unknown')} / {formatValue(
              values['parameters.trayDemand.target'],
              'Unknown',
            )}</strong
          >
        </div>
        <div>
          <span>Events</span>
          <strong>{eventStatus}</strong>
        </div>
      </div>

      {#if activeView === 'overview'}
        <section class="overview-layout main-page-layout" aria-label="Main page run screen">
          <section class="main-page-header {readinessTone()}" aria-labelledby="main-page-title">
            <div>
              <span class="eyebrow">Main Page</span>
              <h2 id="main-page-title">{headlineText()}</h2>
              <p>{headlineDetail()}</p>
            </div>
            <div class="main-page-demand">
              <ValueDisplay
                label="Tray target"
                value={values['parameters.trayDemand.target']}
                quality={valueQuality('parameters.trayDemand.target')}
              />
              <ValueDisplay
                label="Tray actual"
                value={values['parameters.trayDemand.actual']}
                quality={valueQuality('parameters.trayDemand.actual')}
              />
              <SensorChip
                label="Demand enabled"
                value={values['parameters.trayDemand.enabled']}
                quality={valueQuality('parameters.trayDemand.enabled')}
                activeLabel="Enabled"
                inactiveLabel="Disabled"
              />
            </div>
          </section>

          <section
            class="run-group state-{valueQuality('state.machine')}"
            aria-label="Machine states"
          >
            <span class="run-group-label">Machine States</span>
            <div class="state-pocket">
              {#each machineStateReadouts as item}
                <div class="machine-state-tile" data-quality={valueQuality(item.key)}>
                  <span>{item.label}</span>
                  <StateMachineChip
                    label={enumLabel(item.enumName, values[item.key])}
                    state={enumStateTone(item.key, item.enumName)}
                  />
                  {#if valueQuality(item.key) !== 'live'}
                    <small>{valueQuality(item.key) === 'stale' ? 'Stale' : 'Unknown'}</small>
                  {/if}
                </div>
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

          <section class="run-group state-{groupTone(trayPositionStates.map((item) => item.key))}">
            <span class="run-group-label">Tray Position</span>
            <div class="run-group-pocket">
              {#each trayPositionStates as item}
                <SensorChip
                  label={item.label}
                  value={values[item.key]}
                  quality={valueQuality(item.key)}
                  activeLabel={item.activeLabel}
                  inactiveLabel={item.inactiveLabel}
                />
              {/each}
              <ValueDisplay
                label="Gluing position"
                value={values['tray.position.gluing']}
                quality={valueQuality('tray.position.gluing')}
              />
              <ValueDisplay
                label="Forming position"
                value={values['tray.position.forming']}
                quality={valueQuality('tray.position.forming')}
              />
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
            </div>
          </section>

          <section class="main-page-footer" aria-label="Main page state and event status">
            <StatusBanner
              online={connectionOnline()}
              label={connectionOnline() ? 'PLC Connected' : 'PLC Disconnected'}
              detail={status.message}
            />
            <div class="footer-chips">
              <StateMachineChip
                label={readinessText()}
                state={enumStateTone('state.machine', 'E_MachineStates')}
              />
              <StateMachineChip
                label={eventStatus}
                state={eventStatus === 'No Active Conditions' ? 'running' : 'faulted'}
              />
              <ValueDisplay
                label="Fault count"
                value={values['machine.activeFaultCount']}
                quality={valueQuality('machine.activeFaultCount')}
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
      {:else if activeView === 'recipe'}
        <section class="recipe-layout" aria-label="Recipe and pattern controls">
          <section class="recipe-header">
            <div>
              <span class="eyebrow">Recipe</span>
              <h2>Recipe Controls</h2>
            </div>
            <StatusBanner
              online={connectionOnline()}
              label={connectionOnline() ? 'PLC Command Path Ready' : 'PLC Command Path Offline'}
              detail={recipeError || recipeMessage || recipePendingText()}
            />
          </section>

          <section class="recipe-readbacks" aria-label="Recipe readback">
            <ValueDisplay
              label="Active recipe"
              value={values['recipe.activeIndex']}
              quality={recipeQuality('recipe.activeIndex')}
            />
            <ValueDisplay
              label="Selected recipe"
              value={values['recipe.selectedIndex']}
              quality={recipeQuality('recipe.selectedIndex')}
            />
            <ValueDisplay
              label="Pattern index"
              value={values['pattern.index']}
              quality={recipeQuality('pattern.index')}
            />
            <SensorChip
              label="Unsaved changes"
              value={values['recipe.hasUnsavedChanges']}
              quality={recipeQuality('recipe.hasUnsavedChanges')}
              activeLabel="Yes"
              inactiveLabel="No"
            />
          </section>

          <section class="recipe-command-panel">
            <div class="recipe-command-copy">
              <span class="eyebrow">Command Handshake</span>
              <h3>{recipePendingText()}</h3>
              <p>
                Active recipe changes only after selected index is written and E_RecipeCommand.Load
                is confirmed by PLC readback.
              </p>
            </div>

            <div class="recipe-form">
              <ParamRow label="Recipe">
                <ParamInput
                  title="Selected"
                  value={recipeDraft}
                  min={0}
                  max={recipeMax}
                  onchange={(value) => (recipeDraft = clamp(value, 0, recipeMax))}
                />
              </ParamRow>
              <ParamRow label="Pattern">
                <ParamInput
                  title="Index"
                  value={patternDraft}
                  min={1}
                  max={patternMax}
                  onchange={(value) => (patternDraft = clamp(value, 1, patternMax))}
                />
              </ParamRow>

              <div class="recipe-actions">
                <button
                  class="kita-button"
                  type="button"
                  disabled={!connectionOnline() || Boolean(pendingRecipeCommand)}
                  onclick={() => requestRecipeCommand('Load')}
                >
                  Load
                </button>
                <button
                  class="kita-button secondary"
                  type="button"
                  disabled={!connectionOnline() || Boolean(pendingRecipeCommand)}
                  onclick={requestPatternWrite}
                >
                  Apply Pattern
                </button>
                <button
                  class="kita-button secondary"
                  type="button"
                  disabled={!connectionOnline() || Boolean(pendingRecipeCommand)}
                  onclick={() => requestRecipeCommand('Save')}
                >
                  Save
                </button>
                <button
                  class="kita-button warning"
                  type="button"
                  disabled={!connectionOnline() || Boolean(pendingRecipeCommand)}
                  onclick={() => requestRecipeCommand('Discard')}
                >
                  Discard
                </button>
              </div>

              {#if recipeError}
                <p class="recipe-alert danger">{recipeError}</p>
              {:else if recipeMessage}
                <p class="recipe-alert">{recipeMessage}</p>
              {/if}
            </div>
          </section>
        </section>
      {:else if activeView === 'diagnostics'}
        <section class="diagnostics-layout" aria-label="Manual and IO diagnostics">
          <section class="diagnostics-header">
            <div>
              <span class="eyebrow">Manual &amp; IO</span>
              <h2>Diagnostics</h2>
            </div>
            <StatusBanner
              online={connectionOnline() && !diagnosticError}
              label={connectionOnline() ? 'Diagnostics Connected' : 'Diagnostics Offline'}
              detail={diagnosticStatusText()}
            />
            <label class="service-toggle">
              <input
                type="checkbox"
                checked={serviceEnabled}
                onchange={(event) => (serviceEnabled = event.currentTarget.checked)}
              />
              <span>Service Enable</span>
            </label>
          </section>

          <section class="coil-grid" aria-label="Coil diagnostics">
            {#each diagnosticCoils as coil}
              <article class="coil-card">
                <div class="coil-card-head">
                  <h3>{coil.label}</h3>
                  <strong>{forceStatus(values[coil.statusKey])}</strong>
                </div>
                <SensorChip
                  label="Output"
                  value={values[coil.outKey]}
                  quality={diagnosticQuality(coil.outKey)}
                  activeLabel="On"
                  inactiveLabel="Off"
                />
                <ValueDisplay
                  label="Force status"
                  value={forceStatus(values[coil.statusKey])}
                  quality={diagnosticQuality(coil.statusKey)}
                />
                <div class="force-actions">
                  <button
                    class="kita-button secondary"
                    type="button"
                    aria-label="Return Auto {coil.label}"
                    disabled={forceButtonDisabled(coil)}
                    onclick={() => requestForce(coil, 'Auto')}
                  >
                    Auto
                  </button>
                  <button
                    class="kita-button"
                    type="button"
                    aria-label="Force On {coil.label}"
                    disabled={forceButtonDisabled(coil)}
                    onclick={() => requestForce(coil, 'On')}
                  >
                    On
                  </button>
                  <button
                    class="kita-button danger"
                    type="button"
                    aria-label="Force Off {coil.label}"
                    disabled={forceButtonDisabled(coil)}
                    onclick={() => requestForce(coil, 'Off')}
                  >
                    Off
                  </button>
                </div>
              </article>
            {/each}
          </section>
        </section>
      {:else if activeView === 'events'}
        <section class="events-layout" aria-label="Alarm and event surface">
          <section class="events-header">
            <div>
              <span class="eyebrow">Events</span>
              <h2>Event Surface</h2>
            </div>
            <StatusBanner
              online={connectionOnline() && eventStatus === 'No Active Conditions'}
              label={eventStatus}
              detail={status.message}
            />
          </section>

          <section class="event-contract-note" aria-label="PLC alarm contract status">
            <div>
              <span class="eyebrow">PLC Alarm Contract</span>
              <strong>Not present</strong>
            </div>
            <div>
              <span>Ack / Reset</span>
              <strong>Unavailable</strong>
            </div>
            <div>
              <span>Decision</span>
              <strong>0009</strong>
            </div>
          </section>

          <section class="event-list" aria-label="Current event conditions">
            {#each eventRows as row}
              <article class="event-row severity-{row.severity}" data-quality={row.quality}>
                <div>
                  <span>{eventSeverityLabel(row.severity)}</span>
                  <h3>{row.title}</h3>
                  <p>{row.detail}</p>
                </div>
                <strong>{row.source}</strong>
              </article>
            {/each}
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

<ConfirmDialog
  open={Boolean(confirmAction)}
  title={confirmAction?.title}
  message={confirmAction?.message}
  confirmLabel={confirmAction?.confirmLabel}
  variant={confirmAction?.variant}
  onconfirm={confirmPendingAction}
  onclose={() => (confirmAction = null)}
/>
