import raw from "../lib/game-definitions.json";
export type GameDefinition = {
  id: string;
  name: string;
  columns: number;
  rows: number;
  symbols: readonly string[];
  color: string;
  rules: string;
  motif: string;
  speed: number;
  audio: { melody: readonly number[]; wave: OscillatorType; interval: number };
  version: string;
  original: boolean;
  pendingOriginalRules: boolean;
};
export const gameDefinitions = raw as GameDefinition[];
export function definition(id: string): GameDefinition {
  const value = gameDefinitions.find((g) => g.id === id);
  if (!value) throw new Error("Unknown original program");
  return value;
}
