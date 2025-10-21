# React + Three.js Orbital Visualiser

This lightweight project shows how to render a simplified Solar System using React and Three.js without a build step. It uses modern browsers' native ES module support together with CDN hosted React/Three.js bundles.

## Getting started

1. Launch a static file server from the `frontend/` directory. A quick option is Python's built-in server:

   ```bash
   cd frontend
   python -m http.server 4173
   ```

2. Open [http://localhost:4173](http://localhost:4173) in a modern browser (Chrome, Edge, Firefox, or Safari).

3. Interact with the controls in the top-left corner to pause/resume the simulation, change the time acceleration, or lock the camera on any major body.

## Features

- Hierarchical orbital data for the Sun, planets, and a collection of the most notable moons.
- Keplerian orbit solver (Newton iteration) that updates each body's position every animation frame.
- Three.js scene with orbit lines, sphere meshes, physically-inspired lighting, and OrbitControls-based navigation.
- React UI overlay for simulation controls plus a live status bar summarising the current epoch and key orbital facts.

Because dependencies are loaded from CDNs at runtime, no local install step is required. Simply serve the files so that module imports resolve correctly.
