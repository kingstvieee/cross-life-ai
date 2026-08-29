# STAARWARDD Mobile Design Contract

## Product intent

**STAARWARDD** is a native, portrait-first life-orchestration product. The **STAAR Hub** is the central command center that brings seven distinct but connected life dimensions into a single, privacy-aware mobile experience. This project is a migration target, not a redesign: the existing source, visual identity, portal concepts, and any verified server-side contracts must be preserved or mapped explicitly.

## Screen list and required behavior

| Screen | Primary content and functionality | One-handed mobile layout |
|---|---|---|
| Guardian launch | Original, optional first-launch sequence: initialization, sparse field, mark formation, approach, and Hub arrival. It must be silent by default, interruptible, reduced-motion compatible, and offer Skip shortly after launch. | Full-bleed 9:16 composition with the Skip control in the reachable lower-right area. |
| STAAR Hub | Today-focused command center with an at-a-glance status, cross-portal signals, quick capture, and direct entry to all seven canonical dimensions. | Large content cards in a single vertical flow; primary actions sit in the lower half of the screen. |
| Dimension portal | A specialized command surface for Creativity, Work, Home, Wellbeing, Relationships, Events, or Style. Each portal shows its AI role, atmosphere, privacy cue, Now status, starter actions, interaction modes, and an explicit Return to Hub control. | Persistent identity header, thumb-reachable mode selector, and vertically scrollable content. |
| Horizon detail | **Now**, **Today**, and **This Week** layers with plans, task capture, status, and handoff context. | Segmented selection near the top; quick capture and approval-aware actions stay above the fold where practical. |
| Approval review | Prepared, consequential, or external actions awaiting a human decision. It must show context, expected effect, source portal, and approval/rejection controls. | Bottom-sheet or dedicated confirmation surface with the destructive choice visually secondary. |
| Memory and privacy | Consent, visibility, export, and deletion controls for cross-portal memory. Sensitive-domain cues must be clear and actionable. | Grouped native settings rows with descriptive labels and confirmation for irreversible choices. |
| Companion device | Kaya / Atlas entitlement and device states. States must distinguish unavailable, disconnected, discovering, pairing, connected-simulated, failed, and reconnecting. | Clear status panel with one primary action, no claim of a real hardware connection unless verified. |
| Profile and account | Existing authenticated account details, entitlement state, audit activity, and settings entry points. | Native grouped list; session and account actions require explicit confirmation. |

## Canonical portal taxonomy

| Portal ID | Display name | Default focus | Native atmosphere and AI role |
|---|---|---|---|
| `creativity` | Creativity | Move ideas toward a next expression | Energetic violet field; creative partner that helps shape drafts and momentum. |
| `work` | Work | Clarify priorities and execution | Deep indigo structure; strategic operator that frames plans and prepared actions. |
| `home` | Home | Coordinate spaces and routines | Warm amber grounding; home steward that organizes routines without implying device control. |
| `wellbeing` | Wellbeing | Support reflection and healthy routines | Restful teal; supportive guide that avoids clinical diagnosis or treatment claims. |
| `relationships` | Relationships | Plan thoughtful connection | Rose-toned warmth; communication coach that prepares, never sends, consequential messages without approval. |
| `events` | Events | Coordinate time-sensitive plans | Electric blue clarity; event planner that prepares options and approval requests. This is the authoritative native replacement for the prototype's Community portal, while its useful local-impact and outreach behaviors remain candidates for migration into Events where semantically appropriate. |
| `style` | Style | Curate personal expression | Copper and midnight contrast; style curator that helps organize references and decisions. |

## Primary user flows

1. **Launch to Hub:** The user opens STAARWARDD, optionally skips the brief Guardian launch sequence, and lands in the STAAR Hub. Returning users bypass the sequence.
2. **Hub to portal:** The user taps a portal card, enters an original short dimensional transition, reviews the portal's Now state, and selects Listen, Coach, Plan, Create, or Operate.
3. **Quick capture:** The user selects a horizon, enters a bounded task, and either persists it through the verified authenticated backend or sees a clearly labeled preview-local state. Sensitive or external work becomes an approval request rather than executing.
4. **Cross-portal handoff:** The app presents a visible, contextual handoff suggestion. The user reviews the context and provides consent before any portal receives it.
5. **Companion interaction:** The user views entitlement and simulator status, then can begin a clearly labeled simulated discovery or pairing flow. No interface state claims a physical device connection without validated support.

## Visual and interaction language

The native interface should feel at home on iOS and Android while retaining STAARWARDD's cinematic identity. The core palette uses **Obsidian `#080B14`** as the deep-space foundation, **Constellation Blue `#4AA7FF`** for focused actions, **Guardian Violet `#8B5CF6`** for dimensional energy, **STAAR Gold `#E8C86F`** for premium luminous emphasis, **Toronto Copper `#C9824A`** as a restrained CN Tower-inspired accent, **Signal Mint `#50D5B7`** for confirmed non-sensitive success, and **Mist `#EEF3FF`** for high-contrast text. Cards have gentle elevation and soft corners, while portal identity comes from color, copy, and depth—not game-like scenes.

Controls use at least 44-point touch targets, clear text labels alongside symbolic icons where context is not obvious, and standard iOS-style press feedback. The Hub presents seven portals as concise, individually reachable destinations rather than a long dashboard of portal details. Navigation uses native stack behavior, including system Back on Android and natural back behavior on iOS, with an explicit Return to Hub control in every portal. Layouts respect safe areas, avoid web navigation bars and desktop-compressed grids, wrap long text safely, and scale gracefully across small phones, large phones, and tablets.

Motion remains short and optional: portal entry lasts approximately 0.8–1.4 seconds, return transition 0.4–0.7 seconds, and reduced-motion preferences avoid forward-flight effects. The Guardian sequence hands off directly to the mobile Hub rather than a web-style dashboard; premium depth, glow, and dimensional cues are selective so that readability, current status, and primary actions remain clear.

## Data and safety vocabulary

The project must share the following vocabulary wherever compatible with the preserved source contracts: `Portal`, `DimensionProfile`, `Plan`, `Task`, `ApprovalRequest`, `Entitlement`, `CompanionDevice`, `DevicePairing`, `MemoryItem`, and `AuditEvent`. Existing routes, identifiers, entitlements, approvals, audit rules, memory boundaries, and Kaya / Atlas policy are authoritative when found in the source audit. No duplicate backend, database, account, or authorization implementation is permitted.

## Mobile release target

The visible app name is **STAARWARDD** and the intended release identity is **v1.2.0**, with Android `versionCode` of at least `3`. The immutable project slug and bundle/package identifiers must be preserved unless the source audit identifies a safe, necessary migration path.
