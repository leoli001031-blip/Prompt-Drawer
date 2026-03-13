import { formatFolderType } from "../../utils/format";
import type { FolderRecord, StorageDescriptor } from "../../types/storage";
import type { AssetTemplate } from "../../types/settings";

export interface CurrentFolderOverviewProps {
  selectedFolder: FolderRecord | null;
  trashViewOpen: boolean;
  visibleAssetCount: number;
  folderAssetCount: number;
  favoriteCount: number;
  projectDuration: number;
  searchQuery: string;
  favoritesOnly: boolean;
  storageDescriptor: StorageDescriptor | null;
  assetTemplates: AssetTemplate[];
  selectedAssetTemplateId: string;
  onChangeSelectedAssetTemplateId: (value: string) => void;
  onRenameFolder: () => void;
  onCopyProjectScript: () => void;
  onOpenImport: () => void;
  onCreateAsset: () => void;
}

export function CurrentFolderOverview({
  selectedFolder,
  trashViewOpen,
  visibleAssetCount,
  folderAssetCount,
  favoriteCount,
  projectDuration,
  searchQuery,
  favoritesOnly,
  storageDescriptor,
  assetTemplates,
  selectedAssetTemplateId,
  onChangeSelectedAssetTemplateId,
  onRenameFolder,
  onCopyProjectScript,
  onOpenImport,
  onCreateAsset
}: CurrentFolderOverviewProps) {
  return (
    <header className="shrink-0">
      <section className="rounded-[28px] border border-[#d8cfc5] bg-[#f8f3ed]/90 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#9a9085]">Current Folder</p>
            <button
              type="button"
              onClick={onRenameFolder}
              className="mt-2 text-left text-3xl font-semibold tracking-tight text-[#5a544d]"
            >
              {selectedFolder?.name ? `${selectedFolder.name}${trashViewOpen ? " · 垃圾桶" : ""}` : "未选择目录"}
            </button>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8b8379]">
              {trashViewOpen
                ? "这里显示当前目录中已移入垃圾桶的资产。你可以打开查看、恢复，或彻底删除。"
                : "点击下方 Prompt Asset 后，会在当前列表区域直接展开编辑器，不再从右侧抽屉滑出。"}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            {!trashViewOpen && selectedFolder?.type === "project" ? (
              <button
                type="button"
                onClick={onCopyProjectScript}
                className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-4 py-3 text-sm text-[#6a645c] hover:bg-[#efe8df]"
              >
                复制项目脚本
              </button>
            ) : null}
            {!trashViewOpen ? (
              <>
                <button
                  type="button"
                  onClick={onOpenImport}
                  disabled={!selectedFolder}
                  className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-4 py-3 text-sm text-[#6a645c] hover:bg-[#efe8df] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  导入资产
                </button>
                {selectedFolder?.type === "library" && assetTemplates.length > 0 ? (
                  <label className="flex flex-col gap-1 rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-3 py-2">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#9a9085]">
                      默认模板
                    </span>
                    <select
                      value={selectedAssetTemplateId}
                      onChange={(event) => onChangeSelectedAssetTemplateId(event.target.value)}
                      className="bg-transparent text-sm text-[#6a645c] outline-none"
                    >
                      <option value="">空白资产</option>
                      {assetTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <button
                  type="button"
                  onClick={onCreateAsset}
                  disabled={!selectedFolder}
                  className="rounded-2xl bg-[#a8b7ad] px-4 py-3 text-sm font-medium text-[#4e4943] hover:bg-[#97a79d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  新建资产
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-[#efe8e1] p-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#9a9085]">Type</div>
            <div className="mt-3 text-lg font-semibold text-[#5b554e]">
              {selectedFolder ? formatFolderType(selectedFolder.type) : "--"}
            </div>
          </div>
          <div className="rounded-2xl bg-[#efe8e1] p-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#9a9085]">Assets</div>
            <div className="mt-3 text-lg font-semibold text-[#5b554e]">{folderAssetCount}</div>
          </div>
          <div className="rounded-2xl bg-[#efe8e1] p-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#9a9085]">
              {trashViewOpen ? "Visible" : "Favorites"}
            </div>
            <div className="mt-3 text-lg font-semibold text-[#5b554e]">{favoriteCount}</div>
          </div>
          <div className="rounded-2xl bg-[#efe8e1] p-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#9a9085]">Storage</div>
            <div className="mt-3 text-lg font-semibold text-[#5b554e]">
              {storageDescriptor?.mode === "sqlite" ? "SQLite" : "localStorage"}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#8b8379]">
          <span className="rounded-full border border-[#d8cfc5] bg-[#f3ede6] px-3 py-1.5">
            {trashViewOpen ? "垃圾桶显示" : "当前显示"} {visibleAssetCount} / {folderAssetCount}
          </span>
          {!trashViewOpen && selectedFolder?.type === "project" ? (
            <span className="rounded-full border border-[#bfd0c7] bg-[#e6eeea] px-3 py-1.5 text-[#74877d]">
              总时长 {projectDuration} 秒
            </span>
          ) : null}
          {searchQuery ? (
            <span className="rounded-full border border-[#bfd0c7] bg-[#e6eeea] px-3 py-1.5 text-[#74877d]">
              关键词: {searchQuery}
            </span>
          ) : null}
          {favoritesOnly ? (
            <span className="rounded-full border border-[#d8c4b5] bg-[#efe4db] px-3 py-1.5 text-[#9a7e6e]">
              已启用收藏过滤
            </span>
          ) : null}
        </div>
      </section>
    </header>
  );
}
