# ZANSHIN — Sekiro Attempt

A browser-based 3D sword-duel prototype built with Three.js. This is an evolving combat prototype rather than a finished game.

## Current combat pass

- Responsive third-person movement with a follow camera
- Three-hit light-attack chain and a slower, heavier cut
- Guarding with a short, timing-based deflect window
- Dodge invulnerability frames and directional evasion
- Boss attack telegraphs, including heavy and perilous attacks
- Separate wind-up, active, recovery, and stagger states for the boss
- Health and posture build-up, posture recovery, and posture-break deathblows
- Hit-stop, camera shake, hit sparks, combat callouts, and state-driven fighter animations
- Second boss phase with a more aggressive attack cadence
- Responsive HUD and retry flow

## Controls

| Input | Action |
|---|---|
| WASD | Move |
| Left mouse / J | Light attack combo |
| E | Heavy cut |
| Right mouse / K | Guard; tap at impact to deflect |
| Shift / L | Dodge |
| F | Deathblow when the boss's posture is broken and you are close |
| R | Retry after the duel ends |

**Combat tip:** Holding guard can reduce incoming damage, but it does not automatically deflect. Tap guard just before an attack connects. Perilous attacks must be dodged or timed with a deflect.

## Run locally

Serve the repository with a local or static web server. The game imports Three.js as an ES module from jsDelivr, so the browser needs access to the CDN.

## Next upgrades

Replace the procedural fighter meshes with proper character assets, add more distinct animation clips and weapon trails, tune the boss's combat patterns through playtesting, and improve audio and impact VFX.
