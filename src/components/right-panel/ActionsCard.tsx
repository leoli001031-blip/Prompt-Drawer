import type { FolderRecord } from "../../types/storage";

export interface ActionsCardProps {
  isManualSaving: boolean;
  onSaveAsset: () => void;
  onDuplicateCurrentAsset: () => void;
  copyTargetFolderId: string | null;
  onChangeCopyTargetFolderId: (value: string) => void;
  folders: FolderRecord[];
  confirmAssetDelete: boolean;
  onDeleteAsset: () => void;
}

export function ActionsCard({
  isManualSaving,
  onSaveAsset,
  onDuplicateCurrentAsset,
  copyTargetFolderId,
  onChangeCopyTargetFolderId,
  folders,
  confirmAssetDelete,
  onDeleteAsset
}: ActionsCardProps) {
  return (
    <article className="rounded-[28px] border border-[#d8cfc5] bg-[#f8f3ed]/90 p-5">
      <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Actions</div>
      <div className="mt-4 grid gap-3">
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
          onClick={onDeleteAsset}
          className="rounded-2xl border border-[#d5b8aa] bg-[#efe2da] px-4 py-3 text-sm text-[#9b7769] hover:bg-[#e8d9d0]"
        >
          {confirmAssetDelete ? "确认删除" : "删除资产"}
        </button>
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
      <div className="mt-3 text-xs text-[#988f84]">自动保存已开启，编辑停止约 0.9 秒后会自动落库。</div>
    </article>
  );
}
