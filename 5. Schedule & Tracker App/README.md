# 📋 Schedule & Tracker App

A lightweight Progressive Web App (PWA) that works on your **phone and laptop** — no internet required after the first load.

## Features

| Feature | Details |
|---|---|
| 📅 **Daily Schedule** | Tap any time slot (5 AM – 11 PM) to add / edit a task with optional notes and a colour label |
| ✅ **Checklists** | Multiple categories (Subjects, Fitness, Personal, …) with per-item check-off |
| 📊 **Progress tracker** | Overall % complete, per-category progress bars, stats panel |
| 💾 **Offline & persistent** | Data saved to browser localStorage; PWA service worker for offline use |
| 📱 **Installable** | Add to Home Screen on Android/iOS or install via Chrome/Edge on desktop |

## How to use

### Option A — Open directly in a browser
1. Open `index.html` in any modern browser (Chrome, Safari, Firefox, Edge).
2. Everything works from the local file — no server needed.

### Option B — Host on GitHub Pages (recommended for phone access)
1. Push this folder to GitHub.
2. Enable **Settings → Pages** → branch `main` → folder `/5. Schedule & Tracker App`.
3. Visit the generated URL on any device; tap **"Add to Home Screen"** for an app-like experience.

### Option C — Serve locally for development
```bash
# Python 3
python -m http.server 8080 --directory "5. Schedule & Tracker App"
# then open http://localhost:8080
```

## App tabs

### 📅 Schedule
- Navigate days with **‹ ›** arrows or jump to **Today**.
- Tap an empty slot to add a task (name, notes, colour).
- Tap a filled slot to edit or delete it.
- The current hour is highlighted when viewing today.

### ✅ Checklist
- Tap the category header to expand/collapse.
- Tap the circle to mark an item done (turns green ✓).
- Type in the bottom input and press **Add** (or Enter) to add a new item.
- Use **🗑 Delete Category** to remove a whole group.
- Tap **+ Category** to create a new category with a custom colour.

### 📊 Progress
- See overall completion % across all checklists.
- Per-category progress bars update in real time.
- Use **↺ Reset All Checklists** to uncheck everything (useful for a new week/semester).

## Default categories

| Category | Pre-loaded items |
|---|---|
| 📚 Subjects | DSP, VLSI, Embedded Systems, Wireless Comms, Control Systems |
| 🏃 Fitness | Morning Jog, Evening Walk, Workout, Stretching |
| 🎯 Personal | Read 30 min, Review notes, IEEE project work |

All categories and items are fully editable — add, rename topics or delete as needed.

## Tech stack
- Pure **HTML / CSS / JavaScript** — zero dependencies, zero build step
- **localStorage** for persistence
- **PWA** (Web App Manifest + Service Worker) for offline support and home-screen install
