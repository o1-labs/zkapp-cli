import { foo } from '../src/index';
import { Field, isReady, shutdown } from 'snarkyjs';

describe('index.ts', () => {
  describe('foo()', () => {
    beforeAll(async () => {
      await isReady;
    });
    afterAll(async () => {
      await shutdown();
    });
    it('should be correct', async () => {
      console.log(Field.random());
      expect(foo()).toEqual(1);
    });
  });
});
