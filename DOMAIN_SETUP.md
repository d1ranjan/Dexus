# Dexus Custom-Domain Readiness

## Current status

**Status: Pending an owner-provided domain.** No custom domain is configured, purchased, redirected, or claimed by this project. Dexus currently uses GitHub Pages for its public web frontend and Render for its public API; neither host is an owner-owned custom domain.

> Do not add DNS records until the owner has both a registered Dexus domain and the deployment platform’s exact custom-domain target value.

## Current Supabase Auth redirect configuration

Supabase Auth has been corrected to prevent confirmation and recovery emails from falling back to `http://localhost:3000`. Its Site URL is now `https://d1ranjan.github.io/Dexus`, and the allowed redirect list contains the exact GitHub Pages callback `https://d1ranjan.github.io/Dexus/auth/callback`, the Dexus native scheme `dexusdexusmobilev2://**`, and the active development-preview callback.

The public frontend is `https://d1ranjan.github.io/Dexus/`, and its API is `https://dexus-api.onrender.com`. The managed host's frontend maintenance response no longer controls the public web route. The Render free instance can cold-start after inactivity, and the remaining email-link and account-flow validation is still pending.

## Information required from the owner

| Required input | Why it is needed |
|---|---|
| Registered domain | Dexus cannot configure or verify a domain it does not own. |
| Chosen canonical host | Decide whether `dexus.example` or `www.dexus.example` is canonical. |
| DNS-provider access | Required to create the final record set. |
| Deployment-platform target | The platform supplies the exact hostname, IP address, or verification value. Do not guess this value. |
| Supabase Auth redirect configuration | Email verification and password-recovery links must recognise the new production callback URL. |

## DNS records to create after the platform supplies its target

| Hostname | Record type | Exact value | Purpose |
|---|---|---|---|
| `www` (if selected) | `CNAME` | **The deployment platform’s supplied hostname** | Routes the `www` host to Dexus. |
| Apex/root (`@`) | `ALIAS` or `ANAME` where supported | **The deployment platform’s supplied hostname** | Routes the root domain without guessing an IP address. |
| Apex/root (`@`) where ALIAS/ANAME is unavailable | `A` / `AAAA` | **Only values supplied by the deployment platform** | Use only if the host publishes static IP targets. |
| Verification host, if requested | `TXT` or `CNAME` | **The exact value supplied by the deployment platform** | Proves domain control before activation. |

Do not use a placeholder IP address, a guessed CNAME destination, or a generic CDN target. DNS values are deployment-provider specific.

## Production checklist after DNS propagation

| Area | Required action |
|---|---|
| HTTPS and SSL | Confirm the hosting platform has issued a certificate for the canonical host before public traffic is sent. |
| Redirects | Configure a single canonical host and redirect the alternate root/`www` host to it. |
| Supabase Auth web redirect | Replace the current GitHub Pages callback with the exact `https://<canonical-host>/auth/callback` URL in Supabase Auth’s Redirect URLs after the custom host is live. Do not use a preview URL as the production Site URL. |
| Supabase Auth mobile redirect | Add `dexusdexusmobilev2://**` to Supabase Auth’s Redirect URLs so verified email and password-recovery links can return to the native Dexus route. |
| Supabase site URL | Replace the current GitHub Pages Site URL with `https://<canonical-host>` only after that host is live and verified. |
| API and session behavior | Confirm API requests, secure cookies, SameSite policy, and any CORS rules operate on the canonical HTTPS host. |
| Legal links | Confirm `https://<canonical-host>/privacy` and `https://<canonical-host>/terms` resolve publicly. |
| Metadata | Only after the host is live, set canonical, Open Graph, manifest, and application URLs to `https://<canonical-host>`. |

## What remains intentionally unchanged

No custom-domain DNS, HTTPS, or custom-domain metadata is changed by this document. The GitHub Pages Supabase Auth redirect configuration was updated to remove the localhost fallback, and the Render API is restricted to the exact GitHub Pages origin; an owner-provided domain still requires separate deployment-platform values and validation.

> **Expo Go limitation:** Dexus email confirmation and password-recovery links that use the `dexusdexusmobilev2://` scheme require a Dexus development or production build. Test those email links through the HTTPS web preview while using Expo Go; do not treat an Expo Go localhost redirect as a production-authentication failure.
