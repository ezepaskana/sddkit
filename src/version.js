import { readFileSync } from 'node:fs';

/** Versión única, leída de package.json. Nunca hardcodear el número en otro lado. */
export const VERSION = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
).version;
