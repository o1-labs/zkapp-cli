import type { BrowserContext } from '@playwright/test';

export async function closeBrowser(context: BrowserContext): Promise<void> {
  try {
    for (const page of context.pages()) {
      await page.close();
    }
    // await context.browser()?.close();
    // await context.close();
  } catch (e) {
    console.error(`Issue happened during browser cleanup: ${e}, skipping...`);
  }
}
