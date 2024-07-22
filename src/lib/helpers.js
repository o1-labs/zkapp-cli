import { parse as acornParse } from 'acorn';
import { simple as simpleAcornWalk } from 'acorn-walk';
import chalk from 'chalk';
import fs from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import url from 'node:url';
import ora from 'ora';
import shell from 'shelljs';

// Module external API
export {
  capitalize,
  findIfClassExtendsSmartContract,
  isDirEmpty,
  kebabCase,
  readDeployAliasesConfig,
  replaceInFile,
  setProjectName,
  setupProject,
  step,
  titleCase,
};

// Module internal API (exported for testing purposes)
export {
  buildClassHierarchy,
  checkClassInheritance,
  resolveImports,
  resolveModulePath,
};

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const acornOptions = {
  ecmaVersion: 2020,
  sourceType: 'module',
  allowReturnOutsideFunction: true,
  allowImportExportEverywhere: true,
  allowAwaitOutsideFunction: true,
  allowSuperOutsideMethod: true,
  allowHashBang: true,
  checkPrivateFields: false,
};

/**
 * Helper for any steps for a consistent UX.
 * @template T
 * @param {string} step  Name of step to show user.
 * @param {() => Promise<T>} fn  An async function to execute.
 * @param {boolean} [exitOnError=true]  Whether to exit on error with the exit code other than 0.
 * @returns {Promise<T>}
 */
async function step(str, fn, exitOnError = true) {
  // discardStdin prevents Ora from accepting input that would be passed to a
  // subsequent command, like a y/n confirmation step, which would be dangerous.
  const spin = ora({ text: `${str}...`, discardStdin: true }).start();
  try {
    const result = await fn();
    spin.succeed(chalk.green(str));
    return result;
  } catch (err) {
    spin.fail(str);
    console.error('  ' + chalk.red(err)); // maintain expected indentation
    console.log(err);
    if (exitOnError) {
      process.exit(1);
    }
  }
}

/**
 * Sets up the new project from the template.
 * @param {string} destination Destination dir path.
 * @param {string} lang        ts (default) or js
 * @returns {Promise<boolean>} True if successful; false if not.
 */
async function setupProject(destination, lang = 'ts') {
  const currentDir = shell.pwd().toString();
  const projectName = lang === 'ts' ? 'project-ts' : 'project';
  const templatePath = path.resolve(
    __dirname,
    '..',
    '..',
    'templates',
    projectName
  );
  const step = 'Set up project';
  const spin = ora({ text: `${step}...`, discardStdin: true }).start();

  try {
    const destDir = path.resolve(destination);
    shell.mkdir('-p', destDir);
    shell.cd(destDir);
    // `node:fs.cpSync` instead of the `shell.cp` because `ShellJS` does not implement `cp -a`
    // https://github.com/shelljs/shelljs/issues/79#issuecomment-30821277
    fs.cpSync(`${templatePath}/`, `${destDir}/`, { recursive: true });
    shell.mv(
      path.resolve(destDir, '_.gitignore'),
      path.resolve(destDir, '.gitignore')
    );
    shell.mv(
      path.resolve(destDir, '_.npmignore'),
      path.resolve(destDir, '.npmignore')
    );
    spin.succeed(chalk.green(step));

    return true;
  } catch (err) {
    spin.fail(step);
    console.error(err);
    return false;
  } finally {
    shell.cd(currentDir);
  }
}

/**
 * Step to replace placeholder names in the project with the properly-formatted version of it
 * @param {string} projDir Full path to the project directory
 * @returns {void}
 */
function setProjectName(projDir) {
  const name = projDir.split(path.sep).pop();
  replaceInFile(
    path.join(projDir, 'README.md'),
    'PROJECT_NAME',
    titleCase(name)
  );
  replaceInFile(
    path.join(projDir, 'package.json'),
    'package-name',
    kebabCase(name)
  );
}
/**
 * Reads the deploy aliases configuration from the project root.
 * @param {string} projectRoot The project root directory.
 * @returns {Object} The deploy aliases configuration.
 * @throws {Error} And exits if the configuration file is not found or cannot be read.
 */
function readDeployAliasesConfig(projectRoot) {
  try {
    return JSON.parse(fs.readFileSync(`${projectRoot}/config.json`, 'utf8'));
  } catch (err) {
    let str;
    if (err.code === 'ENOENT') {
      str = `config.json not found. Make sure you're in a zkApp project directory.`;
    } else {
      str = 'Unable to read config.json.';
      console.error(err);
    }
    console.log(chalk.red(str));
    process.exit(1);
  }
}

/**
 * Checks if a directory is empty.
 * @param {string} path The path to the directory to check.
 * @returns {boolean} True if the directory is empty, false otherwise.
 */
function isDirEmpty(path) {
  return fs.readdirSync(path).length === 0;
}

/**
 * Helper to replace text in a file.
 * @param {string} file  Path to file
 * @param {string} a  Old text.
 * @param {string} b  New text.
 */
function replaceInFile(file, a, b) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(a, b);
  fs.writeFileSync(file, content);
}

/**
 * Converts a string to title case.
 * @param {string} str The string to convert.
 * @returns {string} The title case string.
 */
function titleCase(str) {
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase())
    .join(' ');
}

/**
 * Converts a string to kebab case.
 * @param {string} str The string to convert.
 * @returns {string} The kebab case string.
 */
function kebabCase(str) {
  return str.toLowerCase().replace(' ', '-');
}

/**
 * Converts a string to capitalized case.
 * @param {string} string The string to convert.
 * @returns {string} The capitalized string.
 */
function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Finds all classes that extend the 'SmartContract' class from 'o1js'.
 * @param {string} entryFilePath - The path of the entry file.
 * @returns {Array<Object>} - An array of objects containing the class name and file path of the smart contract classes found.
 */
function findIfClassExtendsSmartContract(entryFilePath) {
  const classesMap = buildClassHierarchy(entryFilePath);
  const importMappings = resolveImports(entryFilePath);
  const smartContractClasses = [];

  // Check each class in the class map for inheritance from the o1js `SmartContract`
  for (let className of Object.keys(classesMap)) {
    const result = checkClassInheritance(
      className,
      'SmartContract',
      classesMap,
      new Set(),
      importMappings
    );
    if (result) {
      smartContractClasses.push({
        className,
        filePath: classesMap[className].filePath,
      });
    }
  }

  return smartContractClasses;
}

/**
 * Builds a class hierarchy map based on the provided file path.
 * @param {string} filePath - The path to the file containing the class declarations.
 * @returns {Object} - The class hierarchy map, where keys are class names and values are objects containing class information.
 */
function buildClassHierarchy(filePath) {
  const source = fs.readFileSync(filePath, 'utf-8');
  const ast = acornParse(source, acornOptions);
  const classesMap = {};
  const importSet = new Set();

  // Traverse the AST to find class declarations and imports
  simpleAcornWalk(ast, {
    ClassDeclaration(node) {
      const currentClass = node.id.name;
      const parentClass = node.superClass ? node.superClass.name : null;
      classesMap[currentClass] = {
        extends: parentClass,
        filePath,
        inheritsFromO1jsSmartContract: false,
      };
    },
    ImportDeclaration(node) {
      if (node.source.value === 'o1js') {
        node.specifiers.forEach((specifier) => {
          importSet.add(specifier.local.name);
        });
      }
    },
  });

  // Mark classes that extend `SmartContract` from `o1js` in the same file
  Object.values(classesMap).forEach((classInfo) => {
    if (importSet.has(classInfo.extends)) {
      classInfo.inheritsFromO1jsSmartContract = true;
    }
  });

  return classesMap;
}

/**
 * Resolves the imports in the given file path and returns the import mappings.
 * @param {string} filePath - The path of the file to resolve imports for.
 * @returns {Object} - The import mappings where the keys are the local names and the values are objects with the resolved paths and module names.
 */
function resolveImports(filePath) {
  const source = fs.readFileSync(filePath, 'utf-8');
  const ast = acornParse(source, acornOptions);
  const importMappings = {};

  // Traverse the AST to find import declarations
  simpleAcornWalk(ast, {
    ImportDeclaration(node) {
      const sourcePath = node.source.value;
      node.specifiers.forEach((specifier) => {
        const resolvedPath = resolveModulePath(
          sourcePath,
          path.dirname(filePath)
        );
        importMappings[specifier.local.name] = {
          resolvedPath,
          moduleName: sourcePath,
        };
      });
    },
  });

  return importMappings;
}

/**
 * Resolves the path of a module based on the provided module name and base path.
 * @param {string} moduleName - The name of the module to resolve.
 * @param {string} basePath - The base path to resolve the module path relative to.
 * @returns {string|null} - The resolved module path, or null if the module is not found or is a built-in module.
 */
function resolveModulePath(moduleName, basePath) {
  // Check if the module is a Node.js built-in module
  if (builtinModules.includes(moduleName)) {
    return null;
  }

  // Resolve relative or absolute paths based on the current file's directory
  if (path.isAbsolute(moduleName) || moduleName.startsWith('.')) {
    let modulePath = path.resolve(basePath, moduleName);
    if (!fs.existsSync(modulePath) && !modulePath.endsWith('.js')) {
      modulePath += '.js';
    }
    return modulePath;
  } else {
    // Module is a node_modules dependency
    const packagePath = path.join('node_modules', moduleName);
    const packageJsonPath = path.join(packagePath, 'package.json');

    // Try to resolve the main file using the package.json
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      // Skip the primary entry point for the 'o1js' module
      // This is necessary if the 'o1js' module is of < v1.0.1
      // https://github.com/o1-labs/o1js/commit/0a56798210e9e6678a2b18ca0cecd683b05ba6e5
      if (moduleName === 'o1js') {
        delete packageJson['main'];
      }
      let mainFile =
        packageJson.main || packageJson?.exports?.node?.import || 'index.js';
      return path.join(packagePath, mainFile);
    } else {
      console.error(
        `Module '${moduleName}' not found in the './node_modules' directory.`
      );
      return null;
    }
  }
}

/**
 * Checks if a class inherits from a target class by traversing the class hierarchy.
 * @param {string} className - The name of the class to check.
 * @param {string} targetClass - The name of the target class to check inheritance against.
 * @param {Object} classesMap - A map of class names to class information.
 * @param {Set} visitedClasses - A set of visited class names to avoid infinite loops.
 * @param {Object} importMappings - A map of class names to resolved file paths and module names.
 * @returns {boolean} - Returns true if the class inherits from the target class from 'o1js', false otherwise.
 */
function checkClassInheritance(
  className,
  targetClass,
  classesMap,
  visitedClasses,
  importMappings
) {
  // Avoid infinite loops by tracking visited classes
  if (visitedClasses.has(className)) return false;
  visitedClasses.add(className);

  // If the class is not found in the current classesMap, build its hierarchy from imports
  if (!classesMap[className]) {
    let importMapping = importMappings[className];
    if (!importMapping) return false;

    Object.assign(classesMap, buildClassHierarchy(importMapping.resolvedPath));
    importMappings = Object.assign(
      importMappings,
      resolveImports(importMapping.resolvedPath)
    );
  }

  const classInfo = classesMap[className];
  if (!classInfo) return false;

  // Propagate inheritsFromO1jsSmartContract from parent class
  if (classInfo.extends) {
    const parentClassResult = checkClassInheritance(
      classInfo.extends,
      targetClass,
      classesMap,
      visitedClasses,
      importMappings
    );

    // Propagate the inheritsFromO1jsSmartContract flag
    if (parentClassResult) {
      classInfo.inheritsFromO1jsSmartContract = true;
    }
  }

  // Check if the class directly extends the target class
  if (
    classInfo.extends === targetClass &&
    importMappings[classInfo.extends]?.moduleName === 'o1js'
  ) {
    classInfo.inheritsFromO1jsSmartContract = true;
    return true;
  }

  // Additional check for imported base class
  if (importMappings[classInfo.extends]) {
    const baseClassPath = importMappings[classInfo.extends].resolvedPath;
    const baseClassMap = buildClassHierarchy(baseClassPath);
    Object.assign(classesMap, baseClassMap);
    const baseClassInfo = baseClassMap[classInfo.extends];
    if (baseClassInfo && baseClassInfo.extends === targetClass) {
      classInfo.inheritsFromO1jsSmartContract = true;
      return true;
    } else if (baseClassInfo) {
      const parentClassResult = checkClassInheritance(
        baseClassInfo.extends,
        targetClass,
        classesMap,
        visitedClasses,
        importMappings
      );
      /* istanbul ignore next */
      if (parentClassResult) {
        classInfo.inheritsFromO1jsSmartContract = true;
        return true;
      }
    }
  }

  return classInfo.inheritsFromO1jsSmartContract;
}
