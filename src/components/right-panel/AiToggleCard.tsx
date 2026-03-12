export interface AiToggleCardProps {
  aiPanelOpen: boolean;
  onToggleAiPanel: () => void;
}

export function AiToggleCard({ aiPanelOpen, onToggleAiPanel }: AiToggleCardProps) {
  return (
    <article className="rounded-[28px] border border-[#d8cfc5] bg-[#f8f3ed]/90 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">AI</div>
          <p className="mt-2 text-sm leading-6 text-[#8b8379]">
            统一打开 AI 改写、扩写、压缩和结果应用功能。
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={aiPanelOpen}
          aria-label={aiPanelOpen ? "收起 AI" : "打开 AI"}
          onClick={onToggleAiPanel}
          className={[
            "relative mt-1 h-10 w-[108px] overflow-hidden rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#b8c4bb]/70",
            aiPanelOpen
              ? "border-[#b8c4bb] bg-[#a8b7ad] shadow-[inset_0_1px_1px_rgba(120,137,126,0.14)]"
              : "border-[#d8cfc5] bg-[#ddd4cb]"
          ].join(" ")}
        >
          <span
            style={{ left: aiPanelOpen ? "calc(100% - 2.25rem)" : "0.25rem" }}
            className="absolute top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-[#fffdfa] shadow-[0_3px_10px_rgba(111,98,87,0.16)] transition-[left] duration-200"
          />
        </button>
      </div>
    </article>
  );
}
