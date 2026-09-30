# Hosting on istel.space

| Address | What | Vercel project | Root directory |
|---|---|---|---|
| `istel.space` (+ `www`) | Landing page, privacy policy, delete-account page | `istel-site` | `site` |
| `app.istel.space` | The web app (habits, focus, island, streaks, sync) | `istel-app` | repository root |

Both deploy automatically from GitHub whenever the production branch changes. Build settings live in
`vercel.json` (app) and `site/vercel.json` (website). Public Supabase settings for builds are in
`.env.production`; secrets never go in the repository.

## 1. Vercel account
Sign up at https://vercel.com with **Continue with GitHub** (the free Hobby plan is enough) and allow access to
the `project-test` repository.

## 2. The web app
1. **Add New → Project →** import `project-test`.
2. Name it `istel-app`. Framework preset: **Other**. Root directory: leave as `./`. Don't change the build
   settings; they come from `vercel.json`.
3. **Deploy.**
4. The production branch is the repository's default branch (`claude/fervent-fermat-4a5g0u` today). If the
   default branch changes later, update **Settings → Git → Production Branch**.
5. **Settings → Domains → Add** `app.istel.space`.

## 3. The website
1. **Add New → Project →** import `project-test` again.
2. Name it `istel-site`. Framework preset: **Other**. **Root directory: `site`**. Leave build and output empty.
3. **Deploy.**
4. **Settings → Domains → Add** `istel.space`, then add `www.istel.space` and choose to redirect it to
   `istel.space`.

## 4. DNS in Hostinger
hPanel → **Domains → istel.space → DNS / Nameservers → Manage DNS records.** Use exactly the values Vercel
shows on each domain; they are usually:

| Type | Name | Points to | Notes |
|---|---|---|---|
| A | `@` | `76.76.21.21` | **Delete** Hostinger's existing `A @` (parking page) first |
| CNAME | `www` | `cname.vercel-dns.com` | Replace an existing `www` record if there is one |
| CNAME | `app` | `cname.vercel-dns.com` | |

Leave the Resend email records (`send`, `resend._domainkey`, `_dmarc`) untouched. Vercel turns on HTTPS by
itself once the records are live (minutes to a few hours).

## 5. Supabase URLs
Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://app.istel.space`
- **Redirect URLs:** `https://app.istel.space/**`, `istel://**`, and `exp://**` (only for testing with Expo Go)

## 6. Check
- https://istel.space, https://istel.space/privacy and https://istel.space/delete-account load.
- https://app.istel.space opens the app; signing in with an email code works and syncs with the phone.
