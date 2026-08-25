# Dexus Mobile Runtime Audit

**Audit date:** 24 August 2026  
**Scope:** Phone internal-error investigation; Expo configuration, dependencies, client startup/authentication paths, Android/iOS JavaScript bundles, server health, and protected data regressions.

## Finding and repair summary

| Area | Finding | Repair | Verification |
|---|---|---|---|
| Expo native dependencies | Expo diagnostics identified a missing `expo-asset` peer dependency required by `expo-audio`, plus incompatible Expo SDK 54 package versions. The incompatible packages included major mismatches for Document Picker and Network. | Installed `expo-asset`, aligned Expo SDK modules with SDK 54, and refreshed the lockfile. | `npx expo-doctor` now reports **18/18 checks passed**. |
| Native configuration | Required native plugins for Asset, Font, SecureStore, and WebBrowser were absent from the dynamic Expo configuration. | Registered `expo-asset`, `expo-font`, `expo-secure-store`, and `expo-web-browser` in `app.config.ts`; preserved existing Audio, splash, Router, and build-property configuration. | Resolved public Expo manifest contains Android/iOS identity, Dexus deep-link scheme, and all required plugins. |
| Mobile email links | The Dexus callback handled only a launch-time URL. A confirmation or recovery link delivered while the app was already open could fail to complete. | Root startup now loads URL parsing support; the callback uses Expo’s URL hook and requires successful server-session establishment before navigating. | TypeScript, linting, and Android/iOS production JavaScript exports complete successfully. |
| Runtime diagnostics | Theme-provider debug logging emitted a full palette on every render, flooding logs and obscuring useful failures. | Removed the high-frequency client log without changing theme behavior. | Fresh export completes without this repeated client debug output. |
| Auth transport | Branded Dexus auth uses server-mediated Supabase endpoints and a Dexus-managed secure session store. Protected tRPC calls use that same token source. | Previously completed migration work was retained; no secrets or service-role credential is shipped in the Expo bundle. | External API health returned `200`; invalid sign-in returned the expected protected `401`; focused token/config tests passed. |

## Automated evidence

| Validation | Result |
|---|---|
| Expo diagnostics | **18/18 checks passed**. |
| TypeScript | `pnpm check` passed. |
| Linting | `pnpm lint` passed. |
| Backend production bundle | `pnpm build` passed. |
| Mobile JavaScript bundles | `npx expo export --platform all` passed and produced Android and iOS Hermes bundles. |
| Standard test suite | `pnpm test` passed: **12 tests passed**; opt-in live suites correctly remain skipped in the standard run. |
| Live managed database/Admin suite | **10 tests passed**, covering user-scoped CRUD, Supabase identity mapping, Brain Dump retrieval isolation, normal-user admin denial, controlled administrator actions, auditing, suspension, export, soft deletion, and cleanup. |
| Running services | The browser preview and server health endpoint returned `200`; the invalid Dexus sign-in contract returned `401`, rather than a transport failure. |

## What this establishes

The earlier dependency mismatch and missing native peer/plugin configuration were credible causes of an Expo/phone internal error. They have been corrected, and the application now passes configuration validation, static analysis, production bundle generation for both mobile platforms, server compilation, standard tests, and live data/security regressions.

> This is strong automated readiness evidence, but it is not proof of a real-device run. Physical-device confirmation remains necessary because Expo Go and a native development/release build differ in deep-link registration, device networking, and installed native modules.

## Remaining device-only boundary

The next physical-device check should use a **Dexus development or production build**, not Expo Go, for email confirmation and password-recovery links. Expo Go does not support the Dexus custom confirmation scheme reliably. On the device, verify app launch, sign-in, audio permission, document selection, sign-out/sign-in, and an email confirmation or recovery link. If an internal error reappears, capture the exact screen and the device log time; the high-noise theme log has been removed so the actionable error should be easier to isolate.

## Publishing status

No checkpoint or publish action was taken during this audit because the owner previously requested publishing be stopped. The project files and dependency lockfile contain the fixes locally; publish only after the owner explicitly authorizes it.
