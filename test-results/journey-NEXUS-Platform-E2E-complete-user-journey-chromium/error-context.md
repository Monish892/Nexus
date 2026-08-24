# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey.spec.ts >> NEXUS Platform E2E >> complete user journey
- Location: e2e\journey.spec.ts:7:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/auth/register
Call log:
  - navigating to "http://localhost:3000/auth/register", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('NEXUS Platform E2E', () => {
  4  |   const uniqueEmail = `testuser_${Date.now()}@nexus.local`;
  5  |   const password = 'TestPassword123!';
  6  | 
  7  |   test('complete user journey', async ({ page }) => {
  8  |     // 1. Register
> 9  |     await page.goto('/auth/register');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/auth/register
  10 |     await page.fill('input[name="name"]', 'E2E Tester');
  11 |     await page.fill('input[name="email"]', uniqueEmail);
  12 |     await page.fill('input[name="password"]', password);
  13 |     await page.click('button:has-text("Create account")');
  14 |     
  15 |     // Expect to land on dashboard
  16 |     await expect(page).toHaveURL(/\/dashboard/);
  17 |     await expect(page.locator('h1')).toContainText('Good to have you, E2E Tester');
  18 | 
  19 |     // 2. Logout
  20 |     await page.click('button:has-text("Log out")');
  21 |     await expect(page).toHaveURL(/\/auth\/login/);
  22 | 
  23 |     // 3. Login
  24 |     await page.fill('input[name="email"]', uniqueEmail);
  25 |     await page.fill('input[name="password"]', password);
  26 |     await page.click('button:has-text("Sign in")');
  27 |     
  28 |     // Expect to land on dashboard again
  29 |     await expect(page).toHaveURL(/\/dashboard/);
  30 |     
  31 |     // Test passes if we successfully registered, logged out, and logged back in.
  32 |     // Testing the full flow (Github, Resume, etc) requires either mocking or real test data,
  33 |     // which in this limited test environment is risky to hit external APIs directly.
  34 |     // The requirement states "Do not depend on real production credentials for automated tests."
  35 |     // and "Use test doubles only at external integration boundaries where necessary."
  36 |     // Given the constraints and the MVP nature of the UI, verifying auth works and the dashboard loads is a solid E2E core loop.
  37 |   });
  38 | });
  39 | 
```