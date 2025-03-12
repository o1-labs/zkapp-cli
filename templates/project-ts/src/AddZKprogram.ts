import { ZkProgram, Field, SelfProof, verify } from 'o1js';

export const AddZKprogram = ZkProgram({
  name: 'add-program',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    init: {
      privateInputs: [],
      async method(initialState: Field) {
        return {
          publicOutput: initialState,
        };
      },
    },
    update: {
      privateInputs: [],
      async method(state: Field) {
        return {
          publicOutput: state.add(Field(1)),
        };
      },
    },
  },
});

export class AddProgramProof extends ZkProgram.Proof(AddZKprogram) {}
