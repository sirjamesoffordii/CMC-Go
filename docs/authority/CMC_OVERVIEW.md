# CMC Go — Overview

## What is CMC Go?

**CMC Go** is a map-first coordination and visibility platform built to help Chi Alpha leaders **see, track, and mobilize people toward the Campus Missions Conference (CMC)**.

At its core, CMC Go answers three questions for leaders at every level (national, regional, district, campus):

- Who is invited?
- Who is going?
- What still needs follow-up?

CMC Go replaces fragmented spreadsheets, text threads, and guesswork with a **shared, real-time system of record** that is simple, visual, and reliable.

---

## Core Principles

CMC Go is intentionally built around the following principles:

### 1. Map-First Clarity

The map is the primary interface.

Leaders understand momentum geographically. CMC Go makes progress visible by:
- Region
- District
- Campus

This allows leaders to immediately identify:
- Areas of strength
- Areas needing follow-up
- Gaps in invitation or engagement

---

### 2. Status Before Features

CMC Go prioritizes **correctness and clarity over polish**.

Before adding animations, mobile optimizations, or advanced UX, the system ensures:
- Data is accurate
- State is consistent
- Behavior is predictable

A system that looks good but lies is worse than a system that is plain but trustworthy.

---

### 3. Single Source of Truth

CMC Go is designed to be the **authoritative record** for CMC readiness.

That means:
- One person equals one record
- One status per person (Going / Maybe / Not Going / Not Invited)
- Notes and needs are attached directly to people
- Filters and views never mutate underlying data

If it’s not in CMC Go, it’s not considered real.

---

### 4. Leader-Friendly by Design

CMC Go is not built for engineers or administrators — it is built for **busy leaders**.

Design decisions prioritize:
- Fast scanning
- Obvious next actions
- Minimal clicks
- Clear defaults

Every view should answer the question: *“What do I need to do next?”*

---

## What CMC Go Is (and Is Not)

### CMC Go **IS**
- A coordination and visibility tool
- A follow-up and accountability aid
- A real-time snapshot of readiness
- A shared system across leadership layers

### CMC Go **IS NOT**
- A CRM replacement
- A registration system
- A messaging platform
- A vanity reporting dashboard

CMC Go complements existing systems rather than replacing them.

---

## How CMC Go Is Being Built

CMC Go is developed using a **phased, integrity-first delivery model**.

### Phase-Driven Development

Work is organized into explicit phases, each with clear exit criteria:

1. **Core System Integrity**
   - Data model correctness
   - Stable state management
   - Reliable persistence
   - Observability and error visibility

2. **Desktop UX & Navigation**
   - Panel behavior
   - Filters and scope clarity
   - Leader workflows

3. **Authentication & Authorization**
   - Role-based access
   - Scoped visibility
   - Security hardening

4. **Mobile Optimization**
   - Responsive layout
   - Touch interactions
   - Mobile-friendly flows

Each phase must be **verified and signed off** before advancing.

---

### Observability-First Debugging

CMC Go treats observability as **core infrastructure**, not an afterthought.

- Errors are captured via Sentry
- Staging is used to validate behavior before production
- Debugging without visibility is explicitly avoided

If a bug cannot be observed, the system — not the developer — is assumed to be at fault.

---

### Intentional Constraints

CMC Go deliberately avoids:
- Premature optimization
- Feature creep
- Parallel unfinished work
- “Just ship it” shortcuts

Every constraint exists to protect long-term clarity and trust in the system.

---

## Current Focus

CMC Go is currently focused on:
- Cross-view state consistency (Map ↔ Panels)
- Reliable follow-up visibility
- Solidifying observability and deployment stability

New features are deferred until these foundations are proven.

---

## Project Philosophy

> **Make it correct.  
> Make it clear.  
> Make it trustworthy.  
> Then make it fast and beautiful.**
