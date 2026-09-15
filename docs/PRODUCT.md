# Tabletopmancer

A virtual tabletop that a game master hosts, for a group that plays remotely.

> Inferred from the implementation, not stated by the team. Correct what is
> wrong.

## Problem

A group that plays remotely needs a shared board, dice everyone can trust, and
the maps and images of its campaign. The usual answer is a commercial service:
every player makes an account, the campaign material lives on someone else's
server, and the group keeps it only while it keeps paying.

## Solution

The game master runs the app, and keeps the material as plain folders on that
machine. Players open a link, wait for approval, and see the same board. Nobody
creates an account, and no game data leaves the machine.

## User stories

1. As a game master, I want to run the app on my own machine, so that my
   campaign material stays mine.
2. As a game master, I want to drop a folder or a zip of maps, images, notes and
   music into a table, so that it appears in the app without an import step.
3. As a game master, I want to keep one table per campaign, so that I can pause
   and resume a story weeks later.
4. As a game master, I want to send a link and approve who gets in, so that only
   my group sees the board.
5. As a player, I want to join with a name only, so that I can play without an
   account.
6. As a game master, I want to place maps and tokens and hide parts of a map, so
   that players discover the map as they explore.
7. As a game master, I want to give a token to a player, so that they move their
   own figure and nothing else.
8. As a game master, I want to freeze the board, so that nobody moves while I
   set up a scene.
9. As a player, I want to roll dice in view of everyone, so that the result is
   trusted.
10. As a game master, I want to roll in secret, so that players do not read the
    outcome from my roll.
11. As a game master, I want a turn order that takes each player's initiative
    roll as they make it, so that a fight starts without me copying numbers.
12. As a game master, I want to hide my NPCs from the turn order players see, so
    that a surprise stays a surprise.
13. As a player, I want to point at a place on the board, so that I can show the
    others what I mean.
14. As a game master, I want to play a track for the whole table at once, so that
    everyone hears the same scene.
15. As a game master, I want to see what happened at my table, so that I can
    check a past action.

## Out of scope

- **Accounts and multiple game masters.** One installation serves one game
  master. A hosted, multi-tenant service is a different product.
- **Rules automation and character sheets.** The app shows the board and rolls
  the dice; the rules stay with the group.
- **Playing without JavaScript.** The board is live, so the browser must run the
  app.
