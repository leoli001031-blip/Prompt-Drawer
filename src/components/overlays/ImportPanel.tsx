export interface ImportPanelProps {
  open: boolean;
  selectedFolderName: string;
  importTitle: string;
  importRaw: string;
  onClose: () => void;
  onChangeImportTitle: (value: string) => void;
  onChangeImportRaw: (value: string) => void;
  onImport: () => void;
}

export function ImportPanel({
  open,
  selectedFolderName,
  importTitle,
  importRaw,
  onClose,
  onChangeImportTitle,
  onChangeImportRaw,
  onImport
}: ImportPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#5f584f]/18 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 top-10 z-50 mx-auto w-[min(720px,calc(100vw-40px))] rounded-[28px] border border-[#d8cfc5] bg-[#fffaf5] p-5 shadow-[0_24px_80px_rgba(116,106,94,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Import Assets</div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#5b554e]">导入 / 迁移资产</h3>
            <p className="mt-2 text-sm leading-6 text-[#8b8379]">
              支持粘贴 JSON 快照、单条 payload JSON、Markdown 或普通纯文本。导入目标：{selectedFolderName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-3 py-2 text-sm text-[#6a645c] hover:bg-[#efe8df]"
          >
            关闭
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Asset Title</span>
            <input
              value={importTitle}
              onChange={(event) => onChangeImportTitle(event.target.value)}
              placeholder="单条导入时可覆盖标题；批量导入时忽略"
              className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Raw Content</span>
            <textarea
              rows={12}
              value={importRaw}
              onChange={(event) => onChangeImportRaw(event.target.value)}
              placeholder="把 JSON、Markdown 或纯文本粘贴到这里"
              className="w-full rounded-3xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-4 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-4 py-3 text-sm text-[#6a645c] hover:bg-[#efe8df]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onImport}
            className="rounded-2xl bg-[#a8b7ad] px-4 py-3 text-sm font-medium text-[#4e4943] hover:bg-[#97a79d]"
          >
            开始导入
          </button>
        </div>
      </div>
    </>
  );
}
