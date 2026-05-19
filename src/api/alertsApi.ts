import { expect } from '@playwright/test';
import { ApiClient } from './apiClient';

export type Alert = {
  id: string;
  status: string;
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

  async waitForStatus(alertId: string, expectedStatus: string, timeoutMs = 30000): Promise<Alert> {
    //poll the alert until BE finish processing the alert and update its status to the expected status, or until timeout.
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const alert = await this.getAlert(alertId);

      if (alert.status === expectedStatus) {
        return alert;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Alert ${alertId} did not reach status ${expectedStatus} within ${timeoutMs}ms`);
  }
}