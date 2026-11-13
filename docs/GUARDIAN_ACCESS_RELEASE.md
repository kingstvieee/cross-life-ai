# Guardian access and release status

The application has an explicit sign-in entry and a separate local guest preview.
Guest browsing mounts no account memory/activity/home providers, creates no user,
mints no bearer, and sends no private context. All legacy demo sessions are denied
by the common backend authentication boundary. Fixture seed endpoints are disabled.

## Hosted web sign-in

Google, Microsoft, Apple and email use separate connections at a configured hosted
identity broker. The backend performs the authorization-code exchange with S256
PKCE and an expiring browser-bound, single-use state record. It reads verified
identity from the broker's authenticated HTTPS userinfo endpoint. It does not
trust an email supplied by the app or automatically link existing accounts by
email. Provider access tokens remain server-side. Web sessions use Secure,
HttpOnly cookies; cookie mutations require the exact configured app Origin.
Bearer authentication remains available for existing native sessions and workers.

Configure these variables through the backend host's secret/settings UI:

| Variable | Purpose |
| --- | --- |
| AUTH_AUTHORIZE_URL | Broker HTTPS authorization endpoint |
| AUTH_TOKEN_URL | Broker HTTPS token endpoint |
| AUTH_USERINFO_URL | Broker HTTPS authenticated userinfo endpoint |
| AUTH_ISSUER | Stable broker identity namespace |
| AUTH_CLIENT_ID | Registered confidential web application's client ID |
| AUTH_CLIENT_SECRET | Backend-only client secret |
| AUTH_CALLBACK_URL | Exact HTTPS backend URL ending /api/auth/callback |
| AUTH_APP_URL | Exact HTTPS frontend return URL |
| AUTH_CONNECTION_GOOGLE | Existing Google connection name |
| AUTH_CONNECTION_MICROSOFT | Existing Microsoft connection name |
| AUTH_CONNECTION_APPLE | Existing Apple connection name |
| AUTH_NATIVE_REDIRECT_URL | Exactly frontend://auth-complete for the installed native scheme |
| AUTH_CONNECTION_EMAIL | Existing hosted email-account connection name |
| EXPO_PUBLIC_BACKEND_URL | Frontend's actual backend HTTPS origin |

The broker must support authorization-code PKCE, the connection selector, and
verified email at userinfo. Enable each requested connection in the broker and
register the exact callback URL. No provider account/project was created here.
Missing or invalid configuration keeps methods disabled, with HTTP 503 on start.
Prefer frontend/backend hosts under the same site to avoid third-party cookie
blocking. Native login uses the system authentication browser, app-held S256 PKCE, a fixed
callback, and a 60-second single-use grant exchanged for a SecureStore session.
Provider credentials remain on the backend; no bearer appears in the callback URL.
Native methods remain unavailable until AUTH_NATIVE_REDIRECT_URL and each broker
connection are configured. A fake-provider test does not establish live login.
The hosted email connection must provide password registration, verification and
recovery; those provider settings still need live acceptance testing.

The legacy Emergent exchange is disabled by default. ENABLE_LEGACY_EMERGENT_AUTH
is an explicit compatibility switch, not a replacement for the provider setup.

## Verification limits

The automated suite exercises production privacy functions (compiled from their
actual definitions), real identity routes with a fake HTTPS identity provider,
worker authorization, saved grants, expiry, cancellation and evidence rendering.
It does not prove live provider login, a production security control plane,
20-minute away continuation, device readback, ambient calibration, or TestFlight.
The older 25 dialogue cases remain source specifications, not executed evaluations.

Release blockers: the Vercel checks report the account deployment is blocked;
backend origin/database/provider configuration is absent from the inspected
Vercel project; Apple/EAS ownership and signing remain unverified. No invoice
amount is inferred. Resolve provider/billing/signing in their respective consoles;
do not paste credentials into chat or commit environment files.
