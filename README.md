# ZANSHIN — Sekiro Attempt

A browser-based 3D sword-duel prototype built with Three.js.

## Current prototype

- Third-person 3D arena
- Player movement and facing
- Sword attacks with range-based hit detection
- Guard / deflect timing
- Dodge with invulnerability window
- Enemy attack wind-up and recovery
- HP + posture systems
- Deathblow when posture breaks
- Hit-stop and camera shake
- Responsive HUD

## Run

Serve the repository from a local/static web server. The game imports Three.js as an ES module from jsDelivr.

## Roadmap

The next pass will replace the primitive fighters and simple arena with proper assets, expand the combat state machine, add attack-specific hitboxes/tells, phase-based boss AI, audio, VFX, and a more faithful Sekiro-style posture/deflect system.
