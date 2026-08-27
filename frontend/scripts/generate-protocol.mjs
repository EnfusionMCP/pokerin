/**
 * Deterministically generate wire types and standalone runtime validators from
 * backend/ws/protocol.schema.json.
 *
 * Refresh the backend source schema first when its Pydantic models change:
 *   python -m backend.ws.schema_export backend/ws/protocol.schema.json
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import standaloneCode from 'ajv/dist/standalone/index.js';
import { compile } from 'json-schema-to-typescript';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDirectory, '..');
const defaultSchemaPath = resolve(frontendRoot, '..', 'backend', 'ws', 'protocol.schema.json');
const defaultOutputDirectory = resolve(frontendRoot, 'src', 'protocol', 'generated');
const SERVER_SCHEMA_ID = 'https://pokerin.space/schema/ws/server-v1';
const CLIENT_SCHEMA_ID = 'https://pokerin.space/schema/ws/client-v1';

function normalizeLineEndings(value) {
  return value.replace(/\r\n?/g, '\n');
}

function parseArguments(argv) {
  const options = {
    check: false,
    schemaPath: defaultSchemaPath,
    outputDirectory: defaultOutputDirectory,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--check') {
      options.check = true;
    } else if (argument === '--schema' && argv[index + 1]) {
      options.schemaPath = resolve(argv[index += 1]);
    } else if (argument === '--output-dir' && argv[index + 1]) {
      options.outputDirectory = resolve(argv[index += 1]);
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument}`);
    }
  }
  return options;
}

function discriminators(schema) {
  const definitions = schema?.$defs ?? {};
  const values = (schema?.oneOf ?? []).map((branch) => {
    const reference = branch?.$ref;
    const name = typeof reference === 'string' ? reference.split('/').at(-1) : null;
    const definition = name ? definitions[name] : branch;
    const value = definition?.properties?.type?.const;
    if (typeof value !== 'string') throw new Error(`Missing type discriminator for ${reference ?? 'branch'}`);
    return value;
  });
  return [...new Set(values)].sort();
}

function withoutOpenApiAnnotations(value) {
  if (Array.isArray(value)) return value.map(withoutOpenApiAnnotations);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'discriminator')
      .map(([key, child]) => [key, withoutOpenApiAnnotations(child)]),
  );
}

async function renderWireTypes(schema, rootName) {
  const typeOptions = {
    additionalProperties: true,
    bannerComment: '',
    cwd: frontendRoot,
    declareExternallyReferenced: true,
    enableConstEnums: false,
    format: true,
    style: {
      bracketSpacing: true,
      printWidth: 120,
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'all',
      useTabs: false,
    },
    unknownAny: true,
    unreachableDefinitions: false,
  };
  const generated = await compile(schema, rootName, typeOptions);
  return `/** Generated from backend/ws/protocol.schema.json; do not edit by hand. */\n${generated.trim()}\n`;
}

function renderMetadata(bundle, digest) {
  const clientMessages = JSON.stringify(discriminators(bundle.client_messages));
  const serverMessages = JSON.stringify(discriminators(bundle.server_messages));
  return `/** Generated from backend/ws/protocol.schema.json; do not edit by hand. */\n`
    + `export const BACKEND_PROTOCOL_SCHEMA_VERSION = ${JSON.stringify(bundle.schema_version)} as const;\n`
    + `export const BACKEND_PROTOCOL_GENERATED_FROM = ${JSON.stringify(bundle.generated_from)} as const;\n`
    + `export const BACKEND_PROTOCOL_SCHEMA_SHA256 = ${JSON.stringify(digest)} as const;\n`
    + `export const BACKEND_CLIENT_MESSAGE_TYPES = ${clientMessages} as const;\n`
    + `export const BACKEND_SERVER_MESSAGE_TYPES = ${serverMessages} as const;\n`;
}

function convertRuntimeRequiresToEsm(source) {
  const imports = [];
  const body = source.replace(
    /const (\w+) = require\("([^"]+)"\)([^;]*);/g,
    (_match, variable, moduleName, suffix) => {
      const importName = `runtimeModule${imports.length}`;
      const specifier = moduleName.endsWith('.js') ? moduleName : `${moduleName}.js`;
      imports.push(`import ${importName} from ${JSON.stringify(specifier)};`);
      return `const ${variable} = ${importName}${suffix};`;
    },
  );
  return `${imports.join('\n')}\n${body}`;
}

function renderValidator(bundle, digest) {
  const serverSchema = {
    ...withoutOpenApiAnnotations(bundle.server_messages),
    $schema: bundle.$schema,
    $id: SERVER_SCHEMA_ID,
  };
  const clientSchema = {
    ...withoutOpenApiAnnotations(bundle.client_messages),
    $schema: bundle.$schema,
    $id: CLIENT_SCHEMA_ID,
  };
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    // JSON Schema allows a conditional branch to require properties declared
    // by its parent object. Ajv's strictRequired lint treats that legal pattern
    // as an error unless this one strictness check is disabled.
    strictRequired: false,
    code: { esm: true, lines: true, optimize: true, source: true },
  });
  addFormats(ajv);
  ajv.addSchema(serverSchema);
  ajv.addSchema(clientSchema);
  const generated = convertRuntimeRequiresToEsm(standaloneCode(ajv, {
    validateServerMessage: SERVER_SCHEMA_ID,
    validateClientMessage: CLIENT_SCHEMA_ID,
  }));
  return `/** Generated standalone JSON-Schema validators. Source SHA-256: ${digest} */\n${generated.trimEnd()}\n`;
}

function renderValidatorDeclarations() {
  return `/** Generated declarations for protocolValidator.generated.js. */\n`
    + `import type { BackendClientMessage } from './clientProtocol.generated.ts';\n`
    + `import type { BackendServerMessage } from './serverProtocol.generated.ts';\n\n`
    + `export interface GeneratedValidationError {\n`
    + `  instancePath: string;\n`
    + `  schemaPath: string;\n`
    + `  keyword: string;\n`
    + `  params: Record<string, unknown>;\n`
    + `  message?: string;\n`
    + `}\n\n`
    + `export interface GeneratedValidator<T> {\n`
    + `  (value: unknown): value is T;\n`
    + `  errors: GeneratedValidationError[] | null;\n`
    + `}\n\n`
    + `export const validateServerMessage: GeneratedValidator<BackendServerMessage>;\n`
    + `export const validateClientMessage: GeneratedValidator<BackendClientMessage>;\n`;
}

async function expectedArtifacts(schemaPath) {
  const sourceText = normalizeLineEndings(await readFile(schemaPath, 'utf8'));
  const bundle = JSON.parse(sourceText);
  if (!bundle || typeof bundle !== 'object'
      || !bundle.server_messages || !bundle.client_messages
      || !Number.isInteger(bundle.schema_version)) {
    throw new Error('Backend protocol schema bundle is missing required sections');
  }
  const digest = createHash('sha256').update(sourceText).digest('hex');
  return {
    'protocolMetadata.generated.ts': renderMetadata(bundle, digest),
    'serverProtocol.generated.ts': await renderWireTypes(bundle.server_messages, 'BackendServerMessage'),
    'clientProtocol.generated.ts': await renderWireTypes(bundle.client_messages, 'BackendClientMessage'),
    'protocolValidator.generated.js': renderValidator(bundle, digest),
    'protocolValidator.generated.d.ts': renderValidatorDeclarations(),
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const artifacts = await expectedArtifacts(options.schemaPath);
  if (options.check) {
    const stale = [];
    for (const [name, expected] of Object.entries(artifacts)) {
      const actual = await readFile(resolve(options.outputDirectory, name), 'utf8').catch(() => '');
      if (normalizeLineEndings(actual) !== expected) stale.push(name);
    }
    if (stale.length > 0) {
      console.error(`Generated protocol artifacts are stale: ${stale.join(', ')}`);
      console.error('Run: npm run protocol:generate');
      process.exitCode = 1;
    }
    return;
  }

  await mkdir(options.outputDirectory, { recursive: true });
  await Promise.all(Object.entries(artifacts).map(([name, contents]) => (
    writeFile(resolve(options.outputDirectory, name), contents, 'utf8')
  )));
  console.log(`Generated ${Object.keys(artifacts).length} protocol artifacts`);
}

await main();
