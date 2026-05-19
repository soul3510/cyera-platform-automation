import { test, expect } from '@playwright/test';
import { ApiClient } from '../../src/api/apiClient';
import { AuthApi } from '../../src/api/authApi';
import { AdminApi } from '../../src/api/adminApi';
import { ScansApi } from '../../src/api/scansApi';
import { AlertsApi } from '../../src/api/alertsApi';
import { env } from '../../src/utils/env';
import { logger } from '../../src/utils/logger';

test.describe('API Component Tests', () => {

    async function createAuthenticatedApiContext(request: any) {
  const apiClient = new ApiClient(request);
  const authApi = new AuthApi(request);

  const token = await authApi.login();
  apiClient.setAuthToken(token);

  return {
    apiClient,
    adminApi: new AdminApi(apiClient),
    scansApi: new ScansApi(apiClient),
    alertsApi: new AlertsApi(apiClient),
  };
}


  test.describe.configure({ timeout: 120000 });

test('health endpoint should return healthy status within acceptable response time', async ({ request }) => {
  const startedAt = Date.now();

  const response = await request.get(`${env.apiBaseUrl}/health`);

  const durationMs = Date.now() - startedAt;

  expect(response.ok(), `Health check failed with status ${response.status()}`).toBeTruthy();

  const body = await response.json();

  expect(body.status).toBe('healthy');
  expect(durationMs).toBeLessThan(1000);
});

test('policy config endpoint should return valid configuration', async ({ request }) => {
  const apiClient = new ApiClient(request);
  const authApi = new AuthApi(request);

  const token = await authApi.login();
  apiClient.setAuthToken(token);

  const response = await apiClient.get('/policy-config');

  expect(
    response.ok(),
    `Policy config failed with status ${response.status()}`
  ).toBeTruthy();

  const body = await response.json();

  expect(body).toBeTruthy();
  expect(Object.keys(body).length).toBeGreaterThan(0);
});

  test('scan should create alerts', async ({ request }) => {
    const apiClient = new ApiClient(request);
    const authApi = new AuthApi(request);

    const token = await authApi.login();
    apiClient.setAuthToken(token);

    const adminApi = new AdminApi(apiClient);
    const scansApi = new ScansApi(apiClient);
    const alertsApi = new AlertsApi(apiClient);

    logger.info('Resetting data before scan component test');
    await adminApi.resetData();

    logger.info('Starting scan from API component test');
    await scansApi.startScan();
    await scansApi.waitForScanToComplete();

    const alerts = await alertsApi.getAlerts();

    expect(alerts.length).toBeGreaterThan(0);
  });

  test('valid status transition should update OPEN alert to IN_PROGRESS', async ({ request }) => {
    const apiClient = new ApiClient(request);
    const authApi = new AuthApi(request);

    const token = await authApi.login();
    apiClient.setAuthToken(token);

    const adminApi = new AdminApi(apiClient);
    const scansApi = new ScansApi(apiClient);
    const alertsApi = new AlertsApi(apiClient);

    await adminApi.resetData();
    await scansApi.startScan();
    await scansApi.waitForScanToComplete();

    const alert = await alertsApi.findManualRemediationAlert();

    const updatedAlert = await alertsApi.updateStatus(alert.id, 'IN_PROGRESS');

    expect(updatedAlert.status).toBe('IN_PROGRESS');
  });

  test('invalid status transition should return validation error', async ({ request }) => {
    const apiClient = new ApiClient(request);
    const authApi = new AuthApi(request);

    const token = await authApi.login();
    apiClient.setAuthToken(token);

    const adminApi = new AdminApi(apiClient);
    const scansApi = new ScansApi(apiClient);
    const alertsApi = new AlertsApi(apiClient);

    await adminApi.resetData();
    await scansApi.startScan();
    await scansApi.waitForScanToComplete();

    const alert = await alertsApi.findManualRemediationAlert();

    const response = await apiClient.patch(`/alerts/${alert.id}`, {
      status: 'RESOLVED',
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('Invalid status transition');
  });

  test('invalid assignee ID should return validation error', async ({ request }) => {
  const { apiClient, adminApi, scansApi, alertsApi } =
    await createAuthenticatedApiContext(request);

  logger.info('Resetting data before invalid assignee test');
  await adminApi.resetData();

  logger.info('Starting scan before invalid assignee test');
  await scansApi.startScan();
  await scansApi.waitForScanToComplete();

  const alert = await alertsApi.findManualRemediationAlert();

  logger.info(`Trying to assign alert ${alert.id} to invalid assignee`);

  const response = await apiClient.patch(`/alerts/${alert.id}`, {
    assignedToId: 'invalid_user_id',
  });

  expect(response.status()).toBe(400);

  const body = await response.json();

  expect(body.error).toContain('Invalid assignee ID');
});

test('missing comment message should return validation error', async ({ request }) => {
  const { apiClient, adminApi, scansApi, alertsApi } =
    await createAuthenticatedApiContext(request);

  logger.info('Resetting data before missing comment message test');
  await adminApi.resetData();

  logger.info('Starting scan before missing comment message test');
  await scansApi.startScan();
  await scansApi.waitForScanToComplete();

  const alert = await alertsApi.findManualRemediationAlert();

  logger.info(`Trying to add empty comment to alert ${alert.id}`);

  const response = await apiClient.post(`/alerts/${alert.id}/comments`, {});

  expect(response.status()).toBe(400);

  const body = await response.json();

  expect(body.error).toContain('Message is required');
});

test('protected alerts endpoint should reject unauthenticated request', async ({ request }) => {
  const response = await request.get(`${env.apiBaseUrl}/alerts`);

  expect(response.status()).toBe(401);

  const body = await response.json();

  expect(body.error).toContain('Authorization');
});
});