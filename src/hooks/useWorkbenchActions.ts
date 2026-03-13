import type { Dispatch, SetStateAction } from "react";
import {
  applyProjectLockedBlocksToPayload,
  buildProjectScript,
  createDefaultPayload,
  createPayloadFromAssetTemplate,
  duplicatePayload,
  extractProjectLockedBlocks,
  getNextShotNumber,
  parseImportedAssets,
  stripProjectLockMetadata
} from "../lib/payload";
import {
  createFolder as createFolderRecord,
  createPromptAsset,
  deleteFolder as deleteFolderRecord,
  deletePromptAsset,
  exportWorkbenchJson as exportWorkbenchSnapshotJson,
  mapPromptAssets,
  restorePromptAsset,
  trashPromptAsset,
  updateFolder as updateFolderRecord,
  updatePromptAsset
} from "../lib/workbench";
import { copyText, downloadJsonFile } from "../utils";
import type {
  FolderRecord,
  FolderType,
  PromptAsset,
  StorageDescriptor,
  WorkbenchSnapshot
} from "../types/storage";
import type { AssetTemplate } from "../types/settings";

export interface UseWorkbenchActionsArgs {
  snapshot: WorkbenchSnapshot | null;
  storageDescriptor: StorageDescriptor | null;
  folders: FolderRecord[];
  assets: PromptAsset[];
  selectedFolder: FolderRecord | null;
  folderAssets: PromptAsset[];
  activeAsset: PromptAsset | null;
  activeAssetId: string | null;
  copyTargetFolderId: string | null;
  editingFolderName: string;
  importRaw: string;
  importTitle: string;
  assetTemplates: AssetTemplate[];
  selectedCreateAssetTemplateId: string;
  applySnapshot: (nextSnapshot: WorkbenchSnapshot, message: string) => WorkbenchSnapshot;
  setSelectedFolderId: Dispatch<SetStateAction<string | null>>;
  setActiveAssetId: Dispatch<SetStateAction<string | null>>;
  setStatusMessage: Dispatch<SetStateAction<string>>;
  onOpenAsset: (assetId: string) => void;
  onCloseDrawer: () => void;
  onCloseFolderContextMenu: () => void;
  onCloseAssetContextMenu: () => void;
  onCloseImportPanel: () => void;
  onResetImportDraft: () => void;
  onCancelFolderRename: () => void;
  onCompleteFolderRename: () => void;
}

export function useWorkbenchActions({
  snapshot,
  storageDescriptor,
  folders,
  assets,
  selectedFolder,
  folderAssets,
  activeAsset,
  activeAssetId,
  copyTargetFolderId,
  editingFolderName,
  importRaw,
  importTitle,
  assetTemplates,
  selectedCreateAssetTemplateId,
  applySnapshot,
  setSelectedFolderId,
  setActiveAssetId,
  setStatusMessage,
  onOpenAsset,
  onCloseDrawer,
  onCloseFolderContextMenu,
  onCloseAssetContextMenu,
  onCloseImportPanel,
  onResetImportDraft,
  onCancelFolderRename,
  onCompleteFolderRename
}: UseWorkbenchActionsArgs) {
  function applyProjectLocksForTarget(
    payload: PromptAsset["payload"],
    targetFolderId: string,
    _targetFolderType: FolderType
  ): PromptAsset["payload"] {
    const projectLockedBlocks = extractProjectLockedBlocks(assets, targetFolderId);

    if (projectLockedBlocks.length === 0) {
      return stripProjectLockMetadata(payload);
    }

    return applyProjectLockedBlocksToPayload(payload, projectLockedBlocks);
  }

  async function renameFolder(folder: FolderRecord): Promise<void> {
    const nextName = editingFolderName.trim() || folder.name;
    if (nextName === folder.name) {
      onCancelFolderRename();
      return;
    }

    applySnapshot(
      await updateFolderRecord({
        id: folder.id,
        name: nextName,
        type: folder.type
      }),
      "目录名称已更新。"
    );
    onCompleteFolderRename();
  }

  async function createFolder(
    type: FolderType,
    options?: {
      name?: string;
    }
  ): Promise<FolderRecord | null> {
    const nextSnapshot = applySnapshot(
      await createFolderRecord({
        name: options?.name?.trim() || (type === "library" ? "新提示词库" : "新项目"),
        type
      }),
      "已创建目录。"
    );
    const nextFolder = [...nextSnapshot.folders].sort((left, right) => right.created_at - left.created_at)[0];
    setSelectedFolderId(nextFolder?.id ?? null);
    return nextFolder ?? null;
  }

  async function removeFolder(folder: FolderRecord): Promise<void> {
    const nextSnapshot = applySnapshot(await deleteFolderRecord(folder.id), "目录已删除。");
    setSelectedFolderId(nextSnapshot.folders[0]?.id ?? null);
    if (activeAsset && activeAsset.folder_id === folder.id) {
      setActiveAssetId(null);
      onCloseDrawer();
    }
    onCloseFolderContextMenu();
  }

  async function removeAsset(asset: PromptAsset): Promise<void> {
    applySnapshot(await trashPromptAsset(asset.id), "资产已移入垃圾桶。");
    onCloseAssetContextMenu();

    if (activeAssetId === asset.id) {
      onCloseDrawer();
    }
  }

  async function restoreAsset(asset: PromptAsset): Promise<void> {
    applySnapshot(await restorePromptAsset(asset.id), "资产已从垃圾桶恢复。");
    onCloseAssetContextMenu();

    if (activeAssetId === asset.id) {
      onCloseDrawer();
    }
  }

  async function permanentlyDeleteAsset(asset: PromptAsset): Promise<void> {
    applySnapshot(await deletePromptAsset(asset.id), "资产已永久删除。");
    onCloseAssetContextMenu();

    if (activeAssetId === asset.id) {
      onCloseDrawer();
    }
  }

  async function createAsset(): Promise<void> {
    if (!selectedFolder) {
      return;
    }

    const nextShotNumber =
      selectedFolder.type === "project" ? getNextShotNumber(assets, selectedFolder.id) : 1;
    const selectedAssetTemplate =
      assetTemplates.find((template) => template.id === selectedCreateAssetTemplateId) ?? null;
    const basePayload = selectedAssetTemplate
      ? createPayloadFromAssetTemplate(selectedAssetTemplate, selectedFolder.type, nextShotNumber)
      : createDefaultPayload(selectedFolder.type, nextShotNumber);

    const nextSnapshot = applySnapshot(
      await createPromptAsset({
        folder_id: selectedFolder.id,
        title:
          selectedFolder.type === "project"
            ? `镜头 ${String(nextShotNumber).padStart(2, "0")} / 新分镜卡片`
            : "新提示词资产",
        payload: applyProjectLocksForTarget(
          basePayload,
          selectedFolder.id,
          selectedFolder.type
        ),
        is_favorite: false
      }),
      "已创建资产。"
    );
    const nextAsset = mapPromptAssets(nextSnapshot).find((asset) => asset.folder_id === selectedFolder.id);
    if (nextAsset) {
      onOpenAsset(nextAsset.id);
    }
  }

  async function copyStoragePath(): Promise<void> {
    if (!storageDescriptor?.path) {
      return;
    }

    if (await copyText(storageDescriptor.path)) {
      setStatusMessage("存储路径已复制。");
    }
  }

  async function copyWorkbenchJson(): Promise<void> {
    const json = await exportWorkbenchSnapshotJson();
    if (await copyText(json)) {
      setStatusMessage("全量 JSON 已复制。");
    }
  }

  async function downloadWorkbenchJson(): Promise<void> {
    const json = await exportWorkbenchSnapshotJson();
    downloadJsonFile(json, `prompt-workbench-${new Date().toISOString().slice(0, 10)}.json`);
    setStatusMessage("全量 JSON 已下载。");
  }

  async function duplicateAsset(asset: PromptAsset, targetFolderId = asset.folder_id): Promise<void> {
    const targetFolder = folders.find((folder) => folder.id === targetFolderId) ?? selectedFolder;
    const duplicatedPayload = duplicatePayload(asset.payload);

    if (targetFolder?.type === "project") {
      duplicatedPayload.storyboard = {
        ...(duplicatedPayload.storyboard ?? { shot_number: 1 }),
        shot_number: getNextShotNumber(assets, targetFolderId)
      };
    } else {
      duplicatedPayload.storyboard = undefined;
    }

    const nextPayload = applyProjectLocksForTarget(
      duplicatedPayload,
      targetFolderId,
      targetFolder?.type ?? "library"
    );

    const nextSnapshot = applySnapshot(
      await createPromptAsset({
        folder_id: targetFolderId,
        title: `${asset.title} 副本`,
        payload: nextPayload,
        is_favorite: false
      }),
      targetFolderId === asset.folder_id ? "已复制资产。" : "已复制到目标目录。"
    );

    const duplicatedAsset =
      mapPromptAssets(nextSnapshot).find(
        (nextAsset) => nextAsset.folder_id === targetFolderId && nextAsset.title === `${asset.title} 副本`
      ) ?? null;

    if (duplicatedAsset) {
      setSelectedFolderId(targetFolderId);
      onOpenAsset(duplicatedAsset.id);
    }
    onCloseAssetContextMenu();
  }

  async function duplicateCurrentAsset(): Promise<void> {
    if (!activeAsset) {
      return;
    }

    await duplicateAsset(activeAsset, copyTargetFolderId ?? activeAsset.folder_id);
  }

  async function toggleFavorite(asset: PromptAsset): Promise<void> {
    const nextSnapshot = await updatePromptAsset({
      id: asset.id,
      folder_id: asset.folder_id,
      title: asset.title,
      payload: asset.payload,
      is_favorite: !asset.is_favorite
    });
    applySnapshot(nextSnapshot, "收藏状态已更新。");
  }

  async function copyProjectScript(): Promise<void> {
    if (selectedFolder?.type !== "project") {
      return;
    }

    const script = buildProjectScript(folderAssets);
    if (!script) {
      setStatusMessage("当前项目没有可导出的分镜脚本。");
      return;
    }

    if (await copyText(script)) {
      setStatusMessage("项目分镜脚本已复制。");
    }
  }

  async function importAssets(): Promise<void> {
    if (!selectedFolder || !snapshot) {
      return;
    }

    const importedAssets = parseImportedAssets(importRaw, selectedFolder.type);
    if (importedAssets.length === 0) {
      setStatusMessage("没有识别到可导入的内容。");
      return;
    }

    let nextSnapshot: WorkbenchSnapshot | null = null;

    for (let index = 0; index < importedAssets.length; index += 1) {
      const item = importedAssets[index];
      const title = importedAssets.length === 1 && importTitle.trim() ? importTitle.trim() : item.title;
      const payload =
        selectedFolder.type === "project"
          ? applyProjectLocksForTarget(
              {
                ...item.payload,
                storyboard: {
                  ...(item.payload.storyboard ?? {}),
                  shot_number:
                    item.payload.storyboard?.shot_number ??
                    getNextShotNumber(mapPromptAssets(nextSnapshot ?? snapshot), selectedFolder.id)
                }
              },
              selectedFolder.id,
              selectedFolder.type
            )
          : stripProjectLockMetadata(item.payload);

      nextSnapshot = await createPromptAsset({
        folder_id: selectedFolder.id,
        title,
        payload,
        is_favorite: false
      });
    }

    if (nextSnapshot) {
      applySnapshot(nextSnapshot, `已导入 ${importedAssets.length} 条资产。`);
      onCloseImportPanel();
      onResetImportDraft();
    }
  }

  return {
    renameFolder,
    createFolder,
    removeFolder,
    removeAsset,
    restoreAsset,
    permanentlyDeleteAsset,
    createAsset,
    copyStoragePath,
    copyWorkbenchJson,
    downloadWorkbenchJson,
    duplicateAsset,
    duplicateCurrentAsset,
    toggleFavorite,
    copyProjectScript,
    importAssets
  };
}
