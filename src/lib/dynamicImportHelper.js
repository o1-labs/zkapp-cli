/**
 * Dynamic import helper extracted to improve testability.
 * @param {string} modulePath - Path to the module to import
 * @returns {Promise} - Promise that resolves to the module
 */
/* istanbul ignore next */
export async function dynamicImport(modulePath) {
  return import(modulePath);
}
