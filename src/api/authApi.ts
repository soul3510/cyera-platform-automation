import { APIRequestContext, expect } from '@playwright/test';
import { env } from '../utils/env';

type LoginResponse = {
  token: string;
};

/**
 * Handles authentication against the backend API.
 * Caches the bearer token to avoid repeated login calls and backend rate limiting.
 */
export class AuthApi {
  private static cachedToken?: string;
  private static inFlightLogin?: Promise<string>;

  constructor(private readonly request: APIRequestContext) {}

  async login(): Promise<string> {
    // Reuse token between tests in the same worker process.
    if (AuthApi.cachedToken) {
      return AuthApi.cachedToken;
    }

    // If multiple tests/helpers request login at the same time, reuse the same login request.
    if (AuthApi.inFlightLogin) {
      return AuthApi.inFlightLogin;
    }

    AuthApi.inFlightLogin = this.loginWithRetry();

    try {
      AuthApi.cachedToken = await AuthApi.inFlightLogin;
      return AuthApi.cachedToken;
    } finally {
      AuthApi.inFlightLogin = undefined;
    }
  }

  private async loginWithRetry(): Promise<string> {
    const maxAttempts = 6;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await this.request.post(`${env.apiBaseUrl}/login`, {
        data: {
          username: env.username,
          password: env.password,
        },
      });

      if (response.ok()) {
        const body = (await response.json()) as LoginResponse;

        expect(body.token, 'Login response did not include a token').toBeTruthy();

        return body.token;
      }

      if (response.status() === 429 && attempt < maxAttempts) {
        const retryAfterHeader = response.headers()['retry-after'];
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : attempt * 2;
        const waitMs = Number.isFinite(retryAfterSeconds)
          ? retryAfterSeconds * 1000
          : attempt * 2000;

        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }

      const bodyText = await response.text();

      throw new Error(
        `Login failed after ${attempt} attempt(s). Status: ${response.status()}. Body: ${bodyText}`
      );
    }

    throw new Error('Login failed unexpectedly');
  }

  static clearCachedToken(): void {
    AuthApi.cachedToken = undefined;
    AuthApi.inFlightLogin = undefined;
  }
}