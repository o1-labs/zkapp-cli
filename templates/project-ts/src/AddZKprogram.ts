import { ZkProgram, Field } from 'o1js';

export const AddZKProgram = ZkProgram({
  name: 'add-program',
  publicInput: Field,
  publicOutput: Field,
  methods: {
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

export class AddProgramProof extends ZkProgram.Proof(AddZKProgram) {}
