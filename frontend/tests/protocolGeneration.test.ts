import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const FRONTEND_ROOT = resolve(import.meta.dirname, '..');
const GENERATOR = resolve(FRONTEND_ROOT, 'scripts', 'generate-protocol.mjs');
const SOURCE_SCHEMA = resolve(FRONTEND_ROOT, '..', 'backend', 'ws', 'protocol.schema.json');

test('protocol check detects drift in a backend field constraint', () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'pokerin-protocol-'));
  const schemaPath = join(temporaryRoot, 'protocol.schema.json');
  const outputDirectory = join(temporaryRoot, 'generated');

  try {
    const schema = JSON.parse(readFileSync(SOURCE_SCHEMA, 'utf8'));
    writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);

    const generated = spawnSync(process.execPath, [
      GENERATOR,
      '--schema', schemaPath,
      '--output-dir', outputDirectory,
    ], { cwd: FRONTEND_ROOT, encoding: 'utf8' });
    assert.equal(generated.status, 0, generated.stderr);

    schema.client_messages.$defs.ChatCommand.properties.text.maxLength += 1;
    writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);

    const checked = spawnSync(process.execPath, [
      GENERATOR,
      '--schema', schemaPath,
      '--output-dir', outputDirectory,
      '--check',
    ], { cwd: FRONTEND_ROOT, encoding: 'utf8' });
    assert.equal(checked.status, 1);
    assert.match(checked.stderr, /Generated protocol artifacts are stale/);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
