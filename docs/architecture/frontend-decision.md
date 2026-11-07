# Frontend Decision: React 19 SPA + Rails API

## Decision

The frontend is a **React 19 SPA** built with Vite, located in `frontend/`. Rails is API-only — `app/views/` only contains a layout template and a mailer. All dynamic UI is served by the React SPA.

## Stack

| Layer | Tech |
|-------|------|
| Framework | React 19 |
| Build | Vite |
| Routing | react-router-dom |
| Icons | lucide-react |
| Styling | CSS custom properties + inline styles (hand-rolled, no Tailwind) |
| API | Rails JSON endpoints at `/api/v1/*` |
| Auth | Custom `useAuth` hook + httpOnly cookie |

## Key Decisions

- **No UI kit.** The design system is custom: warm paper palette, coral accent, Playfair Display serif for editorial touches, Inter sans for headings. Documented in `DESIGN.md`.
- **No state management library.** Each page manages its own state via `useState`/`useEffect`. No Redux, Zustand, or similar.
- **SVG charts, no chart library.** Net worth trend and projection charts are hand-drawn SVG inline.
- **Rails is API-only.** The React SPA communicates via `fetch` calls to `/api/v1/*`. No Hotwire, no Turbo, no server-rendered pages except the initial HTML shell.

## Historical context

Early versions of the project evaluated Rails 7.2 + Hotwire (Turbo + Stimulus) as documented in earlier drafts. That approach was ultimately not adopted — the project uses the React SPA architecture described above. If you find references to Hotwire or server-rendered views in old docs, they are stale and should be disregarded.
