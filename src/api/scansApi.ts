import { expect } from '@playwright/test';
import { ApiClient } from './apiClient';

export class ScansApi {
  constructor(private readonly api: ApiClient) {}

  async startScan(): Promise<void> {
    //start scan so that we will be able to test the alerts
    const response = await this.api.post('/scans');
    //Also here we check that the scan was succesful. 
    expect(response.ok(), `Start scan failed: ${response.status()}`).toBeTruthy();
  }
}