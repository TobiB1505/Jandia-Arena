# JANDIA ARENA – TV Dashboard PRD

## Original problem statement
Create a 16:9 TV dashboard web app for "JANDIA ARENA". The app will be displayed on a large television during the World Cup.

- Modern sports broadcast style, blue/white branding, dark blue bg, white text, large readable typography.
- Match cards optimized for TV, no small buttons, smooth automatic slide rotation.
- Fullscreen TV mode, today's matches, next match highlight, live scores, final results.
- Auto-refresh every 60 seconds, auto-rotate between screens every 15 seconds.
- Use football API data; show fallback/demo matches if API is not available.

## User choices (2026-02)
- Data source: demo/fallback only (no real football API)
- Language: German (Deutsch)
- Branding: modern blue/white
- Screen rotation: default (Today / Next / Live / Final)

## Personas
- TV in a sports bar / public viewing during the World Cup
- Passive viewers across the room (no interaction)

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`), `/api/matches`, `/api/matches/live|next|finished`. Demo schedule anchored to current time so the 4 screens always have data.
- **Frontend**: React + Tailwind, Framer Motion for screen transitions, `react-country-flag` for flags. Fonts: Anton (display) + Outfit (body).
- Dashboard at `/` rotates 4 screens every 15s, refetches every 60s, falls back to in-memory `FALLBACK_MATCHES` if backend unreachable.

## Implemented (2026-02-20)
- [x] Backend `/api/matches` with demo World Cup schedule + computed live status / minute
- [x] 4 rotating screens (HEUTE IM STADION, NÄCHSTES SPIEL, LIVE ERGEBNISSE, ENDERGEBNISSE)
- [x] Fullscreen toggle (TV-Modus)
- [x] Clock + 60s refresh progress bar in header
- [x] Live countdown to next kickoff
- [x] Live pulsing minute indicator
- [x] Demo / Live data badge
- [x] Smooth slide transitions (Framer Motion)
- [x] 16:9 fixed layout, no scrolling
- [x] Fallback demo data if API unavailable

## Backlog (P1)
- Real football API integration toggle (env-driven), e.g. API-Football
- Group standings screen
- Top scorers / yellow-red cards highlight
- Sound-free goal animation overlay when score changes

## Backlog (P2)
- Multi-day schedule navigation
- Stadium-specific theming
- Sponsor banner slot
