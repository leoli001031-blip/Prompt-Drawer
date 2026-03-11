import { invoke } from "@tauri-apps/api/core";
import { mockWorkbenchSnapshot } from "./mockWorkbench";
import { hydratePromptAsset, serializePromptPayload } from "./payload";
import type {
  CreateFolderInput,
  CreatePromptAssetInput,
  FolderRecord,
  PromptAsset,
  PromptAssetRow,
  StorageDescriptor,
  UpdateFolderInput,
  UpdatePromptAssetInput,
  WorkbenchSnapshot
} from "../types/storage";

const STORAGE_KEY = "prompt-workbench:v2";

function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function cloneSnapshot(snapshot: WorkbenchSnapshot): WorkbenchSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as WorkbenchSnapshot;
}

function normalizeSnapshot(snapshot: WorkbenchSnapshot): WorkbenchSnapshot {
  return {
    folders: [...snapshot.folders].sort((left, right) => left.created_at - right.created_at),
    prompt_assets: [...snapshot.prompt_assets].sort((left, right) => right.updated_at - left.updated_at)
  };
}

function readLocalSnapshot(): WorkbenchSnapshot {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = normalizeSnapshot(cloneSnapshot(mockWorkbenchSnapshot));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  return normalizeSnapshot(JSON.parse(raw) as WorkbenchSnapshot);
}

function writeLocalSnapshot(snapshot: WorkbenchSnapshot): WorkbenchSnapshot {
  const next = normalizeSnapshot(cloneSnapshot(snapshot));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

function buildFolderRecord(input: CreateFolderInput): FolderRecord {
  return {
    id: `folder_${Math.random().toString(36).slice(2, 10)}`,
    name: input.name,
    type: input.type,
    created_at: Date.now()
  };
}

function buildPromptAssetRow(input: CreatePromptAssetInput): PromptAssetRow {
  return {
    id: `asset_${Math.random().toString(36).slice(2, 10)}`,
    folder_id: input.folder_id,
    title: input.title,
    payload: serializePromptPayload(input.payload),
    is_favorite: input.is_favorite ? 1 : 0,
    updated_at: Date.now()
  };
}

function mutateLocalSnapshot(handler: (snapshot: WorkbenchSnapshot) => WorkbenchSnapshot): WorkbenchSnapshot {
  return writeLocalSnapshot(handler(readLocalSnapshot()));
}

export async function loadWorkbenchSnapshot(): Promise<WorkbenchSnapshot> {
  if (isTauriAvailable()) {
    return invoke<WorkbenchSnapshot>("workbench_bootstrap");
  }

  return readLocalSnapshot();
}

export async function createFolder(input: CreateFolderInput): Promise<WorkbenchSnapshot> {
  if (isTauriAvailable()) {
    return invoke<WorkbenchSnapshot>("workbench_create_folder", { input });
  }

  return mutateLocalSnapshot((snapshot) => ({
    ...snapshot,
    folders: [...snapshot.folders, buildFolderRecord(input)]
  }));
}

export async function updateFolder(input: UpdateFolderInput): Promise<WorkbenchSnapshot> {
  if (isTauriAvailable()) {
    return invoke<WorkbenchSnapshot>("workbench_update_folder", { input });
  }

  return mutateLocalSnapshot((snapshot) => ({
    ...snapshot,
    folders: snapshot.folders.map((folder) =>
      folder.id === input.id ? { ...folder, name: input.name, type: input.type } : folder
    )
  }));
}

export async function deleteFolder(folderId: string): Promise<WorkbenchSnapshot> {
  if (isTauriAvailable()) {
    return invoke<WorkbenchSnapshot>("workbench_delete_folder", { folderId });
  }

  return mutateLocalSnapshot((snapshot) => ({
    folders: snapshot.folders.filter((folder) => folder.id !== folderId),
    prompt_assets: snapshot.prompt_assets.filter((asset) => asset.folder_id !== folderId)
  }));
}

export async function createPromptAsset(input: CreatePromptAssetInput): Promise<WorkbenchSnapshot> {
  if (isTauriAvailable()) {
    return invoke<WorkbenchSnapshot>("workbench_create_prompt_asset", {
      input: {
        ...input,
        payload: serializePromptPayload(input.payload)
      }
    });
  }

  return mutateLocalSnapshot((snapshot) => ({
    ...snapshot,
    prompt_assets: [buildPromptAssetRow(input), ...snapshot.prompt_assets]
  }));
}

export async function updatePromptAsset(input: UpdatePromptAssetInput): Promise<WorkbenchSnapshot> {
  if (isTauriAvailable()) {
    return invoke<WorkbenchSnapshot>("workbench_update_prompt_asset", {
      input: {
        ...input,
        payload: serializePromptPayload(input.payload)
      }
    });
  }

  return mutateLocalSnapshot((snapshot) => ({
    ...snapshot,
    prompt_assets: snapshot.prompt_assets.map((asset) =>
      asset.id === input.id
        ? {
            ...asset,
            folder_id: input.folder_id,
            title: input.title,
            payload: serializePromptPayload(input.payload),
            is_favorite: input.is_favorite ? 1 : 0,
            updated_at: Date.now()
          }
        : asset
    )
  }));
}

export async function deletePromptAsset(assetId: string): Promise<WorkbenchSnapshot> {
  if (isTauriAvailable()) {
    return invoke<WorkbenchSnapshot>("workbench_delete_prompt_asset", { assetId });
  }

  return mutateLocalSnapshot((snapshot) => ({
    ...snapshot,
    prompt_assets: snapshot.prompt_assets.filter((asset) => asset.id !== assetId)
  }));
}

export function mapPromptAssets(snapshot: WorkbenchSnapshot): PromptAsset[] {
  return snapshot.prompt_assets.map(hydratePromptAsset);
}

export async function getStorageDescriptor(): Promise<StorageDescriptor> {
  if (isTauriAvailable()) {
    return invoke<StorageDescriptor>("workbench_storage_descriptor");
  }

  return {
    mode: "localStorage",
    path: STORAGE_KEY
  };
}

export async function exportWorkbenchJson(): Promise<string> {
  if (isTauriAvailable()) {
    return invoke<string>("workbench_export_snapshot_json");
  }

  return JSON.stringify(readLocalSnapshot(), null, 2);
}
