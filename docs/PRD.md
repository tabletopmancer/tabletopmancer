# Tabletopmancer — Product Requirements Document

## Vision

A VTT (Virtual Tabletop) that is agnostic to any game system. Inspired by Foundry but simpler. It works with the basics: tokens, dice, and maps. The DM runs the server locally; players connect via a browser.

## Core Principles

- System-agnostic: no D&D assumptions hardcoded anywhere
- DM is always the authority; player permissions are explicit and minimal
- Simple over feature-rich; complexity can be added later via issues
- Real-time sync via SvelteKit `query.live()` (SSE-based, delta events)

---

## Content Model

### System Codex (`codex.json`)
A community-produced game system package.
- Contains JSON schemas defining characters, creatures, items, spells, etc.
- Can include reference data (core monsters, classes, spells as JSON)
- Identified by a unique `short_name`

### Campaign (`campaign.json`)
A community-produced or DM-authored adventure.
- References a system codex via `system: "<short_name>"` (optional)
- Contains instance data: NPCs, maps, handouts, encounter tables
- Data files validate against the system codex's schemas

**Directory detection:** presence of `codex.json` → system codex; presence of `campaign.json` → campaign.

---

## Features

### 1. Session & Invite System

- The DM boots the server and selects a table from a CRUD grid on the home page
- Each table has a **permanent invite link** (shareable URL)
- A player visiting the invite link sees a **name prompt**
- After entering a name, the player lands on a **waiting screen** ("Waiting for the DM to let you in")
- The DM receives a **real-time notification** of the join request
- The DM approves or denies by player name only
- **Approval is permanent**: stored as a token in the player's cookie and on the server
- The DM can **revoke** a player's access via a player management UI
- If the server is offline, the player sees a "table is offline, try again later" message

**Auth model:**
- DM = localhost access; no login required
- Player = identified by a cookie token issued on first approval
- Returning approved players bypass the waiting screen and join directly

---

### 2. Real-time Sync (SSE)

- Built on SvelteKit `query.live()` (stable since 2.61.0)
- Server exposes an async generator per table that yields delta events
- Clients subscribe and apply deltas to local state
- **Optimistic updates**: mutations are applied locally first, confirmed by server
- **Delta event types:**
  - `token:placed` / `token:moved` / `token:removed`
  - `token:owner-assigned`
  - `map:placed` / `map:removed`
  - `fog:updated`
  - `dice:rolled`
  - `ping`
  - `initiative:updated`
  - `player:joined` / `player:approved` / `player:revoked`

**Board state is persisted** to `state.json` on every mutation. On reconnect, the client receives the full current state as the first yield, then deltas.

---

### 3. Tokens

- DM drags a JSON asset (character/creature) from the asset drawer onto the board → token is created
- Token data: `name`, `image` (sourced from the asset), `position`, `owner?`
- **Ownership:**
  - Unowned tokens: DM-controlled only
  - Owned tokens: movable by DM + the assigned player
  - DM assigns ownership via right-click context menu on the token
- **Movement:**
  - Synced on drop (not during drag)
  - Player moves are optimistic: applied locally, confirmed via SSE
- **Removal:** DM only, via right-click context menu
- No HP display on the token

---

### 4. Dice Roller

- **Widget:** formula input (`3d6+2`) in the toolbar area
- **Rolls:**
  - Player rolls are public (visible to everyone)
  - DM rolls are private by default (visible to DM only)
- **Roll history:** shared log panel showing all public rolls with roller name and breakdown; togglable from the toolbar
- Results are broadcast as delta events via SSE
- _(Future: 3D animated dice rolling above the board)_

---

### 5. Fog of War

- Each map instance placed on the board gets its own fog layer ("scratch card" style)
- Players see the map image only where the DM has revealed it
- DM uses a **circle brush** to reveal or re-hide areas (works both ways)
- **5 brush size presets**
- Fog state is **persistent** across server restarts
- Fog updates are synced to players in real time via SSE

---

### 6. Ping

- Any connected user (DM or player) can ping a location on the board
- Displays an **animated ripple** at the cursor position, visible to all
- **Disappears automatically** after a short time
- Broadcast as a delta event; no persistence needed

---

### 7. Maps

- DM drags a `.uvtt`/`.dd2vtt` asset from the asset drawer onto the board
- Multiple maps can coexist on the board (side by side, not layered)
- **Z-order:** last placed is on top
- No grid overlay, no token snapping
- DM can remove a map via right-click context menu
- Map placement is synced to all players in real time

---

### 8. Initiative Tracker

- DM activates the tracker → all player-owned tokens are automatically registered
- DM manually adds NPC/monster tokens with a typed initiative value
- The **next dice roll** a player makes after activation is stored as their initiative value
- **Visibility:** players see only player tokens; DM sees all (including NPCs)
- No next/previous turn button — DM manages turn flow verbally
- **Turn counter** with + and − buttons
- Togglable from the toolbar

---

## Out of Scope (Later Issues)

- 3D animated dice
- DM pause (blocks token movement for all players)
- Grid overlay and token snapping
- Line-of-sight fog (using `line_of_sight` data from dd2vtt)
- Player token image upload
- Codex ZIP import
- `.ttmignore` support
- Character sheet rendering (schema-driven form UI)
- Multi-scene / scene switching
- Private player rolls visible to DM

---

## Tech Stack

- **Frontend:** Svelte 5, SvelteKit 2, TypeScript, Tailwind CSS 4
- **Backend:** SvelteKit server routes + `query.live()` for SSE
- **Storage:** File system (`state.json` per table, assets on disk)
- **Auth:** Cookie-based player tokens, localhost = DM
