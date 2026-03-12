import type { PointerEvent as ReactPointerEvent } from "react";
import type { PromptBlock } from "../../types/prompt";
import { BlockCard } from "./BlockCard";

export interface BlockListProps {
  blocks: PromptBlock[];
  draggingBlockId: string | null;
  dragOverBlockId: string | null;
  onAddBlock: () => void;
  onBlockPointerDown: (event: ReactPointerEvent<HTMLElement>, blockId: string) => void;
  onBlockPointerEnter: (event: ReactPointerEvent<HTMLElement>, blockId: string) => void;
  onLabelChange: (blockId: string, value: string) => void;
  onContentChange: (blockId: string, value: string) => void;
  onDuplicate: (blockId: string) => void;
  onRemove: (blockId: string) => void;
  onClearDragState: () => void;
}

export function BlockList({
  blocks,
  draggingBlockId,
  dragOverBlockId,
  onAddBlock,
  onBlockPointerDown,
  onBlockPointerEnter,
  onLabelChange,
  onContentChange,
  onDuplicate,
  onRemove,
  onClearDragState
}: BlockListProps) {
  return (
    <article className="rounded-[28px] border border-[#d8cfc5] bg-[#f8f3ed]/90 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Blocks</div>
          <p className="mt-2 text-sm text-[#8b8379]">按住整张卡片拖动即可调整顺序。</p>
        </div>
        <button
          type="button"
          onClick={onAddBlock}
          className="rounded-2xl bg-[#e2ddd5] px-4 py-2.5 text-sm font-medium text-[#5a544d] hover:bg-[#d6cec5]"
        >
          新增 Block
        </button>
      </div>

      <div className="space-y-3">
        {blocks.map((block, index) => (
          <BlockCard
            key={block.id}
            block={block}
            index={index}
            isDragging={draggingBlockId === block.id}
            isDragOver={dragOverBlockId === block.id}
            onBlockPointerDown={onBlockPointerDown}
            onBlockPointerEnter={onBlockPointerEnter}
            onLabelChange={onLabelChange}
            onContentChange={onContentChange}
            onDuplicate={onDuplicate}
            onRemove={onRemove}
            onClearDragState={onClearDragState}
          />
        ))}
      </div>
    </article>
  );
}
