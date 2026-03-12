import { useState, type Dispatch, type SetStateAction } from "react";
import { appendVersion, createVersionSnapshot, restoreFromVersion } from "../lib/payload";
import { mapPromptAssets, updatePromptAsset } from "../lib/workbench";
import { cloneAsset } from "../utils/asset";
import type { PromptAsset, WorkbenchSnapshot } from "../types/storage";

export interface UseVersionHistoryArgs {
  assetDraft: PromptAsset | null;
  setAssetDraft: Dispatch<SetStateAction<PromptAsset | null>>;
  applySnapshot: (nextSnapshot: WorkbenchSnapshot, message: string) => WorkbenchSnapshot;
}

export function useVersionHistory({
  assetDraft,
  setAssetDraft,
  applySnapshot
}: UseVersionHistoryArgs) {
  const [versionName, setVersionName] = useState("");

  async function createVersion(): Promise<void> {
    if (!assetDraft) {
      return;
    }

    const version = createVersionSnapshot(assetDraft, versionName);
    const nextDraft = {
      ...assetDraft,
      payload: appendVersion(assetDraft.payload, version)
    };

    setVersionName("");
    setAssetDraft(nextDraft);
    const nextSnapshot = applySnapshot(
      await updatePromptAsset({
        id: nextDraft.id,
        folder_id: nextDraft.folder_id,
        title: nextDraft.title.trim() || "未命名资产",
        payload: nextDraft.payload,
        is_favorite: nextDraft.is_favorite
      }),
      "已创建版本快照。"
    );

    const refreshed = mapPromptAssets(nextSnapshot).find((asset) => asset.id === nextDraft.id) ?? null;
    setAssetDraft(refreshed ? cloneAsset(refreshed) : nextDraft);
  }

  async function restoreVersion(versionId: string): Promise<void> {
    if (!assetDraft) {
      return;
    }

    const restored = restoreFromVersion(assetDraft.payload, versionId);
    if (!restored) {
      return;
    }

    const nextDraft = {
      ...assetDraft,
      title: restored.title,
      payload: restored.payload
    };

    setAssetDraft(nextDraft);
    const nextSnapshot = applySnapshot(
      await updatePromptAsset({
        id: nextDraft.id,
        folder_id: nextDraft.folder_id,
        title: nextDraft.title.trim() || "未命名资产",
        payload: nextDraft.payload,
        is_favorite: nextDraft.is_favorite
      }),
      "已恢复到所选版本。"
    );

    const refreshed = mapPromptAssets(nextSnapshot).find((asset) => asset.id === nextDraft.id) ?? null;
    setAssetDraft(refreshed ? cloneAsset(refreshed) : nextDraft);
  }

  return {
    versionName,
    setVersionName,
    createVersion,
    restoreVersion
  };
}
