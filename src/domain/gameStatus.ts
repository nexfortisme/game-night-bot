import { z } from "zod";

export const GAME_STATUSES = [
  "not_started",
  "in_progress",
  "in_rotation",
  "shelved",
  "finished",
  "abandoned",
] as const;

export type GameStatus = (typeof GAME_STATUSES)[number];

export function isGameStatus(value: string): value is GameStatus {
  return (GAME_STATUSES as readonly string[]).includes(value);
}

export const gameStatusZod = z.enum(GAME_STATUSES);

export function gameStatusChoices(): { name: string; value: GameStatus }[] {
  return GAME_STATUSES.map((status) => ({
    name: status.replaceAll("_", " "),
    value: status,
  }));
}

export function formatGameStatus(status: GameStatus): string {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
