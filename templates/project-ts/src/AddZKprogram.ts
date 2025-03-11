import { ZkProgram, Field } from 'o1js';

export const AddProgram = ZkProgram({
  name: 'add-program',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    // init: {
    //   privateInputs: [],

    //   async method() {},
    // },

    update: {
      privateInputs: [],
      async method(state: Field) {
        return {
          publicOutput: state.add(1),
        };
      },
    },
  },
});

export class AddProgramProof extends ZkProgram.Proof(AddProgram) {}
