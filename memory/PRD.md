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

## Iteration 2 (2026-02-21) – TV-optimisation
- [x] **5 rotating screens**: Today's Matches → Next Match → Live Scores → Tomorrow's Matches → Group Tables
- [x] Replaced Final Results screen with Tomorrow's Matches
- [x] Added Group Tables screen (4 groups, P/W/D/L/GD/PTS, top-2 highlighted)
- [x] Backend `/api/matches/all`, `/api/matches/tomorrow`, `/api/groups`
- [x] Status detection extended: scheduled → UPCOMING, live → LIVE · 37', halftime → HALFTIME, finished → FULL TIME
- [x] Header subtitle changed to "Public Viewing Schedule"
- [x] All status badges in English (per spec)
- [x] 16 unique national teams across 4 groups, no duplicates

## Iteration 3 (2026-02-22) – Vollständige Deutsche Lokalisierung + Logo
- [x] Komplette UI auf Deutsch (Status-Badges, Screen-Titel, Tabellen-Spalten, Footer, Buttons)
- [x] CSS-Monogramm-Logo (keine Transparenz mehr)

## Iteration 4 (2026-02-22) – Robinson Branding + Live-API
- [x] Robinson-Logo eingebunden (eigenes Image-Asset im Header)
- [x] **Football-Data.org v4 Integration** (WM/competition=WC), Saison 2026
- [x] Backend `football_api.py` mit Cache (Fixtures 3 min, Standings 30 min) + Graceful Fallback
- [x] Endpoint `/api/source` zeigt Datenquelle (api/demo/api+demo Mix)
- [x] Dynamische Status-Badge im Footer: DATEN · LIVE-API / DATEN · API + DEMO / DEMO · Ersatzdaten
- [x] Land→ISO Mapping für ~70 WM-Teams mit deutschen Namen
- [x] Group Tables Screen handhabt 12 WM-2026-Gruppen (4×3 Compact-Layout) – Echtdaten von Football-Data.org
- [x] Match-Screens fallen automatisch auf Demo-Daten zurück solange WM 2026 noch nicht gestartet hat

## Backlog (P1)
- Real football API integration toggle (env-driven), e.g. API-Football
- Group standings screen
- Top scorers / yellow-red cards highlight
- Sound-free goal animation overlay when score changes

## Backlog (P2)
- Multi-day schedule navigation
- Stadium-specific theming
- Sponsor banner slot
