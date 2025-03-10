import { ZkProgram, Field } from 'o1js';

export const Add = ZkProgram({
  name: 'add-program',
  publicInput: Field,
  methods: {
    init: {
      privateInputs: [],

      async method() {},
    },
  },
});
