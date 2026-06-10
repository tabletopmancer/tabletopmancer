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
    fog: FogPatch[];
  };

  type FogPatch = {
    mode: "reveal" | "hide";
    x: number;
    y: number;
    radius: number;
  };

  type DiceRoll = {
    id: string;
    player: string;
    formula: string;
    dice: number[];
    modifier: number;
    total: number;
    private: boolean;
    timestamp: number;
  };

  type InitiativeEntry = {
    tokenId: string;
    name: string;
    initiative: number | null;
    isNPC: boolean;
  };

  type InitiativeTracker = {
    active: boolean;
    entries: InitiativeEntry[];
    turn: number;
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
    paused: boolean;
  };

  type TableEvent =
    | { type: "token:placed"; token: Token }
    | { type: "token:moved"; id: string; position: Position }
    | { type: "token:removed"; id: string }
    | { type: "token:owner-assigned"; id: string; owner: string | undefined }
    | { type: "map:placed"; map: BoardMap }
    | { type: "map:removed"; id: string }
    | { type: "map:moved"; id: string; position: Position }
    | { type: "fog:updated"; mapId: string; patch: FogPatch }
    | { type: "dice:rolled"; roll: DiceRoll }
    | { type: "ping"; position: Position; player: string }
    | { type: "initiative:updated"; tracker: InitiativeTracker | null }
    | { type: "player:joined"; player: Player }
    | { type: "player:approved"; playerId: string }
    | { type: "player:denied"; playerId: string }
    | { type: "player:revoked"; playerId: string }
    | { type: "board:paused" }
    | { type: "board:unpaused" };
}

export {};
