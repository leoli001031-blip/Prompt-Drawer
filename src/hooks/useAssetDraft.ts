import { useState, type Dispatch, type SetStateAction } from "react";
import { useAssetPersistence } from "./useAssetPersistence";
import { useBlockEditor } from "./useBlockEditor";
import { useVersionHistory } from "./useVersionHistory";
import type { PromptAsset, StorageDescriptor, WorkbenchSnapshot } from "../types/storage";

export interface UseAssetDraftArgs {
  activeAsset: PromptAsset | null;
  selectedFolderId: string | null;
  storageMode: StorageDescriptor["mode"] | null | undefined;
  applySnapshot: (nextSnapshot: WorkbenchSnapshot, message: string) => WorkbenchSnapshot;
  setSelectedFolderId: Dispatch<SetStateAction<string | null>>;
  setStatusMessage: Dispatch<SetStateAction<string>>;
  onDeleteAssetSuccess: () => void;
}

export function useAssetDraft({
  activeAsset,
  selectedFolderId,
  storageMode,
  applySnapshot,
  setSelectedFolderId,
  setStatusMessage,
  onDeleteAssetSuccess
}: UseAssetDraftArgs) {
  const [assetDraft, setAssetDraft] = useState<PromptAsset | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);

  const {
    updateBlock,
    removeBlock,
    addBlock,
    duplicateBlock,
    beginBlockDrag,
    updateBlockDragTarget,
    clearBlockDragState
  } = useBlockEditor({
    assetDraft,
    setAssetDraft,
    draggingBlockId,
    setDraggingBlockId,
    dragOverBlockId,
    setDragOverBlockId
  });

  const {
    exportPreview,
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
  } = useAssetPersistence({
    activeAsset,
    selectedFolderId,
    storageMode,
    assetDraft,
    setAssetDraft,
    applySnapshot,
    setSelectedFolderId,
    setStatusMessage,
    onDeleteAssetSuccess,
    onResetInteractionState: clearBlockDragState
  });

  const {
    versionName,
    setVersionName,
    createVersion,
    restoreVersion
  } = useVersionHistory({
    assetDraft,
    setAssetDraft,
    applySnapshot
  });

  function resetDraftUiState(): void {
    clearBlockDragState();
    resetPersistenceState();
  }

  return {
    assetDraft,
    setAssetDraft,
    exportPreview,
    saveStateLabel,
    copyFeedback,
    isManualSaving,
    confirmAssetDelete,
    versionName,
    setVersionName,
    copyTargetFolderId,
    setCopyTargetFolderId,
    isEditingAssetTitle,
    setIsEditingAssetTitle,
    draggingBlockId,
    dragOverBlockId,
    resetDraftUiState,
    saveAsset,
    deleteAsset,
    copyExport,
    updateBlock,
    removeBlock,
    addBlock,
    duplicateBlock,
    beginBlockDrag,
    updateBlockDragTarget,
    clearBlockDragState,
    createVersion,
    restoreVersion
  };
}
