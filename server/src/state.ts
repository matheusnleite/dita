import fs from "node:fs";
import { config } from "./config.js";

export type SessionState = {
  id: string;
  directory: string;
  createdAt: number;
};

export type State = {
  session: SessionState | null;
  focus: string | null;
  model: { providerID: string; modelID: string } | null;
  pushSubscriptions: unknown[];
  approvals: unknown[];
};

const EMPTY: State = {
  session: null,
  focus: null,
  model: null,
  pushSubscriptions: [],
  approvals: [],
};

export function loadState(): State {
  try {
    const parsed = JSON.parse(fs.readFileSync(config.stateFile, "utf8")) as Partial<State>;
    return { ...EMPTY, ...parsed };
  } catch {
    return { ...EMPTY };
  }
}

export function saveState(state: State): void {
  const tmp = `${config.stateFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, config.stateFile);
}
