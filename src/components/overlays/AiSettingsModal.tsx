import type { AiProfileDraft, AiSettingsSnapshot } from "../../types/ai";

export interface AiSettingsModalProps {
  open: boolean;
  aiSettings: AiSettingsSnapshot;
  aiProfileDraft: AiProfileDraft;
  aiTesting: boolean;
  aiTestMessage: string;
  onClose: () => void;
  onBeginCreateProfile: () => void;
  onSelectProfile: (profileId: string) => void;
  onChangeDraft: (patch: Partial<AiProfileDraft>) => void;
  onTest: () => void;
  onSave: () => void;
  onDelete: () => void;
}

export function AiSettingsModal({
  open,
  aiSettings,
  aiProfileDraft,
  aiTesting,
  aiTestMessage,
  onClose,
  onBeginCreateProfile,
  onSelectProfile,
  onChangeDraft,
  onTest,
  onSave,
  onDelete
}: AiSettingsModalProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#5f584f]/18 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 top-8 z-50 mx-auto w-[min(920px,calc(100vw-40px))] rounded-[28px] border border-[#d8cfc5] bg-[#fffaf5] p-5 shadow-[0_24px_80px_rgba(116,106,94,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">AI Settings</div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#5b554e]">模型配置</h3>
            <p className="mt-2 text-sm leading-6 text-[#8b8379]">
              当前先支持 OpenAI-compatible 接口。你可以自定义 Base URL、API Key 和模型名称。
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

        <div className="mt-5 grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-3">
            <button
              type="button"
              onClick={onBeginCreateProfile}
              className="w-full rounded-2xl bg-[#e2ddd5] px-4 py-3 text-sm font-medium text-[#5a544d] hover:bg-[#d6cec5]"
            >
              新建模型配置
            </button>
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {aiSettings.profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => onSelectProfile(profile.id)}
                  className={[
                    "w-full rounded-2xl border px-3 py-3 text-left transition",
                    aiProfileDraft.id === profile.id
                      ? "border-[#adbbb0] bg-[#dde5df]"
                      : "border-[#ddd5cc] bg-[#f8f3ed] hover:border-[#cbc0b4] hover:bg-[#f1ebe3]"
                  ].join(" ")}
                >
                  <div className="truncate text-sm font-medium text-[#5b554e]">{profile.name}</div>
                  <div className="mt-1 truncate text-xs text-[#988f84]">{profile.model}</div>
                  {profile.is_default ? (
                    <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[#7d9187]">Default</div>
                  ) : null}
                </button>
              ))}
              {aiSettings.profiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d8cfc5] bg-[#fbf7f2] px-4 py-5 text-sm text-[#988f84]">
                  还没有 AI 模型配置。
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Profile Name</span>
                <input
                  value={aiProfileDraft.name}
                  onChange={(event) => onChangeDraft({ name: event.target.value })}
                  placeholder="例如：OpenAI 主力模型"
                  className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Model</span>
                <input
                  value={aiProfileDraft.model}
                  onChange={(event) => onChangeDraft({ model: event.target.value })}
                  placeholder="例如：gpt-4.1-mini"
                  className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Base URL</span>
              <input
                value={aiProfileDraft.base_url}
                onChange={(event) => onChangeDraft({ base_url: event.target.value })}
                placeholder="https://api.openai.com/v1"
                className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">API Key</span>
              <input
                type="password"
                value={aiProfileDraft.api_key}
                onChange={(event) => onChangeDraft({ api_key: event.target.value })}
                placeholder="sk-..."
                className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-[160px_160px_minmax(0,1fr)]">
              <label className="block">
                <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Temperature</span>
                <input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={aiProfileDraft.temperature}
                  onChange={(event) => onChangeDraft({ temperature: Number(event.target.value || 0) })}
                  className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Max Tokens</span>
                <input
                  value={aiProfileDraft.max_tokens}
                  onChange={(event) => onChangeDraft({ max_tokens: event.target.value })}
                  placeholder="留空使用模型默认值"
                  className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
                />
              </label>
              <label className="flex items-center gap-3 self-end rounded-2xl border border-[#d8cfc5] bg-[#f3ede6] px-4 py-3 text-sm text-[#6a645c]">
                <input
                  type="checkbox"
                  checked={aiProfileDraft.is_default}
                  onChange={(event) => onChangeDraft({ is_default: event.target.checked })}
                  className="h-4 w-4"
                />
                设为默认模型
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={onTest}
                disabled={aiTesting}
                className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-4 py-3 text-sm text-[#6a645c] hover:bg-[#efe8df] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aiTesting ? "测试中..." : "测试连接"}
              </button>
              <button
                type="button"
                onClick={onSave}
                className="rounded-2xl bg-[#a8b7ad] px-4 py-3 text-sm font-medium text-[#4e4943] hover:bg-[#97a79d]"
              >
                保存配置
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={!aiProfileDraft.id}
                className="rounded-2xl border border-[#d5b8aa] bg-[#efe2da] px-4 py-3 text-sm text-[#9b7769] hover:bg-[#e8d9d0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                删除配置
              </button>
            </div>

            <div className="rounded-2xl border border-dashed border-[#d8cfc5] bg-[#fbf7f2] px-4 py-3 text-sm text-[#8f867b]">
              {aiTestMessage || "建议先测试连接，再在编辑页里使用 AI 助手。"}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
