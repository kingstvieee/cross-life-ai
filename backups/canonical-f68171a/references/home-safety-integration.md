# Home Safety Guardian Integration Boundary

## Google Home capability and privacy findings

Google Home’s Android Home APIs document support for Matter and Google Home device types that include contact sensors for door/window open state, occupancy sensors, smoke/CO alarms, water leak detectors, cooktops, door locks, and TV/media players. Device support is trait-dependent, so STAARWARDD must discover the specific household’s authorized capabilities before displaying or acting on a condition. [1]

Google Home presence sensing can combine selected device sensors, phone geofence state, Wi-Fi connectivity, and media state to determine whether someone is home. It is opt-in, can be disabled per home or phone, has user-manageable history, and should not be represented as precise person-by-person room tracking. [2]

Google Home policies require transparency, data minimization, user consent, reversibility, and a privacy policy for connected-home integrations. They also require secondary verification for state changes that could reduce security, such as unlocking a door, turning off a camera, disabling security, or opening a safety-relevant device. [3]

## Alexa capability findings

Alexa Smart Home APIs expose interfaces for contact sensors, motion sensors, doorbells, cooking devices, locks, scenes, security panels, television/media controls, speakers, cameras, power, and proactive notifications. Actual availability depends on the registered device/cloud capability and the user’s enabled Alexa integration. [4]

## STAARWARDD implementation boundary

The Home Safety Guardian may consume only authorized event/state feeds and may proactively **notify, explain, prepare a safe response, and escalate based on user preference**. It must never silently unlock or lock doors, enable/disable cameras, disarm alarms, turn off gas/cooking appliances, make purchases, or access personal accounts. Any high-impact remediation needs an in-app approval step and, where required by the source platform, secondary verification.

Before a real integration, the product needs an approved connection path for Google Home and/or Alexa, a consent screen naming each data category and allowed action, device capability discovery, an audit log, and no-device/offline fallback states. A local demonstration mode must be visibly labeled as simulated and must never imply live sensor or appliance state.

## Sources

[1] https://developers.home.google.com/apis/android/supported-device-types

[2] https://support.google.com/googlehome/answer/10000312?hl=en

[3] https://developers.home.google.com/policies

[4] https://developer.amazon.com/docs/alexaplus/device-apis/smart-home-general-apis.html
