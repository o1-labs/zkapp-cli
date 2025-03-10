import { ZkProgram, Field } from 'o1js';

export const AddProgram = ZkProgram({
  name: 'add-program',
  publicInput: Field,
  methods: {
    init: {
      privateInputs: [],

      async method() {},
    },

    update: {
      privateInputs: [],
      async method(state: Field) {
        state.add(1);
      },
    },
  },
});
