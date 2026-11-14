---
id: TASK-1
title: Merge upstream Actual v26.11.0 into main
status: Done
assignee: []
created_date: '2026-11-13T16:07:00Z'
updated_date: '2026-11-14T03:08:00Z'
labels:
  - base
  - upstream
dependencies:
  - TASK-14
modified_files:
  - .coderabbit.yaml
  - .github/actions/release-notes/check/action.yml
  - .github/actions/release-notes/generate/action.yml
  - .github/actions/setup/action.yml
  - .github/workflows/electron-master.yml
  - .github/workflows/electron-pr.yml
  - .github/workflows/issues-feature-implemented.yml
  - .github/workflows/publish-nightly-electron.yml
  - .github/workflows/stale.yml
  - .nvmrc
  - .oxlintrc.json
  - .yarn/plugins/strip-publish-config.cjs
  - .yarnrc.yml
  - AGENTS.md
  - DESIGN.md
  - README.md
  - package.json
  - packages/api/index.browser.ts
  - packages/api/index.ts
  - packages/api/methods.test.ts
  - packages/api/methods.ts
  - packages/api/package.json
  - packages/api/session.test.ts
  - packages/api/vite.config.mts
  - packages/ci-actions/package.json
  - packages/ci-actions/src/release-notes/util.mjs
  - packages/cli/package.json
  - packages/cli/src/lock.test.ts
  - packages/cli/src/output.test.ts
  - packages/cli/src/output.ts
  - packages/component-library/package.json
  - packages/component-library/src/Button.stories.tsx
  - packages/component-library/src/Button.tsx
  - packages/component-library/src/ComponentSize.web.test.tsx
  - packages/component-library/src/Input.stories.tsx
  - packages/component-library/src/Input.tsx
  - packages/component-library/src/Text.stories.tsx
  - packages/component-library/src/Text.tsx
  - packages/component-library/src/Toggle.tsx
  - packages/component-library/src/styles.ts
  - packages/component-library/src/theme.ts
  - packages/component-library/src/themes/dark.css
  - packages/component-library/src/themes/light.css
  - packages/component-library/src/themes/midnight.css
  - packages/component-library/src/tokens.ts
  - packages/crdt/package.json
  - packages/desktop-client/e2e/accounts.mobile.test.ts
  - >-
    packages/desktop-client/e2e/accounts.mobile.test.ts-snapshots/Mobile-Accounts-opens-individual-account-page-and-checks-that-filtering-is-working-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.mobile.test.ts-snapshots/Mobile-Accounts-opens-individual-account-page-and-checks-that-filtering-is-working-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.mobile.test.ts-snapshots/Mobile-Accounts-opens-individual-account-page-and-checks-that-filtering-is-working-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.mobile.test.ts-snapshots/Mobile-Accounts-opens-individual-account-page-and-checks-that-filtering-is-working-4-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.mobile.test.ts-snapshots/Mobile-Accounts-opens-individual-account-page-and-checks-that-filtering-is-working-5-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.mobile.test.ts-snapshots/Mobile-Accounts-opens-individual-account-page-and-checks-that-filtering-is-working-6-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.mobile.test.ts-snapshots/Mobile-Accounts-opens-individual-account-page-and-checks-that-filtering-is-working-7-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.mobile.test.ts-snapshots/Mobile-Accounts-opens-individual-account-page-and-checks-that-filtering-is-working-8-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.mobile.test.ts-snapshots/Mobile-Accounts-opens-individual-account-page-and-checks-that-filtering-is-working-9-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.mobile.test.ts-snapshots/Mobile-Accounts-reconciles-an-account-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.mobile.test.ts-snapshots/Mobile-Accounts-reconciles-an-account-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.mobile.test.ts-snapshots/Mobile-Accounts-reconciles-an-account-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.mobile.test.ts-snapshots/Mobile-Accounts-reconciles-an-account-4-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.mobile.test.ts-snapshots/Mobile-Accounts-reconciles-an-account-5-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.mobile.test.ts-snapshots/Mobile-Accounts-reconciles-an-account-6-chromium-linux.png
  - packages/desktop-client/e2e/accounts.test.ts
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-Import-Transactions-import-csv-file-twice-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-Import-Transactions-import-csv-file-twice-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-Import-Transactions-import-csv-file-twice-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-Import-Transactions-imports-transactions-from-a-CSV-file-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-Import-Transactions-imports-transactions-from-a-CSV-file-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-Import-Transactions-imports-transactions-from-a-CSV-file-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-account-register-widens-amount-columns-for-large-balances-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-account-register-widens-amount-columns-for-large-balances-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-account-register-widens-amount-columns-for-large-balances-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-closes-an-account-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-closes-an-account-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-closes-an-account-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-closes-an-account-4-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-closes-an-account-5-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-closes-an-account-6-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-creates-a-new-account-and-views-the-initial-balance-transaction-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-creates-a-new-account-and-views-the-initial-balance-transaction-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/accounts.test.ts-snapshots/Accounts-creates-a-new-account-and-views-the-initial-balance-transaction-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/bank-sync.mobile.test.ts-snapshots/Mobile-Bank-Sync-checks-the-page-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/bank-sync.mobile.test.ts-snapshots/Mobile-Bank-Sync-checks-the-page-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/bank-sync.mobile.test.ts-snapshots/Mobile-Bank-Sync-checks-the-page-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/bank-sync.mobile.test.ts-snapshots/Mobile-Bank-Sync-page-handles-empty-state-gracefully-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/bank-sync.mobile.test.ts-snapshots/Mobile-Bank-Sync-page-handles-empty-state-gracefully-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/bank-sync.mobile.test.ts-snapshots/Mobile-Bank-Sync-page-handles-empty-state-gracefully-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/bank-sync.mobile.test.ts-snapshots/Mobile-Bank-Sync-searches-for-accounts-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/bank-sync.mobile.test.ts-snapshots/Mobile-Bank-Sync-searches-for-accounts-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/bank-sync.mobile.test.ts-snapshots/Mobile-Bank-Sync-searches-for-accounts-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/bank-sync.test.ts-snapshots/Bank-Sync-checks-the-page-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/bank-sync.test.ts-snapshots/Bank-Sync-checks-the-page-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/bank-sync.test.ts-snapshots/Bank-Sync-checks-the-page-visuals-3-chromium-linux.png
  - packages/desktop-client/e2e/budget.mobile.test.ts
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking--14404-in-the-page-header-opens-the-month-menu-modal-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking--321fd-ed-amount-opens-the-budget-summary-menu-modal-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking--4bb70-ed-amount-opens-the-budget-summary-menu-modal-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking--6ab37-roup-name-opens-the-category-group-menu-modal-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking--94a79-roup-name-opens-the-category-group-menu-modal-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking--94a85-ed-amount-opens-the-budget-summary-menu-modal-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking--9e6aa-in-the-page-header-opens-the-budget-page-menu-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking--bbde3-roup-name-opens-the-category-group-menu-modal-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking--bed18-in-the-page-header-opens-the-month-menu-modal-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking--ceb3a-in-the-page-header-opens-the-month-menu-modal-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking--d270d-in-the-page-header-opens-the-budget-page-menu-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking--fdd57-in-the-page-header-opens-the-budget-page-menu-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking-the-balance-cell-opens-the-balance-menu-modal-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking-the-balance-cell-opens-the-balance-menu-modal-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking-the-balance-cell-opens-the-balance-menu-modal-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking-the-budgeted-cell-opens-the-budget-menu-modal-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking-the-budgeted-cell-opens-the-budget-menu-modal-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking-the-budgeted-cell-opens-the-budget-menu-modal-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking-the-category-name-opens-the-category-menu-modal-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking-the-category-name-opens-the-category-menu-modal-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-checks-that-clicking-the-category-name-opens-the-category-menu-modal-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-updates-the-budgeted-amount-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-updates-the-budgeted-amount-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Envelope-updates-the-budgeted-amount-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking--0ba04-nt-amount-opens-the-budget-summary-menu-modal-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking--1ce6d-nt-amount-opens-the-budget-summary-menu-modal-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking--42062-in-the-page-header-opens-the-month-menu-modal-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking--49fb6-in-the-page-header-opens-the-month-menu-modal-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking--5f098-roup-name-opens-the-category-group-menu-modal-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking--929be-roup-name-opens-the-category-group-menu-modal-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking--a3783-in-the-page-header-opens-the-budget-page-menu-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking--a8b5e-in-the-page-header-opens-the-budget-page-menu-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking--b1562-in-the-page-header-opens-the-month-menu-modal-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking--dc927-roup-name-opens-the-category-group-menu-modal-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking--f224f-nt-amount-opens-the-budget-summary-menu-modal-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking--f8a19-in-the-page-header-opens-the-budget-page-menu-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking-the-balance-cell-opens-the-balance-menu-modal-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking-the-balance-cell-opens-the-balance-menu-modal-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking-the-balance-cell-opens-the-balance-menu-modal-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking-the-budgeted-cell-opens-the-budget-menu-modal-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking-the-budgeted-cell-opens-the-budget-menu-modal-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking-the-budgeted-cell-opens-the-budget-menu-modal-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking-the-category-name-opens-the-category-menu-modal-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking-the-category-name-opens-the-category-menu-modal-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-checks-that-clicking-the-category-name-opens-the-category-menu-modal-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-updates-the-budgeted-amount-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-updates-the-budgeted-amount-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.mobile.test.ts-snapshots/Mobile-Budget-Tracking-updates-the-budgeted-amount-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.test.ts-snapshots/Budget-renders-the-summary-information-available-funds-overspent-budgeted-and-for-next-month-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.test.ts-snapshots/Budget-renders-the-summary-information-available-funds-overspent-budgeted-and-for-next-month-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.test.ts-snapshots/Budget-renders-the-summary-information-available-funds-overspent-budgeted-and-for-next-month-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.test.ts-snapshots/Budget-transfer-funds-to-another-category-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.test.ts-snapshots/Budget-transfer-funds-to-another-category-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/budget.test.ts-snapshots/Budget-transfer-funds-to-another-category-3-chromium-linux.png
  - packages/desktop-client/e2e/calculator.mobile.test.ts
  - >-
    packages/desktop-client/e2e/command-bar.test.ts-snapshots/Command-bar-Check-the-command-bar-search-works-correctly-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/command-bar.test.ts-snapshots/Command-bar-Check-the-command-bar-search-works-correctly-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/command-bar.test.ts-snapshots/Command-bar-Check-the-command-bar-search-works-correctly-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/command-bar.test.ts-snapshots/Command-bar-Check-the-command-bar-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/command-bar.test.ts-snapshots/Command-bar-Check-the-command-bar-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/command-bar.test.ts-snapshots/Command-bar-Check-the-command-bar-visuals-3-chromium-linux.png
  - packages/desktop-client/e2e/data/qif-categories.qif
  - packages/desktop-client/e2e/fixtures.ts
  - >-
    packages/desktop-client/e2e/help-menu.test.ts-snapshots/Help-menu-Check-the-help-menu-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/help-menu.test.ts-snapshots/Help-menu-Check-the-help-menu-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/help-menu.test.ts-snapshots/Help-menu-Check-the-help-menu-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/help-menu.test.ts-snapshots/Help-menu-Check-the-keyboard-shortcuts-modal-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/help-menu.test.ts-snapshots/Help-menu-Check-the-keyboard-shortcuts-modal-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/help-menu.test.ts-snapshots/Help-menu-Check-the-keyboard-shortcuts-modal-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/help-menu.test.ts-snapshots/Help-menu-Check-the-keyboard-shortcuts-modal-visuals-4-chromium-linux.png
  - >-
    packages/desktop-client/e2e/help-menu.test.ts-snapshots/Help-menu-Check-the-keyboard-shortcuts-modal-visuals-5-chromium-linux.png
  - >-
    packages/desktop-client/e2e/help-menu.test.ts-snapshots/Help-menu-Check-the-keyboard-shortcuts-modal-visuals-6-chromium-linux.png
  - >-
    packages/desktop-client/e2e/help-menu.test.ts-snapshots/Help-menu-Check-the-keyboard-shortcuts-modal-visuals-7-chromium-linux.png
  - >-
    packages/desktop-client/e2e/help-menu.test.ts-snapshots/Help-menu-Check-the-keyboard-shortcuts-modal-visuals-8-chromium-linux.png
  - >-
    packages/desktop-client/e2e/help-menu.test.ts-snapshots/Help-menu-Check-the-keyboard-shortcuts-modal-visuals-9-chromium-linux.png
  - packages/desktop-client/e2e/multitab.test.ts
  - packages/desktop-client/e2e/page-models/mobile-account-page.ts
  - packages/desktop-client/e2e/page-models/mobile-balance-menu-modal.ts
  - packages/desktop-client/e2e/page-models/mobile-budget-menu-modal.ts
  - packages/desktop-client/e2e/page-models/mobile-budget-page.ts
  - packages/desktop-client/e2e/page-models/mobile-category-group-menu-modal.ts
  - packages/desktop-client/e2e/page-models/mobile-category-menu-modal.ts
  - >-
    packages/desktop-client/e2e/page-models/mobile-envelope-budget-summary-modal.ts
  - packages/desktop-client/e2e/page-models/mobile-navigation.ts
  - >-
    packages/desktop-client/e2e/page-models/mobile-tracking-budget-summary-modal.ts
  - packages/desktop-client/e2e/page-models/navigation.ts
  - packages/desktop-client/e2e/page-models/reports-page.ts
  - packages/desktop-client/e2e/page-models/settings-page.ts
  - >-
    packages/desktop-client/e2e/payees.mobile.test.ts-snapshots/Mobile-Payees-checks-the-page-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.mobile.test.ts-snapshots/Mobile-Payees-checks-the-page-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.mobile.test.ts-snapshots/Mobile-Payees-checks-the-page-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.mobile.test.ts-snapshots/Mobile-Payees-filters-out-unrelated-payees-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.mobile.test.ts-snapshots/Mobile-Payees-filters-out-unrelated-payees-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.mobile.test.ts-snapshots/Mobile-Payees-filters-out-unrelated-payees-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.mobile.test.ts-snapshots/Mobile-Payees-page-handles-empty-state-gracefully-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.mobile.test.ts-snapshots/Mobile-Payees-page-handles-empty-state-gracefully-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.mobile.test.ts-snapshots/Mobile-Payees-page-handles-empty-state-gracefully-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.mobile.test.ts-snapshots/Mobile-Payees-search-functionality-works-correctly-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.mobile.test.ts-snapshots/Mobile-Payees-search-functionality-works-correctly-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.mobile.test.ts-snapshots/Mobile-Payees-search-functionality-works-correctly-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.mobile.test.ts-snapshots/Mobile-Payees-search-functionality-works-correctly-4-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.mobile.test.ts-snapshots/Mobile-Payees-search-functionality-works-correctly-5-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.mobile.test.ts-snapshots/Mobile-Payees-search-functionality-works-correctly-6-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.test.ts-snapshots/Payees-checks-the-payees-page-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.test.ts-snapshots/Payees-checks-the-payees-page-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.test.ts-snapshots/Payees-checks-the-payees-page-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.test.ts-snapshots/Payees-checks-the-payees-page-visuals-4-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.test.ts-snapshots/Payees-checks-the-payees-page-visuals-5-chromium-linux.png
  - >-
    packages/desktop-client/e2e/payees.test.ts-snapshots/Payees-checks-the-payees-page-visuals-6-chromium-linux.png
  - packages/desktop-client/e2e/reports.mobile.test.ts
  - packages/desktop-client/e2e/reports.test.ts
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-loads-balance-forecast-report-with-monthly-granularity-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-loads-balance-forecast-report-with-monthly-granularity-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-loads-balance-forecast-report-with-monthly-granularity-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-loads-tracking-budget-forecast-report-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-loads-tracking-budget-forecast-report-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-loads-tracking-budget-forecast-report-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-switches-to-Auto-Y-Axis-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-switches-to-Auto-Y-Axis-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-switches-to-Auto-Y-Axis-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-switches-to-Zero-Based-Y-Axis-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-switches-to-Zero-Based-Y-Axis-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-switches-to-Zero-Based-Y-Axis-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-switches-to-daily-granularity-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-switches-to-daily-granularity-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-switches-to-daily-granularity-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-switches-to-daily-granularity-and-Zero-Based-Y-Axis-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-switches-to-daily-granularity-and-Zero-Based-Y-Axis-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-switches-to-daily-granularity-and-Zero-Based-Y-Axis-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-switches-to-daily-granularity-and-auto-Y-Axis-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-switches-to-daily-granularity-and-auto-Y-Axis-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-balance-forecast-switches-to-daily-granularity-and-auto-Y-Axis-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Switches-to-Area-Graph-and-checks-the-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Switches-to-Area-Graph-and-checks-the-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Switches-to-Area-Graph-and-checks-the-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Switches-to-Bar-Graph-and-checks-the-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Switches-to-Bar-Graph-and-checks-the-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Switches-to-Bar-Graph-and-checks-the-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Switches-to-Data-Table-and-checks-the-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Switches-to-Data-Table-and-checks-the-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Switches-to-Data-Table-and-checks-the-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Switches-to-Donut-Graph-and-checks-the-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Switches-to-Donut-Graph-and-checks-the-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Switches-to-Donut-Graph-and-checks-the-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Switches-to-Line-Graph-and-checks-the-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Switches-to-Line-Graph-and-checks-the-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Switches-to-Line-Graph-and-checks-the-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Validates-that-show-labels-button-shows-the-labels-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Validates-that-show-labels-button-shows-the-labels-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Validates-that-show-labels-button-shows-the-labels-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Validates-that-show-legend-button-shows-the-legend-side-bar-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Validates-that-show-legend-button-shows-the-legend-side-bar-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Validates-that-show-legend-button-shows-the-legend-side-bar-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Validates-that-show-summary-button-shows-the-summary-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Validates-that-show-summary-button-shows-the-summary-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-Validates-that-show-summary-button-shows-the-summary-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-splits-transactions-into-exact-tag-buckets-and-scopes-them-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-splits-transactions-into-exact-tag-buckets-and-scopes-them-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-splits-transactions-into-exact-tag-buckets-and-scopes-them-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-splits-transactions-into-exact-tag-buckets-and-scopes-them-4-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-splits-transactions-into-exact-tag-buckets-and-scopes-them-5-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-custom-reports-splits-transactions-into-exact-tag-buckets-and-scopes-them-6-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-loads-cash-flow-graph-and-checks-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-loads-cash-flow-graph-and-checks-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-loads-cash-flow-graph-and-checks-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-loads-net-worth-and-cash-flow-reports-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-loads-net-worth-and-cash-flow-reports-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-loads-net-worth-and-cash-flow-reports-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-loads-net-worth-graph-and-checks-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-loads-net-worth-graph-and-checks-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-loads-net-worth-graph-and-checks-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-resizes-number-cards-with-the-viewport-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-resizes-number-cards-with-the-viewport-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-resizes-number-cards-with-the-viewport-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-resizes-number-cards-with-the-viewport-4-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-resizes-number-cards-with-the-viewport-5-chromium-linux.png
  - >-
    packages/desktop-client/e2e/reports.test.ts-snapshots/Reports-resizes-number-cards-with-the-viewport-6-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.mobile.test.ts-snapshots/Mobile-Rules-checks-the-page-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.mobile.test.ts-snapshots/Mobile-Rules-checks-the-page-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.mobile.test.ts-snapshots/Mobile-Rules-checks-the-page-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.mobile.test.ts-snapshots/Mobile-Rules-page-handles-empty-state-gracefully-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.mobile.test.ts-snapshots/Mobile-Rules-page-handles-empty-state-gracefully-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.mobile.test.ts-snapshots/Mobile-Rules-page-handles-empty-state-gracefully-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.test.ts-snapshots/Rules-checks-the-page-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.test.ts-snapshots/Rules-checks-the-page-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.test.ts-snapshots/Rules-checks-the-page-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.test.ts-snapshots/Rules-creates-a-rule-and-makes-sure-it-is-applied-when-creating-a-transaction-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.test.ts-snapshots/Rules-creates-a-rule-and-makes-sure-it-is-applied-when-creating-a-transaction-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.test.ts-snapshots/Rules-creates-a-rule-and-makes-sure-it-is-applied-when-creating-a-transaction-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.test.ts-snapshots/Rules-creates-a-rule-and-makes-sure-it-is-applied-when-creating-a-transaction-4-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.test.ts-snapshots/Rules-creates-a-rule-and-makes-sure-it-is-applied-when-creating-a-transaction-5-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.test.ts-snapshots/Rules-creates-a-rule-and-makes-sure-it-is-applied-when-creating-a-transaction-6-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.test.ts-snapshots/Rules-creates-a-split-transaction-rule-and-makes-sure-it-is-applied-when-creating-a-transaction-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.test.ts-snapshots/Rules-creates-a-split-transaction-rule-and-makes-sure-it-is-applied-when-creating-a-transaction-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/rules.test.ts-snapshots/Rules-creates-a-split-transaction-rule-and-makes-sure-it-is-applied-when-creating-a-transaction-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.mobile.test.ts-snapshots/Mobile-Schedules-checks-the-page-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.mobile.test.ts-snapshots/Mobile-Schedules-checks-the-page-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.mobile.test.ts-snapshots/Mobile-Schedules-checks-the-page-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.mobile.test.ts-snapshots/Mobile-Schedules-displays-schedule-details-correctly-in-list-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.mobile.test.ts-snapshots/Mobile-Schedules-displays-schedule-details-correctly-in-list-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.mobile.test.ts-snapshots/Mobile-Schedules-displays-schedule-details-correctly-in-list-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.mobile.test.ts-snapshots/Mobile-Schedules-searches-and-filters-schedules-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.mobile.test.ts-snapshots/Mobile-Schedules-searches-and-filters-schedules-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.mobile.test.ts-snapshots/Mobile-Schedules-searches-and-filters-schedules-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.mobile.test.ts-snapshots/Mobile-Schedules-searches-and-filters-schedules-4-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.mobile.test.ts-snapshots/Mobile-Schedules-searches-and-filters-schedules-5-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.mobile.test.ts-snapshots/Mobile-Schedules-searches-and-filters-schedules-6-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-checks-the-page-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-checks-the-page-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-checks-the-page-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-a-full-list-of-schedules-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-a-full-list-of-schedules-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-a-full-list-of-schedules-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-a-new-schedule-posts-the-transaction-and-later-completes-it-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-a-new-schedule-posts-the-transaction-and-later-completes-it-10-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-a-new-schedule-posts-the-transaction-and-later-completes-it-11-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-a-new-schedule-posts-the-transaction-and-later-completes-it-12-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-a-new-schedule-posts-the-transaction-and-later-completes-it-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-a-new-schedule-posts-the-transaction-and-later-completes-it-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-a-new-schedule-posts-the-transaction-and-later-completes-it-4-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-a-new-schedule-posts-the-transaction-and-later-completes-it-5-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-a-new-schedule-posts-the-transaction-and-later-completes-it-6-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-a-new-schedule-posts-the-transaction-and-later-completes-it-7-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-a-new-schedule-posts-the-transaction-and-later-completes-it-8-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-a-new-schedule-posts-the-transaction-and-later-completes-it-9-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-10-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-11-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-12-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-13-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-14-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-15-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-16-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-17-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-18-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-4-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-5-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-6-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-7-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-8-chromium-linux.png
  - >-
    packages/desktop-client/e2e/schedules.test.ts-snapshots/Schedules-creates-two-new-schedules-posts-both-transactions-and-later-completes-one-9-chromium-linux.png
  - >-
    packages/desktop-client/e2e/settings.mobile.test.ts-snapshots/Mobile-Settings-checks-that-settings-page-can-be-opened-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/settings.mobile.test.ts-snapshots/Mobile-Settings-checks-that-settings-page-can-be-opened-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/settings.mobile.test.ts-snapshots/Mobile-Settings-checks-that-settings-page-can-be-opened-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/settings.mobile.test.ts-snapshots/Mobile-Settings-checks-that-settings-page-can-be-opened-4-chromium-linux.png
  - >-
    packages/desktop-client/e2e/settings.mobile.test.ts-snapshots/Mobile-Settings-checks-that-settings-page-can-be-opened-5-chromium-linux.png
  - >-
    packages/desktop-client/e2e/settings.mobile.test.ts-snapshots/Mobile-Settings-checks-that-settings-page-can-be-opened-6-chromium-linux.png
  - packages/desktop-client/e2e/settings.test.ts
  - >-
    packages/desktop-client/e2e/settings.test.ts-snapshots/Settings-checks-the-page-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/settings.test.ts-snapshots/Settings-checks-the-page-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/settings.test.ts-snapshots/Settings-checks-the-page-visuals-3-chromium-linux.png
  - packages/desktop-client/e2e/transactions.mobile.test.ts
  - packages/desktop-client/e2e/transactions.test.ts
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-checks-the-page-visuals-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-checks-the-page-visuals-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-checks-the-page-visuals-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-column-manager-hides-and-reorders-columns-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-column-manager-hides-and-reorders-columns-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-column-manager-hides-and-reorders-columns-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-column-manager-hides-and-reorders-columns-4-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-column-manager-hides-and-reorders-columns-5-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-column-manager-hides-and-reorders-columns-6-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-creates-a-split-test-transaction-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-creates-a-split-test-transaction-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-creates-a-split-test-transaction-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-creates-a-test-transaction-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-creates-a-test-transaction-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-creates-a-test-transaction-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-creates-a-transfer-test-transaction-1-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-creates-a-transfer-test-transaction-2-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-creates-a-transfer-test-transaction-3-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-creates-a-transfer-test-transaction-4-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-creates-a-transfer-test-transaction-5-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-creates-a-transfer-test-transaction-6-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-filters-transactions-by-category-10-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-filters-transactions-by-category-11-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-filters-transactions-by-category-12-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-filters-transactions-by-category-group-10-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-filters-transactions-by-category-group-11-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-filters-transactions-by-category-group-12-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-filters-transactions-by-date-7-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-filters-transactions-by-date-8-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-filters-transactions-by-date-9-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-filters-transactions-by-payee-7-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-filters-transactions-by-payee-8-chromium-linux.png
  - >-
    packages/desktop-client/e2e/transactions.test.ts-snapshots/Transactions-filters-transactions-by-payee-9-chromium-linux.png
  - packages/desktop-client/package.json
  - packages/desktop-client/src/accounts/syncStatus.test.ts
  - packages/desktop-client/src/accounts/syncStatus.ts
  - packages/desktop-client/src/browser-preload.js
  - packages/desktop-client/src/budget/mutations.ts
  - packages/desktop-client/src/budgetfiles/budgetfilesSlice.ts
  - packages/desktop-client/src/components/App.tsx
  - packages/desktop-client/src/components/CommandBar.tsx
  - packages/desktop-client/src/components/FinancesApp.tsx
  - packages/desktop-client/src/components/FixedSizeList.tsx
  - packages/desktop-client/src/components/HelpMenu.tsx
  - packages/desktop-client/src/components/ManageRulesPage.tsx
  - packages/desktop-client/src/components/Modals.tsx
  - packages/desktop-client/src/components/Page.tsx
  - packages/desktop-client/src/components/StartPageRedirect.tsx
  - packages/desktop-client/src/components/UpdateNotification.tsx
  - packages/desktop-client/src/components/accounts/Account.tsx
  - packages/desktop-client/src/components/accounts/AccountSyncCheck.test.tsx
  - packages/desktop-client/src/components/accounts/AccountSyncCheck.tsx
  - packages/desktop-client/src/components/accounts/Header.tsx
  - packages/desktop-client/src/components/autocomplete/Autocomplete.tsx
  - >-
    packages/desktop-client/src/components/autocomplete/PayeeAutocomplete.test.tsx
  - >-
    packages/desktop-client/src/components/autocomplete/TagMultiAutocomplete.test.tsx
  - packages/desktop-client/src/components/autocomplete/TagMultiAutocomplete.tsx
  - >-
    packages/desktop-client/src/components/banksync/AutomaticSyncSettings.test.tsx
  - packages/desktop-client/src/components/banksync/AutomaticSyncSettings.tsx
  - packages/desktop-client/src/components/banksync/BankSyncCheckboxOptions.tsx
  - packages/desktop-client/src/components/banksync/BuiltInProviders.tsx
  - packages/desktop-client/src/components/banksync/EditSyncAccount.tsx
  - packages/desktop-client/src/components/banksync/FieldMapping.tsx
  - packages/desktop-client/src/components/banksync/bankSyncErrors.test.ts
  - packages/desktop-client/src/components/banksync/bankSyncErrors.ts
  - packages/desktop-client/src/components/banksync/bankSyncInterval.test.ts
  - packages/desktop-client/src/components/banksync/bankSyncInterval.ts
  - packages/desktop-client/src/components/banksync/index.tsx
  - >-
    packages/desktop-client/src/components/banksync/useBuiltInBankSyncProviders.ts
  - packages/desktop-client/src/components/budget/BalanceWithCarryover.tsx
  - packages/desktop-client/src/components/budget/BudgetCategories.tsx
  - packages/desktop-client/src/components/budget/CategoryDeleteMessage.tsx
  - packages/desktop-client/src/components/budget/GoalStatus.tsx
  - packages/desktop-client/src/components/budget/envelope/BalanceMenu.tsx
  - >-
    packages/desktop-client/src/components/budget/envelope/BalanceMovementMenu.test.tsx
  - >-
    packages/desktop-client/src/components/budget/envelope/BalanceMovementMenu.tsx
  - packages/desktop-client/src/components/budget/envelope/BudgetMenu.tsx
  - >-
    packages/desktop-client/src/components/budget/envelope/EnvelopeBudgetComponents.tsx
  - >-
    packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetMonthMenu.tsx
  - >-
    packages/desktop-client/src/components/budget/envelope/budgetsummary/ToBudgetAmount.tsx
  - >-
    packages/desktop-client/src/components/budget/envelope/budgetsummary/ToBudgetMenu.tsx
  - >-
    packages/desktop-client/src/components/budget/goals/editor/BySaveAutomation.tsx
  - >-
    packages/desktop-client/src/components/budget/goals/editor/CleanupAutomation.tsx
  - >-
    packages/desktop-client/src/components/budget/goals/editor/FixedAutomation.tsx
  - >-
    packages/desktop-client/src/components/budget/goals/editor/HistoricalAutomation.tsx
  - >-
    packages/desktop-client/src/components/budget/goals/editor/LimitAutomation.tsx
  - >-
    packages/desktop-client/src/components/budget/goals/editor/RemainderAutomation.tsx
  - packages/desktop-client/src/components/budget/tracking/BalanceMenu.tsx
  - packages/desktop-client/src/components/budget/tracking/BudgetMenu.tsx
  - >-
    packages/desktop-client/src/components/budget/tracking/TrackingBudgetComponents.tsx
  - >-
    packages/desktop-client/src/components/budget/tracking/budgetsummary/BudgetMonthMenu.tsx
  - packages/desktop-client/src/components/common/AriaRouterProvider.tsx
  - packages/desktop-client/src/components/common/CalculatorButtons.test.tsx
  - packages/desktop-client/src/components/common/CalculatorButtons.tsx
  - packages/desktop-client/src/components/common/Modal.tsx
  - packages/desktop-client/src/components/filters/FiltersMenu.tsx
  - packages/desktop-client/src/components/filters/PayeeFilter.tsx
  - packages/desktop-client/src/components/formula/QueryManager.tsx
  - packages/desktop-client/src/components/formula/formulaCatalog.ts
  - packages/desktop-client/src/components/manager/BudgetFileSelection.tsx
  - packages/desktop-client/src/components/manager/ConfigServer.tsx
  - packages/desktop-client/src/components/manager/subscribe/Bootstrap.tsx
  - packages/desktop-client/src/components/manager/subscribe/ChangePassword.tsx
  - packages/desktop-client/src/components/manager/subscribe/Login.tsx
  - packages/desktop-client/src/components/manager/subscribe/OpenIdForm.tsx
  - packages/desktop-client/src/components/mobile/MobileNavTabs.tsx
  - packages/desktop-client/src/components/mobile/MobileSheet.tsx
  - packages/desktop-client/src/components/mobile/MobileSheetActions.tsx
  - packages/desktop-client/src/components/mobile/MobileSheetBalanceHeader.tsx
  - >-
    packages/desktop-client/src/components/mobile/MobileSheetCarryoverIndicator.tsx
  - packages/desktop-client/src/components/mobile/MobileSheetCategoryPicker.tsx
  - packages/desktop-client/src/components/mobile/MobileSheetConfirm.tsx
  - packages/desktop-client/src/components/mobile/MobileSheetDeleteConfirm.tsx
  - packages/desktop-client/src/components/mobile/MobileSheetMenuRows.tsx
  - packages/desktop-client/src/components/mobile/MobileSheetNotes.tsx
  - packages/desktop-client/src/components/mobile/MobileSheetPickerField.tsx
  - packages/desktop-client/src/components/mobile/MobileSheetRow.tsx
  - packages/desktop-client/src/components/mobile/MobileSheetSection.tsx
  - packages/desktop-client/src/components/mobile/accounts/AccountPage.tsx
  - packages/desktop-client/src/components/mobile/accounts/AccountsPage.tsx
  - >-
    packages/desktop-client/src/components/mobile/accounts/AllAccountTransactions.tsx
  - >-
    packages/desktop-client/src/components/mobile/banksync/BankSyncAccountsListItem.tsx
  - >-
    packages/desktop-client/src/components/mobile/banksync/MobileBankSyncAccountEditPage.tsx
  - >-
    packages/desktop-client/src/components/mobile/banksync/MobileBankSyncPage.tsx
  - packages/desktop-client/src/components/mobile/budget/BudgetMenuSheet.tsx
  - >-
    packages/desktop-client/src/components/mobile/budget/BudgetMonthMenuSheet.tsx
  - packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx
  - >-
    packages/desktop-client/src/components/mobile/budget/CategoryGroupActionMenu.tsx
  - packages/desktop-client/src/components/mobile/budget/ExpenseCategoryList.tsx
  - >-
    packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.test.tsx
  - >-
    packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx
  - >-
    packages/desktop-client/src/components/mobile/budget/IncomeCategoryListItem.tsx
  - >-
    packages/desktop-client/src/components/mobile/budget/ToBudgetSheetActions.tsx
  - packages/desktop-client/src/components/mobile/payees/MobilePayeeEditPage.tsx
  - >-
    packages/desktop-client/src/components/mobile/payees/MobilePayeesPage.test.tsx
  - packages/desktop-client/src/components/mobile/payees/MobilePayeesPage.tsx
  - packages/desktop-client/src/components/mobile/rules/AddRuleButton.tsx
  - packages/desktop-client/src/components/mobile/rules/MobileRuleEditPage.tsx
  - packages/desktop-client/src/components/mobile/rules/MobileRulesPage.tsx
  - >-
    packages/desktop-client/src/components/mobile/schedules/SchedulesListItem.tsx
  - >-
    packages/desktop-client/src/components/mobile/transactions/CalculatorKeyboard.tsx
  - >-
    packages/desktop-client/src/components/mobile/transactions/FocusableAmountInput.tsx
  - >-
    packages/desktop-client/src/components/mobile/transactions/TransactionEdit.tsx
  - >-
    packages/desktop-client/src/components/mobile/transactions/TransactionList.tsx
  - >-
    packages/desktop-client/src/components/mobile/transactions/TransactionListWithBalances.tsx
  - packages/desktop-client/src/components/mobile/utils.ts
  - packages/desktop-client/src/components/modals/AccountMenuModal.tsx
  - packages/desktop-client/src/components/modals/AllAccountsMenuModal.tsx
  - >-
    packages/desktop-client/src/components/modals/BudgetAutomationsModal/AutomationEditorPane.tsx
  - >-
    packages/desktop-client/src/components/modals/BudgetAutomationsModal/AutomationListRow.tsx
  - >-
    packages/desktop-client/src/components/modals/BudgetAutomationsModal/BudgetAutomationsBody.tsx
  - >-
    packages/desktop-client/src/components/modals/BudgetAutomationsModal/BudgetAutomationsModal.tsx
  - >-
    packages/desktop-client/src/components/modals/BudgetAutomationsModal/CleanupListRow.tsx
  - >-
    packages/desktop-client/src/components/modals/BudgetAutomationsModal/EmptyState.tsx
  - >-
    packages/desktop-client/src/components/modals/BudgetAutomationsModal/useBudgetAutomationsEditor.ts
  - packages/desktop-client/src/components/modals/BudgetPageMenuModal.tsx
  - packages/desktop-client/src/components/modals/CategoryGroupMenuModal.tsx
  - packages/desktop-client/src/components/modals/CategoryMenuModal.tsx
  - packages/desktop-client/src/components/modals/CloseAccountModal.tsx
  - packages/desktop-client/src/components/modals/ConfirmCategoryDeleteModal.tsx
  - >-
    packages/desktop-client/src/components/modals/ConfirmTransactionEditModal.tsx
  - packages/desktop-client/src/components/modals/CreateAccountModal.tsx
  - >-
    packages/desktop-client/src/components/modals/EnableBankingExternalMsgModal.tsx
  - >-
    packages/desktop-client/src/components/modals/EnableBankingInitialiseModal.tsx
  - >-
    packages/desktop-client/src/components/modals/EnvelopeBalanceMenuModal.test.tsx
  - packages/desktop-client/src/components/modals/EnvelopeBalanceMenuModal.tsx
  - packages/desktop-client/src/components/modals/EnvelopeBudgetMenuModal.tsx
  - >-
    packages/desktop-client/src/components/modals/EnvelopeBudgetMonthMenuModal.tsx
  - packages/desktop-client/src/components/modals/EnvelopeBudgetSummaryModal.tsx
  - >-
    packages/desktop-client/src/components/modals/EnvelopeIncomeBalanceMenuModal.tsx
  - packages/desktop-client/src/components/modals/EnvelopeToBudgetMenuModal.tsx
  - >-
    packages/desktop-client/src/components/modals/GoCardlessExternalMsgModal.test.tsx
  - packages/desktop-client/src/components/modals/GoCardlessExternalMsgModal.tsx
  - packages/desktop-client/src/components/modals/HoldBufferModal.tsx
  - >-
    packages/desktop-client/src/components/modals/ImportTransactionsModal/ImportTransactionsModal.tsx
  - >-
    packages/desktop-client/src/components/modals/ImportTransactionsModal/SubLabel.tsx
  - packages/desktop-client/src/components/modals/KeyboardShortcutModal.tsx
  - packages/desktop-client/src/components/modals/PayeeAutocompleteModal.tsx
  - >-
    packages/desktop-client/src/components/modals/ScheduledTransactionMenuModal.tsx
  - packages/desktop-client/src/components/modals/SelectLinkedAccountsModal.tsx
  - >-
    packages/desktop-client/src/components/modals/SimpleFinInitialiseModal.test.tsx
  - packages/desktop-client/src/components/modals/SimpleFinInitialiseModal.tsx
  - packages/desktop-client/src/components/modals/TrackingBalanceMenuModal.tsx
  - packages/desktop-client/src/components/modals/TrackingBudgetMenuModal.tsx
  - >-
    packages/desktop-client/src/components/modals/TrackingBudgetMonthMenuModal.tsx
  - packages/desktop-client/src/components/modals/TrackingBudgetSummaryModal.tsx
  - >-
    packages/desktop-client/src/components/modals/TransactionTableColumnListItem.tsx
  - >-
    packages/desktop-client/src/components/modals/TransactionTableColumnsModal.tsx
  - packages/desktop-client/src/components/news/ChangelogSection.tsx
  - packages/desktop-client/src/components/news/MarkdownBlockquote.tsx
  - packages/desktop-client/src/components/news/NewsEntryCard.tsx
  - packages/desktop-client/src/components/news/NewsMarkdown.tsx
  - packages/desktop-client/src/components/news/NotificationsButton.test.tsx
  - packages/desktop-client/src/components/news/NotificationsButton.tsx
  - packages/desktop-client/src/components/news/NotificationsPage.test.tsx
  - packages/desktop-client/src/components/news/NotificationsPage.tsx
  - packages/desktop-client/src/components/payees/ManagePayeesPage.tsx
  - packages/desktop-client/src/components/reports/CategorySelector.tsx
  - packages/desktop-client/src/components/reports/Change.test.tsx
  - packages/desktop-client/src/components/reports/ChooseGraph.tsx
  - packages/desktop-client/src/components/reports/FormulaResult.tsx
  - packages/desktop-client/src/components/reports/Overview.tsx
  - packages/desktop-client/src/components/reports/ReportCard.test.tsx
  - packages/desktop-client/src/components/reports/ReportCard.tsx
  - packages/desktop-client/src/components/reports/ReportOptions.ts
  - packages/desktop-client/src/components/reports/ReportSidebar.tsx
  - packages/desktop-client/src/components/reports/SummaryNumber.tsx
  - packages/desktop-client/src/components/reports/TagScopeSelector.test.tsx
  - packages/desktop-client/src/components/reports/TagScopeSelector.tsx
  - packages/desktop-client/src/components/reports/disabledList.ts
  - packages/desktop-client/src/components/reports/graphs/AreaGraph.tsx
  - packages/desktop-client/src/components/reports/graphs/BarGraph.tsx
  - packages/desktop-client/src/components/reports/graphs/CalendarGraph.tsx
  - packages/desktop-client/src/components/reports/graphs/CashFlowGraph.tsx
  - packages/desktop-client/src/components/reports/graphs/DonutGraph.tsx
  - packages/desktop-client/src/components/reports/graphs/LineGraph.tsx
  - >-
    packages/desktop-client/src/components/reports/graphs/MonteCarloCashflowGraphTooltip.tsx
  - >-
    packages/desktop-client/src/components/reports/graphs/MonteCarloPotBalancesGraph.tsx
  - packages/desktop-client/src/components/reports/graphs/NetWorthGraph.tsx
  - >-
    packages/desktop-client/src/components/reports/graphs/StackedBarGraph.test.tsx
  - packages/desktop-client/src/components/reports/graphs/StackedBarGraph.tsx
  - packages/desktop-client/src/components/reports/graphs/showActivity.test.ts
  - packages/desktop-client/src/components/reports/graphs/showActivity.ts
  - >-
    packages/desktop-client/src/components/reports/graphs/tableGraph/ReportTable.tsx
  - >-
    packages/desktop-client/src/components/reports/graphs/tableGraph/ReportTableList.test.tsx
  - >-
    packages/desktop-client/src/components/reports/graphs/tableGraph/ReportTableList.tsx
  - >-
    packages/desktop-client/src/components/reports/graphs/tableGraph/ReportTableRow.tsx
  - >-
    packages/desktop-client/src/components/reports/graphs/util/monteCarloCashflowChart.test.ts
  - >-
    packages/desktop-client/src/components/reports/graphs/util/monteCarloCashflowChart.ts
  - >-
    packages/desktop-client/src/components/reports/graphs/util/monteCarloPotBalancesChart.test.ts
  - >-
    packages/desktop-client/src/components/reports/graphs/util/monteCarloPotBalancesChart.ts
  - packages/desktop-client/src/components/reports/reportRanges.test.ts
  - packages/desktop-client/src/components/reports/reportRanges.ts
  - packages/desktop-client/src/components/reports/reports/AgeOfMoney.tsx
  - packages/desktop-client/src/components/reports/reports/BalanceForecast.tsx
  - >-
    packages/desktop-client/src/components/reports/reports/BalanceForecastCard.tsx
  - packages/desktop-client/src/components/reports/reports/BudgetAnalysis.tsx
  - packages/desktop-client/src/components/reports/reports/Calendar.tsx
  - packages/desktop-client/src/components/reports/reports/CashFlow.tsx
  - packages/desktop-client/src/components/reports/reports/CustomReport.tsx
  - >-
    packages/desktop-client/src/components/reports/reports/CustomReportListCards.tsx
  - packages/desktop-client/src/components/reports/reports/FormulaCard.tsx
  - packages/desktop-client/src/components/reports/reports/GetCardData.tsx
  - packages/desktop-client/src/components/reports/reports/NetWorth.tsx
  - packages/desktop-client/src/components/reports/reports/Sankey.tsx
  - packages/desktop-client/src/components/reports/reports/SankeyCard.tsx
  - packages/desktop-client/src/components/reports/reports/Spending.tsx
  - packages/desktop-client/src/components/reports/reports/SummaryCard.tsx
  - >-
    packages/desktop-client/src/components/reports/reports/monte-carlo/MonteCarlo.tsx
  - >-
    packages/desktop-client/src/components/reports/reports/monte-carlo/MonteCarloConfiguration.tsx
  - >-
    packages/desktop-client/src/components/reports/reports/monte-carlo/MonteCarloContributions.tsx
  - >-
    packages/desktop-client/src/components/reports/reports/monte-carlo/MonteCarloInvestmentPhaseRow.tsx
  - >-
    packages/desktop-client/src/components/reports/reports/monte-carlo/MonteCarloNumberInput.tsx
  - >-
    packages/desktop-client/src/components/reports/reports/monte-carlo/MonteCarloPotConfiguration.tsx
  - >-
    packages/desktop-client/src/components/reports/reports/monte-carlo/MonteCarloRunDetailTable.tsx
  - >-
    packages/desktop-client/src/components/reports/reports/monte-carlo/MonteCarloWithdrawalRuleConfiguration.tsx
  - >-
    packages/desktop-client/src/components/reports/reports/monte-carlo/monteCarloSimulation.test.ts
  - >-
    packages/desktop-client/src/components/reports/reports/monte-carlo/monteCarloSimulation.ts
  - >-
    packages/desktop-client/src/components/reports/reports/monte-carlo/monteCarloYearStory.test.ts
  - >-
    packages/desktop-client/src/components/reports/reports/monte-carlo/monteCarloYearStory.ts
  - packages/desktop-client/src/components/reports/setSessionReport.ts
  - >-
    packages/desktop-client/src/components/reports/spreadsheets/calculateLegend.ts
  - >-
    packages/desktop-client/src/components/reports/spreadsheets/custom-spreadsheet.test.ts
  - >-
    packages/desktop-client/src/components/reports/spreadsheets/custom-spreadsheet.ts
  - >-
    packages/desktop-client/src/components/reports/spreadsheets/fetchSpreadsheetQueryData.ts
  - >-
    packages/desktop-client/src/components/reports/spreadsheets/filterHiddenItems.ts
  - >-
    packages/desktop-client/src/components/reports/spreadsheets/makeQuery.test.ts
  - packages/desktop-client/src/components/reports/spreadsheets/makeQuery.ts
  - packages/desktop-client/src/components/reports/spreadsheets/recalculate.ts
  - >-
    packages/desktop-client/src/components/reports/spreadsheets/sankey-spreadsheet.ts
  - >-
    packages/desktop-client/src/components/reports/spreadsheets/spending-spreadsheet.integration.test.ts
  - >-
    packages/desktop-client/src/components/reports/spreadsheets/spending-spreadsheet.test.ts
  - >-
    packages/desktop-client/src/components/reports/spreadsheets/spending-spreadsheet.ts
  - >-
    packages/desktop-client/src/components/reports/spreadsheets/tagGroups.test.ts
  - packages/desktop-client/src/components/reports/spreadsheets/tagGroups.ts
  - packages/desktop-client/src/components/reports/tagScope.test.ts
  - packages/desktop-client/src/components/reports/tagScope.ts
  - packages/desktop-client/src/components/reports/util.test.ts
  - packages/desktop-client/src/components/reports/util.ts
  - packages/desktop-client/src/components/rules/RuleEditor.tsx
  - packages/desktop-client/src/components/rules/RuleRow.tsx
  - packages/desktop-client/src/components/schedules/ScheduleEditForm.tsx
  - packages/desktop-client/src/components/schedules/index.tsx
  - packages/desktop-client/src/components/select/DateSelect.tsx
  - packages/desktop-client/src/components/settings/AuthSettings.tsx
  - packages/desktop-client/src/components/settings/Backups.tsx
  - packages/desktop-client/src/components/settings/BudgetTypeSettings.tsx
  - packages/desktop-client/src/components/settings/Currency.tsx
  - packages/desktop-client/src/components/settings/Encryption.tsx
  - packages/desktop-client/src/components/settings/Experimental.tsx
  - packages/desktop-client/src/components/settings/Export.tsx
  - packages/desktop-client/src/components/settings/Format.tsx
  - packages/desktop-client/src/components/settings/LanguageSettings.tsx
  - packages/desktop-client/src/components/settings/RepairTransactions.tsx
  - packages/desktop-client/src/components/settings/Reset.tsx
  - packages/desktop-client/src/components/settings/SettingsBackButton.tsx
  - packages/desktop-client/src/components/settings/SettingsGroup.tsx
  - packages/desktop-client/src/components/settings/SettingsNav.test.tsx
  - packages/desktop-client/src/components/settings/SettingsNav.tsx
  - packages/desktop-client/src/components/settings/SettingsNavLink.tsx
  - packages/desktop-client/src/components/settings/SettingsRow.tsx
  - packages/desktop-client/src/components/settings/SidebarMenuListItem.tsx
  - packages/desktop-client/src/components/settings/SidebarSettings.tsx
  - packages/desktop-client/src/components/settings/ThemeInstaller.tsx
  - packages/desktop-client/src/components/settings/Themes.tsx
  - packages/desktop-client/src/components/settings/UI.tsx
  - packages/desktop-client/src/components/settings/index.tsx
  - packages/desktop-client/src/components/sidebar/PrimaryButtons.tsx
  - packages/desktop-client/src/components/sidebar/SidebarMenuRoute.tsx
  - >-
    packages/desktop-client/src/components/sidebar/redesign/AccountGroupHeader.tsx
  - packages/desktop-client/src/components/sidebar/redesign/AccountRow.tsx
  - packages/desktop-client/src/components/sidebar/redesign/AccountTree.tsx
  - packages/desktop-client/src/components/sidebar/redesign/PrimaryNav.tsx
  - >-
    packages/desktop-client/src/components/sidebar/redesign/SidebarBudgetName.tsx
  - packages/desktop-client/src/components/sidebar/redesign/SidebarHeader.tsx
  - packages/desktop-client/src/components/sidebar/redesign/treeItemEditing.ts
  - packages/desktop-client/src/components/sidebar/sidebarMenu.test.ts
  - packages/desktop-client/src/components/sidebar/sidebarMenu.ts
  - packages/desktop-client/src/components/sidebar/useSidebarMenuItemDetails.ts
  - packages/desktop-client/src/components/sort.test.tsx
  - packages/desktop-client/src/components/sort.tsx
  - packages/desktop-client/src/components/table.tsx
  - packages/desktop-client/src/components/tags/ManageTagsPage.tsx
  - packages/desktop-client/src/components/tour/steps.test.ts
  - packages/desktop-client/src/components/tour/steps.tsx
  - packages/desktop-client/src/components/transactions/TransactionList.tsx
  - >-
    packages/desktop-client/src/components/transactions/TransactionsTable.test.tsx
  - packages/desktop-client/src/components/transactions/TransactionsTable.tsx
  - >-
    packages/desktop-client/src/components/transactions/applyRulesToTransaction.test.ts
  - >-
    packages/desktop-client/src/components/transactions/applyRulesToTransaction.ts
  - packages/desktop-client/src/components/transactions/table/utils.test.ts
  - packages/desktop-client/src/components/transactions/table/utils.ts
  - packages/desktop-client/src/components/util/FinancialInput.tsx
  - packages/desktop-client/src/components/util/GenericInput.tsx
  - packages/desktop-client/src/data/customThemeCatalog.json
  - packages/desktop-client/src/data/news.json
  - packages/desktop-client/src/global-events.ts
  - packages/desktop-client/src/hooks/useAutomaticBankSync.test.ts
  - packages/desktop-client/src/hooks/useAutomaticBankSync.ts
  - packages/desktop-client/src/hooks/useDeleteCategoryFlow.ts
  - packages/desktop-client/src/hooks/useIsInViewport.test.ts
  - packages/desktop-client/src/hooks/useIsInViewport.ts
  - packages/desktop-client/src/hooks/useNewsFeed.test.ts
  - packages/desktop-client/src/hooks/useNewsFeed.ts
  - packages/desktop-client/src/hooks/useQuery.ts
  - packages/desktop-client/src/hooks/useReducedMotion.ts
  - packages/desktop-client/src/hooks/useRefEventListener.ts
  - packages/desktop-client/src/hooks/useScrollListener.tsx
  - packages/desktop-client/src/hooks/useSidebarMenu.ts
  - packages/desktop-client/src/hooks/useSimpleFinStatus.ts
  - packages/desktop-client/src/hooks/useSwipeToDismiss.ts
  - packages/desktop-client/src/hooks/useTransactionBatchActions.ts
  - packages/desktop-client/src/hooks/useTransactions.test.ts
  - packages/desktop-client/src/hooks/useTransactions.ts
  - packages/desktop-client/src/hooks/useTransactionsSearch.ts
  - packages/desktop-client/src/modals/modalsSlice.ts
  - packages/desktop-client/src/news/changelog.test.ts
  - packages/desktop-client/src/news/changelog.ts
  - packages/desktop-client/src/news/fetchNewsFeed.test.ts
  - packages/desktop-client/src/news/fetchNewsFeed.ts
  - packages/desktop-client/src/prefs/prefsSlice.test.ts
  - packages/desktop-client/src/prefs/prefsSlice.ts
  - packages/desktop-client/src/sync-events.test.ts
  - packages/desktop-client/src/sync-events.ts
  - packages/desktop-client/src/util/error.ts
  - packages/desktop-client/src/util/schedule-actions.test.ts
  - packages/desktop-client/src/util/schedule-actions.ts
  - packages/desktop-client/src/util/versions.test.ts
  - packages/desktop-client/src/util/versions.ts
  - packages/desktop-client/vite.config.mts
  - packages/desktop-electron/certificates.ts
  - >-
    packages/desktop-electron/e2e/__screenshots__/onboarding.test.ts/Onboarding-checks-the-page-visuals-1-linux.png
  - >-
    packages/desktop-electron/e2e/__screenshots__/onboarding.test.ts/Onboarding-checks-the-page-visuals-2-linux.png
  - >-
    packages/desktop-electron/e2e/__screenshots__/onboarding.test.ts/Onboarding-starts-the-sync-server-and-navigates-to-bootstrap-page-1-linux.png
  - packages/desktop-electron/e2e/fixtures.ts
  - packages/desktop-electron/e2e/navigation-security.test.ts
  - packages/desktop-electron/external-links.ts
  - packages/desktop-electron/index.ts
  - packages/desktop-electron/package.json
  - packages/desktop-electron/security.ts
  - packages/desktop-electron/server.ts
  - packages/desktop-electron/tests/external-links.test.ts
  - packages/desktop-electron/tests/trusted-url.test.ts
  - packages/desktop-electron/trusted-url.ts
  - packages/desktop-electron/vitest.config.ts
  - packages/docs/blog/2026-10-01-release-26-10-0.md
  - packages/docs/docs-sidebar.js
  - packages/docs/docs/accounts/index.md
  - packages/docs/docs/accounts/reconciliation.md
  - packages/docs/docs/advanced/bank-sync.md
  - packages/docs/docs/advanced/bank-sync/gocardless.md
  - packages/docs/docs/advanced/bank-sync/pluggyai.md
  - packages/docs/docs/advanced/bank-sync/simplefin.md
  - packages/docs/docs/advanced/restart.md
  - packages/docs/docs/api/reference.md
  - packages/docs/docs/backup-restore/backup.md
  - packages/docs/docs/backup-restore/restore.md
  - packages/docs/docs/budgeting/categories.md
  - packages/docs/docs/budgeting/credit-cards/carrying-debt.md
  - packages/docs/docs/budgeting/credit-cards/paying-in-full.md
  - packages/docs/docs/budgeting/index.md
  - packages/docs/docs/budgeting/joint-accounts.md
  - packages/docs/docs/budgeting/multi-currency.md
  - packages/docs/docs/budgeting/returns-and-reimbursements.md
  - packages/docs/docs/budgeting/rules/custom.md
  - packages/docs/docs/community-repos.md
  - packages/docs/docs/config/index.md
  - packages/docs/docs/config/multi-user.md
  - packages/docs/docs/config/oauth-auth.md
  - packages/docs/docs/contributing/index.md
  - packages/docs/docs/custom-themes.md
  - packages/docs/docs/experimental/balance-forecast-report.md
  - packages/docs/docs/experimental/budget-analysis-report.md
  - packages/docs/docs/experimental/budget-automation.md
  - packages/docs/docs/experimental/formulas.md
  - packages/docs/docs/experimental/goal-templates.md
  - packages/docs/docs/experimental/index.md
  - packages/docs/docs/experimental/monte-carlo-analysis.md
  - packages/docs/docs/experimental/monthly-cleanup.md
  - packages/docs/docs/experimental/redesigned-sidebar.md
  - packages/docs/docs/experimental/rule-templating.md
  - packages/docs/docs/experimental/sankey-report.md
  - packages/docs/docs/getting-started/starting-fresh.md
  - packages/docs/docs/getting-started/tips-tricks.md
  - packages/docs/docs/getting-started/tracking-budget.md
  - packages/docs/docs/install/desktop-app.md
  - packages/docs/docs/install/fly.md
  - packages/docs/docs/install/index.md
  - packages/docs/docs/install/pikapods.md
  - packages/docs/docs/migration/nynab.md
  - packages/docs/docs/notifications.md
  - packages/docs/docs/releases.md
  - packages/docs/docs/reports/custom-reports.md
  - packages/docs/docs/reports/index.md
  - packages/docs/docs/schedules.md
  - packages/docs/docs/settings/index.md
  - packages/docs/docs/tour/accounts.md
  - packages/docs/docs/tour/budget.md
  - packages/docs/docs/tour/payees.md
  - packages/docs/docs/tour/reports.md
  - packages/docs/docs/tour/rules.md
  - packages/docs/docs/tour/schedules.md
  - packages/docs/docs/tour/user-interface.md
  - packages/docs/docs/transactions/bulk-editing.md
  - packages/docs/docs/transactions/filters.md
  - packages/docs/docs/transactions/importing.md
  - packages/docs/docs/transactions/merging.md
  - packages/docs/docs/transactions/payee-locations.md
  - packages/docs/docs/transactions/payees.md
  - packages/docs/docs/transactions/split-transactions.md
  - packages/docs/docs/transactions/tags.md
  - packages/docs/docs/transactions/transfers.md
  - packages/docs/docs/troubleshooting/server.md
  - packages/docs/package.json
  - packages/docs/src/components/ExperimentalFeatureWarning.tsx
  - packages/docs/static/img/a-tour-of-actual/server-connecting-first-time.webp
  - >-
    packages/docs/static/img/a-tour-of-actual/tour-account-register-adding-transaction.webp
  - packages/docs/static/img/a-tour-of-actual/tour-account-register-filter.webp
  - packages/docs/static/img/a-tour-of-actual/tour-account-register-header.webp
  - >-
    packages/docs/static/img/a-tour-of-actual/tour-account-register-overview.webp
  - >-
    packages/docs/static/img/a-tour-of-actual/tour-account-register-selected-transactions.webp
  - >-
    packages/docs/static/img/a-tour-of-actual/tour-accounts-add-transaction@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-accounts-filter@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-accounts-header@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-accounts-register@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-accounts-selected@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-budget-calendar-choose.webp
  - packages/docs/static/img/a-tour-of-actual/tour-budget-calendar.webp
  - packages/docs/static/img/a-tour-of-actual/tour-budget-details.webp
  - >-
    packages/docs/static/img/a-tour-of-actual/tour-budget-header-expanded@2x.webp
  - >-
    packages/docs/static/img/a-tour-of-actual/tour-budget-header-minimized@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-budget-header-note@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-budget-month-count@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-budget-month-picker@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-budget-overview.webp
  - packages/docs/static/img/a-tour-of-actual/tour-budget-overview@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-budget-table@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-budget-top-expanded.webp
  - packages/docs/static/img/a-tour-of-actual/tour-budget-top-minimized.webp
  - packages/docs/static/img/a-tour-of-actual/tour-budget-top-note-hover.webp
  - >-
    packages/docs/static/img/a-tour-of-actual/tour-overview-of-user-interface.webp
  - packages/docs/static/img/a-tour-of-actual/tour-overview-sidebar.webp
  - packages/docs/static/img/a-tour-of-actual/tour-overview-top-right.webp
  - packages/docs/static/img/a-tour-of-actual/tour-payees-delete-merge.webp
  - packages/docs/static/img/a-tour-of-actual/tour-payees-delete-merge@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-payees-overview.webp
  - packages/docs/static/img/a-tour-of-actual/tour-payees-overview@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-reports-cash-flow@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-reports-cashflow.webp
  - packages/docs/static/img/a-tour-of-actual/tour-reports-custom-graph@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-reports-custom-table@2x.webp
  - >-
    packages/docs/static/img/a-tour-of-actual/tour-reports-daily-expenses-graph.webp
  - >-
    packages/docs/static/img/a-tour-of-actual/tour-reports-daily-expenses-table.webp
  - packages/docs/static/img/a-tour-of-actual/tour-reports-overview.webp
  - packages/docs/static/img/a-tour-of-actual/tour-reports-overview@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-rules-overview.webp
  - packages/docs/static/img/a-tour-of-actual/tour-rules-overview@2x.webp
  - packages/docs/static/img/a-tour-of-actual/tour-schedules-overview.webp
  - packages/docs/static/img/a-tour-of-actual/tour-schedules-overview@2x.webp
  - >-
    packages/docs/static/img/a-tour-of-actual/tour-user-interface-overview@2x.webp
  - >-
    packages/docs/static/img/a-tour-of-actual/tour-user-interface-sidebar@2x.webp
  - packages/docs/static/img/accounts/account-delete-all-transactions.webp
  - packages/docs/static/img/accounts/accounts-add-account-dialog@2x.webp
  - packages/docs/static/img/accounts/accounts-add-account@2x.webp
  - packages/docs/static/img/accounts/accounts-create-local-account@2x.webp
  - packages/docs/static/img/accounts/accounts-name-notes@2x.webp
  - packages/docs/static/img/accounts/accounts-new-account@2x.webp
  - packages/docs/static/img/accounts/accounts-sidebar-list@2x.webp
  - packages/docs/static/img/accounts/reconciliation-all-reconciled@2x.webp
  - packages/docs/static/img/accounts/reconciliation-asset-difference@2x.webp
  - packages/docs/static/img/accounts/reconciliation-asset-locked@2x.webp
  - packages/docs/static/img/accounts/reconciliation-asset-reconciled@2x.webp
  - packages/docs/static/img/accounts/reconciliation-asset-value@2x.webp
  - packages/docs/static/img/accounts/reconciliation-cleared-uncleared@2x.webp
  - packages/docs/static/img/accounts/reconciliation-difference@2x.webp
  - packages/docs/static/img/accounts/reconciliation-edit-warning@2x.webp
  - packages/docs/static/img/accounts/reconciliation-lock-icon@2x.webp
  - packages/docs/static/img/accounts/reconciliation-locked@2x.webp
  - >-
    packages/docs/static/img/accounts/reconciliation-statement-balance-synced@2x.webp
  - packages/docs/static/img/accounts/reconciliation-statement-balance@2x.webp
  - packages/docs/static/img/accounts/reconciliation-unlock@2x.webp
  - packages/docs/static/img/add-account/AccountNameEdit.webp
  - packages/docs/static/img/add-account/AddAccount.webp
  - packages/docs/static/img/add-account/CreateAccount1.webp
  - packages/docs/static/img/add-account/CreateAccount@2x.webp
  - packages/docs/static/img/add-account/NewBudget.webp
  - packages/docs/static/img/add-account/SidebarAccountList@2x.webp
  - >-
    packages/docs/static/img/advanced/bank-sync/bank-sync-account-buttons@2x.webp
  - >-
    packages/docs/static/img/advanced/bank-sync/bank-sync-add-account-modal@2x.webp
  - packages/docs/static/img/advanced/bank-sync/bank-sync-add-account@2x.webp
  - >-
    packages/docs/static/img/advanced/bank-sync/bank-sync-link-account-menu@2x.webp
  - >-
    packages/docs/static/img/advanced/bank-sync/gocardless-link-accounts-chosen@2x.webp
  - packages/docs/static/img/advanced/bank-sync/gocardless-link-accounts@2x.webp
  - >-
    packages/docs/static/img/advanced/bank-sync/gocardless-link-bank-account@2x.webp
  - >-
    packages/docs/static/img/advanced/bank-sync/gocardless-link-your-bank@2x.webp
  - >-
    packages/docs/static/img/advanced/bank-sync/gocardless-loading-accounts@2x.webp
  - packages/docs/static/img/advanced/bank-sync/gocardless-set-up@2x.webp
  - packages/docs/static/img/advanced/bank-sync/gocardless-setup-modal@2x.webp
  - packages/docs/static/img/advanced/bank-sync/gocardless-success@2x.webp
  - packages/docs/static/img/advanced/bank-sync/gocardless-sync-all@2x.webp
  - packages/docs/static/img/advanced/bank-sync/gocardless-waiting@2x.webp
  - packages/docs/static/img/advanced/bank-sync/pluggyai-link-accounts@2x.webp
  - >-
    packages/docs/static/img/advanced/bank-sync/pluggyai-link-bank-account@2x.webp
  - packages/docs/static/img/advanced/bank-sync/pluggyai-set-up@2x.webp
  - packages/docs/static/img/advanced/bank-sync/pluggyai-setup-modal@2x.webp
  - packages/docs/static/img/advanced/bank-sync/simplefin-account-picker@2x.webp
  - packages/docs/static/img/advanced/bank-sync/simplefin-link-accounts@2x.webp
  - >-
    packages/docs/static/img/advanced/bank-sync/simplefin-link-bank-account@2x.webp
  - packages/docs/static/img/advanced/bank-sync/simplefin-set-up@2x.webp
  - packages/docs/static/img/advanced/bank-sync/simplefin-setup-modal@2x.webp
  - packages/docs/static/img/advanced/restart-delete-all-transactions@2x.webp
  - packages/docs/static/img/backup-restore/backup-sidebar-settings@2x.webp
  - packages/docs/static/img/backup-restore/restore-close-budget.webp
  - packages/docs/static/img/backup-restore/restore-import-actual@2x.webp
  - packages/docs/static/img/backup-restore/restore-import-file-dialog.webp
  - packages/docs/static/img/backup-restore/restore-import-file-select-file.webp
  - packages/docs/static/img/backup-restore/restore-import-file.webp
  - packages/docs/static/img/backup-restore/restore-import-file@2x.webp
  - packages/docs/static/img/backup-restore/restore-import-imported-budget.webp
  - packages/docs/static/img/backup-restore/restore-import-source@2x.webp
  - packages/docs/static/img/backup-restore/restore-imported-budget@2x.webp
  - packages/docs/static/img/backup-restore/restore-switch-file@2x.webp
  - packages/docs/static/img/backup-restore/settings-export.webp
  - packages/docs/static/img/backup-restore/sidebar-settings@2x.webp
  - packages/docs/static/img/budgeting/budgeting-auto-hold-disable@2x.webp
  - packages/docs/static/img/budgeting/budgeting-auto-hold-indicator@2x.webp
  - packages/docs/static/img/budgeting/budgeting-auto-hold@2x.webp
  - packages/docs/static/img/budgeting/budgeting-hold-for-next-month@2x.webp
  - packages/docs/static/img/budgeting/categories-add-group@2x.webp
  - packages/docs/static/img/budgeting/categories-category-hover@2x.webp
  - packages/docs/static/img/budgeting/categories-category-menu@2x.webp
  - packages/docs/static/img/budgeting/categories-delete-modal-food@2x.webp
  - packages/docs/static/img/budgeting/categories-delete-modal@2x.webp
  - packages/docs/static/img/budgeting/categories-duplicates@2x.webp
  - packages/docs/static/img/budgeting/categories-group-hover@2x.webp
  - packages/docs/static/img/budgeting/categories-hidden@2x.webp
  - packages/docs/static/img/budgeting/categories-hide-category@2x.webp
  - packages/docs/static/img/budgeting/categories-merged@2x.webp
  - packages/docs/static/img/budgeting/categories-new-category@2x.webp
  - packages/docs/static/img/budgeting/categories-note-add@2x.webp
  - packages/docs/static/img/budgeting/categories-note-edit@2x.webp
  - packages/docs/static/img/budgeting/categories-note-hover@2x.webp
  - packages/docs/static/img/budgeting/categories-notes-icon@2x.webp
  - packages/docs/static/img/budgeting/categories-toggle-hidden@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/carrying-debt-account-menu@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/carrying-debt-balance-arrows@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/carrying-debt-balance-expanded@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/carrying-debt-citibank-first-payment@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/carrying-debt-citibank-reconcile@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/carrying-debt-citibank-second-payment@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/carrying-debt-demo-payment@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/carrying-debt-demo-reconcile@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/carrying-debt-first-month-debt-category@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/carrying-debt-first-month-extra@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/carrying-debt-first-month-minimums@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/carrying-debt-second-month-extra@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/carrying-debt-second-month-minimums@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/carrying-debt-second-month-snapshot@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/carrying-debt-table-columns@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/paying-in-full-first-month-account@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/paying-in-full-first-month-budget@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/paying-in-full-first-reconcile@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/paying-in-full-first-statement@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/paying-in-full-second-month-budget@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/paying-in-full-second-payment@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/paying-in-full-second-reconciled@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/paying-in-full-second-statement@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/paying-in-full-summary-collapsed@2x.webp
  - >-
    packages/docs/static/img/budgeting/credit-cards/paying-in-full-summary-expanded@2x.webp
  - packages/docs/static/img/budgeting/joint-accounts-budget-full@2x.webp
  - packages/docs/static/img/budgeting/joint-accounts-budget-portion@2x.webp
  - packages/docs/static/img/budgeting/joint-accounts-contribution@2x.webp
  - packages/docs/static/img/budgeting/joint-accounts-partner-income@2x.webp
  - packages/docs/static/img/budgeting/joint-accounts-partner-split@2x.webp
  - >-
    packages/docs/static/img/budgeting/multi-currency-account-name-and-note@2x.webp
  - packages/docs/static/img/budgeting/multi-currency-rule-1@2x.webp
  - packages/docs/static/img/budgeting/multi-currency-rule-2@2x.webp
  - packages/docs/static/img/budgeting/multi-currency-rule-action-normal@2x.webp
  - >-
    packages/docs/static/img/budgeting/multi-currency-rule-action-template@2x.webp
  - packages/docs/static/img/budgeting/multi-currency-rule-action@2x.webp
  - packages/docs/static/img/budgeting/multi-currency-usage-convert@2x.webp
  - packages/docs/static/img/budgeting/multi-currency-usage-postconvert@2x.webp
  - packages/docs/static/img/budgeting/multi-currency-usage-preconvert@2x.webp
  - >-
    packages/docs/static/img/budgeting/returns-and-reimbursements-budget-available@2x.webp
  - >-
    packages/docs/static/img/budgeting/returns-and-reimbursements-budget-spent@2x.webp
  - >-
    packages/docs/static/img/budgeting/returns-and-reimbursements-deposit@2x.webp
  - >-
    packages/docs/static/img/budgeting/returns-and-reimbursements-purchase@2x.webp
  - >-
    packages/docs/static/img/budgeting/returns-and-reimbursements-rollover-arrow@2x.webp
  - >-
    packages/docs/static/img/budgeting/returns-and-reimbursements-rollover-menu@2x.webp
  - packages/docs/static/img/budgeting/rules/custom-cleared@2x.webp
  - packages/docs/static/img/budgeting/rules/custom-default-account@2x.webp
  - packages/docs/static/img/budgeting/rules/custom-imported-payee@2x.webp
  - packages/docs/static/img/budgeting/rules/custom-transfer@2x.webp
  - packages/docs/static/img/bulk-edit/1.webp
  - packages/docs/static/img/bulk-edit/3.webp
  - packages/docs/static/img/bulk-edit/4.webp
  - packages/docs/static/img/bulk-edit/5.webp
  - packages/docs/static/img/bulk-edit/6.webp
  - packages/docs/static/img/bulk-edit/7.webp
  - packages/docs/static/img/bulk-edit/8.webp
  - packages/docs/static/img/bulk-edit/duplicate-transactions.webp
  - packages/docs/static/img/categories/AddCategoryGroup.webp
  - packages/docs/static/img/categories/CategoriesHidden.webp
  - packages/docs/static/img/categories/CategoriesMerged.webp
  - packages/docs/static/img/categories/CategoryAddNote.webp
  - packages/docs/static/img/categories/CategoryDeleteConfirmation.webp
  - packages/docs/static/img/categories/CategoryDeleteConfirmationNewCat.webp
  - packages/docs/static/img/categories/CategoryEditNote.webp
  - packages/docs/static/img/categories/CategoryGroupAddCategory.webp
  - packages/docs/static/img/categories/CategoryGroupRename.webp
  - packages/docs/static/img/categories/CategoryToggleHidden.webp
  - packages/docs/static/img/categories/CategoryViewNoteHover.webp
  - packages/docs/static/img/categories/DuplicatedCategories.webp
  - packages/docs/static/img/categories/RenameCategoryDropDown.webp
  - packages/docs/static/img/categories/RenameCategoryOptions.webp
  - packages/docs/static/img/config/multi-user-access-menu@2x.webp
  - packages/docs/static/img/config/multi-user-user-access@2x.webp
  - packages/docs/static/img/config/multi-user-user-directory-menu@2x.webp
  - packages/docs/static/img/config/multi-user-user-directory@2x.webp
  - packages/docs/static/img/config/oauth-auth-first-login@2x.webp
  - packages/docs/static/img/config/oauth-auth-modal@2x.webp
  - packages/docs/static/img/config/oauth-auth-provider-requirement@2x.webp
  - packages/docs/static/img/connecting-your-bank/connecting-your-bank-01.webp
  - packages/docs/static/img/connecting-your-bank/connecting-your-bank-02.webp
  - packages/docs/static/img/connecting-your-bank/connecting-your-bank-03.webp
  - packages/docs/static/img/connecting-your-bank/connecting-your-bank-04.webp
  - packages/docs/static/img/connecting-your-bank/connecting-your-bank-05.webp
  - packages/docs/static/img/connecting-your-bank/connecting-your-bank-07.webp
  - packages/docs/static/img/connecting-your-bank/connecting-your-bank-08.webp
  - packages/docs/static/img/connecting-your-bank/connecting-your-bank-09.webp
  - packages/docs/static/img/connecting-your-bank/connecting-your-bank-10.webp
  - >-
    packages/docs/static/img/connecting-your-bank/connecting-your-bank-gocardless-05.webp
  - >-
    packages/docs/static/img/connecting-your-bank/connecting-your-bank-gocardless-06.webp
  - >-
    packages/docs/static/img/connecting-your-bank/connecting-your-bank-simplefin-05.webp
  - >-
    packages/docs/static/img/connecting-your-bank/connecting-your-bank-simplefin-06.webp
  - >-
    packages/docs/static/img/connecting-your-bank/connecting-your-bank-simplefin-07.webp
  - >-
    packages/docs/static/img/connecting-your-bank/connecting-your-bank-simplefin-08.webp
  - >-
    packages/docs/static/img/connecting-your-bank/connecting-your-bank-simplefin-09.webp
  - >-
    packages/docs/static/img/connecting-your-bank/connecting-your-bank-simplefin-10.webp
  - packages/docs/static/img/connecting-your-bank/pluggy-setup-add-account.webp
  - >-
    packages/docs/static/img/connecting-your-bank/pluggy-setup-modal-link-account.webp
  - packages/docs/static/img/connecting-your-bank/pluggy-setup-modal-setup.webp
  - packages/docs/static/img/connecting-your-bank/pluggy-setup-modal.webp
  - packages/docs/static/img/connecting-your-bank/syncing-with-your-bank.webp
  - packages/docs/static/img/credit-cards/CC-01.webp
  - packages/docs/static/img/credit-cards/CC-010.webp
  - packages/docs/static/img/credit-cards/CC-011.webp
  - packages/docs/static/img/credit-cards/CC-012.webp
  - packages/docs/static/img/credit-cards/CC-013.webp
  - packages/docs/static/img/credit-cards/CC-014.webp
  - packages/docs/static/img/credit-cards/CC-02.webp
  - packages/docs/static/img/credit-cards/CC-03.webp
  - packages/docs/static/img/credit-cards/CC-04.webp
  - packages/docs/static/img/credit-cards/CC-05.webp
  - packages/docs/static/img/credit-cards/CC-06.webp
  - packages/docs/static/img/credit-cards/CC-07.webp
  - packages/docs/static/img/credit-cards/CC-08.webp
  - packages/docs/static/img/credit-cards/CC-09.webp
  - packages/docs/static/img/credit-cards/CC-IND-01.webp
  - packages/docs/static/img/credit-cards/CC-IND-010.webp
  - packages/docs/static/img/credit-cards/CC-IND-02.webp
  - packages/docs/static/img/credit-cards/CC-IND-03.webp
  - packages/docs/static/img/credit-cards/CC-IND-04.webp
  - packages/docs/static/img/credit-cards/CC-IND-05.webp
  - packages/docs/static/img/credit-cards/CC-IND-06.webp
  - packages/docs/static/img/credit-cards/CC-IND-07.webp
  - packages/docs/static/img/credit-cards/CC-IND-08.webp
  - packages/docs/static/img/credit-cards/CC-IND-09.webp
  - packages/docs/static/img/credit-cards/credit-1.webp
  - packages/docs/static/img/credit-cards/credit-2.webp
  - packages/docs/static/img/credit-cards/credit-3.webp
  - packages/docs/static/img/credit-cards/credit-4.webp
  - packages/docs/static/img/credit-cards/credit-5.webp
  - packages/docs/static/img/elements/sidebar/sidebar-all-accounts@2x.webp
  - packages/docs/static/img/elements/top-bar/top-right@2x.webp
  - packages/docs/static/img/experimental/available.webp
  - >-
    packages/docs/static/img/experimental/balance-forecast-report/balance-forecast-report-overview.png
  - >-
    packages/docs/static/img/experimental/balance-forecast-report/balance-forecast-report-overview@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-analysis/budget-analysis-image.webp
  - >-
    packages/docs/static/img/experimental/budget-analysis/budget-analysis-report-overview@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-automation-adjustment-fixed@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-automation-adjustment-percentage@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-automation-adjustment-type@2x.webp
  - packages/docs/static/img/experimental/budget-automation-balance-cap@2x.webp
  - packages/docs/static/img/experimental/budget-automation-cap-august@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-automation-cap-july-food@2x.webp
  - packages/docs/static/img/experimental/budget-automation-cap-july@2x.webp
  - packages/docs/static/img/experimental/budget-automation-cap-june@2x.webp
  - packages/docs/static/img/experimental/budget-automation-cap-october@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-automation-cleanup-create-pool@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-automation-cleanup-global-weight@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-automation-cleanup-global@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-automation-cleanup-pool-leftovers@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-automation-cover-schedule@2x.webp
  - packages/docs/static/img/experimental/budget-automation-fixed-amount@2x.webp
  - packages/docs/static/img/experimental/budget-automation-from-history@2x.webp
  - packages/docs/static/img/experimental/budget-automation-fully-funded@2x.webp
  - packages/docs/static/img/experimental/budget-automation-icon@2x.webp
  - packages/docs/static/img/experimental/budget-automation-indicators@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-automation-long-term-fully-funded@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-automation-long-term-overfunded@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-automation-long-term-underfunded@2x.webp
  - packages/docs/static/img/experimental/budget-automation-long-term@2x.webp
  - packages/docs/static/img/experimental/budget-automation-migration@2x.webp
  - packages/docs/static/img/experimental/budget-automation-multiple@2x.webp
  - packages/docs/static/img/experimental/budget-automation-new@2x.webp
  - packages/docs/static/img/experimental/budget-automation-note@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-automation-percentage-category@2x.webp
  - packages/docs/static/img/experimental/budget-automation-percentage@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-automation-refill-active@2x.webp
  - packages/docs/static/img/experimental/budget-automation-refill@2x.webp
  - packages/docs/static/img/experimental/budget-automation-remainder@2x.webp
  - packages/docs/static/img/experimental/budget-automation-save-by-date@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-automation-tooltip-general@2x.webp
  - >-
    packages/docs/static/img/experimental/budget-automation-tooltip-restaurants@2x.webp
  - packages/docs/static/img/experimental/budget-automation-underfunded@2x.webp
  - packages/docs/static/img/experimental/experimental-settings@2x.webp
  - packages/docs/static/img/experimental/formulas/add-formula-card.png
  - packages/docs/static/img/experimental/formulas/enable-formula-mode.png
  - >-
    packages/docs/static/img/experimental/formulas/formula-editor-and-queries.png
  - packages/docs/static/img/experimental/formulas/formulas-add-card@2x.webp
  - >-
    packages/docs/static/img/experimental/formulas/formulas-editor-and-queries@2x.webp
  - packages/docs/static/img/experimental/formulas/formulas-enable@2x.webp
  - packages/docs/static/img/experimental/formulas/formulas-rule-toggle@2x.webp
  - packages/docs/static/img/experimental/formulas/rule-formula-toggle.png
  - packages/docs/static/img/experimental/goal-templates-category-menu@2x.webp
  - packages/docs/static/img/experimental/goal-templates-goal-tooltip@2x.webp
  - packages/docs/static/img/experimental/goal-templates-group-menu@2x.webp
  - >-
    packages/docs/static/img/experimental/goal-templates-indicator-colors@2x.webp
  - packages/docs/static/img/experimental/goal-templates-month-menu@2x.webp
  - packages/docs/static/img/experimental/goal-templates-note@2x.webp
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-analysis-cashflow-chart@2x.webp
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-analysis-chart@2x.webp
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-analysis-contributions@2x.webp
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-analysis-histogram@2x.webp
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-analysis-income@2x.webp
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-analysis-overview@2x.webp
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-analysis-plan-details@2x.webp
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-analysis-pots-chart@2x.webp
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-analysis-pots@2x.webp
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-analysis-results@2x.webp
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-analysis-run@2x.webp
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-analysis-runs@2x.webp
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-analysis-tax@2x.webp
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-analysis-withdrawals@2x.webp
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-cashflow-chart.png
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-chart.png
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-contributions.png
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-histogram.png
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-income.png
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-overview.png
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-plan-details.png
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-pots.png
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-results.png
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-run.png
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-runs.png
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-tax.png
  - >-
    packages/docs/static/img/experimental/monte-carlo-analysis/monte-carlo-withdrawals.png
  - packages/docs/static/img/experimental/monthly-cleanup-month-menu@2x.webp
  - packages/docs/static/img/experimental/monthly-cleanup-note@2x.webp
  - >-
    packages/docs/static/img/experimental/redesigned-sidebar/redesigned-sidebar-account-group-dialog@2x.webp
  - >-
    packages/docs/static/img/experimental/redesigned-sidebar/redesigned-sidebar-account-menu@2x.webp
  - >-
    packages/docs/static/img/experimental/redesigned-sidebar/redesigned-sidebar-accounts-header@2x.webp
  - >-
    packages/docs/static/img/experimental/redesigned-sidebar/redesigned-sidebar-collapsed-groups@2x.webp
  - >-
    packages/docs/static/img/experimental/redesigned-sidebar/redesigned-sidebar-create-group@2x.webp
  - >-
    packages/docs/static/img/experimental/redesigned-sidebar/redesigned-sidebar-drag-and-drop@2x.webp
  - >-
    packages/docs/static/img/experimental/redesigned-sidebar/redesigned-sidebar-group-menu@2x.webp
  - >-
    packages/docs/static/img/experimental/redesigned-sidebar/redesigned-sidebar-overview@2x.webp
  - >-
    packages/docs/static/img/experimental/redesigned-sidebar/redesigned-sidebar-search@2x.webp
  - >-
    packages/docs/static/img/experimental/rule-templating/enable-rule-templating-2.webp
  - >-
    packages/docs/static/img/experimental/rule-templating/enable-rule-templating.webp
  - >-
    packages/docs/static/img/experimental/rule-templating/rule-templating-template@2x.webp
  - >-
    packages/docs/static/img/experimental/rule-templating/rule-templating-toggle@2x.webp
  - packages/docs/static/img/experimental/sankey/sankey-overview.webp
  - packages/docs/static/img/experimental/sankey/sankey-report-overview@2x.webp
  - packages/docs/static/img/experimental/setting.webp
  - packages/docs/static/img/filtering/conditions-1.webp
  - packages/docs/static/img/filtering/conditions-2.webp
  - packages/docs/static/img/filtering/filter.webp
  - packages/docs/static/img/filtering/filtered-total.webp
  - packages/docs/static/img/filtering/modify-saved.webp
  - packages/docs/static/img/filtering/multiple-filters.webp
  - packages/docs/static/img/filtering/save-filter.webp
  - packages/docs/static/img/filtering/select-saved-1.webp
  - packages/docs/static/img/filtering/select-saved-2.webp
  - packages/docs/static/img/filtering/selected-total.webp
  - packages/docs/static/img/filtering/set-filter-name.webp
  - packages/docs/static/img/filtering/year-1.webp
  - packages/docs/static/img/filtering/year-2.webp
  - packages/docs/static/img/fly/actual-config-1@2x.webp
  - packages/docs/static/img/fly/actual-config-2@2x.webp
  - packages/docs/static/img/fly/actual-register.webp
  - packages/docs/static/img/fly/fly-first-budget@2x.webp
  - packages/docs/static/img/fly/fly-welcome@2x.webp
  - >-
    packages/docs/static/img/getting-started/actual-intro-set-budget-category-average.webp
  - >-
    packages/docs/static/img/getting-started/actual-intro-set-budget-to-3-months-average.webp
  - >-
    packages/docs/static/img/getting-started/actual-intro-with-budget-numbers.webp
  - >-
    packages/docs/static/img/getting-started/starting-fresh-budget-history@2x.webp
  - >-
    packages/docs/static/img/getting-started/starting-fresh-set-3-month-average@2x.webp
  - >-
    packages/docs/static/img/getting-started/starting-fresh-set-category-average@2x.webp
  - packages/docs/static/img/getting-started/tracking-budget-page@2x.webp
  - >-
    packages/docs/static/img/getting-started/tracking-budget-pie-complete@2x.webp
  - >-
    packages/docs/static/img/getting-started/tracking-budget-pie-incomplete@2x.webp
  - packages/docs/static/img/getting-started/tracking-budget-pies@2x.webp
  - packages/docs/static/img/getting-started/tracking-budget-saved-hover@2x.webp
  - packages/docs/static/img/getting-started/tracking-budget-settings@2x.webp
  - packages/docs/static/img/getting-started/tracking-budget-summary@2x.webp
  - packages/docs/static/img/goal-template/adjustment-fixed.webp
  - packages/docs/static/img/goal-template/adjustment-percentage.webp
  - packages/docs/static/img/goal-template/adjustment-type.webp
  - packages/docs/static/img/goal-template/apply-template-category.png
  - packages/docs/static/img/goal-template/apply-template-group.png
  - packages/docs/static/img/goal-template/august-restaurants.webp
  - packages/docs/static/img/goal-template/automation-icon.webp
  - packages/docs/static/img/goal-template/automation-note.webp
  - packages/docs/static/img/goal-template/automation-tooltip-1.webp
  - packages/docs/static/img/goal-template/automation-tooltip-2.webp
  - packages/docs/static/img/goal-template/balance-cap.webp
  - packages/docs/static/img/goal-template/budget-indicators.webp
  - packages/docs/static/img/goal-template/cleanup-01.webp
  - packages/docs/static/img/goal-template/cleanup-global-weight.webp
  - packages/docs/static/img/goal-template/cleanup-global.webp
  - packages/docs/static/img/goal-template/create-named-pool.webp
  - packages/docs/static/img/goal-template/fixed-amount-automation.webp
  - packages/docs/static/img/goal-template/fully-funded-automation.webp
  - packages/docs/static/img/goal-template/goal-indicator.webp
  - packages/docs/static/img/goal-template/goal-template-1.webp
  - packages/docs/static/img/goal-template/goal-template-2.webp
  - packages/docs/static/img/goal-template/historical-automation.webp
  - packages/docs/static/img/goal-template/july-food.webp
  - packages/docs/static/img/goal-template/july-restaurants.webp
  - packages/docs/static/img/goal-template/june-restaurants.webp
  - packages/docs/static/img/goal-template/long-term-automation.webp
  - packages/docs/static/img/goal-template/long-term-fully-funded.webp
  - packages/docs/static/img/goal-template/long-term-overfunded.webp
  - packages/docs/static/img/goal-template/long-term-underfunded.webp
  - packages/docs/static/img/goal-template/migration.webp
  - packages/docs/static/img/goal-template/multiple-automations.webp
  - packages/docs/static/img/goal-template/named-pool-leftovers.webp
  - packages/docs/static/img/goal-template/new-automation.webp
  - packages/docs/static/img/goal-template/october-restaurants.webp
  - packages/docs/static/img/goal-template/percentage-automation.webp
  - packages/docs/static/img/goal-template/percentage-category.webp
  - packages/docs/static/img/goal-template/refill-active.webp
  - packages/docs/static/img/goal-template/refill-automation.webp
  - packages/docs/static/img/goal-template/remainder-automation.webp
  - packages/docs/static/img/goal-template/save-by-date-automation.webp
  - packages/docs/static/img/goal-template/schedule-automation.webp
  - packages/docs/static/img/goal-template/underfunded-automation.webp
  - packages/docs/static/img/homepage/actual-main-budget-dark.webp
  - packages/docs/static/img/homepage/actual-main-budget.webp
  - packages/docs/static/img/homepage/actual-main-transaction-dark.webp
  - packages/docs/static/img/homepage/actual-main-transaction.webp
  - packages/docs/static/img/homepage/actual-report-dashboard-dark.webp
  - packages/docs/static/img/homepage/actual-report-dashboard-light.webp
  - packages/docs/static/img/how-it-works/auto-hold-carryover.webp
  - packages/docs/static/img/how-it-works/auto-hold-disable.webp
  - packages/docs/static/img/how-it-works/auto-hold.webp
  - packages/docs/static/img/how-it-works/buffer-1.webp
  - packages/docs/static/img/import/import-csv@2x.webp
  - packages/docs/static/img/install/change-server.webp
  - packages/docs/static/img/install/desktop-app-set-up-sync@2x.webp
  - packages/docs/static/img/install/server-set-password@2x.webp
  - packages/docs/static/img/joint-accounts/jointaccount-1.webp
  - packages/docs/static/img/joint-accounts/jointaccount-2.webp
  - packages/docs/static/img/joint-accounts/jointaccount-3.webp
  - packages/docs/static/img/joint-accounts/jointaccount-4.webp
  - packages/docs/static/img/joint-accounts/jointaccount-5.webp
  - packages/docs/static/img/merge-transactions/merge-g.webp
  - packages/docs/static/img/migrating/actual-import-1.webp
  - packages/docs/static/img/migrating/actual-import-2.webp
  - packages/docs/static/img/migrating/nynab-import-select-file@2x.webp
  - packages/docs/static/img/migrating/nynab-import-source@2x.webp
  - packages/docs/static/img/monthly-cleanup/cleanup-01.webp
  - packages/docs/static/img/monthly-cleanup/cleanup-02.webp
  - packages/docs/static/img/multi-currency/account-name-and-note.webp
  - packages/docs/static/img/multi-currency/rule-1.webp
  - packages/docs/static/img/multi-currency/rule-2.webp
  - packages/docs/static/img/multi-currency/rule-action-normal-instructions.webp
  - packages/docs/static/img/multi-currency/rule-action-normal.webp
  - packages/docs/static/img/multi-currency/rule-action-template.webp
  - packages/docs/static/img/multi-currency/rule-action.webp
  - packages/docs/static/img/multi-currency/usage-convert.webp
  - packages/docs/static/img/multi-currency/usage-postconvert.webp
  - packages/docs/static/img/multi-currency/usage-preconvert.webp
  - packages/docs/static/img/multiuser/user-access-overview.webp
  - packages/docs/static/img/multiuser/user-access.webp
  - packages/docs/static/img/multiuser/user-directory-overview.webp
  - packages/docs/static/img/multiuser/user-directory.webp
  - packages/docs/static/img/notifications/notifications-page@2x.webp
  - packages/docs/static/img/oauth/first-login.webp
  - packages/docs/static/img/oauth/modal.webp
  - packages/docs/static/img/oauth/provider-requirement.webp
  - packages/docs/static/img/oauth/start-using-options.webp
  - packages/docs/static/img/payees/MergePayeesOption.webp
  - packages/docs/static/img/payees/MergePayeesSearch.webp
  - packages/docs/static/img/payees/PayeesMerged.webp
  - packages/docs/static/img/payees/PayeesSelected.webp
  - >-
    packages/docs/static/img/payees/payee-locations/payee-locations-nearby-autocomplete.png
  - >-
    packages/docs/static/img/payees/payee-locations/payee-locations-nearby-button.png
  - packages/docs/static/img/payees/payee-locations/payee-locations-request.png
  - packages/docs/static/img/payees/payee-locations/payee-locations-save.png
  - packages/docs/static/img/payees/payee-transfers.webp
  - packages/docs/static/img/reconcile/reconcile-1.webp
  - packages/docs/static/img/reconcile/reconcile-10-2025.webp
  - packages/docs/static/img/reconcile/reconcile-10.webp
  - packages/docs/static/img/reconcile/reconcile-11-2025.webp
  - packages/docs/static/img/reconcile/reconcile-12.webp
  - packages/docs/static/img/reconcile/reconcile-2-2025.webp
  - packages/docs/static/img/reconcile/reconcile-2.webp
  - packages/docs/static/img/reconcile/reconcile-3-2025.webp
  - packages/docs/static/img/reconcile/reconcile-3.webp
  - packages/docs/static/img/reconcile/reconcile-3a-2025.webp
  - packages/docs/static/img/reconcile/reconcile-4-2025.webp
  - packages/docs/static/img/reconcile/reconcile-4.webp
  - packages/docs/static/img/reconcile/reconcile-5-2025.webp
  - packages/docs/static/img/reconcile/reconcile-5.webp
  - packages/docs/static/img/reconcile/reconcile-6-2025.webp
  - packages/docs/static/img/reconcile/reconcile-6.webp
  - packages/docs/static/img/reconcile/reconcile-7.webp
  - packages/docs/static/img/reconcile/reconcile-8-2025.webp
  - packages/docs/static/img/reconcile/reconcile-8.webp
  - packages/docs/static/img/reconcile/reconcile-9-2025.webp
  - packages/docs/static/img/reconcile/reconcile-9.webp
  - packages/docs/static/img/reports/calendar-card.webp
  - packages/docs/static/img/reports/cash-flow.webp
  - packages/docs/static/img/reports/cr-center-menu.webp
  - packages/docs/static/img/reports/cr-example.webp
  - packages/docs/static/img/reports/cr-fancy-example.webp
  - packages/docs/static/img/reports/cr-left-menu.webp
  - packages/docs/static/img/reports/cr-page.webp
  - packages/docs/static/img/reports/cr-save.webp
  - packages/docs/static/img/reports/crossover-point-report/full-chart.webp
  - packages/docs/static/img/reports/custom-reports-center-menu@2x.webp
  - packages/docs/static/img/reports/custom-reports-dashboard-card@2x.webp
  - packages/docs/static/img/reports/custom-reports-example@2x.webp
  - packages/docs/static/img/reports/custom-reports-examples@2x.webp
  - packages/docs/static/img/reports/custom-reports-left-menu@2x.webp
  - packages/docs/static/img/reports/custom-reports-save@2x.webp
  - packages/docs/static/img/reports/dashboard.webp
  - packages/docs/static/img/reports/net-worth-stacked.webp
  - packages/docs/static/img/reports/net-worth.webp
  - packages/docs/static/img/reports/reports-calendar-card@2x.webp
  - packages/docs/static/img/reports/reports-cash-flow@2x.webp
  - packages/docs/static/img/reports/reports-crossover-point@2x.webp
  - packages/docs/static/img/reports/reports-dashboard@2x.webp
  - packages/docs/static/img/reports/reports-net-worth-stacked@2x.webp
  - packages/docs/static/img/reports/reports-net-worth@2x.webp
  - packages/docs/static/img/reports/reports-spending-analysis@2x.webp
  - packages/docs/static/img/reports/reports-summary-card@2x.webp
  - packages/docs/static/img/reports/reports-text-widget@2x.webp
  - packages/docs/static/img/reports/spending-analysis.webp
  - packages/docs/static/img/reports/summary-card.webp
  - packages/docs/static/img/reports/text-widget.webp
  - packages/docs/static/img/returns-reimbursements/reimbursement-1.webp
  - packages/docs/static/img/returns-reimbursements/reimbursement-2.webp
  - packages/docs/static/img/returns-reimbursements/returns-1.webp
  - packages/docs/static/img/returns-reimbursements/returns-2.webp
  - packages/docs/static/img/returns-reimbursements/returns-3.webp
  - packages/docs/static/img/returns-reimbursements/returns-4.webp
  - packages/docs/static/img/rules-custom/custom-rules-1.webp
  - packages/docs/static/img/rules-custom/custom-rules-2.webp
  - packages/docs/static/img/rules-custom/custom-rules-imported-payee.webp
  - packages/docs/static/img/rules-custom/custom-rules-transfer.webp
  - packages/docs/static/img/schedules/schedules-account-register.webp
  - packages/docs/static/img/schedules/schedules-account-register@2x.webp
  - packages/docs/static/img/schedules/schedules-add-repeat.webp
  - packages/docs/static/img/schedules/schedules-add-repeat@2x.webp
  - packages/docs/static/img/schedules/schedules-add-rule.webp
  - packages/docs/static/img/schedules/schedules-add-rule@2x.webp
  - >-
    packages/docs/static/img/schedules/schedules-add-with-repeat-and-autoadd.webp
  - >-
    packages/docs/static/img/schedules/schedules-add-with-repeat-and-autoadd@2x.webp
  - packages/docs/static/img/schedules/schedules-add.webp
  - packages/docs/static/img/schedules/schedules-add@2x.webp
  - packages/docs/static/img/schedules/schedules-amount.webp
  - packages/docs/static/img/schedules/schedules-amount@2x.webp
  - packages/docs/static/img/schedules/schedules-edit-as-rule.webp
  - packages/docs/static/img/schedules/schedules-edit-as-rule@2x.webp
  - packages/docs/static/img/schedules/schedules-find-matches.webp
  - packages/docs/static/img/schedules/schedules-find-matches@2x.webp
  - >-
    packages/docs/static/img/schedules/schedules-from-transaction-add-as-usual.webp
  - >-
    packages/docs/static/img/schedules/schedules-from-transaction-add-as-usual@2x.webp
  - >-
    packages/docs/static/img/schedules/schedules-from-transactions-link-schedule.webp
  - >-
    packages/docs/static/img/schedules/schedules-from-transactions-link-schedule@2x.webp
  - packages/docs/static/img/schedules/schedules-from-transactions.webp
  - packages/docs/static/img/schedules/schedules-from-transactions@2x.webp
  - packages/docs/static/img/schedules/schedules-manage.webp
  - packages/docs/static/img/schedules/schedules-manage@2x.webp
  - packages/docs/static/img/schedules/schedules-overview.webp
  - packages/docs/static/img/schedules/schedules-overview@2x.webp
  - packages/docs/static/img/schedules/schedules-rule-apply-action.webp
  - packages/docs/static/img/schedules/schedules-rule-apply-action@2x.webp
  - packages/docs/static/img/schedules/schedules-upcoming-length-dialog.webp
  - packages/docs/static/img/schedules/schedules-upcoming-length-dialog@2x.webp
  - packages/docs/static/img/schedules/schedules-upcoming-new-list.webp
  - packages/docs/static/img/schedules/schedules-upcoming-new-list@2x.webp
  - packages/docs/static/img/settings/settings-authentication@2x.webp
  - packages/docs/static/img/settings/settings-budget-id@2x.webp
  - packages/docs/static/img/settings/settings-budget-type@2x.webp
  - packages/docs/static/img/settings/settings-encryption@2x.webp
  - packages/docs/static/img/settings/settings-experimental@2x.webp
  - packages/docs/static/img/settings/settings-export@2x.webp
  - packages/docs/static/img/settings/settings-formatting@2x.webp
  - packages/docs/static/img/settings/settings-general@2x.webp
  - packages/docs/static/img/settings/settings-language@2x.webp
  - packages/docs/static/img/settings/settings-repair-splits@2x.webp
  - packages/docs/static/img/settings/settings-reset-cache@2x.webp
  - packages/docs/static/img/settings/settings-reset-sync@2x.webp
  - packages/docs/static/img/split-transactions/split-transactions-buttons.png
  - packages/docs/static/img/tags/filter.webp
  - packages/docs/static/img/tags/input-result.webp
  - packages/docs/static/img/tags/input.webp
  - packages/docs/static/img/tags/manage.webp
  - packages/docs/static/img/tips-tricks/command-palette.webp
  - packages/docs/static/img/tips-tricks/months-selector.webp
  - packages/docs/static/img/tips-tricks/running-balance.webp
  - packages/docs/static/img/tips-tricks/scrambled-scrambled-view.webp
  - packages/docs/static/img/tips-tricks/tips-tricks-command-palette@2x.webp
  - packages/docs/static/img/tips-tricks/tips-tricks-emojis@2x.webp
  - packages/docs/static/img/tips-tricks/tips-tricks-months-selector@2x.webp
  - packages/docs/static/img/tips-tricks/tips-tricks-privacy-filter@2x.webp
  - packages/docs/static/img/tips-tricks/tips-tricks-running-balance@2x.webp
  - packages/docs/static/img/tips-tricks/using-emojis.webp
  - packages/docs/static/img/tracking-budget-1.webp
  - packages/docs/static/img/tracking-budget-2.webp
  - packages/docs/static/img/tracking-budget-3.webp
  - packages/docs/static/img/tracking-budget-4.webp
  - packages/docs/static/img/tracking-budget-5.webp
  - packages/docs/static/img/tracking-budget-6.webp
  - packages/docs/static/img/tracking-budget-7.webp
  - packages/docs/static/img/transactions/bulk-editing-category@2x.webp
  - packages/docs/static/img/transactions/bulk-editing-duplicate@2x.webp
  - packages/docs/static/img/transactions/bulk-editing-fields@2x.webp
  - packages/docs/static/img/transactions/bulk-editing-notes-result@2x.webp
  - packages/docs/static/img/transactions/bulk-editing-notes@2x.webp
  - packages/docs/static/img/transactions/bulk-editing-search@2x.webp
  - packages/docs/static/img/transactions/bulk-editing-selected@2x.webp
  - packages/docs/static/img/transactions/bulk-editing-selection-menu@2x.webp
  - packages/docs/static/img/transactions/filters-category-operators@2x.webp
  - packages/docs/static/img/transactions/filters-date-operators@2x.webp
  - packages/docs/static/img/transactions/filters-field-list@2x.webp
  - packages/docs/static/img/transactions/filters-filtered-total@2x.webp
  - packages/docs/static/img/transactions/filters-modify-saved@2x.webp
  - packages/docs/static/img/transactions/filters-multiple@2x.webp
  - packages/docs/static/img/transactions/filters-name-filter@2x.webp
  - packages/docs/static/img/transactions/filters-save-filter@2x.webp
  - packages/docs/static/img/transactions/filters-saved-picker@2x.webp
  - packages/docs/static/img/transactions/filters-select-saved@2x.webp
  - packages/docs/static/img/transactions/filters-selected-total@2x.webp
  - packages/docs/static/img/transactions/filters-year-option@2x.webp
  - packages/docs/static/img/transactions/filters-year-value@2x.webp
  - packages/docs/static/img/transactions/importing-csv@2x.webp
  - packages/docs/static/img/transactions/merging-merge@2x.webp
  - >-
    packages/docs/static/img/transactions/payee-locations-nearby-autocomplete@2x.webp
  - packages/docs/static/img/transactions/payee-locations-nearby-button@2x.webp
  - packages/docs/static/img/transactions/payee-locations-request@2x.webp
  - packages/docs/static/img/transactions/payee-locations-save@2x.webp
  - packages/docs/static/img/transactions/payees-merge-option@2x.webp
  - packages/docs/static/img/transactions/payees-merged@2x.webp
  - packages/docs/static/img/transactions/payees-search@2x.webp
  - packages/docs/static/img/transactions/payees-selected@2x.webp
  - packages/docs/static/img/transactions/payees-transfers@2x.webp
  - packages/docs/static/img/transactions/split-transactions-buttons@2x.webp
  - packages/docs/static/img/transactions/tags-filter@2x.webp
  - packages/docs/static/img/transactions/tags-input-result@2x.webp
  - packages/docs/static/img/transactions/tags-input@2x.webp
  - packages/docs/static/img/transactions/tags-manage@2x.webp
  - packages/docs/static/img/transactions/transfers-linked-pair@2x.webp
  - packages/docs/static/img/transactions/transfers-make-transfer@2x.webp
  - packages/docs/static/img/transactions/transfers-payees-dropdown@2x.webp
  - packages/docs/static/img/transactions/transfers-sync-both-dates@2x.webp
  - packages/docs/static/img/transfers/make-transfer-tooltip.webp
  - packages/docs/static/img/transfers/payees-dropdown.webp
  - packages/docs/static/img/transfers/transfer-complete.webp
  - packages/docs/static/img/transfers/transfers-sync-both-dates.png
  - packages/docs/static/img/using-actual/actual-budget-cache.webp
  - packages/docs/static/img/using-actual/actual-budget-method.webp
  - packages/docs/static/img/using-actual/actual-budgetid.webp
  - packages/docs/static/img/using-actual/actual-experimental.webp
  - packages/docs/static/img/using-actual/actual-languages.webp
  - packages/docs/static/img/using-actual/actual-openid.webp
  - packages/docs/static/img/using-actual/actual-repair.webp
  - packages/docs/static/img/using-actual/actual-reset-sync.webp
  - packages/docs/static/img/using-actual/actual-settings.webp
  - packages/docs/static/img/using-actual/in-app-notifications.webp
  - packages/docs/static/img/using-actual/settings-encryption.webp
  - packages/docs/static/img/using-actual/settings-export.webp
  - packages/docs/static/img/using-actual/settings-formatting.webp
  - packages/eslint-plugin-actual/package.json
  - packages/loot-core/package.json
  - packages/loot-core/src/platform/client/browser-preload/start.ts
  - packages/loot-core/src/platform/client/browser-preload/worker-bridge.test.ts
  - packages/loot-core/src/platform/client/browser-preload/worker-bridge.ts
  - packages/loot-core/src/platform/client/browser-server/coordinator.test.ts
  - packages/loot-core/src/platform/client/browser-server/coordinator.ts
  - packages/loot-core/src/platform/server/asyncStorage/index.electron.test.ts
  - packages/loot-core/src/platform/server/asyncStorage/index.electron.ts
  - packages/loot-core/src/platform/server/fs/atomic-write.test.ts
  - packages/loot-core/src/platform/server/fs/atomic-write.ts
  - packages/loot-core/src/platform/server/fs/index.api.ts
  - packages/loot-core/src/platform/server/fs/index.electron.ts
  - packages/loot-core/src/platform/server/sqlite/index.electron.ts
  - packages/loot-core/src/platform/server/sqlite/index.test.ts
  - packages/loot-core/src/platform/server/sqlite/index.ts
  - packages/loot-core/src/platform/server/sqlite/regexp.test.ts
  - packages/loot-core/src/platform/server/sqlite/regexp.ts
  - packages/loot-core/src/server/accounts/app-bank-sync.test.ts
  - packages/loot-core/src/server/accounts/app.ts
  - packages/loot-core/src/server/accounts/sync.test.ts
  - packages/loot-core/src/server/accounts/sync.ts
  - packages/loot-core/src/server/api.test.ts
  - packages/loot-core/src/server/api.ts
  - packages/loot-core/src/server/aql/compiler.ts
  - packages/loot-core/src/server/auth/app.ts
  - packages/loot-core/src/server/budget/actions.test.ts
  - packages/loot-core/src/server/budget/app.test.ts
  - packages/loot-core/src/server/budget/app.ts
  - packages/loot-core/src/server/budget/base.ts
  - packages/loot-core/src/server/budget/category-template-context.test.ts
  - packages/loot-core/src/server/budget/category-template-context.ts
  - packages/loot-core/src/server/budget/goal-template.pegjs
  - packages/loot-core/src/server/budget/schedule-template.test.ts
  - packages/loot-core/src/server/budget/schedule-template.ts
  - packages/loot-core/src/server/budget/template-notes.test.ts
  - packages/loot-core/src/server/budgetfiles/app.ts
  - packages/loot-core/src/server/cloud-import.test.ts
  - packages/loot-core/src/server/cloud-storage.ts
  - packages/loot-core/src/server/dashboard/app.test.ts
  - packages/loot-core/src/server/dashboard/app.ts
  - packages/loot-core/src/server/db/index.test.ts
  - packages/loot-core/src/server/db/index.ts
  - packages/loot-core/src/server/db/types/index.ts
  - packages/loot-core/src/server/importers/ynab4-types.ts
  - packages/loot-core/src/server/importers/ynab4.test.ts
  - packages/loot-core/src/server/importers/ynab4.ts
  - packages/loot-core/src/server/main.test.ts
  - packages/loot-core/src/server/migrate/additive-migrations.test.ts
  - packages/loot-core/src/server/migrate/migrations.test.ts
  - packages/loot-core/src/server/reports/app.test.ts
  - packages/loot-core/src/server/reports/app.ts
  - packages/loot-core/src/server/rules/action.ts
  - packages/loot-core/src/server/rules/formula-action-integration.test.ts
  - packages/loot-core/src/server/rules/formula-action.test.ts
  - packages/loot-core/src/server/rules/index.test.ts
  - packages/loot-core/src/server/rules/split-parent-context.test.ts
  - packages/loot-core/src/server/schedules/app.test.ts
  - packages/loot-core/src/server/schedules/app.ts
  - packages/loot-core/src/server/schedules/occurrences.test.ts
  - packages/loot-core/src/server/schedules/occurrences.ts
  - packages/loot-core/src/server/sheet.ts
  - packages/loot-core/src/server/spreadsheet/graph-data-structure.test.ts
  - packages/loot-core/src/server/spreadsheet/graph-data-structure.ts
  - packages/loot-core/src/server/spreadsheet/spreadsheet.ts
  - packages/loot-core/src/server/tags/app.test.ts
  - packages/loot-core/src/server/tags/app.ts
  - packages/loot-core/src/server/transactions/transaction-rules.test.ts
  - packages/loot-core/src/server/transactions/transaction-rules.ts
  - packages/loot-core/src/shared/async.test.ts
  - packages/loot-core/src/shared/currencies.ts
  - packages/loot-core/src/shared/errors.ts
  - packages/loot-core/src/shared/tags.ts
  - packages/loot-core/src/shared/transactions.test.ts
  - packages/loot-core/src/shared/util.test.ts
  - packages/loot-core/src/shared/util.ts
  - packages/loot-core/src/types/api-handlers.ts
  - packages/loot-core/src/types/models/account.ts
  - packages/loot-core/src/types/models/dashboard.ts
  - packages/loot-core/src/types/models/reports.ts
  - packages/loot-core/src/types/models/rule.ts
  - packages/loot-core/src/types/prefs.ts
  - packages/loot-core/src/types/util.ts
  - packages/loot-core/typings/process-worker.ts
  - packages/loot-core/vitest.config.ts
  - packages/loot-core/vitest.web.config.ts
  - packages/mobile-client/capacitor.config.ts
  - packages/mobile-client/ios/App/App.xcodeproj/project.pbxproj
  - packages/mobile-client/ios/App/App/Info.plist
  - packages/mobile-client/ios/App/ExportOptions.plist
  - packages/mobile-client/ios/App/Podfile.lock
  - packages/mobile-client/package.json
  - packages/plugins-service/package.json
  - packages/sync-server/docker/ubuntu.Dockerfile
  - packages/sync-server/package.json
  - packages/sync-server/src/accounts/openid.test.ts
  - packages/sync-server/src/accounts/openid.ts
  - packages/sync-server/src/accounts/password.js
  - packages/sync-server/src/accounts/password.test.js
  - packages/sync-server/src/app-account.js
  - packages/sync-server/src/app-account.test.js
  - packages/sync-server/src/app-cors-proxy.js
  - packages/sync-server/src/app-cors-proxy.test.js
  - packages/sync-server/src/app-enablebanking/app-enablebanking.ts
  - packages/sync-server/src/app-enablebanking/services/enablebanking-service.ts
  - >-
    packages/sync-server/src/app-enablebanking/services/tests/enablebanking-service.spec.ts
  - >-
    packages/sync-server/src/app-enablebanking/services/tests/normalization.spec.ts
  - packages/sync-server/src/app-enablebanking/tests/callback-logging.test.ts
  - >-
    packages/sync-server/src/app-enablebanking/tests/configure-permissions.test.ts
  - packages/sync-server/src/app-enablebanking/tests/poll-auth.spec.ts
  - packages/sync-server/src/app-enablebanking/tests/transactions.spec.ts
  - packages/sync-server/src/app-enablebanking/utils/errors.ts
  - packages/sync-server/src/app-gocardless/app-gocardless.test.ts
  - packages/sync-server/src/app-gocardless/app-gocardless.ts
  - packages/sync-server/src/app-gocardless/banks/commerzbank_cobadeff.ts
  - >-
    packages/sync-server/src/app-gocardless/banks/tests/commerzbank_cobadeff.spec.ts
  - >-
    packages/sync-server/src/app-gocardless/banks/tests/fixtures/commerzbank-hostile.mjs
  - packages/sync-server/src/app-gocardless/services/gocardless-api.ts
  - packages/sync-server/src/app-gocardless/services/gocardless-service.ts
  - >-
    packages/sync-server/src/app-gocardless/util/gocardless-error-details.test.ts
  - packages/sync-server/src/app-gocardless/util/gocardless-error-details.ts
  - packages/sync-server/src/app-gocardless/util/handle-error.ts
  - packages/sync-server/src/app-https-config.test.ts
  - packages/sync-server/src/app-pluggyai/app-pluggyai.js
  - packages/sync-server/src/app-pluggyai/pluggyai-service.js
  - packages/sync-server/src/app-simplefin/app-simplefin.js
  - packages/sync-server/src/app-simplefin/app-simplefin.test.js
  - packages/sync-server/src/app-simplefin/fetch.integration.test.ts
  - packages/sync-server/src/app-simplefin/ssrf.test.ts
  - packages/sync-server/src/app-sync.test.ts
  - packages/sync-server/src/app-sync.ts
  - packages/sync-server/src/app-sync/errors.ts
  - packages/sync-server/src/app-sync/validation.test.ts
  - packages/sync-server/src/app-sync/validation.ts
  - packages/sync-server/src/app.ts
  - packages/sync-server/src/deleted-budget-bank-sync.test.ts
  - packages/sync-server/src/load-config.js
  - packages/sync-server/src/scripts/health-check.ts
  - packages/sync-server/src/services/secrets-service.js
  - packages/sync-server/src/services/user-service.ts
  - packages/sync-server/src/simplefin-config.test.ts
  - packages/sync-server/src/util/atomic-write.test.ts
  - packages/sync-server/src/util/atomic-write.ts
  - packages/sync-server/src/util/middlewares.test.ts
  - packages/sync-server/src/util/middlewares.ts
  - packages/sync-server/src/util/paths.test.ts
  - packages/sync-server/src/util/paths.ts
  - packages/sync-server/src/util/sensitive-logging.test.ts
  - packages/sync-server/src/util/ssrf.test.ts
  - packages/sync-server/src/util/ssrf.ts
  - sync-server.Dockerfile
  - upcoming-release-notes/4985.md
  - upcoming-release-notes/8355.md
  - upcoming-release-notes/8783.md
  - upcoming-release-notes/8800.md
  - upcoming-release-notes/8950.md
  - upcoming-release-notes/8973.md
  - upcoming-release-notes/9189.md
  - upcoming-release-notes/9205.md
  - upcoming-release-notes/9258.md
  - upcoming-release-notes/add-account-groups-management-ui.md
  - upcoming-release-notes/add-api-setpreference.md
  - upcoming-release-notes/add-bangladeshi-taka-currency.md
  - upcoming-release-notes/add-coderabbit-slop-detection.md
  - upcoming-release-notes/add-component-size-tokens.md
  - upcoming-release-notes/add-karma-theme.md
  - upcoming-release-notes/add-new-sidebar-account-list.md
  - upcoming-release-notes/add-new-sidebar-interactions.md
  - upcoming-release-notes/add-new-sidebar-reorder.md
  - upcoming-release-notes/add-new-sidebar-shell.md
  - upcoming-release-notes/add-norwegian-krone-currency.md
  - upcoming-release-notes/add-porcelain-theme.md
  - upcoming-release-notes/add-sidebar-right-border.md
  - upcoming-release-notes/add-tabedzki-main-contributor.md
  - upcoming-release-notes/add-tags-to-bulk-edit-notes.md
  - upcoming-release-notes/add-tzs-currency.md
  - upcoming-release-notes/add-zar-currency.md
  - upcoming-release-notes/all-accounts-toggle-reconciled.md
  - upcoming-release-notes/api-get-schedule-dates.md
  - upcoming-release-notes/api-merge-transactions.md
  - upcoming-release-notes/api-update-split-child-fields.md
  - upcoming-release-notes/api-warn-deferred-sync-changes.md
  - upcoming-release-notes/atomic-user-file-write.md
  - upcoming-release-notes/automatic-bank-sync.md
  - upcoming-release-notes/avoid-commerzbank-import-stalls.md
  - upcoming-release-notes/balance-forecast-zero-based-axis.md
  - upcoming-release-notes/bank-sync-api-returns-reconciled-ids.md
  - upcoming-release-notes/batch-dashboard-layout-updates.md
  - upcoming-release-notes/batch-sync-writes.md
  - upcoming-release-notes/budget-import-progress.md
  - upcoming-release-notes/bump-brace-expansion.md
  - upcoming-release-notes/bump-dependencies-october.md
  - upcoming-release-notes/bump-nanoid.md
  - upcoming-release-notes/bump-node-24-22-1.md
  - upcoming-release-notes/bump-vitest.md
  - upcoming-release-notes/calculator-hold-backspace.md
  - upcoming-release-notes/category-funding.md
  - upcoming-release-notes/clear-cache-on-reset.md
  - upcoming-release-notes/close-stale-wip-prs.md
  - upcoming-release-notes/cross-version-sync-compatibility.md
  - upcoming-release-notes/csv-import-unchecked-match.md
  - upcoming-release-notes/customize-sidebar-menu.md
  - upcoming-release-notes/dashboard-widgets-load-in-edit-mode.md
  - upcoming-release-notes/daterange-in-formula-card.md
  - upcoming-release-notes/deleted-budget-bank-sync.md
  - upcoming-release-notes/desktop-data-folder-error.md
  - upcoming-release-notes/disable-node-options-fuse.md
  - upcoming-release-notes/docs-add-rauthy-tested-oidc.md
  - upcoming-release-notes/docs-community-repos-india2actual.md
  - upcoming-release-notes/docs-community-repos-mcp-section.md
  - upcoming-release-notes/docs-mash-install-option.md
  - upcoming-release-notes/enable-react-compiler-lint-rules.md
  - upcoming-release-notes/envelope-budgeting-typo-fix.md
  - upcoming-release-notes/exclude-callback-secrets-from-logs.md
  - upcoming-release-notes/experimental-feedback-links.md
  - upcoming-release-notes/faster-browser-row-reads.md
  - upcoming-release-notes/faster-reset-budget-cache.md
  - upcoming-release-notes/faster-spreadsheet-cache-writes.md
  - upcoming-release-notes/faster-spreadsheet-topological-sort.md
  - upcoming-release-notes/fix-account-group-balance-sync.md
  - upcoming-release-notes/fix-age-of-money-privacy-alignment.md
  - upcoming-release-notes/fix-apply-transaction-freeze.md
  - upcoming-release-notes/fix-balance-forecast-privacy-alignment.md
  - upcoming-release-notes/fix-browser-memory-large-budgets.md
  - upcoming-release-notes/fix-camt-file-encoding.md
  - upcoming-release-notes/fix-context-menu-after-rename.md
  - upcoming-release-notes/fix-cross-month-net-worth-transfers.md
  - upcoming-release-notes/fix-csv-import-sept-month.md
  - upcoming-release-notes/fix-csv-utf16-import.md
  - upcoming-release-notes/fix-custom-css-indicator-layout.md
  - upcoming-release-notes/fix-custom-report-legend-scroll.md
  - upcoming-release-notes/fix-desktop-startup-log-test.md
  - upcoming-release-notes/fix-disable-date-formula.md
  - upcoming-release-notes/fix-dockerfile-peggy.md
  - upcoming-release-notes/fix-enable-banking-repeated-page.md
  - upcoming-release-notes/fix-enablebanking-counterparty.md
  - upcoming-release-notes/fix-exact-match-payee-autocomplete-ranking.md
  - upcoming-release-notes/fix-export-small-zip.md
  - upcoming-release-notes/fix-fuzzy-match-prefer-unlinked.md
  - upcoming-release-notes/fix-gocardless-invalid-token.md
  - upcoming-release-notes/fix-ios-app-startup-and-notch.md
  - upcoming-release-notes/fix-live-spending-report-month.md
  - upcoming-release-notes/fix-mobile-category-group-drag.md
  - upcoming-release-notes/fix-mobile-category-learning.md
  - upcoming-release-notes/fix-mobile-clear-payee.md
  - upcoming-release-notes/fix-mobile-date-picker-chrome.md
  - upcoming-release-notes/fix-mobile-running-balance-hidden-reconciled.md
  - upcoming-release-notes/fix-monte-carlo-rule-change-wording.md
  - upcoming-release-notes/fix-monte-carlo-rules-zero-spend.md
  - upcoming-release-notes/fix-monte-carlo-spending-floor-after-failure.md
  - upcoming-release-notes/fix-multitab-takeover.md
  - upcoming-release-notes/fix-net-worth-privacy-alignment.md
  - upcoming-release-notes/fix-new-sidebar-custom-light-themes.md
  - upcoming-release-notes/fix-number-input-focus-bounce.md
  - upcoming-release-notes/fix-offline-startup.md
  - upcoming-release-notes/fix-ofx-charset-decoding.md
  - upcoming-release-notes/fix-periodic-template-intervals.md
  - upcoming-release-notes/fix-report-interval-date-format.md
  - upcoming-release-notes/fix-running-balance-text-selection.md
  - upcoming-release-notes/fix-schedule-auto-post-same-day.md
  - upcoming-release-notes/fix-schedule-next-date-after-weekend.md
  - upcoming-release-notes/fix-schedule-template-long-day-interval.md
  - upcoming-release-notes/fix-schedules-stuck-before-weekend.md
  - upcoming-release-notes/fix-settings-theme-e2e-test.md
  - upcoming-release-notes/fix-sidebar-rename-arrow-keys.md
  - upcoming-release-notes/fix-simplefin-server-fetch.md
  - upcoming-release-notes/fix-spending-analysis-tracking-budget.md
  - upcoming-release-notes/fix-store-install-global-prefs.md
  - upcoming-release-notes/fix-tab-after-picking-date-with-mouse.md
  - upcoming-release-notes/fix-theme-color-ordering.md
  - upcoming-release-notes/fix-tips-tricks-documentation.md
  - upcoming-release-notes/fix-windows-loot-core-backend-build.md
  - upcoming-release-notes/forecast-widget-granularity.md
  - upcoming-release-notes/gocardless-missing-credentials-error.md
  - upcoming-release-notes/gocardless-surface-error-reason.md
  - upcoming-release-notes/gruvbox-catalog-preview.md
  - upcoming-release-notes/https-env-newlines.md
  - upcoming-release-notes/i18n-context-post-notes.md
  - upcoming-release-notes/import-amount-currency-suffix.md
  - upcoming-release-notes/keep-cleared-fields-on-new-transactions.md
  - upcoming-release-notes/keep-mobile-payee-rule-filter.md
  - upcoming-release-notes/keep-posted-schedules-paid-today.md
  - upcoming-release-notes/keep-split-focus-on-parent-payment.md
  - upcoming-release-notes/learn-category-oneof-rule.md
  - upcoming-release-notes/merge-duplicate-themes-directories.md
  - upcoming-release-notes/migrate-app-sync-validation-to-typescript.md
  - upcoming-release-notes/migrate-create-folders-to-typescript.md
  - upcoming-release-notes/mobile-bottom-sheets.md
  - upcoming-release-notes/mobile-reconciled-toggle.md
  - upcoming-release-notes/mobile-reconciliation-back-navigation.md
  - upcoming-release-notes/monte-carlo-avoid-resimulating.md
  - upcoming-release-notes/monte-carlo-block-bootstrap.md
  - upcoming-release-notes/monte-carlo-cashflow-chart.md
  - upcoming-release-notes/monte-carlo-contribution-income-cap-hint.md
  - upcoming-release-notes/monte-carlo-custom-allocation-mix.md
  - upcoming-release-notes/monte-carlo-historical-inflation.md
  - upcoming-release-notes/monte-carlo-income-streams.md
  - upcoming-release-notes/monte-carlo-investment-phases.md
  - upcoming-release-notes/monte-carlo-linked-account-polish.md
  - upcoming-release-notes/monte-carlo-pot-balances-chart.md
  - upcoming-release-notes/monte-carlo-rule-explanations.md
  - upcoming-release-notes/notifications-page-readability.md
  - upcoming-release-notes/preserve-qif-import-categories.md
  - upcoming-release-notes/preserve-schedule-split-payees.md
  - upcoming-release-notes/protect-bank-synced-split-children.md
  - upcoming-release-notes/protect-csv-formulas-after-bom.md
  - upcoming-release-notes/protect-local-import-destinations.md
  - upcoming-release-notes/prune-lage-cache-in-ci.md
  - upcoming-release-notes/refresh-dashboard-on-sync.md
  - upcoming-release-notes/release-cut-prs.md
  - upcoming-release-notes/remove-flatpak-release-asset.md
  - upcoming-release-notes/reorganize-docs-sidebar.md
  - upcoming-release-notes/report-interval-click-through.md
  - upcoming-release-notes/require-admin-enablebanking-configuration.md
  - upcoming-release-notes/resize-cash-flow-summary-cards.md
  - upcoming-release-notes/restrict-desktop-navigation.md
  - upcoming-release-notes/restrict-external-links.md
  - upcoming-release-notes/restrict-ssrf-address-ranges.md
  - upcoming-release-notes/retry-weblate-lock-conflicts.md
  - upcoming-release-notes/revoke-sessions-on-password-change.md
  - upcoming-release-notes/revoke-sessions-on-sign-out.md
  - upcoming-release-notes/rule-formula-amount-units.md
  - upcoming-release-notes/rules-invalid-regex-preview.md
  - upcoming-release-notes/rules-payee-is-nothing.md
  - upcoming-release-notes/sankey-add-transfers.md
  - upcoming-release-notes/sankey-bugfix-no-budget-exists.md
  - upcoming-release-notes/sankey-missing-payee-name-bug.md
  - upcoming-release-notes/settings-grouped-rows.md
  - upcoming-release-notes/settings-page-navigation.md
  - upcoming-release-notes/show-commit-hash-on-edge-builds.md
  - upcoming-release-notes/sidebar-feedback.md
  - upcoming-release-notes/simplefin-network-policy.md
  - upcoming-release-notes/simplefin-per-budget.md
  - upcoming-release-notes/simplify-new-sidebar-budget-name.md
  - upcoming-release-notes/skip-running-balance-query.md
  - upcoming-release-notes/smooth-report-card-resizing.md
  - upcoming-release-notes/split-custom-reports-by-tags.md
  - upcoming-release-notes/split-parent-formula-context.md
  - upcoming-release-notes/stabilize-e2e-timing.md
  - upcoming-release-notes/stacked-bar-tooltip-truncation-indicator.md
  - upcoming-release-notes/stop-welcome.md
  - upcoming-release-notes/strip-publish-config.md
  - upcoming-release-notes/support-file-mounted-secrets.md
  - upcoming-release-notes/sync-timestamp-counter-overflow.md
  - upcoming-release-notes/tag-report-calculations.md
  - upcoming-release-notes/tour-to-budget-displayed-month.md
  - upcoming-release-notes/update-release-security-dependencies.md
  - upcoming-release-notes/use-chf-swiss-franc-symbol.md
  - upcoming-release-notes/validate-server-password-input.md
  - upcoming-release-notes/verify-current-server-password.md
  - upcoming-release-notes/whats-new-feed.md
  - upcoming-release-notes/ynab4-budget-notes.md
  - yarn.lock
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bring the fork up to Actual Budget's newest release, v26.11.0 (tag commit 1766241e3; the tag is already in this repository, do not fetch). main is based on v26.10.0. The release is 4 commits, about 1,830 files. A trial merge is clean: `git merge-tree --write-tree main v26.11.0` exits 0.

Do exactly this on the task branch: `git merge --no-ff v26.11.0` (no hand edits), then `node .yarn/releases/yarn-4.17.1.cjs install`, then the test gate. Do not fetch, push or change remotes.

Rule-file exception for this task only: the merge brings upstream's one-line change to AGENTS.md (the .nvmrc version it mentions, v24.18.1 to v24.22.1). Keep that line as merged. Change nothing else in AGENTS.md, CLAUDE.md, .claude/, t3.json, land.conf, backlog/ or docs/.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The task branch has exactly one new commit: a merge whose first parent is the main commit the branch started from and whose second parent is tag v26.11.0 (1766241e3).
- [x] #2 The merge commit's tree equals the output of `git merge-tree --write-tree HEAD^1 v26.11.0` (a clean merge: no hand edits, no extra files).
- [x] #3 `git diff --stat HEAD^1 HEAD -- backlog docs land.conf .claude CLAUDE.md t3.json` is empty, and `git diff HEAD^1 HEAD -- AGENTS.md` shows only upstream's one .nvmrc version line.
- [x] #4 After `node .yarn/releases/yarn-4.17.1.cjs install`, the gate `node .yarn/releases/yarn-4.17.1.cjs typecheck && node .yarn/releases/yarn-4.17.1.cjs lint && node .yarn/releases/yarn-4.17.1.cjs test` passes on the merge commit, and the working tree is clean afterwards (the install changed no tracked file).
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-13: rung 1 candidate 076fbe1f5 is the correct clean merge (tree 450bc19e, checks 1 to 3 pass, typecheck passes) but the gate stops at lint for a reason already on main; waits on TASK-14, then the merge is redone from the new main.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Landed task-1-upstream-v26-11-0 as 431d8877c on 2026-11-13.
<!-- SECTION:FINAL_SUMMARY:END -->
