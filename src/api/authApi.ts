import { APIRequestContext, expect } from '@playwright/test';
import { env } from '../utils/env';

/**
 * Handles authentication against the backend API.
 * Returns a bearer token that can be passed into ApiClient for authenticated requests.
 */

type LoginResponse = {
  token: string;
};

export class AuthApi {
  constructor(private readonly request: APIRequestContext) {}

  async login(): Promise<string> {
    // Authenticate with the default test user and return a bearer token.
    const response = await this.request.post(`${env.apiBaseUrl}/login`, {
      data: {
        username: env.username,
        password: env.password,
      },
    });

    expect(response.ok(), `Login failed: ${response.status()}`).toBeTruthy();

    const body = (await response.json()) as LoginResponse;

    expect(body.token, 'Login response did not include a token').toBeTruthy();

    return body.token;
  }
}