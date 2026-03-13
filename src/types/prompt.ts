export type PromptBlockType = "character" | "camera" | "style" | "format" | "custom";

export interface PromptBlock {
  id: string;
  type: PromptBlockType;
  label?: string;
  content: string;
  isActive: boolean;
  template_id?: string;
  is_locked?: boolean;
  project_lock_id?: string;
}

export interface StoryboardMeta {
  shot_number: number;
  duration_seconds?: number;
  transition?: string;
}

export interface PromptVersionSnapshot {
  id: string;
  name: string;
  created_at: number;
  asset_title: string;
  payload: Omit<PromptPayload, "versions">;
}

export interface PromptPayload {
  blocks: PromptBlock[];
  tags: string[];
  remark?: string;
  storyboard?: StoryboardMeta;
  versions?: PromptVersionSnapshot[];
  export_settings: {
    separator: string;
    include_labels: boolean;
  };
}
