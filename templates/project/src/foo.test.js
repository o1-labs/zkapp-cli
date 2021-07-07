import { foo } from './foo.js';

describe('foo.js', () => {
  it('should be correct', () => {
    expect(foo()).toEqual(1);
  });
});
