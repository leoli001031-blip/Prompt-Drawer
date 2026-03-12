import type { PointerEvent as ReactPointerEvent } from "react";
import type { PromptBlock } from "../../types/prompt";

export interface BlockCardProps {
  block: PromptBlock;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onBlockPointerDown: (event: ReactPointerEvent<HTMLElement>, blockId: string) => void;
  onBlockPointerEnter: (event: ReactPointerEvent<HTMLElement>, blockId: string) => void;
  onLabelChange: (blockId: string, value: string) => void;
  onContentChange: (blockId: string, value: string) => void;
  onDuplicate: (blockId: string) => void;
  onRemove: (blockId: string) => void;
  onClearDragState: () => void;
}

export function BlockCard({
  block,
  index,
  isDragging,
  isDragOver,
  onBlockPointerDown,
  onBlockPointerEnter,
  onLabelChange,
  onContentChange,
  onDuplicate,
  onRemove,
  onClearDragState
}: BlockCardProps) {
  const handleControlPointerDownCapture = (event: ReactPointerEvent<HTMLElement>) => {
    onClearDragState();
    event.stopPropagation();
  };

  return (
    <article
      onPointerDown={(event) => onBlockPointerDown(event, block.id)}
      onPointerEnter={(event) => onBlockPointerEnter(event, block.id)}
      className={[
        "rounded-3xl border border-[#d8cfc5] bg-[#f3ede6] p-4 transition select-none",
        isDragging ? "cursor-grabbing opacity-60" : "cursor-grab",
        isDragOver ? "border-[#9eb0a5] bg-[#edf3ee] shadow-[0_0_0_1px_rgba(158,176,165,0.35)]" : ""
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <input
          value={block.label ?? ""}
          onChange={(event) => onLabelChange(block.id, event.target.value)}
          onFocus={onClearDragState}
          onPointerDownCapture={handleControlPointerDownCapture}
          aria-label={`Block ${index + 1} 标签`}
          placeholder="点击命名 Block"
          className="min-w-[180px] w-1/2 max-w-[560px] rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-2.5 text-lg font-semibold tracking-tight text-[#5e5851] placeholder:text-[#b0a598] select-text"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDuplicate(block.id)}
            className="rounded-full border border-[#d8cfc5] bg-[#f8f3ed] px-3 py-1.5 text-xs text-[#7f786f] hover:bg-[#ece5dd]"
          >
            复制
          </button>
          <button
            type="button"
            onClick={() => onRemove(block.id)}
            className="rounded-full border border-[#d5b8aa] bg-[#efe2da] px-3 py-1.5 text-xs text-[#9b7769] hover:bg-[#e8d9d0]"
          >
            删除
          </button>
        </div>
      </div>

      <textarea
        rows={5}
        value={block.content}
        onChange={(event) => onContentChange(block.id, event.target.value)}
        onFocus={onClearDragState}
        onPointerDownCapture={handleControlPointerDownCapture}
        placeholder="输入这一段提示词内容"
        className="mt-3 w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598] select-text"
      />
    </article>
  );
}
