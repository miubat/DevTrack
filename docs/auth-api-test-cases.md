# Auth API test cases · DevTrack · AGL-06.6

Test cases for the authentication API built in AGL-06 (login, refresh, logout, access token, roles, lockout and rate limit). They cover FR-AUTH-01, FR-AUTH-04, NFR-SEC-02, NFR-SEC-07 and the role rules in SRS §1.3. AGL-34.2 automates every case in `backend/test/auth-*.e2e-spec.ts`.

**Not covered yet**

- FR-AUTH-02 (user administration) and FR-AUTH-03 (profile and password): their APIs are not built yet.
- Project membership and ID tampering (NFR-SEC-03, NFR-SEC-04): they need the project and issue APIs (AGL-34.3).

**Environment**

- Backend on `http://localhost:3000`, built from master, with the seeded database (`npm run db:setup` in `db/`).
- Seed users, all with password `Passw0rd1`: admin@devtrack.local (ADMIN), rahim@devtrack.local and sadia@devtrack.local (PROJECT_MANAGER), karim@, hasan@, nila@, imran@, tania@devtrack.local (TEAM_MEMBER).
- Tool: curl (on Windows, call `curl.exe`, not the PowerShell `curl` alias).

**Before you run**

- The login limit is 10 requests per minute per IP (TC-AGL-06.6-29). Wait one minute between groups of login cases, or restart the backend, so the limit does not break other cases.
- The lockout cases (26 to 28) leave rows in `failed_logins`. Clear them afterwards: `DELETE FROM failed_logins;`
- Cases 08 and 16 deactivate a user with SQL. Set the user back to active after the case.

| Test Case ID | Module | Test Case Title | Preconditions | Test Steps | Test Data | Expected Result | Actual Result | Test Result (Pass/Fail) | Remarks |
|---|---|---|---|---|---|---|---|---|---|
| TC-AGL-06.6-01 | Login | Verify that a valid login returns the user, an access token and a secure refresh cookie | Backend running with seed data | 1. POST /auth/login with the test data<br>2. Check the body and the Set-Cookie header | admin@devtrack.local / Passw0rd1 | 200<br>Body has `user` (id, email, role ADMIN) and `accessToken`<br>No `password_hash` in the body<br>Cookie `refresh_token` is HttpOnly, SameSite=Strict, Path=/auth | 200 with `user` (id 1, role ADMIN) and `accessToken`<br>No `password_hash`<br>Cookie `refresh_token`: Path=/auth, HttpOnly, SameSite=Strict | Pass |  |
| TC-AGL-06.6-02 | Login | Verify that the email is not case sensitive | Backend running with seed data | 1. POST /auth/login with the email in capitals | ADMIN@DEVTRACK.LOCAL / Passw0rd1 | 200 with the admin user | 200 with the admin user (role ADMIN) | Pass |  |
| TC-AGL-06.6-03 | Login | Verify that a wrong password is refused with a general message | Backend running with seed data | 1. POST /auth/login | karim@devtrack.local / Wrong-password-1 | 401, message "Invalid email or password"<br>No access token, no cookie | 401 "Invalid email or password"<br>No cookie, no token | Pass |  |
| TC-AGL-06.6-04 | Login | Verify that an unknown email gets the same answer as a wrong password | Backend running with seed data | 1. POST /auth/login<br>2. Compare with TC-AGL-06.6-03 | nobody@devtrack.local / Passw0rd1 | 401, message "Invalid email or password", the same as case 03 (the API does not tell which emails exist) | 401 "Invalid email or password", the same as case 03<br>No cookie, no token | Pass |  |
| TC-AGL-06.6-05 | Login | Verify that a badly formed email is refused | Backend running | 1. POST /auth/login | not-an-email / Passw0rd1 | 400 validation error | 400 "email must be an email" | Pass |  |
| TC-AGL-06.6-06 | Login | Verify that an empty password is refused | Backend running | 1. POST /auth/login | karim@devtrack.local / "" (empty) | 400 validation error | 400 "password should not be empty" | Pass |  |
| TC-AGL-06.6-07 | Login | Verify that an empty body is refused | Backend running | 1. POST /auth/login with body `{}` | Empty JSON body | 400 validation error | 400 with three messages: "email must be an email", "password should not be empty", "password must be a string" | Pass |  |
| TC-AGL-06.6-08 | Login | Verify that a deactivated user cannot log in | Run SQL: `UPDATE users SET is_active = false WHERE email = 'tania@devtrack.local'` | 1. POST /auth/login<br>2. After the case, set tania back to active | tania@devtrack.local / Passw0rd1 | 401, no access token | SQL: UPDATE 1<br>Login: 401 "Invalid email or password"<br>Tania set back to active (UPDATE 1) | Pass |  |
| TC-AGL-06.6-09 | Session | Verify that refresh returns a new access token and a new refresh cookie | Karim is logged in; his `refresh_token` cookie is saved | 1. POST /auth/refresh with the cookie | Karim's refresh cookie | 200 with a new `accessToken`<br>A new `refresh_token` cookie, different from the old one | 200 with a new `accessToken`<br>New cookie value, different from the first one | Pass |  |
| TC-AGL-06.6-10 | Session | Verify that an old refresh token cannot be used again after refresh | Case 09 done; the first cookie is still saved | 1. POST /auth/refresh with the first (old) cookie | Old refresh cookie | 401 "Invalid refresh token" (the token was rotated) | 401 "Invalid refresh token" | Pass |  |
| TC-AGL-06.6-11 | Session | Verify that the access token from refresh works | Case 09 done | 1. GET /auth/me with `Authorization: Bearer <new access token>` | Access token from case 09 | 200 with Karim's id and role TEAM_MEMBER | 200 `{"id":"4","role":"TEAM_MEMBER"}` | Pass |  |
| TC-AGL-06.6-12 | Session | Verify that refresh without a cookie is refused | Backend running | 1. POST /auth/refresh with no cookie | None | 401 "Invalid refresh token" | 401 "Invalid refresh token" | Pass |  |
| TC-AGL-06.6-13 | Session | Verify that a made-up refresh cookie is refused | Backend running | 1. POST /auth/refresh | Cookie `refresh_token=fake-token` | 401 "Invalid refresh token" | 401 "Invalid refresh token" | Pass |  |
| TC-AGL-06.6-14 | Session | Verify that logout ends the session and clears the cookie | Karim is logged in; his cookie is saved | 1. POST /auth/logout with the cookie<br>2. POST /auth/refresh with the same cookie | Karim's refresh cookie | Step 1: 204, Set-Cookie clears `refresh_token` (empty value, expiry in 1970)<br>Step 2: 401 | Step 1: 204, `refresh_token=` with Expires Thu, 01 Jan 1970<br>Step 2: 401 "Invalid refresh token" | Pass |  |
| TC-AGL-06.6-15 | Session | Verify that logout without a cookie still succeeds | Backend running | 1. POST /auth/logout with no cookie | None | 204 | 204, cookie cleared | Pass |  |
| TC-AGL-06.6-16 | Session | Verify that a user deactivated after login cannot refresh | Nila is logged in; her cookie is saved<br>Then run SQL: `UPDATE users SET is_active = false WHERE email = 'nila@devtrack.local'` | 1. POST /auth/refresh with Nila's cookie<br>2. After the case, set nila back to active | Nila's refresh cookie | 401 | 401 "Invalid refresh token"<br>Nila set back to active (UPDATE 1) | Pass |  |
| TC-AGL-06.6-17 | Token | Verify that a protected route without a token is refused | Backend running | 1. GET /auth/me with no Authorization header | None | 401, code UNAUTHENTICATED | 401, code UNAUTHENTICATED, "Not signed in" | Pass |  |
| TC-AGL-06.6-18 | Token | Verify that a made-up token is refused | Backend running | 1. GET /auth/me | `Authorization: Bearer not.a.token` | 401, code UNAUTHENTICATED | 401, code UNAUTHENTICATED, "Invalid or expired token" | Pass |  |
| TC-AGL-06.6-19 | Token | Verify that an expired token is refused | A token signed with the real secret that expired one minute ago | 1. GET /auth/me with the expired token | Expired token | 401 | 401, code UNAUTHENTICATED, "Invalid or expired token" | Pass | Token made with the real secret from backend/.env, see Test run |
| TC-AGL-06.6-20 | Token | Verify that a token signed with a different secret is refused | A token for an ADMIN signed with another secret | 1. GET /auth/me with the forged token | Forged token | 401 (a forged ADMIN token gives no access) | 401, code UNAUTHENTICATED, "Invalid or expired token" | Pass | Token made with the secret "someone-else-secret", see Test run |
| TC-AGL-06.6-21 | Token | Verify that a real token with the wrong scheme is refused | Admin is logged in | 1. GET /auth/me with `Authorization: Basic <admin access token>` | Admin access token | 401 | 401, code UNAUTHENTICATED, "Not signed in" | Pass | A "Basic" header is treated as no token |
| TC-AGL-06.6-22 | Token | Verify that a valid token returns the user's id and role | Karim is logged in | 1. GET /auth/me with `Authorization: Bearer <access token>` | Karim's access token | 200, body is exactly `{ id: <Karim's id>, role: "TEAM_MEMBER" }` | 200 `{"id":"4","role":"TEAM_MEMBER"}` | Pass |  |
| TC-AGL-06.6-23 | Roles | Verify that every role can open a route for all logged-in users | Admin, Rahim and Karim are logged in | 1. Each user sends GET /access-check/any | Each user's access token | 200 for all three | Admin 200, Rahim 200, Karim 200 (`{"ok":true}`) | Pass | Temporary route from AGL-06.5 |
| TC-AGL-06.6-24 | Roles | Verify that only admins and project managers can open a manager route | Admin, Rahim and Karim are logged in | 1. Each user sends GET /access-check/manager | Each user's access token | Admin 200, Rahim 200<br>Karim 403, code FORBIDDEN_ROLE | Admin 200, Rahim 200<br>Karim 403, code FORBIDDEN_ROLE | Pass | Temporary route from AGL-06.5 |
| TC-AGL-06.6-25 | Roles | Verify that only admins can open an admin route | Admin, Rahim and Karim are logged in | 1. Each user sends GET /access-check/admin | Each user's access token | Admin 200<br>Rahim 403 and Karim 403, code FORBIDDEN_ROLE | Admin 200<br>Rahim 403 and Karim 403, code FORBIDDEN_ROLE | Pass | Temporary route from AGL-06.5 |
| TC-AGL-06.6-26 | Lockout | Verify that 5 wrong passwords lock the account, even for the right password | `failed_logins` is empty; the login limit has not been used this minute | 1. POST /auth/login 5 times with a wrong password<br>2. POST /auth/login with the right password | sadia@devtrack.local<br>Wrong: Wrong-password-1<br>Right: Passw0rd1 | Step 1: 401 each time<br>Step 2: 429, code TEMPORARILY_LOCKED, `Retry-After` header between 1 and 900 seconds | Step 1: 401 five times<br>Step 2: 429, code TEMPORARILY_LOCKED, Retry-After: 870 | Pass |  |
| TC-AGL-06.6-27 | Lockout | Verify that the lock is per account | Case 26 done (Sadia is locked) | 1. POST /auth/login as another user | hasan@devtrack.local / Passw0rd1 | 200 | 200 | Pass |  |
| TC-AGL-06.6-28 | Lockout | Verify that a successful login resets the failed count | `failed_logins` is empty; the login limit has not been used this minute | 1. 4 wrong passwords<br>2. The right password<br>3. 4 wrong passwords<br>4. The right password | imran@devtrack.local<br>Wrong: Wrong-password-1<br>Right: Passw0rd1 | Step 1 and 3: 401 each time<br>Step 2 and 4: 200 (the account is never locked) | 401 four times, 200, 401 four times, 200 (never locked) | Pass |  |
| TC-AGL-06.6-29 | Rate limit | Verify that the 11th login request in one minute is refused | The login limit has not been used this minute | 1. POST /auth/login 10 times quickly<br>2. An 11th POST /auth/login with valid admin details | Step 1: email not-an-email, password x<br>Step 2: admin@devtrack.local / Passw0rd1 | Step 1: 400 each time (the requests still count)<br>Step 2: 429, code RATE_LIMITED, `Retry-After` header between 1 and 60 seconds | Step 1: 400 ten times<br>Step 2: 429, code RATE_LIMITED, Retry-After: 60 | Pass |  |

Summary: 29 cases. FR-AUTH-01: 01 to 16. NFR-SEC-02: 17 to 22. SRS §1.3 roles: 23 to 25. FR-AUTH-04: 26 to 28. NFR-SEC-07: 29.

## Test run · 2026-11-23

- Tester: Sanzida Khan Mitu (QA 2)
- Build: master c1b0396, backend started with `npm run start:dev`, local Docker database with seed data
- Tool: curl in Git Bash on Windows
- Result: **29 of 29 passed**, no bugs found. Screenshots are attached to AGL-06.6 in ClickUp.

**Notes from the run**

- The first login returned 500 because the local `backend/.env` had an old `DATABASE_URL`. After copying the value from `backend/.env.example` and restarting the backend, it worked. This was a local setup problem, not a product bug.
- Tokens for cases 19 and 20 were made in the `backend` folder with the `jsonwebtoken` package (in Git Bash, call `node.exe`, not `node`, inside `$( )`):
  - Case 19: `node.exe -e "require('dotenv').config(); console.log(require('jsonwebtoken').sign({sub:'1',role:'ADMIN',exp:Math.floor(Date.now()/1000)-60}, process.env.JWT_ACCESS_SECRET))"`
  - Case 20: `node.exe -e "console.log(require('jsonwebtoken').sign({sub:'1',role:'ADMIN'}, 'someone-else-secret', {expiresIn: 300}))"`
- Cookies for the session cases were kept with `curl -c <file>` and sent with `curl -b <file>`.
- After the run: Tania and Nila were set back to active, and `failed_logins` was cleared.
