import {
  expect,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';

export class LandingPage {
  readonly url: URL;
  readonly page: Page;
  context: BrowserContext;
  readonly docsLink: Locator;
  readonly tutorialsLink: Locator;
  readonly questionsLink: Locator;
  readonly deployLink: Locator;

  constructor(url: URL, page: Page, context: BrowserContext) {
    this.url = url;
    this.page = page;
    this.context = context;
    this.docsLink = page.locator('a', { hasText: 'DOCS' });
    this.tutorialsLink = page.locator('a', { hasText: 'TUTORIALS' });
    this.questionsLink = page.locator('a', { hasText: 'QUESTIONS' });
    this.deployLink = page.locator('a', { hasText: 'DEPLOY' });
  }

  async goto(): Promise<void> {
    await this.page.bringToFront();
    await this.page.goto(this.url.toString());
  }

  async openDocsPage(): Promise<void> {
    const newPage = await this.openLinkInNewTab(this.docsLink);
    await this.checkPageTitle(newPage, 'zkApps Overview | Mina Documentation');
  }

  async openTutorialsPage(): Promise<void> {
    const newPage = await this.openLinkInNewTab(this.tutorialsLink);
    await this.checkPageTitle(
      newPage,
      'Tutorial 1: Hello World | Mina Documentation'
    );
  }

  async openQuestionsPage(): Promise<void> {
    const newPage = await this.openLinkInNewTab(this.questionsLink);
    await this.checkPageTitle(newPage, 'Discord');
  }

  async openDeployPage(): Promise<void> {
    const newPage = await this.openLinkInNewTab(this.deployLink);
    await this.checkPageTitle(
      newPage,
      'How to Deploy a zkApp | Mina Documentation'
    );
  }

  private async checkPageTitle(page: Page, expected: string): Promise<void> {
    const title = await page.title();
    expect(title).toContain(expected);
  }

  private async openLinkInNewTab(locator: Locator): Promise<Page> {
    await this.page.bringToFront();
    const pagePromise = this.context.waitForEvent('page');
    await locator.click();
    const newPage = await pagePromise;
    await newPage.waitForLoadState();
    return newPage;
  }
}
