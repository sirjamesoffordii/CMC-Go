# CMC Go — Brief

This document explains what **CMC Go** is and the key concepts that make the app coherent.

---

## What CMC Go Is

CMC Go is a **map-first coordination app** for organizing Regions → Districts → Campuses → People.

Core objective:
- Make scope explicit (what region/district/campus you’re looking at).
- Keep the map, side panel, and lists consistent with that scope.

---

## Core Concepts

### Hierarchy
Region → District → Campus → Person

This hierarchy governs data models, queries, and UI flows.

### Server Authority
- Authorization is enforced server-side.
- The UI must reflect server truth (the UI should not “invent access”).

### Map as State
- Map selection defines scope.
- Scope constrains queries and the visible UI.

### Data Sensitivity
People data is sensitive; treat visibility rules as first-class behavior.

---

## Product Framing

CMC Go is “map-first” because selecting a geography is a primary action. The app should always make it clear:
- what scope you’re in,
- what data is included/excluded by that scope,
- and what actions are allowed.
