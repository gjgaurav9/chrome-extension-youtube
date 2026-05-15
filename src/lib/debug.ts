const DEBUG = false;

export function debug(...args: unknown[]): void {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[ReviseTube]', ...args);
  }
}
