import { useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { PromptBlock } from "../../types/prompt";
import type { BlockTemplate } from "../../types/settings";
import type { FolderType } from "../../types/storage";
import { BlockCard } from "./BlockCard";

export interface BlockListProps {
  blocks: PromptBlock[];
  blockTemplates: BlockTemplate[];
  selectedFolderType: FolderType | null | undefined;
  draggingBlockId: string | null;
  dragOverBlockId: string | null;
  onAddBlock: (template?: BlockTemplate | null) => void;
  onBlockPointerDown: (event: ReactPointerEvent<HTMLElement>, blockId: string) => void;
  onBlockPointerEnter: (event: ReactPointerEvent<HTMLElement>, blockId: string) => void;
  onLabelChange: (blockId: string, value: string) => void;
  onContentChange: (blockId: string, value: string) => void;
  onToggleLock: (blockId: string) => void;
  onDuplicate: (blockId: string) => void;
  onRemove: (blockId: string) => void;
  onClearDragState: () => void;
}

export function BlockList({
  blocks,
  blockTemplates,
  selectedFolderType,
  draggingBlockId,
  dragOverBlockId,
  onAddBlock,
  onBlockPointerDown,
  onBlockPointerEnter,
  onLabelChange,
  onContentChange,
  onToggleLock,
  onDuplicate,
  onRemove,
  onClearDragState
}: BlockListProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  useEffect(() => {
    if (!selectedTemplateId) {
      return;
    }

    if (!blockTemplates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId("");
    }
  }, [blockTemplates, selectedTemplateId]);

  const selectedTemplate =
    blockTemplates.find((template) => template.id === selectedTemplateId) ?? null;
  const showFolderLock = Boolean(selectedFolderType);
  const lockLabel = selectedFolderType === "project" ? "锁定到当前项目" : "锁定到当前词库";

  return (
    <article className="rounded-[28px] border border-[#d8cfc5] bg-[#f8f3ed]/90 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Blocks</div>
          <p className="mt-2 text-sm text-[#8b8379]">
            按住整张卡片拖动即可调整顺序。
            {selectedFolderType ? " 锁定后的 Block 会自动同步到当前目录，并出现在后续新建资产里。" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {blockTemplates.length > 0 ? (
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className="rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-3 py-2.5 text-sm text-[#5e5851]"
            >
              <option value="">空白 Block</option>
              {blockTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={() => onAddBlock(selectedTemplate)}
            className="rounded-2xl bg-[#e2ddd5] px-4 py-2.5 text-sm font-medium text-[#5a544d] hover:bg-[#d6cec5]"
          >
            {selectedTemplate ? "使用模板新增" : "新增 Block"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {blocks.map((block, index) => (
          <BlockCard
            key={block.id}
            block={block}
            index={index}
            isDragging={draggingBlockId === block.id}
            isDragOver={dragOverBlockId === block.id}
            showProjectLock={showFolderLock}
            lockLabel={lockLabel}
            onBlockPointerDown={onBlockPointerDown}
            onBlockPointerEnter={onBlockPointerEnter}
            onLabelChange={onLabelChange}
            onContentChange={onContentChange}
            onToggleLock={onToggleLock}
            onDuplicate={onDuplicate}
            onRemove={onRemove}
            onClearDragState={onClearDragState}
          />
        ))}
      </div>
    </article>
  );
}
