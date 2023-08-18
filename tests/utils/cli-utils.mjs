import crypto from 'node:crypto';
import {
  Constants,
  cleanupFeePayerCacheByAlias,
  feePayerCacheExists,
  getBooleanFromString,
  getZkAppAccountFromAlias,
  listCachedFeePayerAliases,
} from './common-utils.mjs';
import {
  acquireAvailableAccount,
  getMinaGraphQlEndpoint,
  releaseAcquiredAccount,
} from './network-utils.mjs';

function generateInputsForOptionSelection(lookupOption, targetOptions) {
  const inputs = [];

  for (let i = 1; i <= targetOptions.indexOf(lookupOption); i++) {
    inputs.push('arrowDown');
  }

  inputs.push('enter');
  return inputs;
}

export async function executeInteractiveCommand(options) {
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

export async function generateProject(
  projectName,
  uiType,
  skipInteractiveSelection,
  processHandler
) {
  const cliArgs = skipInteractiveSelection ? `--ui ${uiType}` : '';
  const command = `project ${cliArgs} ${projectName}`.replace(/\s{2,}/g, ' ');
  let interactiveDialog = {};

  if (!skipInteractiveSelection) {
    interactiveDialog = {
      ...interactiveDialog,
      'Create an accompanying UI project too?':
        generateInputsForOptionSelection(uiType, Constants.uiTypes),
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
    waitForCompletion: true,
    interactiveDialog,
  });

  console.info(`[Project CLI StdOut] zk ${command}: ${stdOut}`);
  console.info(`[Project CLI StdErr] zk ${command}: ${stdErr}`);

  return { exitCode, stdOut, stdErr };
}

export async function generateExampleProject(
  exampleType,
  skipInteractiveSelection,
  processHandler
) {
  const cliArgs = skipInteractiveSelection ? `--name ${exampleType}` : '';
  const command = `example ${cliArgs}`.replace(/\s{2,}/g, ' ');
  let interactiveDialog = {};

  if (getBooleanFromString(process.env.CI)) {
    // Because of the way how it behaves in CI
    // https://github.com/o1-labs/zkapp-cli/blob/f977c91ac11fe333b86317d6092c7a0d151a9529/src/lib/example.js#L113
    delete process.env.CI;
  }

  if (!skipInteractiveSelection) {
    interactiveDialog = {
      ...interactiveDialog,
      'Choose an example': generateInputsForOptionSelection(
        exampleType,
        Constants.exampleTypes
      ),
    };
  }

  const { exitCode, stdOut, stdErr } = await executeInteractiveCommand({
    processHandler,
    runner: 'zk',
    command,
    runFrom: undefined,
    waitForCompletion: true,
    interactiveDialog,
  });

  console.info(`[Example CLI StdOut] zk ${command}: ${stdOut}`);
  console.info(`[Example CLI StdErr] zk ${command}: ${stdErr}`);

  return { exitCode, stdOut, stdErr };
}

export async function createDeploymentAlias(processHandler, options) {
  const command = 'config';
  const {
    deploymentAlias,
    feePayerAlias,
    feePayerPrivateKey,
    feePayerMgmtType,
    minaGraphQlEndpoint,
    transactionFee,
    interruptProcess,
    runFrom,
    waitForCompletion,
  } = options;
  let feePayerInteractiveDialog = {};

  if (feePayerCacheExists() && feePayerMgmtType !== 'cached') {
    feePayerInteractiveDialog = {
      ...feePayerInteractiveDialog,
      'Use stored account': ['arrowDown', 'enter'],
    };
  }

  switch (feePayerMgmtType) {
    case 'recover': {
      feePayerInteractiveDialog = {
        ...feePayerInteractiveDialog,
        'Recover fee payer account from an existing base58 private key': [
          'enter',
        ],
        'Create an alias for this account': [feePayerAlias, 'enter'],
        'Account private key (base58)': [
          feePayerPrivateKey,
          interruptProcess ? 'ctrlc' : 'enter',
        ],
      };
      break;
    }
    case 'new': {
      feePayerInteractiveDialog = {
        ...feePayerInteractiveDialog,
        'Recover fee payer account from an existing base58 private key': [
          'arrowDown',
          'enter',
        ],
        'Create an alias for this account': [
          feePayerAlias,
          interruptProcess ? 'ctrlc' : 'enter',
        ],
      };
      break;
    }
    case 'cached': {
      if (feePayerCacheExists()) {
        feePayerInteractiveDialog = {
          ...feePayerInteractiveDialog,
          'Use stored account': ['enter'],
        };
      }
      break;
    }
    default: {
      feePayerInteractiveDialog = {
        ...feePayerInteractiveDialog,
        'Recover fee payer account from an existing base58 private key': [
          'arrowDown',
          'arrowDown',
          'enter',
        ],
        'Choose another saved fee payer': generateInputsForOptionSelection(
          feePayerMgmtType,
          listCachedFeePayerAliases()
        ),
      };
      break;
    }
  }

  const interactiveDialog = {
    'Create a name (can be anything)': [deploymentAlias, 'enter'],
    'Set the Mina GraphQL API URL to deploy to': [minaGraphQlEndpoint, 'enter'],
    'Set transaction fee to use when deploying (in MINA)': [
      transactionFee,
      'enter',
    ],
    ...feePayerInteractiveDialog,
  };

  const { exitCode, stdOut, stdErr } = await executeInteractiveCommand({
    processHandler,
    runner: 'zk',
    command,
    runFrom,
    waitForCompletion,
    interactiveDialog,
  });

  console.info(`[Config CLI StdOut] zk ${command}: ${stdOut}`);
  console.info(`[Config CLI StdErr] zk ${command}: ${stdErr}`);

  return { exitCode, stdOut, stdErr };
}

export async function maybeCreateDeploymentAlias(processHandler, options) {
  const command = 'config';
  const { runFrom, waitForCompletion, interactiveDialog } = options;

  const { exitCode, stdOut, stdErr } = await executeInteractiveCommand({
    processHandler,
    runner: 'zk',
    command,
    runFrom,
    waitForCompletion,
    interactiveDialog,
  });

  console.info(`[Config CLI StdOut] zk ${command}: ${stdOut}`);
  console.info(`[Config CLI StdErr] zk ${command}: ${stdErr}`);

  return { exitCode, stdOut, stdErr };
}

export async function deployZkApp(
  path,
  projectType,
  interactiveMode,
  processHandler,
  cancelDeployment = false
) {
  const projectName = crypto.randomUUID();
  const deploymentAlias = crypto.randomUUID();
  const feePayerAlias = crypto.randomUUID();
  const feePayerAccount = await acquireAvailableAccount();
  const feePayerMgmtType = 'recover';
  const minaGraphQlEndpoint = await getMinaGraphQlEndpoint();
  const transactionFee = '0.01';
  const cliArgs = interactiveMode ? `` : ' --yes ';
  const command = `deploy ${cliArgs} ${deploymentAlias}`.replace(
    /\s{2,}/g,
    ' '
  );
  let interactiveDialog = {};
  let workDir;

  if (interactiveMode) {
    interactiveDialog = {
      ...interactiveDialog,
      'Are you sure you want to send (yes/no)?': [
        cancelDeployment ? 'no' : 'yes',
        'enter',
      ],
    };
  }

  try {
    if (Constants.exampleTypes.includes(projectType)) {
      workDir = `./${projectType}`;
      await generateExampleProject(projectType, true, processHandler);
    } else {
      if (projectType !== 'none') {
        workDir = `./${projectName}/contracts`;
      } else {
        workDir = `./${projectName}`;
      }
      await generateProject(projectName, projectType, true, processHandler);
    }
    await createDeploymentAlias(processHandler, {
      deploymentAlias,
      feePayerAlias,
      feePayerPrivateKey: feePayerAccount.sk,
      feePayerMgmtType,
      minaGraphQlEndpoint,
      transactionFee,
      interruptProcess: false,
      runFrom: workDir,
      waitForCompletion: true,
    });
    const zkAppPublicKey = getZkAppAccountFromAlias(
      `${path}/${workDir}`,
      deploymentAlias
    ).publicKey;

    const { exitCode, stdOut, stdErr } = await executeInteractiveCommand({
      processHandler,
      runner: 'zk',
      command,
      runFrom: workDir,
      waitForCompletion: true,
      interactiveDialog,
    });

    console.info(`[Deploy CLI StdOut] zk ${command}: ${stdOut}`);
    console.info(`[Deploy CLI StdErr] zk ${command}: ${stdErr}`);

    return { zkAppPublicKey, exitCode, stdOut, stdErr };
  } finally {
    cleanupFeePayerCacheByAlias(feePayerAlias);
    await releaseAcquiredAccount(feePayerAccount);
  }
}
