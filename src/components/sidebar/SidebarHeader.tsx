export function SidebarHeader() {
  return (
    <div className="border-b border-[#d8cfc5] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[#8ca29a]">AI Prompt Workbench</p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight text-[#5a544d]">本地提示词工作台</h1>
      <p className="mt-2 text-sm leading-6 text-[#8b8379]">
        左侧切目录，主区浏览与内联编辑，数据直接落在 SQLite 两表结构中。
      </p>
    </div>
  );
}
