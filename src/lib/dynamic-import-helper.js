// Helpers extracted to improve testability.

/**
 * Imports module dynamically.
 * @param {string} modulePath - Path to the module to import
 * @returns {Promise} - Promise that resolves to the module
 */
/* istanbul ignore next */
export async function dynamicImport(modulePath) {
  return import(modulePath);
}
