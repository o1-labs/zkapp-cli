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
      privateInputs: [SelfProof],
      async method(
        initialState: Field,
        previousProof: SelfProof<Field, Field>
      ) {
        previousProof.verify();
        return {
          publicOutput: initialState.add(Field(1)),
        };
      },
    },
  },
});

export class AddProgramProof extends ZkProgram.Proof(AddZKprogram) {}
