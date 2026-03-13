import type { PromptPayload } from "./prompt";

export type FolderType = "library" | "project";

export interface FolderRecord {
  id: string;
  name: string;
  type: FolderType;
  created_at: number;
}

export interface PromptAssetRow {
  id: string;
  folder_id: string;
  title: string;
  payload: string;
  is_favorite: number;
  updated_at: number;
  deleted_at?: number | null;
}

export interface PromptAsset {
  id: string;
  folder_id: string;
  title: string;
  payload: PromptPayload;
  is_favorite: boolean;
  updated_at: number;
  deleted_at?: number | null;
}

export interface WorkbenchSnapshot {
  folders: FolderRecord[];
  prompt_assets: PromptAssetRow[];
}

export interface StorageDescriptor {
  mode: "sqlite" | "localStorage";
  path: string;
}

export interface CreateFolderInput {
  name: string;
  type: FolderType;
}

export interface UpdateFolderInput {
  id: string;
  name: string;
  type: FolderType;
}

export interface CreatePromptAssetInput {
  folder_id: string;
  title: string;
  payload: PromptPayload;
  is_favorite: boolean;
}

export interface UpdatePromptAssetInput {
  id: string;
  folder_id: string;
  title: string;
  payload: PromptPayload;
  is_favorite: boolean;
}
