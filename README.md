# Web AR Starter

## What this prototype does
- Opens as a normal webpage.
- Detects whether `immersive-ar` is supported.
- Starts an AR session with Three.js.
- Detects a real-world surface using WebXR hit testing.
- Lets you tap to place a small 3D cube.

## Run locally
You need a local web server. For example:

    python -m http.server 8000

Then open:

    http://localhost:8000

For testing on a phone over the internet, deploy the folder to an HTTPS host such as GitHub Pages, Cloudflare Pages, or Vercel.

## Important
WebXR AR support is not universal across browsers/devices. HTTPS is required for WebXR in deployed sites.
