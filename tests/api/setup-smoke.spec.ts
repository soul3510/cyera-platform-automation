import { test, expect } from '@playwright/test';
import { ApiClient } from '../../src/api/apiClient';
import { AuthApi } from '../../src/api/authApi';
import { AdminApi } from '../../src/api/adminApi';
import { ScansApi } from '../../src/api/scansApi';
import { AlertsApi } from '../../src/api/alertsApi';
import { logger } from '../../src/utils/logger';

test.describe('API setup smoke', () => {
  test('should reset data, start scan, and find a manual remediation alert', async ({ request }) => {
    const apiClient = new ApiClient(request);
    const authApi = new AuthApi(request);

    logger.info('Logging in through API');
    const token = await authApi.login();
    apiClient.setAuthToken(token);

    const adminApi = new AdminApi(apiClient);
    const scansApi = new ScansApi(apiClient);
    const alertsApi = new AlertsApi(apiClient);

    logger.info('Resetting test data');
    await adminApi.resetData();

    logger.info('Starting scan');
    await scansApi.startScan();

    logger.info('Waiting for scan completion');
    await scansApi.waitForScanToComplete();

    logger.info('Searching for OPEN alert with Auto Remediate OFF');
    const alert = await alertsApi.findManualRemediationAlert();

    expect(alert.id).toBeTruthy();
    expect(alert.status).toBe('OPEN');
    expect(alert.remediation?.autoRemediate).toBe(false);

    logger.info(`Selected alert for manual remediation flow: ${alert.id}`);
  });
});