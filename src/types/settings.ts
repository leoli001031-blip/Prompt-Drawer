import type { PromptBlockType } from "./prompt";

export interface BlockTemplate {
  id: string;
  name: string;
  type: PromptBlockType;
  label: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface BlockTemplateDraft {
  id?: string;
  name: string;
  type: PromptBlockType;
  label: string;
  content: string;
}

export interface WorkbenchSettingsSnapshot {
  block_templates: BlockTemplate[];
  asset_templates: AssetTemplate[];
  folder_template_bindings: FolderTemplateBinding[];
}

export interface AssetTemplateBlock {
  type: PromptBlockType;
  label: string;
  content: string;
}

export interface AssetTemplate {
  id: string;
  name: string;
  blocks: AssetTemplateBlock[];
  structure: string;
  created_at: number;
  updated_at: number;
}

export interface AssetTemplateDraft {
  id?: string;
  name: string;
  blocks: AssetTemplateBlock[];
}

export interface FolderTemplateBinding {
  folder_id: string;
  asset_template_id: string;
}
