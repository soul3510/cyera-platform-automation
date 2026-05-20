import 'dotenv/config';

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  // Base URL for browser-based UI tests.
  webBaseUrl: process.env.WEB_BASE_URL ?? 'http://localhost:3000',

  // Base URL for direct backend API tests and setup calls.
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:8080/api',

  // Test credentials are loaded from .env and should not be hardcoded in test files.
  username: getRequiredEnv('E2E_USERNAME'),
  password: getRequiredEnv('E2E_PASSWORD'),
};