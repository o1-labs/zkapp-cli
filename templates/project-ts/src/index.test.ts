import { Field, isReady, shutdown } from 'snarkyjs';

describe('index.ts', () => {
  describe('foo()', () => {
    beforeAll(async () => {
      await isReady;
    });
    afterAll(async () => {
      // `shutdown()` internally calls `process.exit()` which will exit the running Jest process early.
      // Specifying a timeout of 0 is a workaround to defer `shutdown()` until Jest is done running all tests.
      // This should be fixed with https://github.com/MinaProtocol/mina/issues/10943
      setTimeout(async () => {
        await shutdown();
      }, 0);
    });
    it('should be correct', async () => {
      expect(Field(1).add(1)).toEqual(Field(2));
    });
  });
});
