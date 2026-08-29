# STAARWARDD Source-to-Native Migration Map

## Compatibility decision

The selected source repository is a **browser prototype**, not an existing native or production service project. The mobile application will therefore migrate only the capabilities demonstrably present in that source. The native project will not fabricate a production backend, database, authentication, account, entitlement, audit, memory, or ESP32 implementation that is absent from the source.

## Product identity map

| Source capability | Native target | Decision |
|---|---|---|
| StaarWardd visible identity and original Guardian/Toronto visual language | **STAARWARDD** native app identity and launch experience | Preserve. Use the existing project-owned visual assets and a native, silent-by-default, reduced-motion-compatible transition. |
| Single browser launch sequence into a portal field | Native Guardian launch followed directly by the STAAR Hub | Adapt. The native sequence is shorter and interruptible; it does not present a web dashboard after launch. |
| Browser portal names: Creativity, Work, Home, Wellbeing, Relationships, Community, Style | Canonical native IDs: `creativity`, `work`, `home`, `wellbeing`, `relationships`, `events`, `style` | Adapt. **Events** is authoritative for native migration. Retain suitable Community planning behaviors only as Events capabilities, not as a hidden eighth portal. |
| Browser portal prompts and distinct playbooks | Configuration-driven `DimensionProfile` records and portal starter actions | Preserve and normalize. The UI uses one shared, typed portal system rather than seven copied screens. |
| Deterministic `/api/plan` planner and optional server-side AI adapter | Local native preview planner | Preserve the deterministic behavior as a clearly labeled local preview. Do not move API credentials into the mobile client. |
| Browser confirmation dialog for sensitive intent | Native approval review state | Preserve the safety boundary. In this source, approvals are simulations only; the native app must state that it prepares work and does not perform external actions. |
| Browser local action log | Device-local preview activity history | Adapt to local persistence when implemented. It must remain clearly separate from any future server audit log. |
| Browser speech recognition and speech synthesis | Native voice/text command surface | Defer implementation until a supported native voice strategy is specified. Never imply a browser speech service or live transcription exists in native runtime. |
| Project-owned Guardian, portal, bubble, sword, and maple visual files | Bundled app assets and native-safe visual treatment | Preserve eligible assets with their existing licensing context. Image assets may be copied into the native project; browser CSS choreography must be recreated as mobile-native motion. |
| Node tests for deterministic planner, safety behavior, HTTP serving, and static assets | Vitest tests for planner compatibility, canonical IDs, horizon behavior, approval policy, and native route model | Adapt behavioral assertions. Omit HTTP static-file-serving assertions, which are specific to the browser server. |

## Source boundaries and external dependencies

| Requested preserved capability | Evidence in selected source | Migration status |
|---|---|---|
| Backend server | Minimal Node HTTP server with a planning API and static-file delivery | Source-backed, but not a durable application backend. It will not be duplicated. |
| Database and data | No schema, migration, connection, or data export present | Blocked pending the separate production source or data export. |
| Authentication, accounts, and authorization | No auth provider, session, user model, or authorization rules present | Blocked pending the separate production service source or access. |
| Entitlements, durable approvals, audit, and memory | The prototype has client-local simulation and local storage only | Blocked for server-side preservation; safe local preview states may be represented without claiming production durability. |
| Kaya / Atlas and ESP32 protocol | No device code, protocol, or hardware integration present | Blocked pending the original hardware specification or source. |

## Native implementation sequence

1. Copy project-owned visual assets and document provenance inside the native project.
2. Define typed portal profiles, planner types, horizon values, approval states, and companion-device simulation states.
3. Build an Expo Router stack with a launch screen, one Hub route, and parameterized portal detail routes that behave naturally with Android Back and iOS navigation.
4. Implement the Hub with seven concise portal destinations, then add the shared portal shell with Now, Today, This Week, quick actions, safe preview command handling, and explicit Return to Hub behavior.
5. Adapt source-backed deterministic planner behavior and test it against the original observable safety and routing outcomes.
6. Configure STAARWARDD v1.2.0 branding and generate the required original launcher icon while retaining approved source visual assets inside the experience.
7. Validate native configuration, deterministic logic, safe-area-aware layout rules, and route behavior. APK creation remains a managed publishing action after final checkpointing.
