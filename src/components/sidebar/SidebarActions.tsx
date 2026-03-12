export interface SidebarActionsProps {
  onCreateLibrary: () => void;
  onOpenAiSettings: () => void;
}

export function SidebarActions({ onCreateLibrary, onOpenAiSettings }: SidebarActionsProps) {
  return (
    <div className="border-b border-[#d8cfc5] p-3">
      <div className="grid gap-2">
        <button
          type="button"
          onClick={onCreateLibrary}
          className="rounded-2xl bg-[#a8b7ad] px-5 py-2 text-sm font-medium text-[#4e4943] hover:bg-[#97a79d]"
        >
          新建提示词库
        </button>
        <button
          type="button"
          onClick={onOpenAiSettings}
          className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-5 py-2 text-sm text-[#6a645c] hover:bg-[#efe8df]"
        >
          AI 配置
        </button>
      </div>
    </div>
  );
}
