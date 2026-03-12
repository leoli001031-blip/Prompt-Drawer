import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { buildExportPreview } from "../lib/payload";
import { deletePromptAsset, mapPromptAssets, updatePromptAsset } from "../lib/workbench";
import { assetFingerprint, cloneAsset } from "../utils/asset";
import { copyText } from "../utils/browser";
import type { PromptAsset, StorageDescriptor, WorkbenchSnapshot } from "../types/storage";

export interface UseAssetPersistenceArgs {
  activeAsset: PromptAsset | null;
  selectedFolderId: string | null;
  storageMode: StorageDescriptor["mode"] | null | undefined;
  assetDraft: PromptAsset | null;
  setAssetDraft: Dispatch<SetStateAction<PromptAsset | null>>;
  applySnapshot: (nextSnapshot: WorkbenchSnapshot, message: string) => WorkbenchSnapshot;
  setSelectedFolderId: Dispatch<SetStateAction<string | null>>;
  setStatusMessage: Dispatch<SetStateAction<string>>;
  onDeleteAssetSuccess: () => void;
  onResetInteractionState: () => void;
}

export function useAssetPersistence({
  activeAsset,
  selectedFolderId,
  storageMode,
  assetDraft,
  setAssetDraft,
  applySnapshot,
  setSelectedFolderId,
  setStatusMessage,
  onDeleteAssetSuccess,
  onResetInteractionState
}: UseAssetPersistenceArgs) {
  const [copyFeedback, setCopyFeedback] = useState("");
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [confirmAssetDelete, setConfirmAssetDelete] = useState(false);
  const [copyTargetFolderId, setCopyTargetFolderId] = useState<string | null>(null);
  const [isEditingAssetTitle, setIsEditingAssetTitle] = useState(false);

  const exportPreview = useMemo(() => (assetDraft ? buildExportPreview(assetDraft.payload) : ""), [assetDraft]);
  const draftIsDirty = useMemo(
    () => assetFingerprint(assetDraft) !== assetFingerprint(activeAsset),
    [activeAsset, assetDraft]
  );
  const saveStateLabel = isManualSaving || isAutoSaving ? "保存中" : draftIsDirty ? "待保存" : "已保存";

  useEffect(() => {
    if (activeAsset) {
      setAssetDraft(cloneAsset(activeAsset));
      setIsEditingAssetTitle(false);
      setConfirmAssetDelete(false);
      onResetInteractionState();
    } else {
      setAssetDraft(null);
      setIsEditingAssetTitle(false);
      setConfirmAssetDelete(false);
      onResetInteractionState();
    }
  }, [activeAsset, onResetInteractionState, setAssetDraft]);

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
      void updatePromptAsset({
        id: draftToSave.id,
        folder_id: draftToSave.folder_id,
        title: draftToSave.title.trim() || "未命名资产",
        payload: draftToSave.payload,
        is_favorite: draftToSave.is_favorite
      })
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
  }, [activeAsset, applySnapshot, assetDraft, draftIsDirty, setSelectedFolderId, setStatusMessage, storageMode]);

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
        await updatePromptAsset({
          id: draftToSave.id,
          folder_id: draftToSave.folder_id,
          title: draftToSave.title.trim() || "未命名资产",
          payload: draftToSave.payload,
          is_favorite: draftToSave.is_favorite
        }),
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
      setAssetDraft(refreshed ? cloneAsset(refreshed) : null);
    } finally {
      if (mode === "manual") {
        setIsManualSaving(false);
      }
    }
  }

  async function saveAsset(): Promise<void> {
    await persistAssetDraft("manual");
  }

  async function deleteAsset(): Promise<void> {
    if (!assetDraft) {
      return;
    }

    if (!confirmAssetDelete) {
      setConfirmAssetDelete(true);
      setStatusMessage("再次点击“确认删除”以删除当前资产。");
      return;
    }

    const deletedAssetId = assetDraft.id;
    applySnapshot(await deletePromptAsset(deletedAssetId), "资产已删除。");
    setConfirmAssetDelete(false);
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
    setConfirmAssetDelete(false);
  }

  return {
    exportPreview,
    draftIsDirty,
    saveStateLabel,
    copyFeedback,
    isManualSaving,
    confirmAssetDelete,
    copyTargetFolderId,
    setCopyTargetFolderId,
    isEditingAssetTitle,
    setIsEditingAssetTitle,
    saveAsset,
    deleteAsset,
    copyExport,
    resetPersistenceState
  };
}
