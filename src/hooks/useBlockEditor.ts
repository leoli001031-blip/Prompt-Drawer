import { useEffect, type Dispatch, type PointerEvent as ReactPointerEvent, type SetStateAction } from "react";
import {
  createBlock as createPromptBlock,
  duplicateBlock as duplicatePromptBlock,
  reorderBlocks
} from "../lib/payload";
import type { PromptBlock } from "../types/prompt";
import type { PromptAsset } from "../types/storage";

function isBlockControlTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("textarea, select, input, button"));
}

export interface UseBlockEditorArgs {
  assetDraft: PromptAsset | null;
  setAssetDraft: Dispatch<SetStateAction<PromptAsset | null>>;
  draggingBlockId: string | null;
  setDraggingBlockId: Dispatch<SetStateAction<string | null>>;
  dragOverBlockId: string | null;
  setDragOverBlockId: Dispatch<SetStateAction<string | null>>;
}

export function useBlockEditor({
  assetDraft,
  setAssetDraft,
  draggingBlockId,
  setDraggingBlockId,
  dragOverBlockId,
  setDragOverBlockId
}: UseBlockEditorArgs) {
  useEffect(() => {
    if (!draggingBlockId) {
      return;
    }

    const clearDragging = () => {
      setDraggingBlockId(null);
      setDragOverBlockId(null);
    };

    window.addEventListener("pointerup", clearDragging);
    window.addEventListener("pointercancel", clearDragging);

    return () => {
      window.removeEventListener("pointerup", clearDragging);
      window.removeEventListener("pointercancel", clearDragging);
    };
  }, [draggingBlockId, setDragOverBlockId, setDraggingBlockId]);

  function updateBlock(blockId: string, patch: Partial<PromptBlock>): void {
    if (!assetDraft) {
      return;
    }

    setAssetDraft({
      ...assetDraft,
      payload: {
        ...assetDraft.payload,
        blocks: assetDraft.payload.blocks.map((block) =>
          block.id === blockId ? { ...block, ...patch } : block
        )
      }
    });
  }

  function removeBlock(blockId: string): void {
    if (!assetDraft) {
      return;
    }

    setAssetDraft({
      ...assetDraft,
      payload: {
        ...assetDraft.payload,
        blocks: assetDraft.payload.blocks.filter((block) => block.id !== blockId)
      }
    });
  }

  function addBlock(): void {
    if (!assetDraft) {
      return;
    }

    setAssetDraft({
      ...assetDraft,
      payload: {
        ...assetDraft.payload,
        blocks: [...assetDraft.payload.blocks, createPromptBlock("custom")]
      }
    });
  }

  function duplicateBlock(blockId: string): void {
    if (!assetDraft) {
      return;
    }

    const blockIndex = assetDraft.payload.blocks.findIndex((block) => block.id === blockId);
    if (blockIndex === -1) {
      return;
    }

    const nextBlocks = [...assetDraft.payload.blocks];
    nextBlocks.splice(blockIndex + 1, 0, duplicatePromptBlock(nextBlocks[blockIndex]));
    setAssetDraft({
      ...assetDraft,
      payload: {
        ...assetDraft.payload,
        blocks: nextBlocks
      }
    });
  }

  function moveDraftBlock(sourceBlockId: string, targetBlockId: string): void {
    setAssetDraft((current) => {
      if (!current) {
        return current;
      }

      const fromIndex = current.payload.blocks.findIndex((block) => block.id === sourceBlockId);
      const toIndex = current.payload.blocks.findIndex((block) => block.id === targetBlockId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return current;
      }

      return {
        ...current,
        payload: {
          ...current.payload,
          blocks: reorderBlocks(current.payload.blocks, fromIndex, toIndex)
        }
      };
    });
  }

  function beginBlockDrag(event: ReactPointerEvent<HTMLElement>, blockId: string): void {
    if (isBlockControlTarget(event.target)) {
      return;
    }

    event.preventDefault();
    setDraggingBlockId(blockId);
    setDragOverBlockId(null);
  }

  function updateBlockDragTarget(event: ReactPointerEvent<HTMLElement>, blockId: string): void {
    if (!draggingBlockId || draggingBlockId === blockId || event.buttons === 0) {
      return;
    }

    if (dragOverBlockId === blockId) {
      return;
    }

    setDragOverBlockId(blockId);
    moveDraftBlock(draggingBlockId, blockId);
  }

  function clearBlockDragState(): void {
    setDraggingBlockId(null);
    setDragOverBlockId(null);
  }

  return {
    updateBlock,
    removeBlock,
    addBlock,
    duplicateBlock,
    beginBlockDrag,
    updateBlockDragTarget,
    clearBlockDragState
  };
}
