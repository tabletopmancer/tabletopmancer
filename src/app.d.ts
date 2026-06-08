// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      role: "DM" | "PLAYER";
      player: Player | null;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  type Codex = {
    relativepath: string;
    name: string;
    code: string;
    icon?: string;
    type: "system" | "campaign";
    system?: string;
  };

  type Asset = {
    relativepath: string;
    name: string;
    mimetype: string;
    thumbnail: string;
    codex: Codex;
    url: string;
  };

  type Position = {
    x: number;
    y: number;
  };

  type Token = {
    id: string;
    name: string;
    position: Position;
    imageUrl?: string;
    owner?: string;
    size?: number;
  };

  type BoardMap = {
    id: string;
    assetUrl: string;
    position: Position;
    fog?: Record<string, boolean>;
  };

  type FogPatch = {
    cells: Array<{ x: number; y: number; visible: boolean }>;
  };

  type DiceRoll = {
    id: string;
    formula: string;
    result: number;
    breakdown: number[];
    player: string;
    timestamp: number;
  };

  type InitiativeTracker = {
    entries: Array<{
      id: string;
      name: string;
      initiative: number;
      tokenId?: string;
    }>;
    currentIndex: number;
    round: number;
  };

  type Player = {
    id: string;
    name: string;
    status: "pending" | "approved" | "denied" | "revoked";
  };

  type BoardState = {
    tokens: Token[];
    maps: BoardMap[];
    initiative: InitiativeTracker | null;
    rollHistory: DiceRoll[];
    players: Player[];
  };

  type DeltaEvent =
    | { type: "token:placed"; token: Token }
    | { type: "token:moved"; id: string; position: Position }
    | { type: "token:removed"; id: string }
    | { type: "token:owner-assigned"; id: string; owner: string }
    | { type: "map:placed"; map: BoardMap }
    | { type: "map:removed"; id: string }
    | { type: "fog:updated"; mapId: string; patch: FogPatch }
    | { type: "dice:rolled"; roll: DiceRoll }
    | { type: "ping"; position: Position; player: string }
    | { type: "initiative:updated"; tracker: InitiativeTracker }
    | { type: "player:joined"; player: Player }
    | { type: "player:approved"; playerId: string }
    | { type: "player:denied"; playerId: string }
    | { type: "player:revoked"; playerId: string };
}

export {};
