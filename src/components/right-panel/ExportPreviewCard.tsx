export interface ExportPreviewCardProps {
  exportPreview: string;
  copyFeedback: string;
  onCopyExport: () => void;
}

export function ExportPreviewCard({
  exportPreview,
  copyFeedback,
  onCopyExport
}: ExportPreviewCardProps) {
  return (
    <article className="rounded-[28px] border border-[#d8cfc5] bg-[#efe8e1] p-5">
      <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Export Preview</div>
      <pre className="mt-4 max-h-[280px] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7 text-[#655f58]">
        {exportPreview || "当前没有可导出的内容。"}
      </pre>
      <button
        type="button"
        onClick={onCopyExport}
        className="mt-4 w-full rounded-2xl bg-[#a8b7ad] px-4 py-3 text-sm font-medium text-[#4e4943] hover:bg-[#97a79d]"
      >
        复制导出结果
      </button>
      <div className="mt-2 text-xs text-[#988f84]">{copyFeedback || "复制到剪贴板"}</div>
    </article>
  );
}
