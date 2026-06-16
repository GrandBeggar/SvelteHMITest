<script>
  import { onMount } from 'svelte';
  import Activity from '@lucide/svelte/icons/activity';
  import AlarmClock from '@lucide/svelte/icons/alarm-clock';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Gauge from '@lucide/svelte/icons/gauge';
  import SaveIcon from '@lucide/svelte/icons/save';
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
  import XIcon from '@lucide/svelte/icons/x';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import FooterPill from '$lib/components/FooterPill.svelte';
  import NavButton from '$lib/components/NavButton.svelte';
  import ParamInput from '$lib/components/ParamInput.svelte';
  import ParamRow from '$lib/components/ParamRow.svelte';
  import SensorChip from '$lib/components/SensorChip.svelte';
  import StateMachineChip from '$lib/components/StateMachineChip.svelte';
  import StateMachineHolder from '$lib/components/StateMachineHolder.svelte';
  import StatusBanner from '$lib/components/StatusBanner.svelte';
  import SubNavButton from '$lib/components/SubNavButton.svelte';
  import ValueDisplay from '$lib/components/ValueDisplay.svelte';
  import { numberBounds } from '$lib/contractRuntime.js';
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
    { id: 'overview', label: 'Overview', menuLabel: 'Home' },
    { id: 'recipe', label: 'Recipe', menuLabel: 'Recipes' },
    { id: 'diagnostics', label: 'Diagnostics', menuLabel: 'Diagnostics' },
    { id: 'events', label: 'Events', menuLabel: 'Events' },
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
  const recipeParameterKeys = [
    'recipe.pattern.current.leading.start',
    'recipe.pattern.current.leading.stop',
    'recipe.pattern.current.trailing.start',
    'recipe.pattern.current.trailing.stop',
    'recipe.pattern.current.guns.lh1',
    'recipe.pattern.current.guns.lh2',
    'recipe.pattern.current.guns.lh3',
    'recipe.pattern.current.guns.rh1',
    'recipe.pattern.current.guns.rh2',
    'recipe.pattern.current.guns.rh3',
    'parameters.gluing.lh1Offset',
    'parameters.gluing.lh2Offset',
    'parameters.gluing.lh3Offset',
    'parameters.gluing.rh1Offset',
    'parameters.gluing.rh2Offset',
    'parameters.gluing.rh3Offset',
    'recipe.forming.backStop.start',
    'recipe.forming.backStop.stop',
    'recipe.forming.bottomStop.start',
    'recipe.forming.bottomStop.stop',
    'recipe.forming.rotary.start',
    'recipe.forming.rotary.stop',
    'recipe.forming.sideAlign.start',
    'recipe.forming.sideAlign.stop',
    'recipe.forming.compression.start',
    'recipe.forming.compression.stop',
    'recipe.vacuum.vacuumOn.start',
    'recipe.vacuum.vacuumOn.stop',
    'recipe.vacuum.verifyTimer',
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
  const recipeSections = [
    { id: 'gluing', label: 'Gluing' },
    { id: 'forming', label: 'Forming' },
    { id: 'vacuum', label: 'Vacuum' },
  ];
  const glueWindows = [
    {
      label: 'Leading Pattern',
      startKey: 'recipe.pattern.current.leading.start',
      stopKey: 'recipe.pattern.current.leading.stop',
    },
    {
      label: 'Trailing Pattern',
      startKey: 'recipe.pattern.current.trailing.start',
      stopKey: 'recipe.pattern.current.trailing.stop',
    },
  ];
  const glueGuns = [
    {
      label: 'LH3',
      enableKey: 'recipe.pattern.current.guns.lh3',
      offsetKey: 'parameters.gluing.lh3Offset',
    },
    {
      label: 'LH2',
      enableKey: 'recipe.pattern.current.guns.lh2',
      offsetKey: 'parameters.gluing.lh2Offset',
    },
    {
      label: 'LH1',
      enableKey: 'recipe.pattern.current.guns.lh1',
      offsetKey: 'parameters.gluing.lh1Offset',
    },
    {
      label: 'RH1',
      enableKey: 'recipe.pattern.current.guns.rh1',
      offsetKey: 'parameters.gluing.rh1Offset',
    },
    {
      label: 'RH2',
      enableKey: 'recipe.pattern.current.guns.rh2',
      offsetKey: 'parameters.gluing.rh2Offset',
    },
    {
      label: 'RH3',
      enableKey: 'recipe.pattern.current.guns.rh3',
      offsetKey: 'parameters.gluing.rh3Offset',
    },
  ];
  const formingStations = [
    {
      label: 'Rotary',
      startKey: 'recipe.forming.rotary.start',
      stopKey: 'recipe.forming.rotary.stop',
    },
    {
      label: 'Side Align',
      startKey: 'recipe.forming.sideAlign.start',
      stopKey: 'recipe.forming.sideAlign.stop',
    },
    {
      label: 'Back Stop',
      startKey: 'recipe.forming.backStop.start',
      stopKey: 'recipe.forming.backStop.stop',
    },
    {
      label: 'Bottom Stop',
      startKey: 'recipe.forming.bottomStop.start',
      stopKey: 'recipe.forming.bottomStop.stop',
    },
    {
      label: 'Compression',
      startKey: 'recipe.forming.compression.start',
      stopKey: 'recipe.forming.compression.stop',
    },
  ];
  const vacuumParameters = [
    {
      label: 'Vacuum On',
      startKey: 'recipe.vacuum.vacuumOn.start',
      stopKey: 'recipe.vacuum.vacuumOn.stop',
    },
    {
      label: 'Verify Timer',
      valueKey: 'recipe.vacuum.verifyTimer',
    },
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
  let activeRecipeSection = $state('gluing');
  let pendingRecipeCommand = $state(null);
  let pendingParameterWrite = $state(null);
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
    for (const key of recipeParameterKeys) {
      subscribe(key, 250);
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
    if (pendingParameterWrite) return `${pendingParameterWrite.label} write pending`;
    if (!pendingRecipeCommand) return 'Idle';
    return `${pendingRecipeCommand.label} pending`;
  }

  function contractBounds(key) {
    return numberBounds(machineContract, machineContract.symbols[key]);
  }

  function normalizeParameterValue(key, value) {
    const bounds = contractBounds(key);
    const numericValue = Number(value);
    const min = bounds.min ?? numericValue;
    const max = bounds.max ?? numericValue;
    return clamp(numericValue, min, max);
  }

  function parameterValue(key) {
    return values[key] ?? machineContract.symbols[key]?.mock ?? 0;
  }

  function parameterWriteDisabled(key) {
    return (
      !connectionOnline() ||
      Boolean(pendingRecipeCommand) ||
      Boolean(pendingParameterWrite) ||
      recipeQuality(key) === 'unknown'
    );
  }

  function recipeSectionIndex() {
    return recipeSections.findIndex((section) => section.id === activeRecipeSection);
  }

  function moveRecipeSection(direction) {
    const index = recipeSectionIndex();
    const nextIndex = (index + direction + recipeSections.length) % recipeSections.length;
    activeRecipeSection = recipeSections[nextIndex].id;
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

  function requestParameterWrite(key, value, label) {
    const current = values[key];
    confirmAction = {
      type: 'parameter',
      key,
      value,
      label,
      title: `Write ${label}`,
      message: `Write ${label} from ${formatValue(current, 'Unknown')} to ${formatValue(
        value,
        'Unknown',
      )}? Save Recipe persists accepted working-recipe changes.`,
      confirmLabel: 'Write',
      variant: 'default',
    };
  }

  function requestGunToggle(gun) {
    const nextValue = !Boolean(values[gun.enableKey]);
    requestParameterWrite(
      gun.enableKey,
      nextValue,
      `${gun.label} ${nextValue ? 'enable' : 'disable'}`,
    );
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

    if (action.type === 'parameter') {
      await applyParameterWrite(action.key, action.value, action.label);
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

  async function applyParameterWrite(key, value, label) {
    recipeError = '';
    recipeMessage = '';
    pendingParameterWrite = { key, label, value };

    try {
      await write(key, value);
      recipeMessage = `${label} accepted`;
    } catch (error) {
      recipeError = error.message;
    } finally {
      pendingParameterWrite = null;
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
      <span class="brand-name">KITA</span>
      <span class="brand-sub">PACKAGING MACHINERY</span>
    </div>

    <nav class="top-nav" aria-label="HMI views">
      {#each navItems as item}
        <NavButton
          label={item.menuLabel}
          active={activeView === item.id}
          onclick={() => (activeView = item.id)}
        />
      {/each}
    </nav>

    <div
      class="connection-dot"
      class:online={connectionOnline()}
      title={connectionOnline() ? 'PLC Connected' : 'PLC Disconnected'}
      aria-label={connectionOnline() ? 'PLC Connected' : 'PLC Disconnected'}
    ></div>
  </header>

  <section class="workspace" aria-label={pageTitle()}>
    {#if activeView === 'overview'}
      <section class="overview-layout main-page-layout" aria-label="Main page run screen">
        <div class="status-row">
          <StatusBanner
            online={connectionOnline()}
            label={connectionOnline() ? 'PLC Connected' : 'PLC Disconnected'}
            detail={status.message}
          />
        </div>

        <section class="main-page-header {readinessTone()}" aria-labelledby="main-page-title">
          <span class="eyebrow">Main Page</span>
          <h2 id="main-page-title">{headlineText()}</h2>
          <p>{headlineDetail()}</p>
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

        <StateMachineHolder
          label="Machine States"
          state={enumStateTone('state.machine', 'E_MachineStates')}
        >
          {#each machineStateReadouts as item}
            <StateMachineChip
              label={enumLabel(item.enumName, values[item.key])}
              state={enumStateTone(item.key, item.enumName)}
            />
          {/each}
        </StateMachineHolder>

        <StateMachineHolder
          label="Safety"
          state={groupTone(
            safetyStates.map((item) => item.key),
            true,
          )}
        >
          {#each safetyStates as item}
            <SensorChip
              label={item.label}
              value={values[item.key]}
              quality={valueQuality(item.key)}
              activeLabel={item.activeLabel}
              inactiveLabel={item.inactiveLabel}
            />
          {/each}
        </StateMachineHolder>

        <StateMachineHolder
          label="Tray Position"
          state={groupTone(trayPositionStates.map((item) => item.key))}
        >
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
        </StateMachineHolder>

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
      </section>
    {:else if activeView === 'recipe'}
      <section class="recipe-layout" aria-label="Recipe and pattern controls">
        <section class="recipe-redesign-header">
          <div class="recipe-name-field">
            <span class="eyebrow">Recipe</span>
            <strong>Working Recipe</strong>
          </div>
          <div class="recipe-select-field">
            <span>Select</span>
            <ParamInput
              title="Recipe"
              numpadLabel="Select - Recipe"
              value={recipeDraft}
              min={0}
              max={recipeMax}
              disabled={!connectionOnline() || Boolean(pendingRecipeCommand)}
              onchange={(value) => (recipeDraft = clamp(value, 0, recipeMax))}
            />
          </div>
          <div class="recipe-select-field">
            <span>Pattern</span>
            <ParamInput
              title="Index"
              numpadLabel="Pattern - Index"
              value={patternDraft}
              min={1}
              max={patternMax}
              disabled={!connectionOnline() || Boolean(pendingRecipeCommand)}
              onchange={(value) => (patternDraft = clamp(value, 1, patternMax))}
            />
          </div>
          <div class="recipe-icon-actions">
            <button
              type="button"
              class="icon-command"
              aria-label="Load Recipe"
              title="Load selected recipe"
              disabled={!connectionOnline() || Boolean(pendingRecipeCommand)}
              onclick={() => requestRecipeCommand('Load')}
            >
              <ChevronRight size={24} />
            </button>
            <button
              type="button"
              class="icon-command"
              aria-label="Apply Pattern"
              title="Apply pattern index"
              disabled={!connectionOnline() || Boolean(pendingRecipeCommand)}
              onclick={requestPatternWrite}
            >
              <SlidersHorizontal size={24} />
            </button>
            <button
              type="button"
              class="icon-command"
              aria-label="Save Recipe"
              title="Save recipe"
              disabled={!connectionOnline() || Boolean(pendingRecipeCommand)}
              onclick={() => requestRecipeCommand('Save')}
            >
              <SaveIcon size={24} />
            </button>
            <button
              type="button"
              class="icon-command warning"
              aria-label="Discard Recipe"
              title="Discard recipe changes"
              disabled={!connectionOnline() || Boolean(pendingRecipeCommand)}
              onclick={() => requestRecipeCommand('Discard')}
            >
              <XIcon size={26} />
            </button>
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

        <section class="recipe-parameter-surface" aria-label="Recipe parameter editor">
          <button
            type="button"
            class="recipe-page-arrow"
            aria-label="Previous recipe section"
            onclick={() => moveRecipeSection(-1)}
          >
            <ChevronLeft size={30} />
          </button>

          <div class="recipe-parameter-panel">
            {#if activeRecipeSection === 'gluing'}
              <section class="recipe-tab-page" aria-label="Gluing recipe parameters">
                <div class="recipe-window-grid">
                  {#each glueWindows as window}
                    <ParamRow label="{window.label} ms">
                      <ParamInput
                        title="Start"
                        unit="ms"
                        value={parameterValue(window.startKey)}
                        {...contractBounds(window.startKey)}
                        disabled={parameterWriteDisabled(window.startKey)}
                        onchange={(value) =>
                          requestParameterWrite(
                            window.startKey,
                            normalizeParameterValue(window.startKey, value),
                            `${window.label} start`,
                          )}
                      />
                      <ParamInput
                        title="Stop"
                        unit="ms"
                        value={parameterValue(window.stopKey)}
                        {...contractBounds(window.stopKey)}
                        disabled={parameterWriteDisabled(window.stopKey)}
                        onchange={(value) =>
                          requestParameterWrite(
                            window.stopKey,
                            normalizeParameterValue(window.stopKey, value),
                            `${window.label} stop`,
                          )}
                      />
                    </ParamRow>
                  {/each}
                </div>

                <div class="glue-gun-grid" aria-label="Glue gun controls">
                  {#each glueGuns as gun}
                    <article class="glue-gun-card" data-quality={recipeQuality(gun.enableKey)}>
                      <button
                        type="button"
                        class:active={Boolean(values[gun.enableKey])}
                        disabled={parameterWriteDisabled(gun.enableKey)}
                        onclick={() => requestGunToggle(gun)}
                      >
                        {gun.label}
                      </button>
                      <ParamInput
                        title="Offset"
                        unit="ms"
                        value={parameterValue(gun.offsetKey)}
                        {...contractBounds(gun.offsetKey)}
                        disabled={parameterWriteDisabled(gun.offsetKey)}
                        onchange={(value) =>
                          requestParameterWrite(
                            gun.offsetKey,
                            normalizeParameterValue(gun.offsetKey, value),
                            `${gun.label} offset`,
                          )}
                      />
                    </article>
                  {/each}
                </div>
              </section>
            {:else if activeRecipeSection === 'forming'}
              <section class="recipe-tab-page" aria-label="Forming recipe parameters">
                <div class="forming-grid">
                  {#each formingStations as station}
                    <ParamRow label="{station.label} ms">
                      <ParamInput
                        title="Start"
                        unit="ms"
                        value={parameterValue(station.startKey)}
                        {...contractBounds(station.startKey)}
                        disabled={parameterWriteDisabled(station.startKey)}
                        onchange={(value) =>
                          requestParameterWrite(
                            station.startKey,
                            normalizeParameterValue(station.startKey, value),
                            `${station.label} start`,
                          )}
                      />
                      <ParamInput
                        title="Stop"
                        unit="ms"
                        value={parameterValue(station.stopKey)}
                        {...contractBounds(station.stopKey)}
                        disabled={parameterWriteDisabled(station.stopKey)}
                        onchange={(value) =>
                          requestParameterWrite(
                            station.stopKey,
                            normalizeParameterValue(station.stopKey, value),
                            `${station.label} stop`,
                          )}
                      />
                    </ParamRow>
                  {/each}
                </div>
              </section>
            {:else}
              <section class="recipe-tab-page" aria-label="Vacuum recipe parameters">
                <div class="forming-grid">
                  {#each vacuumParameters as parameter}
                    {#if parameter.valueKey}
                      <ParamRow label="{parameter.label} ms">
                        <ParamInput
                          title="Timer"
                          unit="ms"
                          value={parameterValue(parameter.valueKey)}
                          {...contractBounds(parameter.valueKey)}
                          disabled={parameterWriteDisabled(parameter.valueKey)}
                          onchange={(value) =>
                            requestParameterWrite(
                              parameter.valueKey,
                              normalizeParameterValue(parameter.valueKey, value),
                              parameter.label,
                            )}
                        />
                      </ParamRow>
                    {:else}
                      <ParamRow label="{parameter.label} ms">
                        <ParamInput
                          title="Start"
                          unit="ms"
                          value={parameterValue(parameter.startKey)}
                          {...contractBounds(parameter.startKey)}
                          disabled={parameterWriteDisabled(parameter.startKey)}
                          onchange={(value) =>
                            requestParameterWrite(
                              parameter.startKey,
                              normalizeParameterValue(parameter.startKey, value),
                              `${parameter.label} start`,
                            )}
                        />
                        <ParamInput
                          title="Stop"
                          unit="ms"
                          value={parameterValue(parameter.stopKey)}
                          {...contractBounds(parameter.stopKey)}
                          disabled={parameterWriteDisabled(parameter.stopKey)}
                          onchange={(value) =>
                            requestParameterWrite(
                              parameter.stopKey,
                              normalizeParameterValue(parameter.stopKey, value),
                              `${parameter.label} stop`,
                            )}
                        />
                      </ParamRow>
                    {/if}
                  {/each}
                </div>
              </section>
            {/if}

            <nav class="recipe-section-tabs" aria-label="Recipe parameter sections">
              {#each recipeSections as section}
                <SubNavButton
                  label={section.label}
                  active={activeRecipeSection === section.id}
                  onclick={() => (activeRecipeSection = section.id)}
                />
              {/each}
            </nav>
          </div>

          <button
            type="button"
            class="recipe-page-arrow"
            aria-label="Next recipe section"
            onclick={() => moveRecipeSection(1)}
          >
            <ChevronRight size={30} />
          </button>
        </section>

        {#if recipeError}
          <p class="recipe-alert danger">{recipeError}</p>
        {:else if recipeMessage}
          <p class="recipe-alert">{recipeMessage}</p>
        {/if}
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

  <footer class="shell-footer">
    <div class="footer-chips" aria-label="Panel status pills">
      <FooterPill
        label={readinessText()}
        state={enumStateTone('state.machine', 'E_MachineStates')}
      />
      <FooterPill
        label={eventStatus}
        state={eventStatus === 'No Active Conditions' ? 'running' : 'faulted'}
      />
      <FooterPill
        label={`Fault Count ${formatValue(values['machine.activeFaultCount'], 'Unknown')}`}
        state={values['machine.activeFaultCount'] ? 'faulted' : 'inactive'}
      />
      <FooterPill
        label={`Tray ${formatValue(values['parameters.trayDemand.actual'], 'Unknown')} / ${formatValue(
          values['parameters.trayDemand.target'],
          'Unknown',
        )}`}
        state={valueQuality('parameters.trayDemand.actual') === 'live' ? 'running' : 'waiting'}
      />
    </div>
    <span class="tpm">{formatValue(values['metrics.traysPerMinute'], '0.00')} TPM</span>
  </footer>
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
