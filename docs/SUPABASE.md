# Supabase setup

Istel uses Supabase for accounts. Sign-in is optional: without Supabase settings the app still works fully on
the device, and the Sign in screen says it is not set up.

## How sign-in works

- **Email code (default):** the user types their email, gets a 6-digit code, and types it into the app. No password
  and no deep links, so it works the same on iOS, Android and web. The first sign-in creates the account.
- **Google (optional):** "Continue with Google" appears when `EXPO_PUBLIC_AUTH_GOOGLE=true`.
- A `profiles` row is created for every new user with their device time zone
  (`supabase/migrations/20260930120000_profiles.sql`). Row-level security lets users read and update only their own row.
- The session is saved on the device (browser storage on web, SQLite on iOS/Android) and refreshed automatically.

## Run it locally

Needs Docker.

```bash
npx supabase start          # starts Postgres, Auth, the API and Mailpit, and applies migrations
npx supabase status         # shows the API URL and publishable key
cp .env.example .env        # paste the API URL and publishable key into .env
npx expo start
```

Sign-in emails are not really sent locally. Open Mailpit at http://127.0.0.1:54324 to read the code.

## Hosted project

1. Create a project at https://supabase.com/dashboard.
2. Apply the migrations, oldest first: either paste each file from `supabase/migrations/` into the
   **SQL Editor** and run it, or use the CLI:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. **Auth > Email Templates:** in both "Magic Link" and "Confirm signup", show the code with `{{ .Token }}`
   (you can paste `supabase/templates/sign-in-code.html`). Without it the email only has a link and the app
   cannot use it.
4. **Auth > URL Configuration:** set the Site URL to where the web app is hosted and add these redirect URLs:
   `istel://auth/callback`, `https://<your-web-domain>/auth/callback`, and `exp://**` for Expo Go during
   development.
5. For real email volume, set up custom SMTP under **Auth > SMTP Settings** (the built-in sender is rate-limited).
6. Put the project URL and publishable key from the **Connect** dialog into `.env`.

### Google (optional)

1. In Google Cloud, create an OAuth client (type "Web application") and add
   `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI.
2. In Supabase, **Auth > Providers > Google**: turn it on and paste the client ID and secret.
3. Set `EXPO_PUBLIC_AUTH_GOOGLE=true` in `.env`.

Locally, set `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` and turn on
`[auth.external.google]` in `supabase/config.toml`.

## Sync

`supabase/migrations/20261001120000_sync.sql` adds the synced tables (habits, check-ins, focus sessions,
settings, the running timer) and `delete_my_account()`.

- Every table has row-level security: people only reach their own rows. Check-ins and sessions can only be
  added, never edited. Tested with two users trying to read, edit and insert into each other's data.
- Conflicts: habits, settings and the timer keep the newest change (by the time it was made on the device);
  check-ins and sessions are merged by id, so nothing is counted twice.
- The app syncs right after sign-in, a moment after each change, when it comes back to the foreground, and
  every minute. Changes made offline wait and go out on the next sync.
- The first sign-in on a device uploads what is already there. Signing in to a different account on a device
  that holds another account's data clears that data from the device instead of uploading it.
- Deleting the account (Account screen) removes the user and all their rows everywhere.

## Not done yet

- Instant updates between devices (Supabase Realtime); today another device catches up within a minute or
  when it is opened.
- Sign in with Apple (not needed while the app is Android-only).
- The public web page for account deletion requests that Google Play asks for.
