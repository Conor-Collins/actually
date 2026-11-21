import type { Locator, Page } from '@playwright/test';

import { MobileAccountPage } from './mobile-account-page';
import { MobileAccountsPage } from './mobile-accounts-page';
import { MobileBankSyncPage } from './mobile-bank-sync-page';
import { MobileBudgetPage } from './mobile-budget-page';
import { MobilePayeesPage } from './mobile-payees-page';
import { MobileReportsPage } from './mobile-reports-page';
import { MobileRulesPage } from './mobile-rules-page';
import { MobileSchedulesPage } from './mobile-schedules-page';
import { MobileTransactionEntryPage } from './mobile-transaction-entry-page';
import { SettingsPage } from './settings-page';

const ROUTES_BY_PAGE = {
  Accounts: '/accounts',
  Transactions: '/accounts/all',
  Budget: '/budget',
  Schedules: '/schedules',
  Reports: '/reports',
  Settings: '/settings',
};

export class MobileNavigation {
  readonly page: Page;
  readonly heading: Locator;
  readonly navbar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading');
    this.navbar = page.locator('[data-navbar-state="default"]');
  }

  async navigateToPage<T extends { waitFor: Locator['waitFor'] }>(
    pageName: Exclude<keyof typeof ROUTES_BY_PAGE, 'Settings'>,
    pageModelFactory: () => T,
  ): Promise<T> {
    const pageInstance = pageModelFactory();

    if (new URL(this.page.url()).pathname !== ROUTES_BY_PAGE[pageName]) {
      await this.navbar
        .getByRole('link', { name: pageName, exact: true })
        .click();
    }

    await pageInstance.waitFor();
    return pageInstance;
  }

  async goToBudgetPage() {
    return await this.navigateToPage(
      'Budget',
      () => new MobileBudgetPage(this.page),
    );
  }

  async goToAccountsPage() {
    return await this.navigateToPage(
      'Accounts',
      () => new MobileAccountsPage(this.page),
    );
  }

  async goToUncategorizedPage() {
    await this.goToBudgetPage();
    const button = this.page.getByRole('button', { name: 'Categorize' });
    await button.click();

    return new MobileAccountPage(this.page);
  }

  async goToTransactionsPage() {
    return this.navigateToPage(
      'Transactions',
      () => new MobileAccountPage(this.page),
    );
  }

  async goToTransactionEntryPage() {
    const entry = new MobileTransactionEntryPage(this.page);

    if (new URL(this.page.url()).pathname !== '/transactions/new') {
      const addTransaction = this.page.getByRole('button', {
        name: 'Add transaction',
        exact: true,
      });
      if (!(await addTransaction.isVisible())) {
        await this.goToTransactionsPage();
      }
      await addTransaction.click();
    }

    await entry.waitFor();
    return entry;
  }

  async goToReportsPage() {
    return await this.navigateToPage(
      'Reports',
      () => new MobileReportsPage(this.page),
    );
  }

  async goToPayeesPage() {
    const settingsPage = await this.goToSettingsPage();
    await settingsPage.goToSection('Payees');

    const payeesPage = new MobilePayeesPage(this.page);
    await payeesPage.waitFor();
    return payeesPage;
  }

  async goToSchedulesPage() {
    return this.navigateToPage(
      'Schedules',
      () => new MobileSchedulesPage(this.page),
    );
  }

  async goToRulesPage() {
    const settingsPage = await this.goToSettingsPage();
    await settingsPage.goToSection('Rules');

    const rulesPage = new MobileRulesPage(this.page);
    await rulesPage.waitFor();
    return rulesPage;
  }

  async goToBankSyncPage() {
    const settingsPage = await this.goToSettingsPage();
    await settingsPage.goToSection('Bank Sync');

    const bankSyncPage = new MobileBankSyncPage(this.page);
    await bankSyncPage.waitFor();
    return bankSyncPage;
  }

  async goToSettingsPage() {
    const settings = new SettingsPage(this.page);

    if (new URL(this.page.url()).pathname !== ROUTES_BY_PAGE.Settings) {
      const button = this.page.getByRole('button', {
        name: 'Settings',
        exact: true,
      });
      if (!(await button.isVisible())) {
        await this.goToBudgetPage();
      }
      await button.click();
    }

    await settings.waitFor();
    return settings;
  }
}
