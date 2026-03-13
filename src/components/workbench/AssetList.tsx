import type { MouseEvent } from "react";
import type { FolderType, PromptAsset } from "../../types/storage";
import { AssetCard } from "./AssetCard";

export interface AssetListProps {
  visibleAssets: PromptAsset[];
  folderAssets: PromptAsset[];
  selectedFolderType: FolderType | null | undefined;
  isTrashViewOpen: boolean;
  onOpenAsset: (assetId: string) => void;
  onOpenAssetContextMenu: (event: MouseEvent, asset: PromptAsset) => void;
  onToggleFavorite: (asset: PromptAsset) => void;
}

export function AssetList({
  visibleAssets,
  folderAssets,
  selectedFolderType,
  isTrashViewOpen,
  onOpenAsset,
  onOpenAssetContextMenu,
  onToggleFavorite
}: AssetListProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-3">
        {visibleAssets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            selectedFolderType={selectedFolderType}
            isTrashViewOpen={isTrashViewOpen}
            onOpenAsset={onOpenAsset}
            onOpenAssetContextMenu={onOpenAssetContextMenu}
            onToggleFavorite={onToggleFavorite}
          />
        ))}

        {visibleAssets.length === 0 ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-[28px] border border-dashed border-[#d8cfc5] bg-[#f7f1ea] px-8 text-center text-sm leading-7 text-[#988f84]">
            {isTrashViewOpen
              ? folderAssets.length === 0
                ? "当前目录的垃圾桶还是空的。"
                : "当前筛选条件下没有匹配的已删除资产。"
              : folderAssets.length === 0
                ? "当前目录下还没有 Prompt Asset，先在上方创建一条。"
                : "当前筛选条件下没有匹配资产，试试清空关键词或关闭收藏过滤。"}
          </div>
        ) : null}
      </div>
    </div>
  );
}
