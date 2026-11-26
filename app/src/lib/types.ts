export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  text: string;
  tools: string[];
  error?: string;
  createdAt?: number;
};

export type Session = {
  id: string;
  directory: string;
  createdAt: number;
};

export type ModelOption = {
  providerID: string;
  modelID: string;
  name: string;
  free: boolean;
  status?: string;
};

export type Snapshot = {
  session: Session | null;
  focus: string | null;
  model: { providerID: string; modelID: string } | null;
  messages: ChatMessage[];
};

export type Project = {
  name: string;
  path: string;
  hasGit: boolean;
  updatedAt: number;
};
