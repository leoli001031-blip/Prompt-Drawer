import type { FolderRecord } from "../../types/storage";

export interface FolderContextMenuState {
  folder: FolderRecord;
  x: number;
  y: number;
  confirmDelete: boolean;
}

export interface FolderContextMenuProps {
  menu: FolderContextMenuState | null;
  onClose: () => void;
  onBeginRename: (folder: FolderRecord) => void;
  onToggleConfirmDelete: () => void;
  onDelete: (folder: FolderRecord) => void;
  onCopyStoragePath: () => void;
  onCopyWorkbenchJson: () => void;
  onDownloadWorkbenchJson: () => void;
}

export function FolderContextMenu({
  menu,
  onClose,
  onBeginRename,
  onToggleConfirmDelete,
  onDelete,
  onCopyStoragePath,
  onCopyWorkbenchJson,
  onDownloadWorkbenchJson
}: FolderContextMenuProps) {
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
        className="fixed z-50 min-w-[220px] rounded-2xl border border-[#d8cfc5] bg-[#fffaf5] p-2 shadow-[0_18px_50px_rgba(116,106,94,0.12)]"
        style={{ left: menu.x, top: menu.y }}
      >
        {menu.confirmDelete ? (
          <>
            <div className="px-3 py-2 text-xs leading-6 text-[#8b8379]">
              确认删除「{menu.folder.name}」及其下所有资产？
            </div>
            <button
              type="button"
              onClick={() => onDelete(menu.folder)}
              className="mt-1 w-full rounded-xl bg-[#efe2da] px-3 py-2 text-left text-sm text-[#9b7769] hover:bg-[#e8d9d0]"
            >
              确认删除
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-[#5f584f] hover:bg-[#f2ebe3]"
            >
              取消
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onBeginRename(menu.folder)}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#5f584f] hover:bg-[#f2ebe3]"
            >
              重命名
            </button>
            <button
              type="button"
              onClick={onToggleConfirmDelete}
              className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-[#9b7769] hover:bg-[#efe2da]"
            >
              删除目录
            </button>
            <div className="my-2 border-t border-[#e2d8ce]" />
            <button
              type="button"
              onClick={onCopyStoragePath}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#5f584f] hover:bg-[#f2ebe3]"
            >
              复制存储路径
            </button>
            <button
              type="button"
              onClick={onCopyWorkbenchJson}
              className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-[#5f584f] hover:bg-[#f2ebe3]"
            >
              复制全量 JSON
            </button>
            <button
              type="button"
              onClick={onDownloadWorkbenchJson}
              className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-[#5f584f] hover:bg-[#f2ebe3]"
            >
              下载全量 JSON
            </button>
          </>
        )}
      </div>
    </>
  );
}
