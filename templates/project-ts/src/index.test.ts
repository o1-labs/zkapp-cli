import { Field, isReady, shutdown } from 'snarkyjs';

describe('index.ts', () => {
  describe('foo()', () => {
    beforeAll(async () => {
      await isReady;
    });
    afterAll(() => {
      shutdown();
    });
    it('should be correct', async () => {
      expect(Field(1).add(1)).toEqual(Field(2));
    });
  });
});
