import { ZkProgram, Field, SelfProof, verify } from 'o1js';

export const AddZKprogram = ZkProgram({
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

export class AddProgramProof extends ZkProgram.Proof(AddZKprogram) {}
