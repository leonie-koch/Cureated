# Cureated (working title)

**The smart curator for medical, evidence-based nutrition therapy — driven by science, powered by community.**

## Concept

A community recipe platform where AI evaluates micronutrients to match recipes with the nutrition tags that best fit a person's symptoms. The prototype starts with a single condition, ME/CFS, but is built to grow into broader therapeutic nutrition support across a range of conditions.

## Core features

**1. Community-driven experience**
Users upload recipes and rate them on disease-specific metrics (effort/exertion check, tolerability during a crash/flare).

**2. AI-assisted recipe capture**
Free-text or photo mode (e.g. a snapshot of a page from a cookbook) — AI automatically structures the input into ingredients, quantities, and steps, with a review step so the user stays in control before saving.

**3. Automated nutrient & tag logic**
Data flow: ingredient → micronutrient analysis → atomic tagging → composite tagging.
- **Atomic properties**: directly data-based, mapped 1:1 to measurable values (e.g. "Low sugar" when total sugar content is below 5g/100g).
- **Composite properties**: combine multiple atomic properties into a functional, disease-relevant benefit (e.g. "Mitochondrial support" when magnesium and B12 scores both exceed 0.7).

**4. Disease-specific matching & scoring**
Each condition (starting with ME/CFS) has its own weighting table for properties. Recipes are ranked using these weighted tags, so results with the most relevant attributes surface higher in the feed.

## Tech stack

- **Client**: Next.js (React, TypeScript)
- **Server**: NestJS, Prisma
- **Database**: PostgreSQL (via Docker Compose)

## Project structure

```
client/    Next.js frontend
server/    NestJS API (modules: recipes, ingredients, properties, conditions)
```

Current server modules — `recipes`, `ingredients`, `properties`, `conditions` — expose CRUD endpoints and automatically compute property scores when recipes are created or updated.

## Getting started

Start the database:

```bash
docker-compose up -d
```

Server:

```bash
cd server
npm install
npm run prisma:migrate:dev
npm run start:dev
```

Client:

```bash
cd client
npm install
npm run dev
```

## Status

Early-stage prototype of a personal side project — currently in active development.
