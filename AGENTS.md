# AGENTS.md
Guide for coding agents working in `/root/todo-app-mini-project-20223150`.

## Repo shape
- Two apps:
  - `frontend/`: React 19 + Vite 8, JavaScript/JSX.
  - `backend/`: Express 5 + Mongoose, CommonJS JavaScript.
- Product intent lives in `userplan.md`.
- Expected Todo API routes:
  - `GET /api/todos`
  - `POST /api/todos`
  - `PUT /api/todos/:id`
  - `DELETE /api/todos/:id`

## Existing instruction files
- `AGENTS.md`: this file.
- No `.cursorrules` file exists.
- No `.cursor/rules/` directory exists.
- No `.github/copilot-instructions.md` file exists.
- Do not assume hidden Cursor or Copilot rules.
- `backend/vercel.json` configures standalone Vercel deployment when the backend project root is `backend/`.

## Read these before editing
- `userplan.md`
- `frontend/package.json`
- `frontend/eslint.config.js`
- `frontend/src/App.jsx`
- `frontend/src/main.jsx`
- `frontend/src/App.css`
- `frontend/src/index.css`
- `backend/package.json`
- `backend/index.js`

## Package management
- Use `npm`.
- Prefer root-level commands with `npm --prefix <dir> run <script>`.
- Both `frontend/` and `backend/` have committed `package-lock.json` files.
- Never edit `node_modules/`.

## Canonical commands

### Frontend
- Install: `npm --prefix frontend install`
- Dev: `npm --prefix frontend run dev`
- Build: `npm --prefix frontend run build`
- Preview: `npm --prefix frontend run preview`
- Lint: `npm --prefix frontend run lint`

### Backend
- Install: `npm --prefix backend install`
- Start: `npm --prefix backend run start`
- Dev: `npm --prefix backend run dev`

## Build, lint, test, typecheck status
- Frontend build works with `npm --prefix frontend run build`.
- Frontend lint works with `npm --prefix frontend run lint`.
- Backend has only `start` and `dev` scripts.
- No typecheck script exists in either package.
- No test script exists in either package.
- No project test files were found outside `node_modules/`.

## Single-test guidance
- There is currently no supported single-test command because no test runner is configured.
- Do not pretend `vitest`, `jest`, or `mocha` is already wired up.
- If you add testing later, update this file with:
  - the package script,
  - the single-file command,
  - the single-test-name command.

## Language and framework conventions
- Frontend uses `.jsx`, not `.tsx`.
- Backend uses `.js` with CommonJS `require(...)`.
- Do not migrate to TypeScript unless the user explicitly asks.
- Preserve the current Vite React frontend + Express backend split.
- Do not introduce a new framework or state library casually.

## Frontend code style
- Follow the existing function component pattern: `function App() { ... }`.
- Current components use default exports.
- Use hooks when needed; `useState` is already the local pattern.
- Keep imports at the top.
- Follow the observed import order:
  - React imports,
  - asset imports,
  - CSS imports.
- Use PascalCase for components.
- Use camelCase for variables, handlers, state, and helpers.
- Match the current semicolon-free style in frontend files.

## Styling conventions
- Styling is CSS-file based, imported into JSX.
- Put global tokens and element rules in `frontend/src/index.css`.
- Put component layout and behavior rules in component CSS files like `frontend/src/App.css`.
- Reuse existing CSS custom properties before adding new raw colors.
- Existing CSS includes:
  - `:root` design tokens,
  - dark mode via `@media (prefers-color-scheme: dark)`,
  - nested selectors with `&`,
  - responsive rules around `max-width: 1024px`.
- Do not assume Tailwind utility classes are already in use just because Tailwind is installed.

## Lint and formatting rules
- Active lint config: `frontend/eslint.config.js`.
- ESLint applies to `**/*.{js,jsx}`.
- `dist/` is ignored.
- `no-unused-vars` is enabled.
- Unused variables prefixed with uppercase or `_` are tolerated by config.
- No Prettier config exists.
- No dedicated format script exists.
- Match nearby formatting instead of inventing a new style.

## Types and data handling
- Treat this as a JavaScript codebase, not an active TypeScript codebase.
- Do not add TS-only syntax to JS/JSX files.
- Keep object shapes simple and explicit.
- Current Todo model shape in the backend:
  - `title: String`
  - `completed: Boolean`
- If you add validation, keep it obvious and easy to trace.

## Backend conventions
- Backend entrypoint is currently `backend/index.js`.
- Existing backend style uses semicolons.
- Preserve the local style of the file you touch.
- Keep route handlers straightforward.
- Current routes are declared inline on `app`.
- If you split backend code into modules, keep the structure simple and update this file.

## Error handling guidance
- Current backend error handling is minimal.
- Mongo connection uses `.then(...).catch(...)` and logs failures.
- Route handlers currently have no explicit `try/catch` blocks.
- Never swallow errors silently.
- If you add error handling, prefer clear status codes and readable responses.
- If you introduce centralized Express error middleware, document it here.

## API and integration expectations
- `userplan.md` expects the frontend to call the backend from `src/App.jsx`.
- Intended frontend flow:
  - fetch all todos,
  - create a todo,
  - toggle completion,
  - delete a todo.
- `userplan.md` allows Axios or `fetch`.
- `frontend/package.json` includes `axios`, but current frontend code does not use it yet.

## Naming conventions
- Components and models: PascalCase.
- Variables, functions, handlers, state: camelCase.
- CSS custom properties: kebab-case with `--`.
- Route paths: lowercase and REST-shaped.

## Verification expectations
- After frontend changes, run `npm --prefix frontend run lint`.
- After frontend UI changes, run `npm --prefix frontend run build`.
- After backend changes affecting startup, run `npm --prefix backend run start` or `npm --prefix backend run dev`.
- After backend deployment changes, verify the exported Vercel handler still works locally and ensure required Vercel env vars are documented (`MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`).
- If a command does not exist, say so clearly instead of implying it passed.
- If you add tests or typechecking, update this file with the exact commands.

## Things to avoid
- Do not edit `node_modules/`.
- Do not claim tests passed when no tests are configured.
- Do not claim typechecking passed when no typecheck command exists.
- Do not perform an unrequested migration to TypeScript.
- Do not add broad refactors while fixing a small bug.

## Maintenance rule
- If you add new scripts, configs, rule files, or conventions, update `AGENTS.md` in the same change.

## Quick reference
- Frontend dev: `npm --prefix frontend run dev`
- Frontend build: `npm --prefix frontend run build`
- Frontend lint: `npm --prefix frontend run lint`
- Frontend preview: `npm --prefix frontend run preview`
- Backend start: `npm --prefix backend run start`
- Backend dev: `npm --prefix backend run dev`
- Single test: not available yet
- Typecheck: not available yet
