# Supabase setup

Rootline uses Supabase for accounts. Sign-in is optional: without Supabase settings the app still works fully on
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
2. Apply the migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. **Auth > Email Templates:** in both "Magic Link" and "Confirm signup", show the code with `{{ .Token }}`
   (you can paste `supabase/templates/sign-in-code.html`). Without it the email only has a link and the app
   cannot use it.
4. **Auth > URL Configuration:** set the Site URL to where the web app is hosted and add these redirect URLs:
   `rootline://auth/callback`, `https://<your-web-domain>/auth/callback`, and `exp://**` for Expo Go during
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

## Not done yet

- Syncing habits, check-ins and focus sessions to the account (next step; data stays on the device for now).
- Sign in with Apple (needs an Apple Developer account; required on iOS if Google sign-in ships there).
- Deleting an account from inside the app.
