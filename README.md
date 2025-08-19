# MOHASingphony

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.6.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Deploying for Multi‑Device Testing (Free Options)

This app is a static Angular SPA and can be hosted for free on several platforms. Routes are configured in `src/app/app.routes.ts`, and a SPA fallback is needed.

### Option A: Netlify (fastest and free)
1. Push this repository to GitHub.
2. Sign in to Netlify and "Import from GitHub".
3. Build command: `npm run build`
4. Publish directory: `dist/mohasingphony/browser`
5. Ensure SPA fallback: a `_redirects` file is included under `public/` with `/* /index.html 200` (already added).
6. After deploy, open the Netlify URL on multiple devices.

### Option B: GitHub Pages (free)
1. In your repo, enable GitHub Pages (Settings → Pages → Deploy from branch → `gh-pages` when available).
2. Build with a base href:
   - `npm run build -- --base-href /<your-repo-name>/`
3. Publish the contents of `dist/mohasingphony/browser` to a `gh-pages` branch (you can do this manually or with an action). For SPA routing, add a `404.html` that redirects to `index.html`.

## Enabling Real‑Time Cross‑Device Communication
By default, the app’s messaging is in‑memory. For multi‑device tests, a lightweight optional real‑time sync layer was added using Firebase Realtime Database via REST streaming (no SDKs).

### Quick Setup (Firebase Realtime Database)
1. Create a Firebase project at https://console.firebase.google.com.
2. Add a Realtime Database (in "test mode" for quick demos). For production, restrict your rules.
3. Find your database URL, e.g. `https://YOUR-PROJECT-ID-default-rtdb.firebaseio.com`.
4. Copy `public/config.example.json` to `public/config.json` and fill in:
```
{
  "realtime": {
    "enabled": true,
    "provider": "firebase",
    "firebaseDatabaseUrl": "https://YOUR-PROJECT-ID-default-rtdb.firebaseio.com",
    "roomId": "demo"
  }
}
```
5. Deploy (Netlify/GitHub Pages). Visit the deployed URL on two devices with the same room, e.g. `?room=demo`.
6. Actions on one device (send messages, change key/tempo) will propagate to the other.

Notes:
- For testing speed, the current song state uses a short polling fallback alongside SSE.
- Don’t keep permissive DB rules in production. Tighten rules and authentication as needed.

## Local Development
- `npm install`
- `npm start` or `ng serve`
- Optional: create `public/config.json` as above to test real‑time sync locally (open two browser windows).

## Additional Resources
For more information on using the Angular CLI, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
