import type { PromptAsset } from "../../types/storage";

export interface AssetContextMenuState {
  asset: PromptAsset;
  x: number;
  y: number;
}

export interface AssetContextMenuProps {
  menu: AssetContextMenuState | null;
  onClose: () => void;
  onDuplicateAsset: (asset: PromptAsset) => void;
  onDeleteAsset: (asset: PromptAsset) => void;
}

export function AssetContextMenu({
  menu,
  onClose,
  onDuplicateAsset,
  onDeleteAsset
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
          className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#5f584f] hover:bg-[#f2ebe3]"
        >
          复制资产
        </button>
        <button
          type="button"
          onClick={() => onDeleteAsset(menu.asset)}
          className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-[#9b7769] hover:bg-[#efe2da]"
        >
          直接删除
        </button>
      </div>
    </>
  );
}
