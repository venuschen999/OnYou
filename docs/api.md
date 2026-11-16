# OnYou API reference

The OnYou API is JSON over HTTPS, served by Next.js Route Handlers. Fields are camelCase and timestamps are ISO 8601 in UTC (for example `2026-11-15T17:00:00.000Z`). The live interactive docs are Swagger UI at `/docs` (for example https://onyou123.vercel.app/docs), and the machine-readable spec is [`docs/openapi.yaml`](openapi.yaml).

## Authentication

- **Set.** `POST /api/auth/signup` and `POST /api/auth/login` set the `onyou_auth` cookie. It holds a JWT signed with HS256. The JWT subject is the user id and the `tv` claim is the account's `tokenVersion`. It expires after 7 days, with no sliding renewal.
- **Cookie attributes.** `onyou_auth=<JWT>; Path=/; Max-Age=604800; Secure; HttpOnly; SameSite=Lax`. Client JavaScript cannot read it.
- **Sent.** The browser sends the cookie on every same-site request. Clients do nothing extra. A missing, expired, or invalid cookie gets `401 UNAUTHENTICATED`.
- **Cleared.** `POST /api/auth/logout` and `POST /api/auth/password-reset/confirm` return the cookie with `Max-Age=0`.
- **Invalidated everywhere.** Every authenticated request checks that the JWT's `tv` matches the stored `tokenVersion`. A password reset increments `tokenVersion`, so every device is signed out.
- There is no API key and no focus-session or tab token. `X-Session-Token` does not exist. Any authenticated tab of the owner may heartbeat, give up, or complete a session.

## Errors

Every error uses one body. `fields` appears only on validation errors that point at specific fields. It maps a field name to its message.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the highlighted fields and try again.",
    "fields": {
      "password": "Use 8 to 15 characters. This one has 3."
    }
  }
}
```

A body that is not valid JSON gets `400 VALIDATION_ERROR` with the message `Request body must be valid JSON.` and no `fields`.

| Code                    | Status | When                                                                                                       |
| ----------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `VALIDATION_ERROR`      | 400    | The body is not JSON, a field breaks a rule, or a history query is invalid.                                |
| `RESET_LINK_INVALID`    | 400    | The reset token is missing, unknown, used, or expired. Message: `This link no longer works.`               |
| `INVALID_CREDENTIALS`   | 401    | Login email or password is wrong. One message covers both.                                                 |
| `UNAUTHENTICATED`       | 401    | No valid `onyou_auth` cookie, or its `tokenVersion` is stale. Message: `Log in to continue.`               |
| `FORBIDDEN`             | 403    | The session belongs to another account. Message: `That session belongs to another account.`                |
| `SESSION_NOT_FOUND`     | 404    | No session has that id. Message: `No session exists with that id.`                                         |
| `ACTIVE_SESSION_EXISTS` | 409    | Start was called while the account already has an Active session. Message: `One session at a time`         |
| `SESSION_TOO_EARLY`     | 409    | Complete was called before the scheduled end. Message: `This session has not reached its scheduled end.`   |
| `SESSION_ABANDONED`     | 409    | Complete was called on an Abandoned session. Message: `This session was abandoned and cannot be completed.` |
| `EMAIL_IN_USE`          | 409    | Signup with an email that already has an account (case-insensitive).                                       |
| `TOO_MANY_REQUESTS`     | 429    | Password-reset request limit reached.                                                                      |
| `INTERNAL_ERROR`        | 500    | Unexpected server error. Message: `Something went wrong. Try again.` Internal details are never returned.  |

Every endpoint can also return `500 INTERNAL_ERROR`. The per-endpoint tables below leave it out.

## Endpoint index

| Area           | Method | Path                               | Auth   | Purpose                                         |
| -------------- | ------ | ---------------------------------- | ------ | ----------------------------------------------- |
| Auth           | POST   | `/api/auth/signup`                 | No     | Create an account and Mochi, and sign in        |
| Auth           | POST   | `/api/auth/login`                  | No     | Sign in with email and password                 |
| Auth           | POST   | `/api/auth/logout`                 | Cookie | End the Active session and sign this browser out |
| Password reset | POST   | `/api/auth/password-reset/request` | No     | Email a reset link                              |
| Password reset | POST   | `/api/auth/password-reset/confirm` | No     | Set a new password from a reset link            |
| Pet            | GET    | `/api/pet`                         | Cookie | Read the pet and today's feeding progress       |
| Pet            | PATCH  | `/api/pet`                         | Cookie | Rename the pet                                  |
| Focus sessions | POST   | `/api/sessions`                    | Cookie | Start a focus session                           |
| Focus sessions | GET    | `/api/sessions/active`             | Cookie | Join the account's Active session               |
| Focus sessions | POST   | `/api/sessions/{id}/heartbeat`     | Cookie | Record presence for a session                   |
| Focus sessions | POST   | `/api/sessions/{id}/complete`      | Cookie | Complete a session and store rewards            |
| Focus sessions | POST   | `/api/sessions/{id}/abandon`       | Cookie | Give up a session                               |
| History        | GET    | `/api/sessions`                    | Cookie | List Completed and Abandoned sessions           |
| Docs           | GET    | `/api/openapi`                     | No     | Serve `docs/openapi.yaml`                       |

## Auth

### POST /api/auth/signup

Creates the account and its default pet, Mochi, in one transaction, then signs the user in.

**Auth:** not required.

**Request body**

| Field      | Type   | Rules                                                                                                                   |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| `email`    | string | Required. Valid format, at most 254 characters. Trimmed and stored lowercase. Unique, case-insensitive.                 |
| `password` | string | Required. 8 to 15 characters, counted as characters (an emoji counts as one).                                           |
| `timezone` | string | Optional. IANA timezone from the browser. Missing or unknown values are stored as `America/Los_Angeles`. Cannot change later. |

```json
{
  "email": "jo@school.edu",
  "password": "sunflower22",
  "timezone": "America/New_York"
}
```

**Success:** `201 Created`, with the `onyou_auth` cookie set.

```json
{
  "user": {
    "id": "cm3x9k2ab0001qz8f7h2d4e5g",
    "email": "jo@school.edu",
    "timezone": "America/New_York"
  }
}
```

**Errors**

| Status | Code               | When                                                                                                                                  |
| ------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR` | Bad JSON or a field breaks a rule. Field messages include `Enter your email.`, `Enter a valid email address.`, `Enter a password.`, and `Use 8 to 15 characters. This one has 3.` |
| 409    | `EMAIL_IN_USE`     | `An account with this email already exists.` Also sent as `fields.email`.                                                            |

### POST /api/auth/login

Signs in with email and password.

**Auth:** not required.

**Request body**

| Field      | Type   | Rules                                                      |
| ---------- | ------ | ---------------------------------------------------------- |
| `email`    | string | Required. Same rules as signup. Matched case-insensitively. |
| `password` | string | Required. 8 to 15 characters.                               |

Any other field, including `timezone`, is ignored.

**Success:** `200 OK`, with the `onyou_auth` cookie set.

```json
{
  "user": {
    "id": "cm3x9k2ab0001qz8f7h2d4e5g",
    "email": "jo@school.edu",
    "timezone": "America/New_York"
  }
}
```

**Errors**

| Status | Code                  | When                                                                                     |
| ------ | --------------------- | ---------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`    | Bad JSON or a field breaks a rule.                                                        |
| 401    | `INVALID_CREDENTIALS` | `Email or password is incorrect. Check both and try again.` Same for an unknown email and a wrong password. |

- An unknown email still runs a bcrypt comparison, so response time does not reveal whether an account exists.

### POST /api/auth/logout

Ends the account's Active session on every device, then signs this browser out.

**Auth:** required.

**Request body:** none.

**Success:** `200 OK`. The response clears the `onyou_auth` cookie.

```json
{
  "message": "Logged out."
}
```

**Errors**

| Status | Code              | When                    |
| ------ | ----------------- | ----------------------- |
| 401    | `UNAUTHENTICATED` | No valid auth cookie.   |

- The Active session follows the Give up rule. Before the scheduled end it becomes Abandoned with zero rewards. At or after the end, with presence met, it completes with its exactly-once rewards.
- Other devices stay signed in. Their next heartbeat returns the ended session.
- The client asks for confirmation before calling this during an Active session.

## Password reset

### POST /api/auth/password-reset/request

Emails a single-use reset link if the email has an account.

**Auth:** not required.

**Request body**

| Field   | Type   | Rules                           |
| ------- | ------ | ------------------------------- |
| `email` | string | Required. Same rules as signup. |

**Success:** `200 OK`.

```json
{
  "message": "If an account exists for that email, a reset link is on its way."
}
```

**Errors**

| Status | Code                | When                                                              |
| ------ | ------------------- | ----------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`  | Bad JSON or an invalid email.                                     |
| 429    | `TOO_MANY_REQUESTS` | `Too many reset requests. Wait a few minutes, then try again.`    |

- The body is the same for unknown emails, and also when the email could not be sent.
- Rate limited to 3 requests per email and 10 per IP address in each fixed 15-minute window. Counters live in PostgreSQL, and unknown emails count too.
- The server stores only a SHA-256 hash of the token. The link expires after 30 minutes. A new request deletes the account's older unused links.

### POST /api/auth/password-reset/confirm

Sets a new password from an emailed reset link.

**Auth:** not required.

**Request body**

| Field      | Type   | Rules                                                                    |
| ---------- | ------ | ------------------------------------------------------------------------ |
| `token`    | string | The token from the reset link. A missing token gets `RESET_LINK_INVALID`. |
| `password` | string | Required. 8 to 15 characters.                                            |

```json
{
  "token": "<token from the reset link>",
  "password": "maplewood7"
}
```

**Success:** `200 OK`. The response clears the `onyou_auth` cookie.

```json
{
  "message": "Password updated. Log in with your new password."
}
```

**Errors**

| Status | Code                 | When                                                   |
| ------ | -------------------- | ------------------------------------------------------ |
| 400    | `VALIDATION_ERROR`   | Bad JSON or the password breaks the 8 to 15 rule.      |
| 400    | `RESET_LINK_INVALID` | The token is missing, unknown, used, or expired.       |

- In one transaction the server stores the new bcrypt hash, increments `tokenVersion` (signing out every device), marks the link used, and deletes other unused links. Two tabs cannot both use one link.
- A reset does not abandon an Active focus session by itself. Signing out stops heartbeats, so presence then lapses.

## Pet

### GET /api/pet

Returns the account's pet, its coin balance, and today's feeding progress.

**Auth:** required.

**Request body:** none.

**Success:** `200 OK`.

```json
{
  "name": "Mochi",
  "coins": 385,
  "applesToday": 1,
  "feedingMinutesTowardNextApple": 10,
  "feedingState": "HUNGRY"
}
```

| Field                           | Meaning                                                                    |
| ------------------------------- | -------------------------------------------------------------------------- |
| `coins`                         | Total coins earned. Never resets.                                          |
| `applesToday`                   | Apples today, 0 to 2.                                                      |
| `feedingMinutesTowardNextApple` | Leftover feeding minutes today toward the next apple, 0 to 24. 0 when Full. |
| `feedingState`                  | `STARVING` (0 apples), `HUNGRY` (1), or `FULL` (2). Screens show Starving, Hungry, Full. |

**Errors**

| Status | Code              | When                  |
| ------ | ----------------- | --------------------- |
| 401    | `UNAUTHENTICATED` | No valid auth cookie. |

- Read-only. It does not resolve or complete a running session.
- "Today" is the current date in the timezone saved at signup. Apples and feeding minutes reset at midnight there.

### PATCH /api/pet

Renames the account's pet.

**Auth:** required.

**Request body**

| Field  | Type   | Rules                                                                                      |
| ------ | ------ | ------------------------------------------------------------------------------------------ |
| `name` | string | Required. Trimmed. At most 30 characters, rejected (never truncated) above that. Blank restores `Mochi`. |

```json
{
  "name": "Biscuit"
}
```

**Success:** `200 OK`, with the same shape as `GET /api/pet`.

```json
{
  "name": "Biscuit",
  "coins": 385,
  "applesToday": 1,
  "feedingMinutesTowardNextApple": 10,
  "feedingState": "HUNGRY"
}
```

**Errors**

| Status | Code               | When                                                                                                      |
| ------ | ------------------ | --------------------------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR` | Bad JSON, `name` missing or not text (`Enter a pet name.`), or too long (`Pet names can be up to 30 characters. This one has 35.`). |
| 401    | `UNAUTHENTICATED`  | No valid auth cookie.                                                                                     |

## Focus sessions

All session endpoints return a `FocusSession`:

| Field                  | Meaning                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `id`                   | Session id.                                                |
| `taskName`             | Task name, trimmed. Blank was stored as `Focus session`.   |
| `durationMinutes`      | 15, 25, or 50.                                             |
| `status`               | `ACTIVE`, `COMPLETED`, or `ABANDONED`.                     |
| `startTime`, `endTime` | Set by the server. `endTime` is the scheduled end.         |
| `lastHeartbeatAt`      | Latest accepted heartbeat.                                 |
| `coinsEarned`, `feedingMinutesEarned`, `applesEarned` | Rewards stored at completion. 0 while Active and when Abandoned. |

Complete, and abandon when it completes, add a `pet` snapshot for the session's feeding day: `name`, `feedingState`, `apples`, `feedingMinutes`, and `minutesUntilNextApple` (0 when Full).

### POST /api/sessions

Starts the account's single Active session.

**Auth:** required.

**Request body**

| Field             | Type    | Rules                                                                                                       |
| ----------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `taskName`        | string  | Optional. Trimmed. At most 80 characters, rejected (never truncated) above that. Blank becomes `Focus session`. |
| `durationMinutes` | integer | Required. Exactly 15, 25, or 50.                                                                            |

```json
{
  "taskName": "Essay draft: intro",
  "durationMinutes": 25
}
```

**Success:** `201 Created`.

```json
{
  "id": "cm3xa1f7k0004qz8fm9t2v6wp",
  "taskName": "Essay draft: intro",
  "durationMinutes": 25,
  "status": "ACTIVE",
  "startTime": "2026-11-15T17:00:00.000Z",
  "endTime": "2026-11-15T17:25:00.000Z",
  "lastHeartbeatAt": "2026-11-15T17:00:00.000Z",
  "coinsEarned": 0,
  "feedingMinutesEarned": 0,
  "applesEarned": 0
}
```

**Errors**

| Status | Code                    | When                                                                                                                     |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 400    | `VALIDATION_ERROR`      | Bad JSON; `durationMinutes` not allowed (`Choose 15, 25, or 50 minutes.`); `taskName` not text (`Task name must be text.`) or too long (`Task names can be up to 80 characters. This one has 81.`). |
| 401    | `UNAUTHENTICATED`       | No valid auth cookie.                                                                                                    |
| 409    | `ACTIVE_SESSION_EXISTS` | The account already has an Active session (`One session at a time`).                                                     |

- Start records the first heartbeat: `lastHeartbeatAt` equals `startTime`.
- An older Active session whose presence lapsed is resolved to Abandoned first, so start succeeds. A presence-met session past its end still blocks start until it is completed.
- A partial unique index enforces one Active session per account, even under concurrent requests.

### GET /api/sessions/active

Returns the account's Active session so any tab or device can join it.

**Auth:** required.

**Request body:** none.

**Success:** `200 OK`, with a `FocusSession` (same shape as start) or `null` when nothing is Active.

```json
null
```

**Errors**

| Status | Code              | When                  |
| ------ | ----------------- | --------------------- |
| 401    | `UNAUTHENTICATED` | No valid auth cookie. |

- The server resolves presence first. A session whose presence lapsed is Abandoned and `null` is returned.
- This read does not count as a heartbeat. Joining tabs should heartbeat right after.

### POST /api/sessions/{id}/heartbeat

Records that an authenticated tab of the owner is still connected.

**Auth:** required.

**Path parameter:** `id`, the session id.

**Request body:** none (ignored).

**Success:** `200 OK`, with the session after resolution.

```json
{
  "id": "cm3xa1f7k0004qz8fm9t2v6wp",
  "taskName": "Essay draft: intro",
  "durationMinutes": 25,
  "status": "ACTIVE",
  "startTime": "2026-11-15T17:00:00.000Z",
  "endTime": "2026-11-15T17:25:00.000Z",
  "lastHeartbeatAt": "2026-11-15T17:12:40.000Z",
  "coinsEarned": 0,
  "feedingMinutesEarned": 0,
  "applesEarned": 0
}
```

**Errors**

| Status | Code                | When                                    |
| ------ | ------------------- | --------------------------------------- |
| 401    | `UNAUTHENTICATED`   | No valid auth cookie.                   |
| 403    | `FORBIDDEN`         | The session belongs to another account. |
| 404    | `SESSION_NOT_FOUND` | No session has that id.                 |

- A heartbeat before the presence deadline renews `lastHeartbeatAt`. A heartbeat after the deadline never revives the session: it returns `ABANDONED`.
- A heartbeat never marks a session Completed. Past the end with presence met, it returns `ACTIVE` until complete is called.
- A final session returns its stored state with `200`, not an error.

### POST /api/sessions/{id}/complete

Completes a session after its scheduled end and stores its rewards.

**Auth:** required.

**Path parameter:** `id`, the session id.

**Request body:** none. Any body, including client-sent rewards, is ignored.

**Success:** `200 OK`, with the completed session and a `pet` snapshot.

```json
{
  "id": "cm3xa1f7k0004qz8fm9t2v6wp",
  "taskName": "Essay draft: intro",
  "durationMinutes": 25,
  "status": "COMPLETED",
  "startTime": "2026-11-15T17:00:00.000Z",
  "endTime": "2026-11-15T17:25:00.000Z",
  "lastHeartbeatAt": "2026-11-15T17:24:52.000Z",
  "coinsEarned": 25,
  "feedingMinutesEarned": 25,
  "applesEarned": 1,
  "pet": {
    "name": "Mochi",
    "feedingState": "HUNGRY",
    "apples": 1,
    "feedingMinutes": 25,
    "minutesUntilNextApple": 25
  }
}
```

**Errors**

| Status | Code                | When                                    |
| ------ | ------------------- | --------------------------------------- |
| 401    | `UNAUTHENTICATED`   | No valid auth cookie.                   |
| 403    | `FORBIDDEN`         | The session belongs to another account. |
| 404    | `SESSION_NOT_FOUND` | No session has that id.                 |
| 409    | `SESSION_TOO_EARLY` | The scheduled end has not been reached. |
| 409    | `SESSION_ABANDONED` | The session is Abandoned, or presence lapsed at or before the end. |

- Completes only when the presence deadline is strictly later than the scheduled end.
- Exactly once. Status and rewards are written in one transaction guarded by `status = 'ACTIVE'`. A retry returns the stored rewards with `200` and awards nothing again.
- Rewards: coins equal the duration. Feeding minutes add the duration, capped at 50 per feeding day. One apple per 25 minutes, at most 2 per day. The feeding day is `endTime` in the account's timezone, even when resolution happens later.

### POST /api/sessions/{id}/abandon

Gives up a session. Any authenticated tab of the owner may call it.

**Auth:** required.

**Path parameter:** `id`, the session id.

**Request body:** none (ignored).

**Success:** `200 OK`, with the resolved session. An Abandoned session has zero rewards and no `pet`.

```json
{
  "id": "cm3xa1f7k0004qz8fm9t2v6wp",
  "taskName": "Essay draft: intro",
  "durationMinutes": 25,
  "status": "ABANDONED",
  "startTime": "2026-11-15T17:00:00.000Z",
  "endTime": "2026-11-15T17:25:00.000Z",
  "lastHeartbeatAt": "2026-11-15T17:09:30.000Z",
  "coinsEarned": 0,
  "feedingMinutesEarned": 0,
  "applesEarned": 0
}
```

**Errors**

| Status | Code                | When                                    |
| ------ | ------------------- | --------------------------------------- |
| 401    | `UNAUTHENTICATED`   | No valid auth cookie.                   |
| 403    | `FORBIDDEN`         | The session belongs to another account. |
| 404    | `SESSION_NOT_FOUND` | No session has that id.                 |

- Before the scheduled end, the session becomes Abandoned. Rewards already earned on earlier sessions are unchanged.
- At or after the scheduled end with presence met, it completes instead, with the same exactly-once rewards and `pet` snapshot as complete.
- A session that is already Completed or Abandoned returns its stored outcome. Nothing is written again.

## History

### GET /api/sessions

Lists the account's Completed and Abandoned sessions, newest first, 20 per page.

**Auth:** required.

**Request body:** none.

**Query parameters**

| Param    | Type   | Rules                                                                                                  |
| -------- | ------ | ------------------------------------------------------------------------------------------------------ |
| `cursor` | string | Optional. The `nextCursor` from the previous page: the id of a final session owned by this account.    |
| `limit`  | string | Optional. Only `20` is accepted.                                                                       |

**Success:** `200 OK`.

```json
{
  "items": [
    {
      "id": "cm3xa1f7k0004qz8fm9t2v6wp",
      "taskName": "Essay draft: intro",
      "date": "2026-11-15T17:00:00.000Z",
      "durationMinutes": 25,
      "outcome": "COMPLETED",
      "coinsEarned": 25,
      "feedingMinutesEarned": 25
    },
    {
      "id": "cm3x8w3pq0002qz8fk1r5n7ys",
      "taskName": "Focus session",
      "date": "2026-11-15T15:30:00.000Z",
      "durationMinutes": 15,
      "outcome": "ABANDONED",
      "coinsEarned": 0,
      "feedingMinutesEarned": 0
    }
  ],
  "nextCursor": null
}
```

**Errors**

| Status | Code               | When                                                                                                                  |
| ------ | ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR` | `limit` is not `20` (`fields.limit`: `History pages contain 20 sessions.`), or `cursor` is not a final session of this account (`fields.cursor`: `That cursor is not in this account's history.`). |
| 401    | `UNAUTHENTICATED`  | No valid auth cookie.                                                                                                 |

- `date` is the session's `startTime` in UTC. Ties sort by greater id first. Active sessions are omitted.
- `nextCursor` is `null` on the last page.
- The account's Active session is resolved first, so a session whose presence just lapsed appears as Abandoned.

## Docs

### GET /api/openapi

Serves `docs/openapi.yaml` as `application/yaml; charset=utf-8`. The Swagger UI page at `/docs` loads it.

**Auth:** not required. **Request body:** none. **Success:** `200 OK` with the YAML document.

## Session lifecycle

- A session starts `ACTIVE` and ends as `COMPLETED` or `ABANDONED`. Both are final, and an account has at most one `ACTIVE` session across tabs and devices.
- Start records the first heartbeat. Each open, authenticated tab heartbeats when it joins and every 10 seconds.
- The presence deadline is the latest accepted heartbeat plus 30 seconds. If it passes at or before the scheduled end, the session is Abandoned and cannot be revived.
- A session is Completed only if its presence deadline is strictly later than the scheduled end and the owner calls complete (or gives up after the end). Completion before the end is rejected.
- The server has no running timer. It resolves the session on the next request from stored timestamps, judged against the scheduled end time, not the request time.
- Abandoned sessions earn zero coins, apples, and feeding minutes.

## Spec differences

Differences between `docs/openapi.yaml` and the handlers. The handlers are correct.

- `GET /api/openapi` is a shipped route but is not listed in `docs/openapi.yaml`.
- `docs/openapi.yaml` types the history `limit` as an integer that defaults to 20. The handler accepts only the exact string `20` (for example, `020` is rejected) and always uses 20.
