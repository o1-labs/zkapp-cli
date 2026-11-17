import keypress from 'enquirer/lib/keypress.js';

/**
 * Makes enquirer prompts stop cleanly on Node.js 24 and later.
 *
 * Each enquirer prompt reads keys through its own `readline` interface. When
 * the prompt stops, enquirer calls `rl.pause()` and then `rl.close()`. On
 * Ctrl+C, `readline` closes the interface itself before enquirer stops it.
 * Node.js 22 ignores `pause()` on a closed interface, but Node.js 24 throws
 * `ERR_USE_AFTER_CLOSE`. The error is thrown inside an event handler, so the
 * CLI crashes with a stack trace instead of handling the cancelled prompt.
 *
 * enquirer removes its listeners and restores the terminal mode before it
 * calls `rl.pause()`, so nothing is left to clean up when we ignore this error.
 */
export function patchEnquirerKeypressListener(target = keypress) {
  if (target.listen.zkappCliPatched) return;

  const listen = target.listen;
  const patchedListen = (...args) => {
    const off = listen(...args);
    return () => {
      try {
        off();
      } catch (error) {
        if (error?.code !== 'ERR_USE_AFTER_CLOSE') throw error;
      }
    };
  };
  patchedListen.zkappCliPatched = true;
  target.listen = patchedListen;
}

patchEnquirerKeypressListener();
