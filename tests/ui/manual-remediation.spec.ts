import { test, expect } from '@playwright/test';
import { ApiClient } from '../../src/api/apiClient';
import { AuthApi } from '../../src/api/authApi';
import { AdminApi } from '../../src/api/adminApi';
import { ScansApi } from '../../src/api/scansApi';
import { AlertsApi, Alert } from '../../src/api/alertsApi';
import { env } from '../../src/utils/env';
import { logger } from '../../src/utils/logger';

test.describe('Alert Life Cycle - Manual Remediation', () => {
    //I increased the timout for the UI test only since the flow is long and the Plawright defualt is only 30 sec. this makes sure other tests still test with defualt of 30 sec. 
  test.describe.configure({ timeout: 120000  });

  let alertsApi: AlertsApi;
  let selectedAlert: Alert;

  test.beforeEach(async ({ request }) => {
    const apiClient = new ApiClient(request);
    const authApi = new AuthApi(request);

    logger.info('Authenticating API client');
    const token = await authApi.login();
    apiClient.setAuthToken(token);

    const adminApi = new AdminApi(apiClient);
    const scansApi = new ScansApi(apiClient);
    alertsApi = new AlertsApi(apiClient);

    logger.info('Resetting data before UI flow');
    await adminApi.resetData();

    logger.info('Starting scan to create alerts');
    await scansApi.startScan();
    await scansApi.waitForScanToComplete();

    logger.info('Finding OPEN alert with Auto Remediate OFF');
    selectedAlert = await alertsApi.findManualRemediationAlert();

    logger.info(`Selected alert for test: ${selectedAlert.id}`);
  });

  test('should manually remediate an open alert through the UI', async ({ page }) => {
    const drawer = page.getByTestId('alert-details-drawer');
    const finalComment = 'Remediation verified successfully and issue is resolved';

    await test.step('Login and open selected alert', async () => {
      await page.goto(`${env.webBaseUrl}/login`);

      await page.getByRole('textbox', { name: 'Email Address' }).fill(env.username);
      await page.getByRole('textbox', { name: 'Password' }).fill(env.password);
      await page.getByRole('button', { name: 'Sign in' }).click();

      await page.getByRole('link', { name: 'Alerts' }).click();
      await page.getByText(selectedAlert.assetDisplayName!, { exact: false }).click();

      await expect(drawer).toBeVisible();
    });

    await test.step('Assign alert to Security Analyst', async () => {
          logger.info('Assigning alert to Security Analyst');

      await drawer.getByRole('button', { name: 'Assign alert' }).click();
      await page.getByRole('option', { name: 'Security Analyst' }).click();

      await expect(
        drawer.getByRole('button', { name: 'Assign alert' })
      ).toContainText('Security Analyst');
      logger.info('Alert assigned to Security Analyst successfully');
    });

    await test.step('Move alert to In Progress', async () => {
        logger.info(`Changing alert ${selectedAlert.id} status to IN_PROGRESS`);
      await drawer.getByRole('button', { name: 'Change alert status' }).click();
      await page.getByRole('option', { name: 'In Progress' }).click();

      await expect(
        drawer.getByRole('button', { name: 'Change alert status' })
      ).toContainText('In Progress');
        logger.info(`Alert ${selectedAlert.id} status changed to IN_PROGRESS`);

    });

    await test.step('Start manual remediation', async () => {
         logger.info(`Starting manual remediation for alert ${selectedAlert.id}`);
      await drawer.getByRole('button', { name: 'Remediation ▶' }).click();
      await drawer.getByRole('textbox', { name: 'Remediation note' })
        .fill('Manual remediation completed by automation test');

      await drawer.getByRole('button', { name: 'Remediate' }).click();

      logger.info(`Manual remediation submitted for alert ${selectedAlert.id}`);
  logger.info('Waiting for remediation to complete');
      await alertsApi.waitForStatus(
  selectedAlert.id,
  'REMEDIATED_WAITING_FOR_CUSTOMER',
  90000
);
logger.info(`Alert ${selectedAlert.id} remediation completed`);
    });

    await test.step('Resolve alert and add final comment', async () => {
        logger.info(`Reloading page before resolving alert ${selectedAlert.id}`);
      await page.reload();

      await page.getByText(selectedAlert.assetDisplayName!, { exact: false }).click();

       logger.info(`Changing alert ${selectedAlert.id} status to RESOLVED`);
      await drawer.getByRole('button', { name: 'Change alert status' }).click();
      await page.getByRole('option', { name: 'Resolved' }).click();

      logger.info(`Adding final verification comment to alert ${selectedAlert.id}`);
      await drawer.getByRole('textbox', { name: 'Comment message' }).fill(finalComment);
      await drawer.getByRole('button', { name: 'Post comment' }).click();

      await expect(
        drawer.getByRole('button', { name: 'Change alert status' })
      ).toContainText('Resolved');

      await expect(drawer.getByText(finalComment)).toBeVisible();
      logger.info(`Alert ${selectedAlert.id} resolved and final comment was added`);
    });

    await test.step('Verify final alert state through API', async () => {
      const finalAlert = await alertsApi.getAlert(selectedAlert.id);

      expect(finalAlert.status).toBe('RESOLVED');
      logger.info(`Final API verification passed for alert ${selectedAlert.id}`);
      expect(
        finalAlert.comments?.some(comment => comment.message === finalComment)
      ).toBeTruthy();
    });
  });
});