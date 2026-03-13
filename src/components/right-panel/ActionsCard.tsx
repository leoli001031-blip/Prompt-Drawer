import type { FolderRecord } from "../../types/storage";

export interface ActionsCardProps {
  isTrashViewOpen: boolean;
  isManualSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndoDraft: () => void;
  onRedoDraft: () => void;
  onSaveAsset: () => void;
  onDuplicateCurrentAsset: () => void;
  copyTargetFolderId: string | null;
  onChangeCopyTargetFolderId: (value: string) => void;
  folders: FolderRecord[];
  confirmPermanentDelete: boolean;
  onMoveAssetToTrash: () => void;
  onRestoreAsset: () => void;
  onPermanentlyDeleteAsset: () => void;
}

export function ActionsCard({
  isTrashViewOpen,
  isManualSaving,
  canUndo,
  canRedo,
  onUndoDraft,
  onRedoDraft,
  onSaveAsset,
  onDuplicateCurrentAsset,
  copyTargetFolderId,
  onChangeCopyTargetFolderId,
  folders,
  confirmPermanentDelete,
  onMoveAssetToTrash,
  onRestoreAsset,
  onPermanentlyDeleteAsset
}: ActionsCardProps) {
  return (
    <article className="rounded-[28px] border border-[#d8cfc5] bg-[#f8f3ed]/90 p-5">
      <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Actions</div>
      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onUndoDraft}
            disabled={!canUndo}
            className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-4 py-3 text-sm text-[#6a645c] hover:bg-[#efe8df] disabled:cursor-not-allowed disabled:opacity-50"
          >
            撤销
          </button>
          <button
            type="button"
            onClick={onRedoDraft}
            disabled={!canRedo}
            className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-4 py-3 text-sm text-[#6a645c] hover:bg-[#efe8df] disabled:cursor-not-allowed disabled:opacity-50"
          >
            重做
          </button>
        </div>
        <button
          type="button"
          onClick={onSaveAsset}
          disabled={isManualSaving}
          className="rounded-2xl bg-[#e2ddd5] px-4 py-3 text-sm font-medium text-[#5a544d] hover:bg-[#d6cec5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isManualSaving ? "保存中..." : "立即保存"}
        </button>
        <button
          type="button"
          onClick={onDuplicateCurrentAsset}
          disabled={!copyTargetFolderId}
          className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-4 py-3 text-sm text-[#6a645c] hover:bg-[#efe8df] disabled:cursor-not-allowed disabled:opacity-50"
        >
          复制资产
        </button>
        <button
          type="button"
          onClick={isTrashViewOpen ? onRestoreAsset : onMoveAssetToTrash}
          className="rounded-2xl border border-[#bfd0c7] bg-[#e6eeea] px-4 py-3 text-sm text-[#74877d] hover:bg-[#dce7e1]"
        >
          {isTrashViewOpen ? "恢复资产" : "移入垃圾桶"}
        </button>
        {isTrashViewOpen ? (
          <button
            type="button"
            onClick={onPermanentlyDeleteAsset}
            className="rounded-2xl border border-[#d5b8aa] bg-[#efe2da] px-4 py-3 text-sm text-[#9b7769] hover:bg-[#e8d9d0]"
          >
            {confirmPermanentDelete ? "确认永久删除" : "永久删除"}
          </button>
        ) : null}
      </div>
      <label className="mt-3 block">
        <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">复制到目录</span>
        <select
          value={copyTargetFolderId ?? ""}
          onChange={(event) => onChangeCopyTargetFolderId(event.target.value)}
          className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
        >
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-3 text-xs text-[#988f84]">
        {isTrashViewOpen ? "垃圾桶中的资产可恢复，也可以永久删除。" : "自动保存已开启，编辑停止约 0.9 秒后会自动落库。"}
      </div>
    </article>
  );
}
