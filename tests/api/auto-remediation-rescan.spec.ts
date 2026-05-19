import { test, expect } from '@playwright/test';
import { ApiClient } from '../../src/api/apiClient';
import { AuthApi } from '../../src/api/authApi';
import { AdminApi } from '../../src/api/adminApi';
import { ScansApi } from '../../src/api/scansApi';
import { AlertsApi } from '../../src/api/alertsApi';
import { logger } from '../../src/utils/logger';

test.describe('Alert Life Cycle - Auto-Remediation and Rescan Verification', () => {
  test.describe.configure({ timeout: 120000 });

  test('should not recreate an identical alert after auto-remediation and rescan @expected-failure', async ({ request }) => {
    const apiClient = new ApiClient(request);
    const authApi = new AuthApi(request);

    logger.info('Authenticating API client');
    const token = await authApi.login();
    apiClient.setAuthToken(token);

    const adminApi = new AdminApi(apiClient);
    const scansApi = new ScansApi(apiClient);
    const alertsApi = new AlertsApi(apiClient);

    const finalComment = 'Remediation verified successfully and issue is resolved';

    await test.step('Reset data and start initial scan', async () => {
      logger.info('Resetting data before auto-remediation flow');
      await adminApi.resetData();

      logger.info('Starting initial scan');
      await scansApi.startScan();
      await scansApi.waitForScanToComplete();
    });

    let originalAlert = await test.step('Find auto-remediated alert', async () => {
      logger.info('Finding alert with Auto Remediate ON');
      const alert = await alertsApi.findAutoRemediationAlert();

      logger.info(
        `Selected auto-remediation alert: ${alert.id}, policyId=${alert.policyId}, assetId=${alert.assetId}, violationType=${alert.violationType}`
      );

      return alert;
    });

    await test.step('Wait for auto-remediation to complete', async () => {
      logger.info(`Waiting for auto-remediation to complete for alert ${originalAlert.id}`);

      originalAlert = await alertsApi.waitForStatus(
        originalAlert.id,
        'REMEDIATED_WAITING_FOR_CUSTOMER',
        90000
      );

      logger.info(`Auto-remediation completed for alert ${originalAlert.id}`);
    });

    await test.step('Resolve alert and add verification comment', async () => {
      logger.info(`Changing alert ${originalAlert.id} status to RESOLVED`);
      await alertsApi.updateStatus(originalAlert.id, 'RESOLVED');

      logger.info(`Adding verification comment to alert ${originalAlert.id}`);
      await alertsApi.addComment(originalAlert.id, finalComment);

      const resolvedAlert = await alertsApi.getAlert(originalAlert.id);

      expect(resolvedAlert.status).toBe('RESOLVED');
      expect(
        resolvedAlert.comments?.some(comment => comment.message === finalComment)
      ).toBeTruthy();

      logger.info(`Alert ${originalAlert.id} resolved and verified`);
    });

    await test.step('Start rescan', async () => {
      logger.info('Starting rescan after resolving auto-remediated alert');
      await scansApi.startScan();
      await scansApi.waitForScanToComplete();

      logger.info('Rescan completed');
    });

    await test.step('Verify identical alert was not recreated', async () => {
      logger.info(`Checking for identical alerts recreated from ${originalAlert.id}`);

      const identicalAlerts = await alertsApi.findIdenticalAlerts(originalAlert);

      logger.info(
        `Identical recreated alerts found: ${identicalAlerts.map(alert => alert.id).join(', ') || 'none'}`
      );

      // This assertion is expected to fail by assignment design.
      expect(
        identicalAlerts,
        `Expected no identical alert to be recreated, but found: ${identicalAlerts
          .map(alert => alert.id)
          .join(', ')}`
      ).toHaveLength(0);
    });
  });
});