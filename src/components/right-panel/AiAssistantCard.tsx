import type { AiProviderProfile, AiTaskType } from "../../types/ai";
import type { PromptBlock } from "../../types/prompt";

export interface AiAssistantCardProps {
  onOpenAiSettings: () => void;
  activeAiProfile: AiProviderProfile | null;
  selectedAiProfileId: string | null;
  aiProfiles: AiProviderProfile[];
  aiTaskType: AiTaskType;
  onSelectAiProfile: (value: string) => void;
  onSelectAiTaskType: (value: AiTaskType) => void;
  blocks: PromptBlock[];
  aiTargetBlockId: string | null;
  onSelectAiTargetBlock: (value: string) => void;
  aiInstruction: string;
  onChangeAiInstruction: (value: string) => void;
  aiRunning: boolean;
  onRunAi: () => void;
  aiRunMessage: string;
}

export function AiAssistantCard({
  onOpenAiSettings,
  activeAiProfile,
  selectedAiProfileId,
  aiProfiles,
  aiTaskType,
  onSelectAiProfile,
  onSelectAiTaskType,
  blocks,
  aiTargetBlockId,
  onSelectAiTargetBlock,
  aiInstruction,
  onChangeAiInstruction,
  aiRunning,
  onRunAi,
  aiRunMessage
}: AiAssistantCardProps) {
  return (
    <article className="rounded-[28px] border border-[#d8cfc5] bg-[#f8f3ed]/90 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">AI Assistant</div>
          <p className="mt-2 text-sm leading-6 text-[#8b8379]">
            先预览结果，再决定替换当前 Block 或追加成新 Block。
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAiSettings}
          className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-3 py-2 text-sm text-[#6a645c] hover:bg-[#efe8df]"
        >
          配置
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Model</span>
          <select
            value={selectedAiProfileId ?? activeAiProfile?.id ?? ""}
            onChange={(event) => onSelectAiProfile(event.target.value)}
            className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
          >
            {aiProfiles.length > 0 ? (
              aiProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} · {profile.model}
                </option>
              ))
            ) : (
              <option value="">请先配置模型</option>
            )}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Task</span>
          <select
            value={aiTaskType}
            onChange={(event) => onSelectAiTaskType(event.target.value as AiTaskType)}
            className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
          >
            <option value="generate_from_asset">生成完整提示词</option>
            <option value="rewrite_block">改写当前 Block</option>
            <option value="expand_block">扩写当前 Block</option>
            <option value="compress_block">压缩当前 Block</option>
          </select>
        </label>

        {aiTaskType !== "generate_from_asset" ? (
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Target Block</span>
            <select
              value={aiTargetBlockId ?? ""}
              onChange={(event) => onSelectAiTargetBlock(event.target.value)}
              className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
            >
              {blocks.map((block, index) => (
                <option key={block.id} value={block.id}>
                  {index + 1}. {(block.label ?? "").trim() || "未命名 Block"}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Instruction</span>
          <textarea
            rows={4}
            value={aiInstruction}
            onChange={(event) => onChangeAiInstruction(event.target.value)}
            placeholder="例如：更电影感、更适合 Midjourney、保持中文、增强光影层次"
            className="w-full rounded-3xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-4 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
          />
        </label>

        <button
          type="button"
          onClick={onRunAi}
          disabled={aiRunning || !activeAiProfile}
          className="rounded-2xl bg-[#a8b7ad] px-4 py-3 text-sm font-medium text-[#4e4943] hover:bg-[#97a79d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {aiRunning ? "AI 生成中..." : "运行 AI"}
        </button>

        <div className="rounded-2xl border border-[#d8cfc5] bg-[#fbf7f2] px-4 py-3 text-sm text-[#8f867b]">
          {aiRunMessage || (activeAiProfile ? "选择动作后即可调用当前模型。" : "请先在 AI 配置里添加模型。")}
        </div>
      </div>
    </article>
  );
}
