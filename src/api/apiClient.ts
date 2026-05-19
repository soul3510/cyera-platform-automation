import { APIRequestContext, expect } from '@playwright/test';
import { env } from '../utils/env';

export class ApiClient {
  private token?: string;

  constructor(private readonly request: APIRequestContext) {}

  async login(): Promise<void> {
    const response = await this.request.post(`${env.apiBaseUrl}/login`, {
      data: {
        username: env.username,
        password: env.password,
      },
    });

    expect(response.ok(), `Login failed: ${response.status()}`).toBeTruthy();

    const body = await response.json();
    this.token = body.token;
  }

  async get(path: string) {
    return this.request.get(`${env.apiBaseUrl}${path}`, {
      headers: this.authHeaders(),
    });
  }

  async post(path: string, data?: unknown) {
    return this.request.post(`${env.apiBaseUrl}${path}`, {
      headers: this.authHeaders(),
      data,
    });
  }

  async patch(path: string, data?: unknown) {
    return this.request.patch(`${env.apiBaseUrl}${path}`, {
      headers: this.authHeaders(),
      data,
    });
  }

  private authHeaders(): Record<string, string> | undefined {
  if (!this.token) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${this.token}`,
  };
}
}