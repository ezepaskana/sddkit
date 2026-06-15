import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { VERSION } from './version.js';

test('VERSION debe ser un string no vacío', () => {
  assert.strictEqual(typeof VERSION, 'string');
  assert(VERSION.length > 0);
});
