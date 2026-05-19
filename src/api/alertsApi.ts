import { expect } from '@playwright/test';
import { ApiClient } from './apiClient';

export type Alert = {
  id: string;
  runId?: string;
  policyId?: string;
  policyName?: string;
  status: string;
  assetId?: string;
  assetDisplayName?: string;
  assetLocation?: string;
  violationType?: string;
  remediation?: {
    autoRemediate?: boolean;
    note?: string;
  };
  assignedTo?: {
    id: string;
    name: string;
  } | null;
  comments?: Array<{
    message: string;
  }>;
};

export class AlertsApi {
  constructor(private readonly api: ApiClient) {}

  async getAlerts(): Promise<Alert[]> {
    //Get all the alert after scan succesful
    const response = await this.api.get('/alerts');
    expect(response.ok(), `Get alerts failed: ${response.status()}`).toBeTruthy();
    return response.json();
  }

  async getAlert(alertId: string): Promise<Alert> {
    //Get a single akert with specific id
    const response = await this.api.get(`/alerts/${alertId}`);
    expect(response.ok(), `Get alert failed: ${response.status()}`).toBeTruthy();
    return response.json();
  }

  //This method should be able to find an alert with status Open and autoRemediate false, which is the type of alert we want to test in this assignment.
  async findManualRemediationAlert(): Promise<Alert> {
    const alerts = await this.getAlerts();

    const alert = alerts.find(
      item =>
        item.status === 'OPEN' &&
        item.remediation?.autoRemediate === false
    );

    expect(alert, 'No OPEN alert with Auto Remediate OFF was found').toBeTruthy();

    return alert!;
  }

async waitForStatus(
  alertId: string,
  expectedStatus: string,
  timeoutMs = 30000
): Promise<Alert> {
  const startedAt = Date.now();
  let lastStatus = 'UNKNOWN';

  while (Date.now() - startedAt < timeoutMs) {
    const alert = await this.getAlert(alertId);
    lastStatus = alert.status;

    console.log(
      `[INFO] Alert ${alertId} current status: ${alert.status}`
    );

    if (alert.status === expectedStatus) {
      return alert;
    }

    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  throw new Error(
    `Alert ${alertId} did not reach status ${expectedStatus} within ${timeoutMs}ms. Last status was: ${lastStatus}`
  );
}

async findAutoRemediationAlert(): Promise<Alert> {
  // Find an alert that matches the auto-remediation flow requirements.
  const alerts = await this.getAlerts();

  const alert = alerts.find(
    item =>
      item.remediation?.autoRemediate === true &&
      ['OPEN', 'REMEDIATION_IN_PROGRESS', 'REMEDIATED_WAITING_FOR_CUSTOMER'].includes(item.status)
  );

  expect(alert, 'No alert with Auto Remediate ON was found').toBeTruthy();

  return alert!;
}

async updateStatus(alertId: string, status: string): Promise<Alert> {
  // Update alert lifecycle status through the backend API.
  const response = await this.api.patch(`/alerts/${alertId}`, {
    status,
  });

  expect(
    response.ok(),
    `Failed to update alert ${alertId} status to ${status}. Status: ${response.status()}`
  ).toBeTruthy();

  return response.json();
}

async addComment(alertId: string, message: string): Promise<void> {
  // Add a user verification comment to the alert.
  const response = await this.api.post(`/alerts/${alertId}/comments`, {
    message,
  });

  expect(
    response.ok(),
    `Failed to add comment to alert ${alertId}. Status: ${response.status()}`
  ).toBeTruthy();
}

async findIdenticalAlerts(originalAlert: Alert): Promise<Alert[]> {
  // Identify alerts that represent the same issue after a rescan.
  // We intentionally ignore ID and runId because recreated alerts receive new values.
  const alerts = await this.getAlerts();

  return alerts.filter(candidate =>
    candidate.id !== originalAlert.id &&
    candidate.policyId === originalAlert.policyId &&
    candidate.assetId === originalAlert.assetId &&
    candidate.violationType === originalAlert.violationType
  );
}
}