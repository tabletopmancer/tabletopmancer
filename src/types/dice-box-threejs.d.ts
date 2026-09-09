// @3d-dice/dice-box-threejs ships no type declarations; this is the minimal
// surface we use. See https://github.com/3d-dice/dice-box-threejs
declare module "@3d-dice/dice-box-threejs" {
  export type DiceBoxConfig = {
    assetPath?: string;
    framerate?: number;
    sounds?: boolean;
    volume?: number;
    shadows?: boolean;
    theme_surface?: string;
    theme_customColorset?: {
      name?: string;
      foreground?: string | string[];
      background?: string | string[];
      outline?: string;
      texture?: string;
      material?: string;
    } | null;
    theme_colorset?: string;
    theme_texture?: string;
    theme_material?: string;
    gravity_multiplier?: number;
    light_intensity?: number;
    baseScale?: number;
    strength?: number;
    onRollComplete?: (results: unknown) => void;
  };

  export default class DiceBox {
    constructor(containerSelector: string, config?: DiceBoxConfig);
    initialize(): Promise<void>;
    roll(notation: string): Promise<unknown>;
    clear(): void;
    updateConfig(config: Partial<DiceBoxConfig>): void;
  }
}
