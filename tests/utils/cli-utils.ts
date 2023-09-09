import { CommandOptions, CommandResults } from '../models/types.js';
import { TestConstants, getBooleanFromString } from './common-utils.js';

export async function executeInteractiveCommand(
  options: CommandOptions
): Promise<CommandResults> {
  console.info(`[Command options]: ${JSON.stringify(options)}`);

  const {
    processHandler,
    runner,
    command,
    runFrom,
    waitForCompletion,
    interactiveDialog,
  } = options;
  const {
    debug,
    getStdout,
    getStderr,
    getExitCode,
    pressKey,
    wait,
    waitForText,
    waitForFinish,
    writeText,
  } = await processHandler(runner, command, runFrom);
  const testDebugEnabled = getBooleanFromString(
    process.env.TEST_DEBUG ?? 'true'
  );

  if (testDebugEnabled) {
    debug();
  }

  for (const prompt in interactiveDialog) {
    await waitForText(prompt.replace(/^#+/g, ''));
    const inputs = interactiveDialog[prompt];
    for (const input of inputs) {
      if (TestConstants.specialCliKeys.includes(input)) {
        // We have to wait for a bit before pressing the special keys
        // because otherwise it might be ignored by the CLI
        await wait(TestConstants.cliPromptMsDelay);
        await pressKey(input);
      } else {
        await writeText(input);
      }
    }
  }

  if (waitForCompletion) {
    await waitForFinish();
  }

  const stdOut = getStdout();
  const stdErr = getStderr();
  const exitCode = getExitCode();

  return { exitCode, stdOut, stdErr };
}

export function generateInputsForOptionSelection(
  lookupOption: string,
  targetOptions: string[] | readonly string[]
): string[] {
  const inputs = [];

  for (let i = 1; i <= targetOptions.indexOf(lookupOption); i++) {
    inputs.push('arrowDown');
  }

  inputs.push('enter');
  return inputs;
}
