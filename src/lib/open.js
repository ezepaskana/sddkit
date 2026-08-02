import { exec } from 'node:child_process';
import { join } from 'node:path';
import { readJSON } from './fsutil.js';

/** ¿La terminal actual está embebida en un IDE (JetBrains o VSCode)? */
export function isEmbeddedIdeTerminal(env) {
  return env.TERMINAL_EMULATOR === 'JetBrains-JediTerm' || env.TERM_PROGRAM === 'vscode';
}

/** Comando de apertura por defecto del SO. */
function defaultOpenCommand(p) {
  return process.platform === 'win32'
    ? `start "" "${p}"`
    : process.platform === 'darwin'
      ? `open "${p}"`
      : `xdg-open "${p}"`;
}

/** Comando de apertura: en terminal embebida abre en el IDE anfitrión (ignora opener);
 *  si no, usa el opener configurado o la app por defecto del SO. */
export function openCommand(p, opener, env = {}) {
  if (isEmbeddedIdeTerminal(env)) {
    if (process.platform === 'darwin' && env.__CFBundleIdentifier) {
      return `open -b "${env.__CFBundleIdentifier}" "${p}"`;
    }
    return defaultOpenCommand(p);
  }
  if (opener) return `${opener} "${p}"`;
  return defaultOpenCommand(p);
}

/** Opener configurado en .sdd/config.json → ui.opener (ej. "code", "open -a TextEdit"), o null. */
export function resolveOpener(root) {
  const cfg = readJSON(join(root, '.sdd', 'config.json'));
  return (cfg && cfg.ui && cfg.ui.opener) || null;
}

/** Abre un archivo: en terminal embebida usa el IDE anfitrión; si no, el opener configurado
 *  (ui.opener) o la app por defecto del SO. Silencioso si falla (CI, headless). */
export function openFile(p, root = null) {
  const cmd = openCommand(p, root ? resolveOpener(root) : null, process.env);
  try { exec(cmd, () => {}); } catch { /* sin entorno gráfico */ }
}

/** ¿Está habilitada la apertura automática? (config ui.openFiles, default true) */
export function openEnabled(root, flags) {
  if (flags && flags['no-open']) return false;
  const cfg = readJSON(join(root, '.sdd', 'config.json'));
  return !(cfg && cfg.ui && cfg.ui.openFiles === false);
}
