import type { PromptAsset } from "../../types/storage";

export interface AssetContextMenuState {
  asset: PromptAsset;
  x: number;
  y: number;
}

export interface AssetContextMenuProps {
  menu: AssetContextMenuState | null;
  isTrashViewOpen: boolean;
  onClose: () => void;
  onDuplicateAsset: (asset: PromptAsset) => void;
  onMoveAssetToTrash: (asset: PromptAsset) => void;
  onRestoreAsset: (asset: PromptAsset) => void;
  onPermanentlyDeleteAsset: (asset: PromptAsset) => void;
}

export function AssetContextMenu({
  menu,
  isTrashViewOpen,
  onClose,
  onDuplicateAsset,
  onMoveAssetToTrash,
  onRestoreAsset,
  onPermanentlyDeleteAsset
}: AssetContextMenuProps) {
  if (!menu) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-50 min-w-[180px] rounded-2xl border border-[#d8cfc5] bg-[#fffaf5] p-2 shadow-[0_18px_50px_rgba(116,106,94,0.12)]"
        style={{ left: menu.x, top: menu.y }}
      >
        <button
          type="button"
          onClick={() => onDuplicateAsset(menu.asset)}
          disabled={isTrashViewOpen}
          className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#5f584f] hover:bg-[#f2ebe3] disabled:cursor-not-allowed disabled:opacity-50"
        >
          复制资产
        </button>
        {isTrashViewOpen ? (
          <>
            <button
              type="button"
              onClick={() => onRestoreAsset(menu.asset)}
              className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-[#74877d] hover:bg-[#e6eeea]"
            >
              恢复资产
            </button>
            <button
              type="button"
              onClick={() => onPermanentlyDeleteAsset(menu.asset)}
              className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-[#9b7769] hover:bg-[#efe2da]"
            >
              永久删除
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onMoveAssetToTrash(menu.asset)}
            className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-[#9b7769] hover:bg-[#efe2da]"
          >
            移入垃圾桶
          </button>
        )}
      </div>
    </>
  );
}
