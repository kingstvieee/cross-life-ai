# Guardian access and release status

The application has an explicit sign-in entry and a separate local guest preview.
Guest browsing mounts no account memory/activity/home providers, creates no user,
mints no bearer, and sends no private context. All legacy demo sessions are denied
by the common backend authentication boundary. Fixture seed endpoints are disabled.

## Hosted web sign-in

Google, Microsoft, Apple, Yahoo and email use separate connections at a configured hosted
identity broker. The backend performs the authorization-code exchange with S256
PKCE and an expiring browser-bound, single-use state record. It reads verified
identity from the broker's authenticated HTTPS userinfo endpoint. It does not
trust an email supplied by the app or automatically link existing accounts by
email. Provider access tokens remain server-side. Web sessions use Secure,
HttpOnly cookies; account mutations require the exact configured app Origin.
The OAuth callback accepts GET query parameters and POST form fields through the
same handler. Its short-lived browser-binding cookie is Secure, HttpOnly and
SameSite=None so cross-site form_post can return it. Only POST /api/auth/callback
bypasses session-Origin checks; it still requires matching one-use state and
browser binding, and never inherits an old session bearer. All other cookie
mutations keep exact-origin CSRF checks.
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
| AUTH_CONNECTION_YAHOO | Existing Yahoo OIDC connection name with verified email |
| AUTH_CONNECTION_APPLE | Existing Apple connection name |
| AUTH_NATIVE_REDIRECT_URL | Exactly frontend://auth-complete for the installed native scheme |
| AUTH_CONNECTION_EMAIL | Existing hosted email-account connection name |
| EXPO_PUBLIC_BACKEND_URL | Frontend's actual backend HTTPS origin |

Microsoft / Outlook shares the `microsoft` provider ID. Configure that broker
connection to accept personal Microsoft accounts (including Outlook/Hotmail);
work/school accounts require the appropriate supported account type or a
separate enterprise connection. Yahoo uses its own `yahoo` provider ID and
`AUTH_CONNECTION_YAHOO`; an email address alone never enables social login.
Regular email login uses the broker's hosted account flow and must return
`email_verified: true` before this backend creates a session. The app never
collects a person's Google, Microsoft, Apple or Yahoo password.

Operational checkpoint, 2026-11-13 (Toronto): Apple Developer's primary App ID,
web Services ID and app-restricted signing key are configured for the Auth0 Apple
connection. Auth0's connection test reported a successful Apple transaction.
The confidential broker client and Apple/email connection settings are deployed
on the Emergent backend. The backend client secret was corrected after the first
full Hub exchange failed; a complete Hub session after that correction is still
unverified. `/api/auth/providers` reports Apple/email enabled, native enabled,
and Google/Microsoft/Yahoo disabled. Enabled configuration is not login proof.

After the owner completed Apple Developer authentication, Emergent's iOS build
panel started version 1.0.1. That attempt failed before compilation because
the managed detector selected `backups/canonical-f68171a` instead of `frontend`.
The archived package manifest was preserved as `package.json.archived`, leaving
only `frontend` eligible for app detection. The correction is committed on the
integration checkout and PR branch. Corrected Publish 9 (`97b8028`) is live;
the owner authenticated again and the version 1.0.1 retry succeeded.
App Store Connect received version 1.0.1 build 102 at 9:44 PM Toronto and finished
processing it. Build 102 is assigned to the existing Team (Expo) internal group
with one tester. Test instructions were saved. Installation and complete native
Apple/email login are still awaiting device verification; the last observed
installed build was 1.0.0 (2). Apple capability changes invalidated existing provisioning profiles, so
the managed build must regenerate them. No public App Store release is authorized.

Google's Cloud Console is currently unavailable in this cloud browser; the Auth0
Google connection still uses development credentials. Microsoft Entra requires
interactive session recovery. Yahoo's selected sign-in reached account creation
and was stopped before accepting terms. These providers remain disabled until
owned production credentials and actual login are verified.

The broker must support authorization-code PKCE, the connection selector, and
verified email at userinfo. Enable each requested connection in the broker and
register the exact callback URL. Auth0 registration and Apple configuration were
completed with owner approval; Google/Microsoft/Yahoo setup remains incomplete.
Missing or invalid configuration keeps methods disabled, with HTTP 503 on start.
Prefer frontend/backend hosts under the same site to avoid third-party cookie
blocking. Native login uses the system authentication browser, app-held S256 PKCE, a fixed
callback, and a 60-second single-use grant exchanged for a SecureStore session.
Provider credentials remain on the backend; no bearer appears in the callback URL.
Native methods remain unavailable until AUTH_NATIVE_REDIRECT_URL and each broker
connection are configured. A fake-provider test does not establish live login.
Leave AUTH_CONNECTION_APPLE unset until the hosted broker is confirmed to handle
Apple’s JWT client-secret lifecycle (.p8/team/key ID) and verified-email userinfo.
This backend exchanges a broker authorization code; it does not implement direct
Apple token exchange or generate Apple client-secret JWTs. Callback-route tests
do not establish live Apple login.

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

Release blockers: verify the corrected Apple exchange through the complete Hub
session, complete Google/Microsoft/Yahoo configuration, and verify the new iOS
binary in TestFlight on a real device. The Emergent mobile backend is deployed;
its root path returns 404 and is not evidence of a hosted web frontend. The
separate Vercel project was not made deployment-ready by this work. Emergent shows
exhausted agent credits and a failed subscription renewal; no payment, upgrade
or extra build allocation was purchased. Do not paste credentials into chat or
commit environment files.
