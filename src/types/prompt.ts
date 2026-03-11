export type PromptBlockType = "character" | "camera" | "style" | "format" | "custom";

export interface PromptBlock {
  id: string;
  type: PromptBlockType;
  label?: string;
  content: string;
  isActive: boolean;
}

export interface PromptPayload {
  blocks: PromptBlock[];
  tags: string[];
  remark?: string;
  export_settings: {
    separator: string;
    include_labels: boolean;
  };
}
