import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

function projectFilePath(relativePath) {
  try {
    return fileURLToPath(new URL(relativePath, import.meta.url));
  } catch {
    return relativePath.replace(/^\.\.\//, '');
  }
}

const CONTRACT_PATH = projectFilePath('../src/lib/machine-contract.json');
const SYMBOL_PROOF_PATH = projectFilePath(
  '../test/fixtures/machine-contract/primary-symbol-proof.json',
);
const ROOT_FIELDS = ['DataType', 'SubItem', 'Symbol', 'DataArea', 'Module', 'Property', 'EnumInfo'];

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return value['#text'];
}

function propertyValue(node, name) {
  for (const property of asArray(node?.Properties?.Property)) {
    if (property.Name === name) {
      return property.Value ?? true;
    }
  }
  return undefined;
}

function typeName(node) {
  return textOf(node.Type ?? node.BaseType);
}

function dataTypeName(node) {
  return textOf(node.Name);
}

function declarationText(path) {
  const text = readFileSync(path, 'utf8');
  return text.match(/<Declaration><!\[CDATA\[([\s\S]*?)\]\]><\/Declaration>/)?.[1] ?? text;
}

function parseVariableLines(declaration) {
  const variables = [];

  for (const rawLine of declaration.split(/\r?\n/)) {
    const line = rawLine.replace(/\(\*.*?\*\)/g, '').trim();
    const match = line.match(/^([A-Za-z_]\w*)\s*(?:AT\s+(%[IQ]\*))?\s*:\s*([A-Za-z_]\w*)/);
    if (!match) continue;

    variables.push({
      name: match[1],
      address: match[2],
      plcType: match[3],
    });
  }

  return variables;
}

function parseConstants(declaration) {
  const constants = new Map();

  for (const rawLine of declaration.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^([A-Za-z_]\w*)\s*:\s*([A-Za-z_]\w*)\s*:=\s*([^;]+);/);
    if (!match) continue;
    constants.set(`C.${match[1]}`, {
      plcType: match[2],
      value: Number(match[3].trim()),
    });
  }

  return constants;
}

function sourceFacts(plcRoot) {
  const multiFormRoot = `${plcRoot}\\MultiFormPLC`;
  const facts = {
    atInput: new Set(),
    atOutput: new Set(),
    constants: new Map(),
    recipeDirection: new Map(),
    hmiRetainWritable: new Set(),
    coilNames: [],
  };

  const cDeclaration = declarationText(`${multiFormRoot}\\GVLs\\C.TcGVL`);
  facts.constants = parseConstants(cDeclaration);

  const inputsDeclaration = declarationText(`${multiFormRoot}\\GVLs\\Inputs.TcGVL`);
  for (const variable of parseVariableLines(inputsDeclaration)) {
    if (variable.address === '%I*') {
      facts.atInput.add(`Inputs.${variable.name}`);
    }
  }

  const hmiDeclaration = declarationText(`${multiFormRoot}\\DUTs\\Structs\\HMIStructure.TcDUT`);
  for (const variable of parseVariableLines(hmiDeclaration)) {
    const symbol = `MF.HMI.${variable.name}`;
    if (variable.address === '%I*') {
      facts.atInput.add(symbol);
      continue;
    }
    if (['BOOL', 'INT', 'UINT', 'UDINT', 'REAL'].includes(variable.plcType)) {
      facts.hmiRetainWritable.add(symbol);
    }
  }

  const recipeDeclaration = declarationText(`${multiFormRoot}\\DUTs\\Structs\\ST_RecipeHMI.TcDUT`);
  let recipeDirection;
  for (const rawLine of recipeDeclaration.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.includes('HMI -> PLC')) recipeDirection = 'write';
    if (line.includes('PLC -> HMI')) recipeDirection = 'read';

    const match = line.match(/^([A-Za-z_]\w*)\s*:\s*([A-Za-z_]\w*)/);
    if (match && recipeDirection) {
      facts.recipeDirection.set(`MF.HMI.Recipe.${match[1]}`, recipeDirection);
    }
  }

  const coilDeclaration = declarationText(`${multiFormRoot}\\POUs\\Coils\\FB_Coil.TcPOU`);
  for (const variable of parseVariableLines(coilDeclaration)) {
    if (variable.address === '%Q*') {
      facts.atOutput.add(`FB_Coil.${variable.name}`);
    }
  }

  const coilManagerDeclaration = declarationText(
    `${multiFormRoot}\\POUs\\Coils\\FB_CoilManager.TcPOU`,
  );
  facts.coilNames = parseVariableLines(coilManagerDeclaration)
    .filter((variable) => variable.plcType === 'FB_Coil')
    .map((variable) => variable.name);

  for (const coilName of facts.coilNames) {
    for (const outputName of facts.atOutput) {
      facts.atOutput.add(outputName.replace('FB_Coil', `MF.Coils.${coilName}`));
    }
  }

  return facts;
}

function parseTmc(path) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ROOT_FIELDS.includes(name),
  });
  const doc = parser.parse(readFileSync(path, 'utf8'));
  const dataTypes = new Map();
  const symbols = new Map();
  const enums = new Map();
  const constants = new Map();

  for (const dataType of asArray(doc.TcModuleClass?.DataTypes?.DataType)) {
    const name = dataTypeName(dataType);
    if (!name) continue;
    dataTypes.set(name, dataType);

    const enumValues = Object.fromEntries(
      asArray(dataType.EnumInfo).map((entry) => [entry.Text, Number(entry.Enum)]),
    );
    if (Object.keys(enumValues).length > 0) {
      enums.set(name, enumValues);
    }
  }

  function addSymbol(name, metadata) {
    const existing = symbols.get(name);
    if (!existing || existing.source === 'expanded') {
      symbols.set(name, metadata);
    }
  }

  function expand(prefix, plcType, areaType, inheritedItemType, stack = []) {
    if (stack.includes(plcType)) return;
    const dataType = dataTypes.get(plcType);
    if (!dataType) return;

    for (const subItem of asArray(dataType.SubItem)) {
      const name = `${prefix}.${subItem.Name}`;
      const childType = typeName(subItem);
      const itemType = propertyValue(subItem, 'ItemType') ?? inheritedItemType;
      addSymbol(name, {
        symbol: name,
        plcType: childType,
        areaType,
        itemType,
        source: 'expanded',
      });
      expand(name, childType, areaType, itemType, [...stack, plcType]);
    }
  }

  const modules = asArray(doc.TcModuleClass?.Modules?.Module);
  for (const module of modules) {
    for (const dataArea of asArray(module.DataAreas?.DataArea)) {
      const areaType = dataArea.AreaNo?.['@_AreaType'];
      for (const symbol of asArray(dataArea.Symbol)) {
        const plcType = typeName(symbol);
        const metadata = {
          symbol: symbol.Name,
          plcType,
          areaType,
          itemType: propertyValue(symbol, 'ItemType'),
          source: 'data-area',
        };
        addSymbol(symbol.Name, metadata);
        expand(symbol.Name, plcType, areaType, metadata.itemType);

        const defaultValue = symbol.Default?.Value;
        if (defaultValue !== undefined) {
          constants.set(symbol.Name, {
            plcType,
            value: Number(defaultValue),
          });
        }
      }
    }
  }

  return { dataTypes, symbols, enums, constants };
}

function materializeSymbols(contract) {
  const symbols = { ...contract.symbols };

  for (const coilName of contract.coilNames ?? []) {
    const prefix = `manual.coils.${coilName[0].toLowerCase()}${coilName.slice(1)}`;
    symbols[`${prefix}.out`] = {
      ...contract.coilTemplate.readbackOut,
      symbol: contract.coilTemplate.readbackOut.symbolPattern.replace('{coil}', coilName),
    };
    symbols[`${prefix}.status`] = {
      ...contract.coilTemplate.readbackStatus,
      symbol: contract.coilTemplate.readbackStatus.symbolPattern.replace('{coil}', coilName),
    };
    symbols[`${prefix}.force`] = {
      ...contract.coilTemplate.force,
      symbol: contract.coilTemplate.force.symbolPattern.replace('{coil}', coilName),
    };
  }

  return symbols;
}

function mapFromObject(object = {}) {
  return new Map(Object.entries(object));
}

function loadSymbolProof(path = SYMBOL_PROOF_PATH) {
  const fixture = JSON.parse(readFileSync(path, 'utf8'));

  return {
    source: fixture.source ?? {},
    facts: {
      atInput: new Set(fixture.facts?.atInput ?? []),
      atOutput: new Set(fixture.facts?.atOutput ?? []),
      constants: mapFromObject(fixture.facts?.constants),
      recipeDirection: mapFromObject(fixture.facts?.recipeDirection),
      hmiRetainWritable: new Set(fixture.facts?.hmiRetainWritable ?? []),
      coilNames: fixture.facts?.coilNames ?? [],
    },
    tmc: {
      symbols: mapFromObject(fixture.tmc?.symbols),
      enums: mapFromObject(fixture.tmc?.enums),
      constants: mapFromObject(fixture.tmc?.constants),
    },
  };
}

function requestsWrite(access) {
  return access === 'write' || access === 'readwrite';
}

function isWritableByPlcSource(symbol, tmcSymbol, facts) {
  if (facts.atInput.has(symbol)) return false;
  if (facts.recipeDirection.get(symbol) === 'write') return true;
  if (facts.hmiRetainWritable.has(symbol)) return true;
  if (tmcSymbol?.itemType === 'Input') return true;
  return false;
}

function validateContract(contract, options = {}) {
  const errors = [];
  const symbols = materializeSymbols(contract);
  const proof = options.proof ?? loadSymbolProof(options.fixturePath);
  const facts = proof.facts;
  const proofTmc = proof.tmc;
  const proofVariant = proof.source.variant ?? contract.primaryVariant;
  const proofVariantSource = contract.source.variants[proofVariant];

  if (!contract.source.variants[contract.primaryVariant]) {
    errors.push(`Primary variant ${contract.primaryVariant} is not declared in source.variants`);
    return { ok: false, errors };
  }
  if (!proofVariantSource) {
    errors.push(`Fixture variant ${proofVariant} is not declared in source.variants`);
  }
  if (proofVariant !== contract.primaryVariant) {
    errors.push(
      `Fixture variant ${proofVariant} does not match primary variant ${contract.primaryVariant}`,
    );
  }
  if (proofVariantSource?.commit !== proof.source.commit) {
    errors.push(
      `${proofVariant} fixture commit ${proof.source.commit} !== ${proofVariantSource?.commit}`,
    );
  }
  if (proofVariantSource?.tmcSha256 !== proof.source.tmcSha256) {
    errors.push(
      `${proofVariant} fixture TMC hash ${proof.source.tmcSha256} !== ${proofVariantSource?.tmcSha256}`,
    );
  }

  if (JSON.stringify(facts.coilNames) !== JSON.stringify(contract.coilNames)) {
    errors.push(
      `Contract coilNames do not match FB_CoilManager: ${contract.coilNames?.join(', ')} vs ${facts.coilNames.join(', ')}`,
    );
  }

  const seenSymbols = new Map();
  for (const [key, entry] of Object.entries(symbols)) {
    if (!entry.symbol) errors.push(`${key} is missing symbol`);
    if (!entry.plcType) errors.push(`${key} is missing plcType`);
    if (!['read', 'write', 'readwrite'].includes(entry.access)) {
      errors.push(`${key} has invalid access ${entry.access}`);
    }

    const prior = seenSymbols.get(entry.symbol);
    if (prior && (prior.plcType !== entry.plcType || prior.access !== entry.access)) {
      errors.push(
        `${entry.symbol} is declared with conflicting metadata by ${prior.key} and ${key}`,
      );
    }
    seenSymbols.set(entry.symbol, { key, plcType: entry.plcType, access: entry.access });

    if (entry.bounds?.maxConstant && !contract.constants?.[entry.bounds.maxConstant]) {
      errors.push(`${key} references missing maxConstant ${entry.bounds.maxConstant}`);
    }
  }

  for (const [constantKey, expected] of Object.entries(contract.constants ?? {})) {
    const sourceConstant = facts.constants.get(expected.symbol);
    const tmcConstant = proofTmc.constants.get(expected.symbol);
    if (!sourceConstant) errors.push(`${constantKey} missing from fixture PLC source constants`);
    if (!tmcConstant) errors.push(`${constantKey} missing default value from fixture TMC proof`);
    if (sourceConstant && sourceConstant.plcType !== expected.plcType) {
      errors.push(`${constantKey} source type ${sourceConstant.plcType} !== ${expected.plcType}`);
    }
    if (tmcConstant && tmcConstant.value !== expected.value) {
      errors.push(`${constantKey} TMC value ${tmcConstant.value} !== ${expected.value}`);
    }
  }

  for (const [enumName, expectedValues] of Object.entries(contract.enums ?? {})) {
    const actualValues = proofTmc.enums.get(enumName);
    if (!actualValues) {
      errors.push(`${enumName} missing from fixture TMC enum types`);
      continue;
    }
    if (JSON.stringify(actualValues) !== JSON.stringify(expectedValues)) {
      errors.push(`${enumName} enum mismatch`);
    }
  }

  for (const [key, entry] of Object.entries(symbols)) {
    const tmcSymbol = proofTmc.symbols.get(entry.symbol);
    if (!tmcSymbol) {
      errors.push(`${key} ${entry.symbol} missing from ${proofVariant} fixture TMC proof`);
      continue;
    }
    if (tmcSymbol.plcType !== entry.plcType) {
      errors.push(
        `${key} ${entry.symbol} type mismatch in ${proofVariant} fixture: ${tmcSymbol.plcType} !== ${entry.plcType}`,
      );
    }

    if (facts.atInput.has(entry.symbol) && requestsWrite(entry.access)) {
      errors.push(`${key} marks AT %I* symbol ${entry.symbol} writable`);
      continue;
    }
    if (requestsWrite(entry.access) && !isWritableByPlcSource(entry.symbol, tmcSymbol, facts)) {
      errors.push(`${key} marks ${entry.symbol} writable without PLC input/HMI-write evidence`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    symbols,
    facts: options.includeFacts ? facts : undefined,
  };
}

export { materializeSymbols, parseTmc, sourceFacts, validateContract };
export { loadSymbolProof };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const contract = JSON.parse(readFileSync(CONTRACT_PATH, 'utf8'));
  const result = validateContract(contract);
  if (!result.ok) {
    console.error(result.errors.join('\n'));
    process.exit(1);
  }
  console.log(
    `Machine contract valid: ${Object.keys(result.symbols).length} symbols against ${contract.primaryVariant} committed fixture`,
  );
}
