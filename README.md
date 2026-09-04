# Whoami

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.2.

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

## AI-readable résumé (`llms.txt` / `llms-full.txt`)

The site exposes machine/AI-friendly versions of the résumé following the [`llms.txt`](https://llmstxt.org) convention:

- `llms.txt` — short index pointing to the full file and to the other languages.
- `llms-full.txt` — the complete résumé as a single Markdown file, with YAML front matter (name, headline, location, contacts) and reading instructions for AI agents.

They are **generated**, not hand-written. The content comes from the Angular component templates (source of truth) and, for `pt`/`es`, from the XLF translations in `src/locales/`. Because `public/` assets are duplicated into every locale bundle by the i18n build, the generator runs **after** `ng build` and writes one pair of files into each locale output folder:

- `/whoami/llms.txt` + `llms-full.txt` — English (root, exposed by `build:copy-root`)
- `/whoami/en/llms-full.txt` — English
- `/whoami/pt/llms-full.txt` — Portuguese
- `/whoami/es/llms-full.txt` — Spanish

Commands:

- `npm run build` — builds and regenerates the files (part of the deploy flow).
- `npm run llms` — runs only the generator (requires a prior `ng build`).

### Root `/whoami/` ≡ `/whoami/en/`

`/whoami/` (root) and `/whoami/en/` serve the same English bundle. The build
(`finalize` step) makes the root self-contained and canonical:

- rewrites `<base href>` of the root `index.html` from `/whoami/en/` to `/whoami/`
  so its assets and relative links (`llms.txt`, favicon…) resolve at the root;
- injects `<link rel="canonical">` per locale — English (root and `/en/`) is
  canonical at `/whoami/`; `/pt/` and `/es/` canonical to themselves — avoiding
  duplicate-content for crawlers.

Notes:

- Keep `src/locales/*.xlf` translations up to date (`npm run i18n:coverage`).
- The generator fails the build if any `i18n` text has no matching translation for `pt`/`es`, so content never silently leaks in English.
- Set `LLMS_ALLOW_MISSING=1` only to bypass that check locally.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
