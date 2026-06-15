import { exec } from 'node:child_process';
import { join } from 'node:path';
import { readJSON } from './fsutil.js';

/** Abre un archivo con la app por defecto del SO. Silencioso si falla (CI, headless). */
export function openFile(p) {
  const cmd = process.platform === 'win32'
    ? `start "" "${p}"`
    : process.platform === 'darwin'
      ? `open "${p}"`
      : `xdg-open "${p}"`;
  try { exec(cmd, () => {}); } catch { /* sin entorno gráfico */ }
}

/** ¿Está habilitada la apertura automática? (config ui.openFiles, default true) */
export function openEnabled(root, flags) {
  if (flags && flags['no-open']) return false;
  const cfg = readJSON(join(root, '.sdd', 'config.json'));
  return !(cfg && cfg.ui && cfg.ui.openFiles === false);
}
