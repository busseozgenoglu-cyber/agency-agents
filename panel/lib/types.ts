export type Agent = {
  id: string;
  name: string;
  title: string;
  description: string;
  division: string;
  emoji: string;
  color: string;
  custom?: boolean;
  prompt?: string;
};
export type Project = {
  id: string;
  title: string;
  brief: string;
  team: Agent[];
  status: 'queued' | 'running' | 'paused' | 'completed' | 'error';
  cursor: number;
  total: number;
  output: string;
  error: string;
  createdAt: number;
  updatedAt: number;
};
export type Message = {
  id: string;
  projectId: string;
  step: number;
  agentId: string;
  agentName: string;
  phase: 'proposal' | 'review' | 'presentation';
  body: string;
  createdAt: number;
};
export type Snapshot = {
  agents: Agent[];
  projects: Project[];
  configured: boolean;
  model: string;
};
