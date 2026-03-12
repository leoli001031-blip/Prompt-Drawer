import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { runAiTask } from "../lib/ai";
import { appendVersion, createBlock, createVersionSnapshot } from "../lib/payload";
import { copyText } from "../utils/browser";
import { formatAiTaskLabel } from "../utils/format";
import type { AiProviderProfile, AiTaskResult, AiTaskType } from "../types/ai";
import type { PromptBlock } from "../types/prompt";
import type { FolderType, PromptAsset } from "../types/storage";

export interface UseAiRunnerArgs {
  activeAiProfile: AiProviderProfile | null;
  assetDraft: PromptAsset | null;
  setAssetDraft: Dispatch<SetStateAction<PromptAsset | null>>;
  selectedFolderType: FolderType | null | undefined;
  setStatusMessage: Dispatch<SetStateAction<string>>;
}

export function useAiRunner({
  activeAiProfile,
  assetDraft,
  setAssetDraft,
  selectedFolderType,
  setStatusMessage
}: UseAiRunnerArgs) {
  const [aiTaskType, setAiTaskType] = useState<AiTaskType>("rewrite_block");
  const [aiTargetBlockId, setAiTargetBlockId] = useState<string | null>(null);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiResult, setAiResult] = useState<AiTaskResult | null>(null);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiRunMessage, setAiRunMessage] = useState("");
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  useEffect(() => {
    if (!assetDraft) {
      setAiTargetBlockId(null);
      setAiResult(null);
      return;
    }

    const fallbackTarget = assetDraft.payload.blocks[0]?.id ?? null;
    setAiTargetBlockId((current) =>
      current && assetDraft.payload.blocks.some((block) => block.id === current) ? current : fallbackTarget
    );
  }, [assetDraft]);

  async function runAi(): Promise<void> {
    if (!assetDraft) {
      return;
    }

    if (!activeAiProfile) {
      setAiRunMessage("请先配置 AI 模型。");
      return;
    }

    if (aiTaskType !== "generate_from_asset" && !aiTargetBlockId) {
      setAiRunMessage("请先选择一个目标 Block。");
      return;
    }

    setAiRunning(true);
    setAiRunMessage("");
    setAiResult(null);

    try {
      const result = await runAiTask({
        profile_id: activeAiProfile.id,
        task_type: aiTaskType,
        folder_type: selectedFolderType ?? "library",
        asset_title: assetDraft.title,
        tags: assetDraft.payload.tags,
        blocks: assetDraft.payload.blocks.map((block) => ({
          id: block.id,
          type: block.type,
          label: block.label ?? "",
          content: block.content
        })),
        target_block_id: aiTaskType === "generate_from_asset" ? null : aiTargetBlockId,
        user_instruction: aiInstruction,
        context_remark: assetDraft.payload.remark
      });
      setAiResult(result);
      setAiRunMessage("AI 已返回结果。");
    } catch (error) {
      setAiRunMessage(error instanceof Error ? error.message : "AI 请求失败。");
    } finally {
      setAiRunning(false);
    }
  }

  function applyAiVersionSnapshot(taskLabel: string, nextTitle: string, nextBlocks: PromptBlock[]): void {
    if (!assetDraft) {
      return;
    }

    const version = createVersionSnapshot(assetDraft, `AI ${taskLabel}`);
    setAssetDraft({
      ...assetDraft,
      title: nextTitle,
      payload: appendVersion(
        {
          ...assetDraft.payload,
          blocks: nextBlocks
        },
        version
      )
    });
    setStatusMessage("AI 结果已写入当前资产。");
  }

  function applyAiToTargetBlock(): void {
    if (!assetDraft || !aiResult?.text || !aiTargetBlockId) {
      return;
    }

    const nextBlocks = assetDraft.payload.blocks.map((block) =>
      block.id === aiTargetBlockId ? { ...block, content: aiResult.text } : block
    );
    applyAiVersionSnapshot(formatAiTaskLabel(aiTaskType), assetDraft.title, nextBlocks);
  }

  function appendAiAsBlock(): void {
    if (!assetDraft || !aiResult?.text) {
      return;
    }

    const sourceBlock = aiTargetBlockId
      ? assetDraft.payload.blocks.find((block) => block.id === aiTargetBlockId) ?? null
      : null;
    const nextBlock: PromptBlock = {
      ...createBlock(sourceBlock?.type ?? "custom"),
      label: sourceBlock?.label?.trim() ?? "",
      content: aiResult.text
    };
    applyAiVersionSnapshot(formatAiTaskLabel(aiTaskType), assetDraft.title, [
      ...assetDraft.payload.blocks,
      nextBlock
    ]);
  }

  async function copyAiResult(): Promise<void> {
    if (!aiResult?.text) {
      return;
    }

    if (await copyText(aiResult.text)) {
      setAiRunMessage("AI 结果已复制。");
    }
  }

  return {
    aiTaskType,
    setAiTaskType,
    aiTargetBlockId,
    setAiTargetBlockId,
    aiInstruction,
    setAiInstruction,
    aiResult,
    aiRunning,
    aiRunMessage,
    aiPanelOpen,
    setAiPanelOpen,
    runAi,
    applyAiToTargetBlock,
    appendAiAsBlock,
    copyAiResult
  };
}
