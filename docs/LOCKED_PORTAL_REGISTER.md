# Locked portal implementation register

Authoritative source: user-directed review of **Design Portal Interiors**, **Open Cloud Browser**, and **Approve release actions**, 2026-11-14. Release approval covers existing allocation, no purchases/upgrades, existing live Hub and replacement TestFlight candidate 1.0.2 (103). No public App Store release is implied.

| No. | Display name / route | Locked environment and interaction |
|---|---|---|
| 01 | STAAR Hub / home | Cinematic residence; My Residence, Smart Controls, Entry & Security, Guardian Presence, Daily Automations, Home Systems. Rooms, lights, TV, climate, doors, windows and security controls stay inside the home. Hardware may be simulated explicitly until connected and read back. |
| 02 | STAAR Work / work | Bright daytime Toronto command centre, central Earth console, no executive chair. Employment, Businesses, Career, Teams; account connection, import and manual setup. Teams, 365, Docs, LinkedIn, résumé and job search need authorized integrations or clearly identified external links. |
| 03 | STAAR Dreams / creativity | Distinct floating dream universe, changing day/night, waterfalls, trees, floating Guardian head. Film/animation, fashion, visual art, writing, 3D and creative library. Runway, Kling, Magnific, Veo, Luma, Leonardo, Pika; music belongs in STAARSONIC. |
| 04 | STAAR Health / wellbeing | Yonge–Dundas and Eaton Centre medical street-world. Clinics, appointments, doctor links, records, mental health, physio, nutrition, skin, longevity, dictionary and first aid. Separate free public resources from paid provider services. No invented provider connection or clinical verification. |
| 05 | STAAR Love / relationships | Two distinct approved worlds. Relationship Realm: ruby/champagne couture, fireplace, tequila bar, Cupid bear, inclusive couples in background. Singles: obsidian, ultraviolet, chrome, leather, lion, circular fire, cabaret and VIP. Three optional personal setup questions: relationship status, orientation, vibe. No inferred orientation or automatic external disclosure. |
| 06 | STAAR Village / events | Scotiabank Arena district, CN Tower, interactive GTA map to Brampton, Mississauga, Scarborough, DVP and Yorkdale. Events, transit, culture, volunteering, mentorship, LGBTQ+ resources, community help, meetings and Community Pass. Futuristic illustration is not a geographically exact road map. |
| 07 | STAAR Closet / style | Character-free white fur, crystal and chrome. No preset human/mannequin. Subtle fur motion. RSF boutique, wardrobe, shopping search, fit, try-on, price comparison, wishlists, local Toronto shops, beauty and returns. RSF concepts are not confirmed stock or invented CAD prices. |
| 08 | STARVERSE / staarverse | Central star gateway, floating islands, waterfalls and holographic bridges. Milo, action/adventure, racing, multiplayer, creator lab, games library, Guardian guide. First playable phase prioritizes Milo/library/navigation; no game is certified playable from an illustration. |
| 09 | STAARSONIC / staarsonic | Full luxury studio, white/chrome plus blue, orange, yellow and brown accents, Toronto skyline, waterfalls. Oversized headphones rotate once in 30 seconds. Library, beats, vocals, mix/master, videos, live performance, AI tools. Suno, ElevenLabs, BandLab, FL Studio, Ableton, Logic, Pro Tools and others need verified connections or external links. |

The signed-in homepage is separately locked: black/chrome/silver space, diamonds, moving stars, nine entrances, Toronto skyline and central Guardian platform. It is not a conventional card dashboard. Every world must retain its own identity.

## Source reconciliation

The repository merged PR24 with microphone input, speech playback reporting, device acceptance UI, native iPhone WatchConnectivity and SwiftUI Watch source. The merge omitted the apple-targets dependency, plugin, team configuration and microphone permission explanation; this continuation restores those build requirements and pins their dependencies. Source version 1.0.1 (103) also disagreed with the approved 1.0.2 (103); corrected here.

The release chat reports Home inventory, Closet and STAARSONIC controls built in another workspace. Those controls were not present in the merged repository at this checkpoint. Do not describe them as shipped based on that message alone.

## Remaining hard gates

- Secure live transcription/speech provider configuration, complete native account session and actual user listening approval.
- Xcode/EAS Swift compile, Watch target signing, TestFlight processing, and physical iPhone/Watch verification.
- Approved Guardian speaking rig/visemes and real-time 3D environment assets/scene implementations. Saved PNG masters are visual specifications, not a substitute for those assets.
- Actual integration and durable background-worker/device readback evidence.

Keep physical device states unknown until read back, preserve per-account storage, and never certify all devices from a web or JavaScript export.
