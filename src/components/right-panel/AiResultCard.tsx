import type { AiTaskResult, AiTaskType } from "../../types/ai";

export interface AiResultCardProps {
  aiResult: AiTaskResult | null;
  aiTaskType: AiTaskType;
  aiTargetBlockId: string | null;
  onApplyAiToTargetBlock: () => void;
  onAppendAiAsBlock: () => void;
  onCopyAiResult: () => void;
}

export function AiResultCard({
  aiResult,
  aiTaskType,
  aiTargetBlockId,
  onApplyAiToTargetBlock,
  onAppendAiAsBlock,
  onCopyAiResult
}: AiResultCardProps) {
  return (
    <article className="rounded-[28px] border border-[#d8cfc5] bg-[#efe8e1] p-5">
      <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">AI Result</div>
      <pre className="mt-4 max-h-[280px] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7 text-[#655f58]">
        {aiResult?.text || "AI 返回的结果会显示在这里。"}
      </pre>
      <div className="mt-4 grid gap-3">
        <button
          type="button"
          onClick={onApplyAiToTargetBlock}
          disabled={!aiResult?.text || (aiTaskType !== "generate_from_asset" && !aiTargetBlockId)}
          className="rounded-2xl bg-[#e2ddd5] px-4 py-3 text-sm font-medium text-[#5a544d] hover:bg-[#d6cec5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          应用到当前 Block
        </button>
        <button
          type="button"
          onClick={onAppendAiAsBlock}
          disabled={!aiResult?.text}
          className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-4 py-3 text-sm text-[#6a645c] hover:bg-[#efe8df] disabled:cursor-not-allowed disabled:opacity-50"
        >
          追加为新 Block
        </button>
        <button
          type="button"
          onClick={onCopyAiResult}
          disabled={!aiResult?.text}
          className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-4 py-3 text-sm text-[#6a645c] hover:bg-[#efe8df] disabled:cursor-not-allowed disabled:opacity-50"
        >
          复制 AI 结果
        </button>
      </div>
      {aiResult?.usage ? (
        <div className="mt-3 text-xs text-[#988f84]">
          Tokens：{aiResult.usage.total_tokens ?? "--"} / 模型：{aiResult.raw_model ?? "--"}
        </div>
      ) : null}
    </article>
  );
}
