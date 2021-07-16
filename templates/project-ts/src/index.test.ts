import { foo } from './index';

describe('index.ts', () => {
  describe('foo()', () => {
    it('should be correct', () => {
      expect(foo()).toEqual(1);
    });
  });
});
