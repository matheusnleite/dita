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
  title?: string;
};

export type ModelOption = {
  providerID: string;
  modelID: string;
  name: string;
  free: boolean;
  status?: string;
};

export type ApprovalRequest = {
  id: string;
  sessionID: string;
  action: string;
  resources: string[];
  message?: string;
};

export type FormOption = { value: string; label: string; description?: string };

export type FormField = {
  key: string;
  type: "string" | "number" | "integer" | "boolean" | "multiselect" | "external";
  title?: string;
  description?: string;
  required?: boolean;
  hidden?: boolean;
  when?: Array<{ key: string; op: "eq" | "neq"; value: string | number | boolean }>;
  options?: FormOption[];
  custom?: boolean;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  placeholder?: string;
  format?: "email" | "uri" | "date" | "date-time";
  default?: string | number | boolean | string[];
  url?: string;
};

export type FormRequest = {
  id: string;
  sessionID: string;
  title: string;
  fields: FormField[];
};

export type Snapshot = {
  session: Session | null;
  focus: string | null;
  model: { providerID: string; modelID: string } | null;
  messages: ChatMessage[];
  approvals: ApprovalRequest[];
  forms: FormRequest[];
  busy: boolean;
};

export type Project = {
  name: string;
  path: string;
  hasGit: boolean;
  updatedAt: number;
};
