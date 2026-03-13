import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  buildExportPreview,
  isProjectLockedBlock,
  syncProjectLockedBlocks
} from "../lib/payload";
import {
  deletePromptAsset,
  mapPromptAssets,
  restorePromptAsset,
  trashPromptAsset,
  updatePromptAsset
} from "../lib/workbench";
import { assetFingerprint, cloneAsset } from "../utils/asset";
import { copyText } from "../utils/browser";
import type { PromptAsset, StorageDescriptor, WorkbenchSnapshot } from "../types/storage";

export interface UseAssetPersistenceArgs {
  activeAsset: PromptAsset | null;
  selectedFolderId: string | null;
  storageMode: StorageDescriptor["mode"] | null | undefined;
  assetDraft: PromptAsset | null;
  folderAssets: PromptAsset[];
  replaceAssetDraft: (nextAsset: PromptAsset | null, options?: { resetHistory?: boolean }) => void;
  applySnapshot: (nextSnapshot: WorkbenchSnapshot, message: string) => WorkbenchSnapshot;
  setSelectedFolderId: Dispatch<SetStateAction<string | null>>;
  setStatusMessage: Dispatch<SetStateAction<string>>;
  onDeleteAssetSuccess: () => void;
  onRestoreAssetSuccess: () => void;
  onResetInteractionState: () => void;
}

export function useAssetPersistence({
  activeAsset,
  selectedFolderId,
  storageMode,
  assetDraft,
  folderAssets,
  replaceAssetDraft,
  applySnapshot,
  setSelectedFolderId,
  setStatusMessage,
  onDeleteAssetSuccess,
  onRestoreAssetSuccess,
  onResetInteractionState
}: UseAssetPersistenceArgs) {
  const [copyFeedback, setCopyFeedback] = useState("");
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState(false);
  const [copyTargetFolderId, setCopyTargetFolderId] = useState<string | null>(null);
  const [isEditingAssetTitle, setIsEditingAssetTitle] = useState(false);

  const exportPreview = useMemo(() => (assetDraft ? buildExportPreview(assetDraft.payload) : ""), [assetDraft]);
  const draftIsDirty = useMemo(
    () => assetFingerprint(assetDraft) !== assetFingerprint(activeAsset),
    [activeAsset, assetDraft]
  );
  const saveStateLabel = isManualSaving || isAutoSaving ? "保存中" : draftIsDirty ? "待保存" : "已保存";

  async function saveProjectLockedAssets(draftToSave: PromptAsset): Promise<WorkbenchSnapshot> {
    const synchronizedAssets = syncProjectLockedBlocks(folderAssets, draftToSave);

    if (synchronizedAssets.length === 0) {
      return updatePromptAsset({
        id: draftToSave.id,
        folder_id: draftToSave.folder_id,
        title: draftToSave.title.trim() || "未命名资产",
        payload: draftToSave.payload,
        is_favorite: draftToSave.is_favorite
      });
    }

    let nextSnapshot: WorkbenchSnapshot | null = null;

    for (const asset of synchronizedAssets) {
      nextSnapshot = await updatePromptAsset({
        id: asset.id,
        folder_id: asset.folder_id,
        title: asset.title.trim() || "未命名资产",
        payload: asset.payload,
        is_favorite: asset.is_favorite
      });
    }

    return nextSnapshot!;
  }

  async function saveDraftSnapshot(draftToSave: PromptAsset): Promise<WorkbenchSnapshot> {
    const shouldSyncLockedBlocks =
      draftToSave.payload.blocks.some(isProjectLockedBlock) ||
      folderAssets.some((asset) => asset.payload.blocks.some(isProjectLockedBlock));

    if (shouldSyncLockedBlocks && draftToSave.folder_id) {
      return saveProjectLockedAssets(draftToSave);
    }

    return updatePromptAsset({
      id: draftToSave.id,
      folder_id: draftToSave.folder_id,
      title: draftToSave.title.trim() || "未命名资产",
      payload: draftToSave.payload,
      is_favorite: draftToSave.is_favorite
    });
  }

  useEffect(() => {
    if (activeAsset) {
      replaceAssetDraft(cloneAsset(activeAsset), { resetHistory: true });
      setIsEditingAssetTitle(false);
      setConfirmPermanentDelete(false);
      onResetInteractionState();
    } else {
      replaceAssetDraft(null, { resetHistory: true });
      setIsEditingAssetTitle(false);
      setConfirmPermanentDelete(false);
      onResetInteractionState();
    }
  }, [activeAsset, onResetInteractionState, replaceAssetDraft]);

  useEffect(() => {
    setCopyTargetFolderId(selectedFolderId);
  }, [selectedFolderId]);

  useEffect(() => {
    if (!assetDraft || !activeAsset || !draftIsDirty) {
      return;
    }

    const timer = window.setTimeout(() => {
      const draftToSave = cloneAsset(assetDraft);
      setIsAutoSaving(true);
      void saveDraftSnapshot(draftToSave)
        .then((nextSnapshot) => {
          applySnapshot(nextSnapshot, storageMode === "sqlite" ? "已自动保存到 SQLite。" : "已自动保存。");
          setSelectedFolderId(draftToSave.folder_id);
        })
        .catch(() => {
          setStatusMessage("自动保存失败。");
        })
        .finally(() => {
          setIsAutoSaving(false);
        });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [activeAsset, applySnapshot, assetDraft, draftIsDirty, folderAssets, setSelectedFolderId, setStatusMessage, storageMode]);

  useEffect(() => {
    if (!draftIsDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [draftIsDirty]);

  async function persistAssetDraft(mode: "manual" | "auto"): Promise<void> {
    if (!assetDraft) {
      return;
    }

    const draftToSave = cloneAsset(assetDraft);
    if (mode === "manual") {
      setIsManualSaving(true);
    }

    try {
      const nextSnapshot = applySnapshot(
        await saveDraftSnapshot(draftToSave),
        mode === "manual"
          ? storageMode === "sqlite"
            ? "资产已保存到 SQLite。"
            : "资产已保存。"
          : storageMode === "sqlite"
            ? "已自动保存到 SQLite。"
            : "已自动保存。"
      );
      setSelectedFolderId(draftToSave.folder_id);
      const refreshed = mapPromptAssets(nextSnapshot).find((asset) => asset.id === draftToSave.id) ?? null;
      replaceAssetDraft(refreshed ? cloneAsset(refreshed) : null);
    } finally {
      if (mode === "manual") {
        setIsManualSaving(false);
      }
    }
  }

  async function saveAsset(): Promise<void> {
    await persistAssetDraft("manual");
  }

  async function moveAssetToTrash(): Promise<void> {
    if (!assetDraft) {
      return;
    }

    applySnapshot(await trashPromptAsset(assetDraft.id), "资产已移入垃圾桶。");
    onDeleteAssetSuccess();
  }

  async function restoreAsset(): Promise<void> {
    if (!assetDraft) {
      return;
    }

    applySnapshot(await restorePromptAsset(assetDraft.id), "资产已从垃圾桶恢复。");
    setConfirmPermanentDelete(false);
    onRestoreAssetSuccess();
  }

  async function permanentlyDeleteAsset(): Promise<void> {
    if (!assetDraft) {
      return;
    }

    if (!confirmPermanentDelete) {
      setConfirmPermanentDelete(true);
      setStatusMessage("再次点击“确认永久删除”以彻底移除当前资产。");
      return;
    }

    applySnapshot(await deletePromptAsset(assetDraft.id), "资产已永久删除。");
    setConfirmPermanentDelete(false);
    onDeleteAssetSuccess();
  }

  async function copyExport(): Promise<void> {
    if (!exportPreview) {
      return;
    }

    if (await copyText(exportPreview)) {
      setCopyFeedback("导出预览已复制");
      window.setTimeout(() => setCopyFeedback(""), 1800);
    }
  }

  function resetPersistenceState(): void {
    setIsEditingAssetTitle(false);
    setConfirmPermanentDelete(false);
  }

  return {
    exportPreview,
    draftIsDirty,
    saveStateLabel,
    copyFeedback,
    isManualSaving,
    confirmPermanentDelete,
    copyTargetFolderId,
    setCopyTargetFolderId,
    isEditingAssetTitle,
    setIsEditingAssetTitle,
    saveAsset,
    moveAssetToTrash,
    restoreAsset,
    permanentlyDeleteAsset,
    copyExport,
    resetPersistenceState
  };
}
