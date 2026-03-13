import { useReducer, useState, type Dispatch, type SetStateAction } from "react";
import { useAssetPersistence } from "./useAssetPersistence";
import { useBlockEditor } from "./useBlockEditor";
import { useVersionHistory } from "./useVersionHistory";
import { assetFingerprint, cloneAsset } from "../utils/asset";
import type { PromptAsset, StorageDescriptor, WorkbenchSnapshot } from "../types/storage";

export interface UseAssetDraftArgs {
  activeAsset: PromptAsset | null;
  folderAssets: PromptAsset[];
  selectedFolderId: string | null;
  storageMode: StorageDescriptor["mode"] | null | undefined;
  applySnapshot: (nextSnapshot: WorkbenchSnapshot, message: string) => WorkbenchSnapshot;
  setSelectedFolderId: Dispatch<SetStateAction<string | null>>;
  setStatusMessage: Dispatch<SetStateAction<string>>;
  onDeleteAssetSuccess: () => void;
  onRestoreAssetSuccess: () => void;
}

interface DraftHistoryState {
  past: PromptAsset[];
  present: PromptAsset | null;
  future: PromptAsset[];
}

type DraftHistoryAction =
  | { type: "apply"; next: SetStateAction<PromptAsset | null> }
  | { type: "replace"; next: PromptAsset | null; resetHistory?: boolean }
  | { type: "undo" }
  | { type: "redo" };

const INITIAL_HISTORY_STATE: DraftHistoryState = {
  past: [],
  present: null,
  future: []
};

function cloneOptionalAsset(asset: PromptAsset | null): PromptAsset | null {
  return asset ? cloneAsset(asset) : null;
}

function draftsMatch(left: PromptAsset | null, right: PromptAsset | null): boolean {
  return assetFingerprint(left) === assetFingerprint(right);
}

function draftHistoryReducer(state: DraftHistoryState, action: DraftHistoryAction): DraftHistoryState {
  switch (action.type) {
    case "apply": {
      const nextDraft =
        typeof action.next === "function" ? action.next(state.present) : action.next;

      if (draftsMatch(state.present, nextDraft)) {
        return state;
      }

      return {
        past: state.present ? [...state.past, cloneAsset(state.present)].slice(-100) : state.past,
        present: cloneOptionalAsset(nextDraft),
        future: []
      };
    }

    case "replace": {
      if (draftsMatch(state.present, action.next) && !action.resetHistory) {
        return state;
      }

      return {
        past: action.resetHistory ? [] : state.past,
        present: cloneOptionalAsset(action.next),
        future: action.resetHistory ? [] : state.future
      };
    }

    case "undo": {
      const previousDraft = state.past[state.past.length - 1];
      if (!previousDraft) {
        return state;
      }

      return {
        past: state.past.slice(0, -1),
        present: cloneAsset(previousDraft),
        future: state.present ? [cloneAsset(state.present), ...state.future].slice(0, 100) : state.future
      };
    }

    case "redo": {
      const nextDraft = state.future[0];
      if (!nextDraft) {
        return state;
      }

      return {
        past: state.present ? [...state.past, cloneAsset(state.present)].slice(-100) : state.past,
        present: cloneAsset(nextDraft),
        future: state.future.slice(1)
      };
    }

    default:
      return state;
  }
}

export function useAssetDraft({
  activeAsset,
  folderAssets,
  selectedFolderId,
  storageMode,
  applySnapshot,
  setSelectedFolderId,
  setStatusMessage,
  onDeleteAssetSuccess,
  onRestoreAssetSuccess
}: UseAssetDraftArgs) {
  const [draftHistoryState, dispatchDraftHistory] = useReducer(draftHistoryReducer, INITIAL_HISTORY_STATE);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const assetDraft = draftHistoryState.present;

  const setAssetDraft: Dispatch<SetStateAction<PromptAsset | null>> = (next) => {
    dispatchDraftHistory({ type: "apply", next });
  };

  function replaceAssetDraft(nextAsset: PromptAsset | null, options?: { resetHistory?: boolean }): void {
    dispatchDraftHistory({
      type: "replace",
      next: nextAsset,
      resetHistory: options?.resetHistory
    });
  }

  const {
    updateBlock,
    removeBlock,
    addBlock,
    duplicateBlock,
    toggleBlockLock,
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
  } = useAssetPersistence({
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

  function undoDraft(): void {
    dispatchDraftHistory({ type: "undo" });
    clearBlockDragState();
  }

  function redoDraft(): void {
    dispatchDraftHistory({ type: "redo" });
    clearBlockDragState();
  }

  return {
    assetDraft,
    setAssetDraft,
    replaceAssetDraft,
    exportPreview,
    saveStateLabel,
    copyFeedback,
    isManualSaving,
    confirmPermanentDelete,
    versionName,
    setVersionName,
    copyTargetFolderId,
    setCopyTargetFolderId,
    isEditingAssetTitle,
    setIsEditingAssetTitle,
    draggingBlockId,
    dragOverBlockId,
    canUndo: draftHistoryState.past.length > 0,
    canRedo: draftHistoryState.future.length > 0,
    resetDraftUiState,
    saveAsset,
    moveAssetToTrash,
    restoreAsset,
    permanentlyDeleteAsset,
    copyExport,
    updateBlock,
    removeBlock,
    addBlock,
    duplicateBlock,
    toggleBlockLock,
    beginBlockDrag,
    updateBlockDragTarget,
    clearBlockDragState,
    createVersion,
    restoreVersion,
    undoDraft,
    redoDraft
  };
}
