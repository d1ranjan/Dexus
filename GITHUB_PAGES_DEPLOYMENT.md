# Dexus GitHub Pages Deployment

## Purpose and scope

The public GitHub Pages address for this repository is expected to be **`https://d1ranjan.github.io/Dexus/`**. It hosts only the Dexus Expo web export: HTML, JavaScript, styles, and static assets. It does **not** host the Express/tRPC server, TiDB database, AI processing, file storage proxy, or server-side Supabase token verification.

| Component | GitHub Pages responsibility | Current target |
| --- | --- | --- |
| Dexus web frontend | Static Expo Router export from `dist/` | `https://d1ranjan.github.io/Dexus/` |
| API, Dexus authentication bridge, tRPC, AI, storage proxy | Not supported by Pages; requires Node.js HTTPS hosting | Current managed Dexus API while its `/api/health` endpoint remains reachable |
| Database and object storage | Not supported by Pages | Existing server-side providers only |
| Supabase confirmation and recovery callback | Must return to the branded static frontend | `https://d1ranjan.github.io/Dexus/auth/callback` after the Pages deployment is confirmed live |

## Frontend-only branch deployment

The Dexus web frontend is exported to the repository’s **`gh-pages` branch** and GitHub Pages serves that branch’s root directory. This approach does not require a GitHub Actions workflow and does not create, upload, or configure an API service, database, AI provider, file-storage provider, or server secret.

The frontend-only Pages build does not include `EXPO_PUBLIC_API_BASE_URL`. This allows the visual Dexus frontend and its static screens to be hosted independently of the managed frontend maintenance response. Features that require an API—such as account creation, sign-in, user data, AI extraction, documents, voice, and administration—will not function from that Pages build until an existing or separately hosted HTTPS backend is deliberately configured.

If the owner later wants a functional web application rather than a frontend shell, the workflow can be given this public build-time repository variable:

```text
DEXUS_API_BASE_URL=https://dexusai-zzil53tz.manus.space
```

That optional setting points only to the existing Dexus backend; it does not create a new API. It should be added only after the owner chooses to make the full web features operational from GitHub Pages.

In the repository’s **Settings → Pages**, select **Deploy from a branch**, then select the **`gh-pages`** branch and the **`/ (root)`** folder. The exported branch contains a `.nojekyll` file so GitHub Pages preserves Expo’s generated `_expo` assets. Future frontend releases can export the same static bundle and replace the contents of `gh-pages`.

## Security boundaries

The backend now uses the server-only `CORS_ALLOWED_ORIGINS` allow-list rather than reflecting every browser `Origin` header. If an HTTPS backend is later connected to the Pages site, its server-only allow-list must contain these exact origins, comma-separated:

```text
https://d1ranjan.github.io,https://dexusai-zzil53tz.manus.space,https://8081-i14mcduh0maapqv67p537-0bacee81.us4.manus.computer
```

The Pages origin is intentionally only `https://d1ranjan.github.io`; CORS compares origins, not paths. The Dexus server continues to verify Supabase bearer tokens and retain all authorization, user-isolation, and administrator checks server-side. No server credential belongs in repository variables, the static export, or GitHub Pages.

## Post-deployment redirect change

Do not change Supabase confirmation or recovery redirects for the frontend-only shell. When an HTTPS backend is deliberately connected and `https://d1ranjan.github.io/Dexus/` is verified as a functional Dexus web client, update the Supabase project configuration to use the exact callback `https://d1ranjan.github.io/Dexus/auth/callback`. Preserve the Dexus native scheme and the development-preview callback in the allow-list.

## Independent backend option

For a deployment that is independent of the managed Dexus backend, first provision an owner-controlled or third-party Node.js HTTPS host that can run the Express server and receive the existing server-only environment variables. Its database, Supabase server verification, AI, storage, security/audit model, and CORS allow-list must be migrated and tested there before changing `DEXUS_API_BASE_URL`. GitHub Pages alone cannot replace that runtime.
