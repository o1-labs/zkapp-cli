// Helpers extracted to improve testability.

/**
 * Delays the promise resolution mimicking the `sleep`.
 * @param {number} timeoutMs Timeout in milliseconds to delay the promise resolution for.
 */
/* istanbul ignore next */
export async function sleep(timeoutMs) {
  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
}
