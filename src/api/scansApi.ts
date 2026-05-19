import { expect } from '@playwright/test';
import { ApiClient } from './apiClient';

type ScanStatusResponse = {
  status: 'IDLE' | 'RUNNING';
};

export class ScansApi {
  constructor(private readonly api: ApiClient) {}

  async startScan(): Promise<void> {
    // Start a scan so the system creates alerts for the test.
    const response = await this.api.post('/scans');

    // A scan must start successfully before we can search for alerts.
    expect(response.ok(), `Start scan failed: ${response.status()}`).toBeTruthy();
  }

  async waitForScanToComplete(timeoutMs = 30000): Promise<void> {
    // Poll scan status until the backend finishes creating alerts.
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const response = await this.api.get('/scans/status');
      expect(response.ok(), `Get scan status failed: ${response.status()}`).toBeTruthy();

      const body = (await response.json()) as ScanStatusResponse;

      if (body.status === 'IDLE') {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Scan did not complete within ${timeoutMs}ms`);
  }
}