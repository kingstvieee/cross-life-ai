# Native daily check-ins

Implementation uses Apple's UserNotifications framework within the existing
local Expo module. No additional package, subscription, push service, background
microphone entitlement or server secret is required.

Settings → Daily check-in notifications lets a signed-in user request permission
and register one repeating daily reminder from 12:00 through 23:59 Toronto time.
The default selection is 13:30; opening the page does not schedule anything or
request permission. Scheduling reads back the pending OS request and its next
trigger date. iOS Focus/notification settings still govern delivery.

The OS schedules the reminder while app JavaScript is suspended or closed.
The alert contains generic text only, never account names, private conversations,
tokens, portal facts or medical information. Opening it returns to the app.
It does not execute a mission, infer home arrival, record or speak in the
background, or provide an always-listening wake word.

The native owner binding stores only a SHA-256 account identifier. Sign-out,
account change and cross-life pause remove the pending/delivered reminder.
Revision fences invalidate permission/scheduling work after cancellation or
account changes. Concurrent scheduling is rejected while an update is pending,
preventing stale cleanup from removing a newer schedule. Notification permission
denial removes any existing schedule; it is never reported as delivery success.
Unsupported builds/web show an unavailable state rather than pretending to
schedule. User consent remains required on the real device.

The Native Check-in Compile workflow performs Expo prebuild, pod installation,
native target validation and an unsigned iOS simulator build on an Apple runner.
A passing JavaScript export alone is not proof of Swift compilation or actual
delivery. A new signed IPA/TestFlight upload and physical-device delivery remain
separate release gates. Existing build number 104 is unchanged in this patch.

Reference: https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app
