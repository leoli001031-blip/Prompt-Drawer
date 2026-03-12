import type { FolderType } from "./storage";
import type { PromptBlockType } from "./prompt";

export type AiProviderKind = "openai_compatible";

export interface AiProviderProfile {
  id: string;
  name: string;
  kind: AiProviderKind;
  base_url: string;
  api_key: string;
  model: string;
  temperature: number;
  max_tokens?: number;
  is_default: boolean;
  created_at: number;
  updated_at: number;
}

export interface AiProfileDraft {
  id?: string;
  name: string;
  kind: AiProviderKind;
  base_url: string;
  api_key: string;
  model: string;
  temperature: number;
  max_tokens: string;
  is_default: boolean;
}

export interface AiSettingsSnapshot {
  default_profile_id: string | null;
  profiles: AiProviderProfile[];
}

export type AiTaskType =
  | "generate_from_asset"
  | "rewrite_block"
  | "expand_block"
  | "compress_block";

export interface AiTaskBlockInput {
  id: string;
  type: PromptBlockType;
  label: string;
  content: string;
}

export interface AiTaskInput {
  profile_id: string;
  task_type: AiTaskType;
  folder_type: FolderType;
  asset_title: string;
  tags: string[];
  blocks: AiTaskBlockInput[];
  target_block_id?: string | null;
  user_instruction?: string;
  context_remark?: string;
}

export interface AiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface AiTaskResult {
  text: string;
  raw_model?: string;
  usage?: AiUsage;
}
