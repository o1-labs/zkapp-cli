import { Constants, getBooleanFromString } from './common-utils.mjs';

function generateInputsForUiTypeSelection(uiType) {
  const inputs = [];

  for (let i = 1; i <= Constants.uiTypes.indexOf(uiType); i++) {
    inputs.push('arrowDown');
  }

  inputs.push('enter');
  return inputs;
}

export async function executeInteractiveCommand(options) {
  console.info(`[Command options]: ${JSON.stringify(options)}`);

  const { processHandler, runner, command, runFrom, interactiveDialog } =
    options;
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
      if (Constants.specialCliKeys.includes(input)) {
        // await wait(Constants.cliPromptMsDelay);
        await pressKey(input);
      } else {
        // await wait(Constants.cliPromptMsDelay);
        await writeText(input);
      }
    }
  }

  await waitForFinish();

  const stdOut = getStdout();
  const stdErr = getStderr();
  const exitCode = getExitCode();

  return { exitCode, stdOut, stdErr };
}

export async function generateProject(
  projectName,
  uiType,
  skipUiTypeSelection,
  processHandler
) {
  const cliArgs = skipUiTypeSelection ? `--ui ${uiType}` : '';
  const command = `project ${cliArgs} ${projectName}`.replace(/\s{2,}/g, ' ');
  let interactiveDialog = {};

  if (!skipUiTypeSelection) {
    interactiveDialog = {
      ...interactiveDialog,
      'Create an accompanying UI project too?':
        generateInputsForUiTypeSelection(uiType),
    };
  }

  switch (uiType) {
    case 'next': {
      if (!getBooleanFromString(process.env.CI)) {
        // TODO: https://github.com/o1-labs/zkapp-cli/issues/453
        process.env.CI = true;
      }
      interactiveDialog = {
        ...interactiveDialog,
        'Do you want to set up your project for deployment to GitHub Pages?': [
          'enter',
        ],
      };
      break;
    }
    case 'svelte': {
      interactiveDialog = {
        ...interactiveDialog,
        'Which Svelte app template?': ['arrowDown', 'enter'],
        'Add type checking with TypeScript?': ['arrowDown', 'enter'],
        'Select additional options (use arrow keys/space bar)': [
          'space',
          'arrowDown',
          'space',
          'arrowDown',
          'space',
          'arrowDown',
          'space',
          'enter',
        ],
      };
      break;
    }
  }

  const { exitCode, stdOut, stdErr } = await executeInteractiveCommand({
    processHandler,
    runner: 'zk',
    command,
    runFrom: undefined,
    interactiveDialog,
  });

  console.info(`[Project CLI StdOut] zk ${command}: ${stdOut}`);
  console.info(`[Project CLI StdErr] zk ${command}: ${stdErr}`);

  return { exitCode, stdOut, stdErr };
}
