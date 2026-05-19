import { APIRequestContext } from '@playwright/test';
import { env } from '../utils/env';

/**
 * ApiClient is a helper class to interact with the backend API. It handles authentication and provides methods for sending requests to the API.
 * for example: Instead of writing this everywhere: request.post('http://localhost:8080/api/alerts/...')
 * you write: api.post('/alerts/...')
 * which is shorter, easier to read and maintain. 
 */

export class ApiClient {
  private token?: string;

  constructor(private readonly request: APIRequestContext) {}

  setAuthToken(token: string): void {
    // Store the bearer token so all following API calls are authenticated.
    this.token = token;
  }

  async get(path: string) {
    // Send an authenticated GET request to the API.
    return this.request.get(`${env.apiBaseUrl}${path}`, {
      headers: this.authHeaders(),
    });
  }

  async post(path: string, data?: unknown) {
    // Send an authenticated POST request, optionally with a request body.
    return this.request.post(`${env.apiBaseUrl}${path}`, {
      headers: this.authHeaders(),
      data,
    });
  }

  async patch(path: string, data?: unknown) {
    // Send an authenticated PATCH request for updating existing resources.
    return this.request.patch(`${env.apiBaseUrl}${path}`, {
      headers: this.authHeaders(),
      data,
    });
  }

  private authHeaders(): Record<string, string> | undefined {
    // Do not send an Authorization header before login.
    if (!this.token) {
      return undefined;
    }

    return {
      Authorization: `Bearer ${this.token}`,
    };
  }
}