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

export async function waitForServer(
  serverUrl: URL,
  getProcessStdout: () => string[]
): Promise<void> {
  const maxAttempts = 5;
  const pollingIntervalMs = 3_000;
  let currentAttempt = 1;
  let isReady = false;

  console.info('\n');
  while (currentAttempt <= maxAttempts && !isReady) {
    console.info(`Waiting for server readiness. Attempt #${currentAttempt}`);
    if (
      getProcessStdout().some(
        // We want to check data presence in process stdout independently
        // because CLI output is usually formatted and colored using
        // different libs and styles.
        (item) =>
          item.includes(`${serverUrl.protocol}`) &&
          item.includes(`${serverUrl.hostname}`) &&
          item.includes(`${serverUrl.port}`)
      )
    ) {
      isReady = true;
      break;
    } else {
      await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs));
    }
    currentAttempt++;
  }
  if (!isReady) {
    throw new Error('Maximum attempts reached. The server is not ready!');
  } else {
    console.info('\nServer is up and running!');
  }
}

export function logProcessOutput(stdOut: string[], stdErr: string[]): void {
  if (stdOut.length !== 0) {
    console.info('Process StdOut:');
    console.info(stdOut.join('\n'));
    console.info('\n--------------------');
  }
  if (stdErr.length !== 0) {
    console.info('Process StdErr:');
    console.info(stdErr.join('\n'));
    console.info('\n--------------------');
  }
}
