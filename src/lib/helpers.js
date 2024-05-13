import { parse as acornParse } from 'acorn';
import { simple as simpleAcornWalk } from 'acorn-walk';
import chalk from 'chalk';
import net from 'net';
import fs from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import ora from 'ora';

/**
 * Helper for any steps for a consistent UX.
 * @template T
 * @param {string} step  Name of step to show user.
 * @param {() => Promise<T>} fn  An async function to execute.
 * @returns {Promise<T>}
 */
async function step(str, fn) {
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
    process.exit(1);
  }
}

/**
 * Checks the Mina GraphQL endpoint availability.
 * @param {endpoint} The GraphQL endpoint to check.
 * @returns {Promise<boolean>} Whether the endpoint is available.
 */
export async function isMinaGraphQlEndpointAvailable(endpoint) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ syncStatus }' }),
    });
    return !!response.ok;
  } catch (_) {
    return false;
  }
}

/**
 * Checks if a single port is available.
 * @param {number} port The port number to check.
 * @returns {Promise<{port: number, busy: boolean}>} A promise that resolves with an object containing the port number and a boolean indicating if the port is busy.
 */
export async function checkLocalPortAvailability(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, '127.0.0.1');
    server.on('listening', () => {
      server.close();
      resolve({ port, busy: false });
    });
    server.on('error', () => {
      resolve({ port, busy: true });
    });
  });
}

/**
 * Checks multiple ports for availability and identifies any that are not.
 * @param {number[]} ports An array of port numbers to check.
 * @returns {Promise<{error: boolean, message: string}>} A promise that resolves with an object containing an error flag and a message indicating the result.
 */
export async function checkLocalPortsAvailability(ports) {
  const checks = ports.map((port) => checkLocalPortAvailability(port));
  const results = await Promise.all(checks);
  const busyPorts = results
    .filter((result) => result.busy)
    .map((result) => result.port);
  if (busyPorts.length > 0) {
    return {
      error: true,
      message:
        `The following local ports are required but unavailable at this time: ${busyPorts.join(', ')}`.trim() +
        '\nYou can close applications that use these ports and try again.',
    };
  } else {
    return { error: false };
  }
}

/**
 * Finds all classes that extend or implement the 'SmartContract' class.
 *
 * @param {string} entryFilePath - The path of the entry file.
 * @returns {Array<Object>} - An array of objects containing the class name and file path of the smart contract classes found.
 */
export function findIfClassExtendsOrImplementsSmartContract(entryFilePath) {
  const classesMap = buildClassHierarchy(entryFilePath);
  const importMappings = resolveImports(entryFilePath);
  const smartContractClasses = [];

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
 *
 * @param {string} filePath - The path to the file containing the class declarations.
 * @returns {Object} - The class hierarchy map, where keys are class names and values are objects containing class information.
 */
function buildClassHierarchy(filePath) {
  const source = fs.readFileSync(filePath, 'utf-8');
  const ast = acornParse(source, {
    ecmaVersion: 2020,
    sourceType: 'module',
    allowAwaitOutsideFunction: true,
  });
  const classesMap = {};

  simpleAcornWalk(ast, {
    ClassDeclaration(node) {
      const currentClass = node.id.name;
      const parentClass = node.superClass ? node.superClass.name : null;
      const implementedInterfaces = node.implements
        ? node.implements.map((iface) => iface.id.name)
        : [];
      classesMap[currentClass] = {
        extends: parentClass,
        implements: implementedInterfaces,
        filePath,
      };
    },
  });

  return classesMap;
}

/**
 * Resolves the imports in the given file path and returns the import mappings.
 *
 * @param {string} filePath - The path of the file to resolve imports for.
 * @returns {Object} - The import mappings where the keys are the local names and the values are the resolved paths.
 */
function resolveImports(filePath) {
  const source = fs.readFileSync(filePath, 'utf-8');
  const ast = acornParse(source, {
    ecmaVersion: 2020,
    sourceType: 'module',
    allowAwaitOutsideFunction: true,
  });
  const importMappings = {};

  simpleAcornWalk(ast, {
    ImportDeclaration(node) {
      const sourcePath = node.source.value;
      node.specifiers.forEach((specifier) => {
        const resolvedPath = resolveModulePath(
          sourcePath,
          path.dirname(filePath)
        );
        importMappings[specifier.local.name] = resolvedPath;
      });
    },
  });

  return importMappings;
}

/**
 * Resolves the path of a module based on the provided module name and base path.
 *
 * @param {string} moduleName - The name of the module to resolve.
 * @param {string} basePath - The base path to resolve the module path relative to.
 * @returns {string|null} - The resolved module path, or null if the module is not found or is a built-in module.
 */
function resolveModulePath(moduleName, basePath) {
  // Check if the module is a Node.js built-in module
  if (builtinModules.includes(moduleName)) {
    return null;
  }

  if (path.isAbsolute(moduleName) || moduleName.startsWith('.')) {
    // Resolve relative or absolute paths based on the current file's directory
    return path.resolve(basePath, moduleName);
  } else {
    // Module is a node_modules dependency
    let packagePath = path.join('node_modules', moduleName);
    let packageJsonPath = path.join(packagePath, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      // Try to resolve the main file using the package.json
      let mainFile = packageJson.main;
      // If main is not available, try packageJson.exports.node.import
      if (
        !mainFile &&
        packageJson.exports &&
        packageJson.exports.node &&
        packageJson.exports.node.import
      ) {
        mainFile = packageJson.exports.node.import;
      }
      // Fallback to 'index.js' if none of the above are specified
      mainFile = mainFile || 'index.js';

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
 *
 * @param {string} className - The name of the class to check.
 * @param {string} targetClass - The name of the target class to check inheritance against.
 * @param {Object} classesMap - A map of class names to class information.
 * @param {Set} visitedClasses - A set of visited class names to avoid infinite loops.
 * @param {Object} importMappings - A map of class names to resolved file paths.
 * @returns {boolean} - Returns true if the class inherits from the target class, false otherwise.
 */
function checkClassInheritance(
  className,
  targetClass,
  classesMap,
  visitedClasses,
  importMappings
) {
  if (visitedClasses.has(className)) return false;
  visitedClasses.add(className);

  if (!classesMap[className]) {
    let resolvedPath = importMappings[className];
    if (!resolvedPath) return false;

    Object.assign(classesMap, buildClassHierarchy(resolvedPath));
  }

  const classInfo = classesMap[className];
  if (!classInfo) return false;
  // Check if the class extends the target
  if (classInfo.extends === targetClass) return true;
  // Check each implemented interface
  for (const iface of classInfo.implements) {
    if (
      iface === targetClass ||
      checkClassInheritance(
        iface,
        targetClass,
        classesMap,
        visitedClasses,
        importMappings
      )
    ) {
      return true;
    }
  }
  if (!classInfo.extends) return false;

  return checkClassInheritance(
    classInfo.extends,
    targetClass,
    classesMap,
    visitedClasses,
    importMappings
  );
}

export default step;
