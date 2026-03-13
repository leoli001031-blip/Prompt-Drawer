import { useEffect, useState } from "react";
import { createEmptyAssetTemplateBlock } from "../../lib/settings";
import type { AiProfileDraft, AiSettingsSnapshot } from "../../types/ai";
import type {
  AssetTemplateBlock,
  AssetTemplateDraft,
  BlockTemplateDraft,
  WorkbenchSettingsSnapshot
} from "../../types/settings";

type SettingsSection = "ai" | "block";

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
  workbenchSettings: WorkbenchSettingsSnapshot;
  selectedTemplateId: string | null;
  blockTemplateDraft: BlockTemplateDraft;
  onBeginCreateBlockTemplate: () => void;
  onSelectBlockTemplate: (templateId: string) => void;
  onChangeBlockTemplateDraft: (patch: Partial<BlockTemplateDraft>) => void;
  onSaveBlockTemplate: () => void;
  onDeleteBlockTemplate: () => void;
  selectedAssetTemplateId: string | null;
  assetTemplateDraft: AssetTemplateDraft;
  onBeginCreateAssetTemplate: () => void;
  onSelectAssetTemplate: (templateId: string) => void;
  onChangeAssetTemplateDraft: (patch: Partial<AssetTemplateDraft>) => void;
  onSaveAssetTemplate: () => void;
  onDeleteAssetTemplate: () => void;
}

function SectionButton({
  active,
  title,
  description,
  onClick
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-2xl border px-4 py-3 text-left transition",
        active
          ? "border-[#adbbb0] bg-[#dde5df] shadow-[0_0_0_1px_rgba(168,183,173,0.28)]"
          : "border-[#ddd5cc] bg-[#f8f3ed] hover:border-[#cbc0b4] hover:bg-[#f1ebe3]"
      ].join(" ")}
    >
      <div className="text-sm font-medium text-[#5b554e]">{title}</div>
      <div className="mt-1 text-xs leading-5 text-[#988f84]">{description}</div>
    </button>
  );
}

interface AiSettingsSectionProps {
  aiSettings: AiSettingsSnapshot;
  aiProfileDraft: AiProfileDraft;
  aiTesting: boolean;
  aiTestMessage: string;
  onBeginCreateProfile: () => void;
  onSelectProfile: (profileId: string) => void;
  onChangeDraft: (patch: Partial<AiProfileDraft>) => void;
  onTest: () => void;
  onSave: () => void;
  onDelete: () => void;
}

function AiSettingsSection({
  aiSettings,
  aiProfileDraft,
  aiTesting,
  aiTestMessage,
  onBeginCreateProfile,
  onSelectProfile,
  onChangeDraft,
  onTest,
  onSave,
  onDelete
}: AiSettingsSectionProps) {
  return (
    <section className="rounded-[24px] border border-[#ddd5cc] bg-[#fcf8f4] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">AI Profiles</div>
          <p className="mt-2 text-sm leading-6 text-[#8b8379]">
            当前支持 OpenAI-compatible 接口，可自定义 Base URL、API Key 和模型名称。
          </p>
        </div>
        <button
          type="button"
          onClick={onBeginCreateProfile}
          className="rounded-2xl bg-[#e2ddd5] px-4 py-3 text-sm font-medium text-[#5a544d] hover:bg-[#d6cec5]"
        >
          新建模型
        </button>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
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
    </section>
  );
}

function BlockTemplateSection({
  workbenchSettings,
  selectedTemplateId,
  blockTemplateDraft,
  onBeginCreateBlockTemplate,
  onSelectBlockTemplate,
  onChangeBlockTemplateDraft,
  onSaveBlockTemplate,
  onDeleteBlockTemplate,
  selectedAssetTemplateId,
  assetTemplateDraft,
  onBeginCreateAssetTemplate,
  onSelectAssetTemplate,
  onChangeAssetTemplateDraft,
  onSaveAssetTemplate,
  onDeleteAssetTemplate
}: Pick<
  AiSettingsModalProps,
  | "workbenchSettings"
  | "selectedTemplateId"
  | "blockTemplateDraft"
  | "onBeginCreateBlockTemplate"
  | "onSelectBlockTemplate"
  | "onChangeBlockTemplateDraft"
  | "onSaveBlockTemplate"
  | "onDeleteBlockTemplate"
  | "selectedAssetTemplateId"
  | "assetTemplateDraft"
  | "onBeginCreateAssetTemplate"
  | "onSelectAssetTemplate"
  | "onChangeAssetTemplateDraft"
  | "onSaveAssetTemplate"
  | "onDeleteAssetTemplate"
>) {
  function updateAssetTemplateBlock(index: number, patch: Partial<AssetTemplateBlock>): void {
    onChangeAssetTemplateDraft({
      blocks: assetTemplateDraft.blocks.map((block, blockIndex) =>
        blockIndex === index ? { ...block, ...patch } : block
      )
    });
  }

  function addAssetTemplateBlock(): void {
    onChangeAssetTemplateDraft({
      blocks: [...assetTemplateDraft.blocks, createEmptyAssetTemplateBlock()]
    });
  }

  function removeAssetTemplateBlock(index: number): void {
    const nextBlocks = assetTemplateDraft.blocks.filter((_, blockIndex) => blockIndex !== index);
    onChangeAssetTemplateDraft({
      blocks: nextBlocks.length > 0 ? nextBlocks : [createEmptyAssetTemplateBlock()]
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-[#ddd5cc] bg-[#fcf8f4] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Prompt Templates</div>
            <p className="mt-2 text-sm leading-6 text-[#8b8379]">
              直接配置模板里有几个 Block、每个 Block 的种类和默认内容。后续新建提示词资产时会按这套结构自动生成。
            </p>
          </div>
          <button
            type="button"
            onClick={onBeginCreateAssetTemplate}
            className="rounded-2xl bg-[#e2ddd5] px-4 py-3 text-sm font-medium text-[#5a544d] hover:bg-[#d6cec5]"
          >
            新建提示词模板
          </button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {workbenchSettings.asset_templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelectAssetTemplate(template.id)}
                className={[
                  "w-full rounded-2xl border px-3 py-3 text-left transition",
                  selectedAssetTemplateId === template.id
                    ? "border-[#adbbb0] bg-[#dde5df]"
                    : "border-[#ddd5cc] bg-[#f8f3ed] hover:border-[#cbc0b4] hover:bg-[#f1ebe3]"
                ].join(" ")}
              >
                <div className="truncate text-sm font-medium text-[#5b554e]">{template.name}</div>
                <div className="mt-1 truncate text-xs text-[#988f84]">
                  {template.blocks.length} 条 Block
                </div>
              </button>
            ))}
            {workbenchSettings.asset_templates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d8cfc5] bg-[#fbf7f2] px-4 py-5 text-sm text-[#988f84]">
                还没有提示词模板。
              </div>
            ) : null}
          </div>

          <div className="grid gap-4">
            <label className="block">
              <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Template Name</span>
              <input
                value={assetTemplateDraft.name}
                onChange={(event) => onChangeAssetTemplateDraft({ name: event.target.value })}
                placeholder="例如：短视频三段式结构"
                className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
              />
            </label>

            <div className="rounded-[24px] border border-[#ddd5cc] bg-[#f8f3ed] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Template Blocks</div>
                  <div className="mt-1 text-sm text-[#8b8379]">
                    当前模板包含 {assetTemplateDraft.blocks.length} 个 Block。
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addAssetTemplateBlock}
                  className="rounded-2xl bg-[#e2ddd5] px-4 py-2.5 text-sm font-medium text-[#5a544d] hover:bg-[#d6cec5]"
                >
                  新增 Block
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {assetTemplateDraft.blocks.map((block, index) => (
                  <div
                    key={`${assetTemplateDraft.id ?? "draft"}-${index}`}
                    className="rounded-3xl border border-[#d8cfc5] bg-[#fcf8f4] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-[#5b554e]">Block {index + 1}</div>
                      <button
                        type="button"
                        onClick={() => removeAssetTemplateBlock(index)}
                        className="rounded-full border border-[#d5b8aa] bg-[#efe2da] px-3 py-1.5 text-xs text-[#9b7769] hover:bg-[#e8d9d0]"
                      >
                        删除
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                      <label className="block">
                        <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Block Type</span>
                        <select
                          value={block.type}
                          onChange={(event) =>
                            updateAssetTemplateBlock(index, {
                              type: event.target.value as AssetTemplateBlock["type"]
                            })
                          }
                          className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
                        >
                          <option value="character">角色</option>
                          <option value="camera">镜头</option>
                          <option value="style">风格</option>
                          <option value="format">格式</option>
                          <option value="custom">自定义</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Block Label</span>
                        <input
                          value={block.label}
                          onChange={(event) =>
                            updateAssetTemplateBlock(index, { label: event.target.value })
                          }
                          placeholder="例如：主体 / 场景 / 风格"
                          className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
                        />
                      </label>
                    </div>

                    <label className="mt-3 block">
                      <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Default Content</span>
                      <textarea
                        rows={4}
                        value={block.content}
                        onChange={(event) =>
                          updateAssetTemplateBlock(index, { content: event.target.value })
                        }
                        placeholder="如果这个 Block 需要默认内容，可以直接写在这里"
                        className="w-full rounded-3xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-4 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={onSaveAssetTemplate}
                className="rounded-2xl bg-[#a8b7ad] px-4 py-3 text-sm font-medium text-[#4e4943] hover:bg-[#97a79d]"
              >
                保存提示词模板
              </button>
              <button
                type="button"
                onClick={onDeleteAssetTemplate}
                disabled={!assetTemplateDraft.id}
                className="rounded-2xl border border-[#d5b8aa] bg-[#efe2da] px-4 py-3 text-sm text-[#9b7769] hover:bg-[#e8d9d0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                删除提示词模板
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#ddd5cc] bg-[#fcf8f4] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Block Templates</div>
            <p className="mt-2 text-sm leading-6 text-[#8b8379]">
              自定义常用 Block 模板。保存后，编辑页新增单个 Block 时可以直接从模板创建。
            </p>
          </div>
          <button
            type="button"
            onClick={onBeginCreateBlockTemplate}
            className="rounded-2xl bg-[#e2ddd5] px-4 py-3 text-sm font-medium text-[#5a544d] hover:bg-[#d6cec5]"
          >
            新建 Block 模板
          </button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {workbenchSettings.block_templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelectBlockTemplate(template.id)}
                className={[
                  "w-full rounded-2xl border px-3 py-3 text-left transition",
                  selectedTemplateId === template.id
                    ? "border-[#adbbb0] bg-[#dde5df]"
                    : "border-[#ddd5cc] bg-[#f8f3ed] hover:border-[#cbc0b4] hover:bg-[#f1ebe3]"
                ].join(" ")}
              >
                <div className="truncate text-sm font-medium text-[#5b554e]">{template.name}</div>
                <div className="mt-1 truncate text-xs text-[#988f84]">
                  {(template.label || "未命名 Block")} · {template.type}
                </div>
              </button>
            ))}
            {workbenchSettings.block_templates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d8cfc5] bg-[#fbf7f2] px-4 py-5 text-sm text-[#988f84]">
                还没有 Block 模板。
              </div>
            ) : null}
          </div>

          <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Template Name</span>
              <input
                value={blockTemplateDraft.name}
                onChange={(event) => onChangeBlockTemplateDraft({ name: event.target.value })}
                placeholder="例如：电影感风格底座"
                className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Block Type</span>
              <select
                value={blockTemplateDraft.type}
                onChange={(event) =>
                  onChangeBlockTemplateDraft({
                    type: event.target.value as BlockTemplateDraft["type"]
                  })
                }
                className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
              >
                <option value="character">角色</option>
                <option value="camera">镜头</option>
                <option value="style">风格</option>
                <option value="format">格式</option>
                <option value="custom">自定义</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Block Label</span>
            <input
              value={blockTemplateDraft.label}
              onChange={(event) => onChangeBlockTemplateDraft({ label: event.target.value })}
              placeholder="例如：风格底座"
              className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Default Content</span>
            <textarea
              rows={10}
              value={blockTemplateDraft.content}
              onChange={(event) => onChangeBlockTemplateDraft({ content: event.target.value })}
              placeholder="写下这个模板默认携带的提示词内容"
              className="w-full rounded-3xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-4 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
            />
          </label>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onSaveBlockTemplate}
              className="rounded-2xl bg-[#a8b7ad] px-4 py-3 text-sm font-medium text-[#4e4943] hover:bg-[#97a79d]"
            >
              保存模板
            </button>
            <button
              type="button"
              onClick={onDeleteBlockTemplate}
              disabled={!blockTemplateDraft.id}
              className="rounded-2xl border border-[#d5b8aa] bg-[#efe2da] px-4 py-3 text-sm text-[#9b7769] hover:bg-[#e8d9d0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              删除模板
            </button>
          </div>
          </div>
        </div>
      </section>
    </div>
  );
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
  onDelete,
  workbenchSettings,
  selectedTemplateId,
  blockTemplateDraft,
  onBeginCreateBlockTemplate,
  onSelectBlockTemplate,
  onChangeBlockTemplateDraft,
  onSaveBlockTemplate,
  onDeleteBlockTemplate,
  selectedAssetTemplateId,
  assetTemplateDraft,
  onBeginCreateAssetTemplate,
  onSelectAssetTemplate,
  onChangeAssetTemplateDraft,
  onSaveAssetTemplate,
  onDeleteAssetTemplate
}: AiSettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("ai");

  useEffect(() => {
    if (open) {
      setActiveSection("ai");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#5f584f]/18 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 top-8 z-50 mx-auto w-[min(1040px,calc(100vw-40px))] rounded-[28px] border border-[#d8cfc5] bg-[#fffaf5] p-5 shadow-[0_24px_80px_rgba(116,106,94,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Settings</div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#5b554e]">设置</h3>
            <p className="mt-2 text-sm leading-6 text-[#8b8379]">
              左侧切换不同设置项。AI 模型和 Block 模板现在分开管理，避免互相挤压。
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

        <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-[24px] border border-[#ddd5cc] bg-[#fcf8f4] p-4">
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Sections</div>
            <div className="mt-4 space-y-2">
              <SectionButton
                active={activeSection === "ai"}
                title="AI"
                description="配置模型、API Key 和默认参数。"
                onClick={() => setActiveSection("ai")}
              />
              <SectionButton
                active={activeSection === "block"}
                title="Block"
                description="维护可复用的 Block 模板。"
                onClick={() => setActiveSection("block")}
              />
            </div>
          </aside>

          <div className="min-w-0">
            {activeSection === "ai" ? (
              <AiSettingsSection
                aiSettings={aiSettings}
                aiProfileDraft={aiProfileDraft}
                aiTesting={aiTesting}
                aiTestMessage={aiTestMessage}
                onBeginCreateProfile={onBeginCreateProfile}
                onSelectProfile={onSelectProfile}
                onChangeDraft={onChangeDraft}
                onTest={onTest}
                onSave={onSave}
                onDelete={onDelete}
              />
            ) : (
              <BlockTemplateSection
                workbenchSettings={workbenchSettings}
                selectedTemplateId={selectedTemplateId}
                blockTemplateDraft={blockTemplateDraft}
                onBeginCreateBlockTemplate={onBeginCreateBlockTemplate}
                onSelectBlockTemplate={onSelectBlockTemplate}
                onChangeBlockTemplateDraft={onChangeBlockTemplateDraft}
                onSaveBlockTemplate={onSaveBlockTemplate}
                onDeleteBlockTemplate={onDeleteBlockTemplate}
                selectedAssetTemplateId={selectedAssetTemplateId}
                assetTemplateDraft={assetTemplateDraft}
                onBeginCreateAssetTemplate={onBeginCreateAssetTemplate}
                onSelectAssetTemplate={onSelectAssetTemplate}
                onChangeAssetTemplateDraft={onChangeAssetTemplateDraft}
                onSaveAssetTemplate={onSaveAssetTemplate}
                onDeleteAssetTemplate={onDeleteAssetTemplate}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
