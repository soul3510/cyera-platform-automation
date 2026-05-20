# Mock DSPM Portal

A deliberate automation testing target application for Full-Stack Automation Engineer assessments.

## Quick Start

### Prerequisites

- **Docker Desktop** installed and running (includes Docker Compose v2)

### Start the Application

```bash
docker compose up -d
```

### Verify Installation

Wait ~10 seconds for containers to start, then run:

```bash
./scripts/healthcheck.sh
```

Or manually verify:

```bash
curl http://localhost:8080/api/health
curl http://localhost:3000
```

### Access the Application

| Service | URL                     |
| ------- | ----------------------- |
| Web UI  | http://localhost:3000   |
| API     | http://localhost:8080   |

### Login Credentials

| Username | Password |
| -------- | -------- |
| admin    | Aa123456 |

---

## Port Conflicts

If ports 3000 or 8080 are already in use on your machine:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and change the ports:
   ```
   WEB_PORT=3001
   API_PORT=8081
   ```

3. Restart the containers:
   ```bash
   docker compose down
   docker compose up -d
   ```

4. Access the application on the new ports:
   - Web UI: http://localhost:3001
   - API: http://localhost:8081

---

## Architecture

```
├── apps/
│   ├── api/     # Node.js + Express + SQLite
│   └── web/     # React + Vite + TypeScript
├── scripts/
│   └── healthcheck.sh  # Verify installation
└── docker-compose.yml
```

## API Endpoints

| Method | Endpoint                  | Description       |
| ------ | ------------------------- | ----------------- |
| GET    | /api/health               | Health check      |
| POST   | /api/login                | Authenticate user |
| GET    | /api/policies             | List policies     |
| GET    | /api/alerts               | List alerts       |
| POST   | /api/scans                | Start a scan      |
| PATCH  | /api/alerts/:id           | Update alert      |
| POST   | /api/alerts/:id/remediate | Remediate alert   |
| GET    | /api/policy-config        | Get configuration |

**Authentication:** All endpoints (except `/api/login` and `/api/health`) require:

```
Authorization: Bearer <token>
```

## Key Features

- **Policies**: 8 seeded policies with severity levels and remediation config
- **Scans**: Generate alerts from policy evaluations
- **Alerts**: Status tracking, remediation flow, audit trail
- **Auto-remediation**: Policies can auto-remediate alerts

## Alert Status Flow

```
OPEN → IN_PROGRESS → RESOLVED
           ↓
   REMEDIATION_IN_PROGRESS → AWAITING_VERIFICATION → RESOLVED
```

See [Alert Status Flow](docs/alert-status-flowchart.md) for full details.

## Locator Strategy (for Automation)

This app intentionally **avoids overusing data-testid**. Use:

- `getByRole()` - buttons, links, dialogs
- `getByLabel()` - form inputs
- `getByText()` - status badges, visible text
- CSS selectors - table rows, cells

## Docker Commands

```bash
# Start (detached)
docker compose up -d

# Stop
docker compose down

# Rebuild (after code changes)
docker compose build --no-cache

# Reset database
docker compose down -v && docker compose up -d

# View logs
docker compose logs -f

# Check container status
docker compose ps
```

## Troubleshooting

### Health check fails

```bash
# Check if containers are running
docker compose ps

# View container logs
docker compose logs

# Wait and retry
sleep 10 && ./scripts/healthcheck.sh
```

### Reset everything

```bash
docker compose down -v
docker compose up -d
```

### Port already in use

See [Port Conflicts](#port-conflicts) section above.

## Documentation

| Document                                            | Description           |
| --------------------------------------------------- | --------------------- |
| [Docker Commands](docs/docker-commands.md)          | Full Docker reference |
| [Alert Status Flow](docs/alert-status-flowchart.md) | Status transitions    |




---

---

# Automation Framework

This repository includes a Playwright-based automation framework for validating the Mock DSPM Portal through both UI and API layers.

The framework covers:

- UI lifecycle validation for manual alert remediation.
- REST API lifecycle validation for auto-remediation and rescan verification.
- API component-level tests.
- Shared API utilities.
- Runtime logging.
- Error handling.
- Automated Playwright HTML and JSON reporting.

---

## Automation Tech Stack

| Tool | Purpose |
| ---- | ------- |
| Playwright | UI and API test automation |
| TypeScript | Test and framework implementation |
| Node.js / npm | Dependency and script management |
| Docker Compose | Local application runtime |
| dotenv | Local environment configuration |
| Playwright HTML Report | Automated test reporting |

---

## Install Dependencies

From the project root:

```bash
npm install
npx playwright install
```

The project uses `dotenv` to load local test configuration from `.env`.

No separate installation is required because `dotenv` is included in `devDependencies`.

---

## Environment Configuration

The automation framework reads runtime configuration from environment variables.

Create a local `.env` file from the example file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Required variables:

```env
WEB_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:8080/api
E2E_USERNAME=admin
E2E_PASSWORD=Aa123456
```

| Variable | Description |
| -------- | ----------- |
| `WEB_BASE_URL` | Base URL for browser/UI tests |
| `API_BASE_URL` | Base URL for direct backend API calls |
| `E2E_USERNAME` | Test user username |
| `E2E_PASSWORD` | Test user password |

### Security Note

The `.env` file is used for local runtime values and should not be committed to Git.

Only `.env.example` is committed as a template for local setup.

Make sure `.gitignore` includes:

```gitignore
.env
.env.local
.env.*.local
```

---

## Automation Project Structure

```bash
├── src/
│   ├── api/
│   │   ├── apiClient.ts      # Shared HTTP client with auth token support
│   │   ├── authApi.ts        # Login and bearer token handling
│   │   ├── adminApi.ts       # Reset data helper
│   │   ├── scansApi.ts       # Scan execution and scan-status polling
│   │   └── alertsApi.ts      # Alert lifecycle helpers
│   │
│   └── utils/
│       ├── env.ts            # Loads URLs and credentials from environment variables
│       └── logger.ts         # Runtime logging utility
│
├── tests/
│   ├── ui/
│   │   └── manual-remediation.spec.ts
│   │
│   └── api/
│       ├── setup-smoke.spec.ts
│       ├── auto-remediation-rescan.spec.ts
│       └── component.spec.ts
│
├── playwright.config.ts
├── tsconfig.json
├── .env.example
└── package.json
```

---

## Run UI Tests

```bash
npm run test:ui
```

Current UI coverage:

### Alert Life Cycle: Manual Remediation

The UI test validates the manual remediation flow through the frontend:

1. Uses API setup to reset data.
2. Starts a scan to create alerts.
3. Finds an `OPEN` alert with Auto Remediate OFF.
4. Logs into the UI.
5. Opens the selected alert.
6. Assigns the alert to `Security Analyst`.
7. Changes the alert status to `In Progress`.
8. Adds remediation notes.
9. Starts manual remediation.
10. Waits for remediation completion.
11. Changes the alert status to `Resolved`.
12. Adds the final verification comment.
13. Verifies the final backend state through API.

---

## Run API Tests

```bash
npm run test:api
```

Current API coverage:

- Auto-remediation + rescan verification flow.
- API component tests:
  - Health check.
  - Policy configuration validation.
  - Scan creates alerts.
  - Valid alert status transition.
  - Invalid alert status transition.
  - Invalid assignee validation.
  - Missing comment validation.
  - Protected endpoint authorization.

---

## Run All Tests

```bash
npm test
```

This runs both UI and API tests and generates one combined Playwright HTML report.

The suite is configured with a single worker because the application uses a shared local SQLite database and the tests perform state-changing operations such as:

- Reset data.
- Start scan.
- Create alerts.
- Update alert status.
- Assign alerts.
- Add comments.
- Trigger remediation.

Running these flows in parallel could create race conditions and flaky results.

---

## View Test Reports

After running tests:

```bash
npm run test:report
```

Report behavior:

| Command | Report Content |
| ------- | -------------- |
| `npm run test:ui` | UI tests only |
| `npm run test:api` | API tests only |
| `npm test` | Combined UI + API test report |

Generated report folders are ignored by Git:

```text
playwright-report/
test-results/
blob-report/
```

---

## Expected Failure: Auto-Remediation + Rescan Verification

The test file:

```text
tests/api/auto-remediation-rescan.spec.ts
```

validates the following flow:

1. Reset data.
2. Start scan.
3. Find an alert with Auto Remediate ON.
4. Wait for auto-remediation to complete.
5. Resolve the alert.
6. Add verification comment.
7. Start another scan.
8. Verify that no identical alert was recreated.

The assignment states that an identical alert is intentionally recreated by the system after rescan.

Therefore, the final assertion is marked with Playwright’s `test.fail()` mechanism.

This makes the behavior explicit: the framework detects the recreated identical alert, and the failure is documented as expected by assignment design.

---

## Logging

The framework includes runtime logging for important operations:

- API authentication.
- Data reset.
- Scan start and completion.
- Alert selection.
- Assignment changes.
- Status transitions.
- Remediation submission.
- Async remediation polling.
- Final API verification.

Example:

```text
[INFO] Starting scan to create alerts
[INFO] Selected alert for test: alert_75914c5c
[INFO] Assigning alert to Security Analyst
[INFO] Changing alert alert_75914c5c status to IN_PROGRESS
[INFO] Waiting for remediation to complete
[INFO] Alert alert_75914c5c current status: REMEDIATION_IN_PROGRESS
[INFO] Alert alert_75914c5c current status: REMEDIATED_WAITING_FOR_CUSTOMER
[INFO] Alert alert_75914c5c resolved and final comment was added
```

---

## Design Decisions

### UI and API Tests Are Separated

UI and API tests are stored in separate folders and can be executed independently:

```bash
npm run test:ui
npm run test:api
```

This keeps execution clear and supports the assignment requirement that UI and API tests can run independently.

---

### API Setup Is Used for UI Tests

The UI test uses API setup to create deterministic test data:

```text
reset data → start scan → find matching alert
```

The actual manual remediation business flow is still executed through the UI.

This reduces UI test flakiness while preserving end-to-end validation of the user flow.

---

### Shared API Utilities Are Reused

Common API actions are implemented under `src/api` and reused by both UI and API tests.

This avoids duplicated request logic and keeps the tests readable.

Examples:

- `AuthApi` handles login.
- `ApiClient` handles authenticated GET / POST / PATCH requests.
- `AdminApi` handles reset data.
- `ScansApi` handles scan execution and scan-status polling.
- `AlertsApi` handles alert lifecycle operations.

---

### Single Worker Execution

The local app uses one shared SQLite database.

Since tests reset data and mutate alert lifecycle state, parallel execution could create race conditions.

For this assignment, the suite is configured to run with one worker for deterministic execution.

---

### Authentication Token Caching

The backend applies rate limiting to login requests.

`AuthApi` caches the bearer token to reduce repeated login calls and avoid `429 Too Many Requests` failures during the suite.

---

### Reports Are Generated, Not Committed

Playwright HTML, JSON, trace, screenshot, and video artifacts are generated locally during test execution.

They are not committed to Git because they are runtime artifacts.

---

## Useful Automation Commands

```bash
# Install dependencies
npm install
npx playwright install

# Create local environment file
cp .env.example .env

# Start app
docker compose up -d

# Stop app
docker compose down

# Validate TypeScript
npx tsc --noEmit

# Run UI tests
npm run test:ui

# Run API tests
npm run test:api

# Run all tests
npm test

# Open Playwright HTML report
npm run test:report
```

On Windows PowerShell, create the `.env` file with:

```powershell
Copy-Item .env.example .env
```

# Additional data

https://docs.google.com/document/d/1H1zLGh8aMp_v7WwEq7efJB7DboC5FxLBFptAiduyOWc/edit?usp=sharing