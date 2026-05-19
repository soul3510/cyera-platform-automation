import { expect } from '@playwright/test';
import { ApiClient } from './apiClient';

/**
 * This class provides methods for admin operations on the backend API. 
 * Currently it has only one method for resetting the application data to a known state before running the tests.
 */

export class AdminApi {
  constructor(private readonly api: ApiClient) {}

  async resetData(): Promise<void> {
    // reseting the application data to a known state before running the tests.
    const response = await this.api.post('/admin/reset');
    //Check that the reset data request was successful so that the tests will not be unreliable or flucky.
    expect(response.ok(), `Reset data failed: ${response.status()}`).toBeTruthy();
  }
}