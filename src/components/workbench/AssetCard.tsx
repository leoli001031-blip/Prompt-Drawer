import type { KeyboardEvent, MouseEvent } from "react";
import { formatTime } from "../../utils/format";
import type { FolderType, PromptAsset } from "../../types/storage";

export interface AssetCardProps {
  asset: PromptAsset;
  selectedFolderType: FolderType | null | undefined;
  isTrashViewOpen: boolean;
  onOpenAsset: (assetId: string) => void;
  onOpenAssetContextMenu: (event: MouseEvent, asset: PromptAsset) => void;
  onToggleFavorite: (asset: PromptAsset) => void;
}

export function AssetCard({
  asset,
  selectedFolderType,
  isTrashViewOpen,
  onOpenAsset,
  onOpenAssetContextMenu,
  onToggleFavorite
}: AssetCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenAsset(asset.id);
    }
  };

  return (
    <article
      onClick={() => onOpenAsset(asset.id)}
      onContextMenu={(event) => onOpenAssetContextMenu(event, asset)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={[
        "group flex h-[106px] items-stretch gap-4 rounded-[28px] border border-[#d8cfc5] bg-gradient-to-r from-[#fbf7f2] to-[#f1ebe3] px-4 py-3 text-left transition hover:border-[#afbbb0] hover:bg-[#f6f0e9]",
        "focus:outline-none focus:ring-2 focus:ring-[#b8c4bb]"
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">
                {isTrashViewOpen
                  ? "Trashed Asset"
                  : selectedFolderType === "project"
                    ? "Storyboard Asset"
                    : "Prompt Asset"}
              </p>
              <h3 className="mt-1 truncate text-xl font-semibold text-[#5b554e]">{asset.title}</h3>
            </div>
            {isTrashViewOpen ? (
              <span className="shrink-0 rounded-full border border-[#d5b8aa] bg-[#efe2da] px-2.5 py-1 text-[11px] text-[#9b7769]">
                已删除
              </span>
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleFavorite(asset);
                }}
                className={[
                  "shrink-0 rounded-full border px-2.5 py-1 text-[11px]",
                  asset.is_favorite
                    ? "border-[#d8c4b5] bg-[#efe4db] text-[#9a7e6e]"
                    : "border-[#d8cfc5] bg-[#f7f1ea] text-[#8b8379]"
                ].join(" ")}
              >
                {asset.is_favorite ? "已收藏" : "收藏"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 overflow-hidden">
          {(asset.payload.tags.length > 0 ? asset.payload.tags : ["未设置标签"]).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="truncate rounded-full border border-[#d8cfc5] bg-[#f6efe7] px-2.5 py-1 text-xs text-[#746d65]"
            >
              {tag === "未设置标签" ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      </div>

      <div className="grid w-[320px] shrink-0 grid-cols-2 gap-3">
        <div className="flex h-full flex-col justify-center rounded-2xl bg-[#efe8e1] px-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Blocks</div>
          <div className="mt-2 text-2xl font-semibold text-[#5b554e]">{asset.payload.blocks.length}</div>
        </div>
        <div className="flex h-full flex-col justify-center rounded-2xl bg-[#efe8e1] px-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">
            {isTrashViewOpen ? "Deleted" : selectedFolderType === "project" ? "Shot" : "Updated"}
          </div>
          <div className="mt-2 text-sm font-medium text-[#6d665e]">
            {isTrashViewOpen
              ? formatTime(asset.deleted_at ?? asset.updated_at)
              : selectedFolderType === "project"
              ? `#${String(asset.payload.storyboard?.shot_number ?? 1).padStart(2, "0")}`
              : formatTime(asset.updated_at)}
          </div>
          {!isTrashViewOpen && selectedFolderType === "project" && asset.payload.storyboard?.duration_seconds ? (
            <div className="mt-1 text-xs text-[#988f84]">{asset.payload.storyboard.duration_seconds} 秒</div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
