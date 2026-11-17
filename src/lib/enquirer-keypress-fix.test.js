import { jest } from '@jest/globals';
import keypress from 'enquirer/lib/keypress.js';
import { patchEnquirerKeypressListener } from './enquirer-keypress-fix.js';

function createTarget(off) {
  return { listen: jest.fn(() => off) };
}

describe('enquirer-keypress-fix.js', () => {
  it('patches the enquirer keypress listener when imported', () => {
    expect(keypress.listen.zkappCliPatched).toBe(true);
  });

  it('passes the arguments to the original listener and stops it', () => {
    const off = jest.fn();
    const target = createTarget(off);
    const originalListen = target.listen;
    patchEnquirerKeypressListener(target);

    const stop = target.listen('options', 'onKeypress');
    stop();

    expect(originalListen).toHaveBeenCalledWith('options', 'onKeypress');
    expect(off).toHaveBeenCalledTimes(1);
  });

  it('ignores ERR_USE_AFTER_CLOSE when the readline interface is already closed', () => {
    const error = Object.assign(new Error('readline was closed'), {
      code: 'ERR_USE_AFTER_CLOSE',
    });
    const target = createTarget(() => {
      throw error;
    });
    patchEnquirerKeypressListener(target);

    expect(() => target.listen()()).not.toThrow();
  });

  it('rethrows other errors', () => {
    const target = createTarget(() => {
      throw new Error('other error');
    });
    patchEnquirerKeypressListener(target);

    expect(() => target.listen()()).toThrow('other error');
  });

  it('does not patch the same listener two times', () => {
    const target = createTarget(jest.fn());
    patchEnquirerKeypressListener(target);
    const patchedListen = target.listen;
    patchEnquirerKeypressListener(target);

    expect(target.listen).toBe(patchedListen);
  });
});
