// Helpers extracted to improve testability.

/**
 * Delays the promise resolution mimicking the `sleep`
 * @param {timeoutMs} Timeout in milliseconds to delay promise resolution.
 */
/* istanbul ignore next */
export async function sleep(timeoutMs) {
  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
}
