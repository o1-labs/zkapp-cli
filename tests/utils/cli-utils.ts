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
    await waitForPrompt(prompt.replace(/^#+/g, ''), {
      command,
      waitForText,
      getExitCode,
      getStdout,
      getStderr,
    });
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

/**
 * Waits for the CLI to print an interactive prompt.
 *
 * `waitForText` from the CLI testing library never settles if the text does not
 * appear, which turns an early CLI failure into a hang that lasts until the
 * test (or the CI job) timeout. This wrapper fails fast when the CLI process
 * exits before the prompt appears, and also enforces an upper bound.
 */
async function waitForPrompt(
  prompt: string,
  context: {
    command: string;
    waitForText: (input: string) => Promise<unknown>;
    getExitCode: () => number | null;
    getStdout: () => string[];
    getStderr: () => string[];
  }
): Promise<void> {
  const { command, waitForText, getExitCode, getStdout, getStderr } = context;
  const describeOutput = () =>
    `\nStdOut:\n${getStdout().join('\n')}\nStdErr:\n${getStderr().join('\n')}`;
  let exitPoller: NodeJS.Timeout | undefined;
  let timeoutTimer: NodeJS.Timeout | undefined;
  const processExited = new Promise<never>((_, reject) => {
    exitPoller = setInterval(() => {
      const exitCode = getExitCode();
      if (exitCode !== null) {
        reject(
          new Error(
            `CLI command "${command}" exited with code ${exitCode} before the prompt "${prompt}" appeared.${describeOutput()}`
          )
        );
      }
    }, TestConstants.cliExitPollMsInterval);
  });
  const timedOut = new Promise<never>((_, reject) => {
    timeoutTimer = setTimeout(() => {
      reject(
        new Error(
          `Timed out after ${TestConstants.cliPromptMsTimeout} ms waiting for the prompt "${prompt}" from the CLI command "${command}".${describeOutput()}`
        )
      );
    }, TestConstants.cliPromptMsTimeout);
  });

  try {
    await Promise.race([waitForText(prompt), processExited, timedOut]);
  } finally {
    clearInterval(exitPoller);
    clearTimeout(timeoutTimer);
  }
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
  processStdout: string[]
): Promise<void> {
  const maxAttempts = 5;
  const pollingIntervalMs = 3_000;
  let currentAttempt = 1;
  let isReady = false;

  console.info('\n');
  while (currentAttempt <= maxAttempts && !isReady) {
    console.info(`Waiting for server readiness. Attempt #${currentAttempt}`);
    if (
      processStdout.some(
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

export function logProcessOutput(
  processStdout: string[],
  processStderr: string[]
): void {
  if (processStdout.length > 0) {
    console.info('Process StdOut:');
    console.info(processStdout.join('\n'));
    console.info('\n--------------------');
  }
  if (processStderr.length > 0) {
    console.info('Process StdErr:');
    console.info(processStderr.join('\n'));
    console.info('\n--------------------');
  }
}
