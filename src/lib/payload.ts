import type { PromptBlock, PromptBlockType, PromptPayload } from "../types/prompt";
import type { FolderType } from "../types/storage";
import type { PromptAsset, PromptAssetRow } from "../types/storage";

const BLOCK_TYPE_LABELS: Record<PromptBlockType, string> = {
  character: "角色",
  camera: "镜头",
  style: "风格",
  format: "格式",
  custom: "自定义"
};

const EMPTY_PAYLOAD: PromptPayload = {
  blocks: [],
  tags: [],
  export_settings: {
    separator: "\n",
    include_labels: true
  }
};

export function getBlockTypeLabel(type: PromptBlockType): string {
  return BLOCK_TYPE_LABELS[type];
}

export function getBlockLabel(block: Pick<PromptBlock, "type" | "label">): string {
  return block.label?.trim() || getBlockTypeLabel(block.type);
}

export function parsePromptPayload(raw: string): PromptPayload {
  try {
    const parsed = JSON.parse(raw) as Partial<PromptPayload>;

    return {
      blocks: (parsed.blocks ?? []).map((block) => ({
        ...block,
        label: block.label ?? getBlockTypeLabel(block.type ?? "custom"),
        isActive: true
      })),
      tags: parsed.tags ?? [],
      remark: parsed.remark,
      export_settings: {
        separator: parsed.export_settings?.separator ?? EMPTY_PAYLOAD.export_settings.separator,
        include_labels:
          parsed.export_settings?.include_labels ?? EMPTY_PAYLOAD.export_settings.include_labels
      }
    };
  } catch {
    return EMPTY_PAYLOAD;
  }
}

export function hydratePromptAsset(row: PromptAssetRow): PromptAsset {
  return {
    ...row,
    payload: parsePromptPayload(row.payload),
    is_favorite: row.is_favorite === 1
  };
}

export function serializePromptPayload(payload: PromptPayload): string {
  return JSON.stringify(payload);
}

export function createBlock(type: PromptBlockType = "custom"): PromptPayload["blocks"][number] {
  return {
    id: `block_${Math.random().toString(36).slice(2, 10)}`,
    type,
    label: getBlockTypeLabel(type),
    content: "",
    isActive: true
  };
}

export function createDefaultPayload(folderType: FolderType): PromptPayload {
  return {
    blocks:
      folderType === "project"
        ? [createBlock("camera"), createBlock("style"), createBlock("format")]
        : [createBlock("character"), createBlock("style"), createBlock("format")],
    tags: [],
    remark: folderType === "project" ? "" : undefined,
    export_settings: {
      separator: "\n",
      include_labels: true
    }
  };
}

export function reorderBlocks<T>(blocks: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= blocks.length || toIndex >= blocks.length) {
    return blocks;
  }

  const next = [...blocks];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function buildExportPreview(payload: PromptPayload): string {
  const visibleBlocks = payload.blocks.filter((block) => block.content.trim().length > 0);

  return visibleBlocks
    .map((block) =>
      payload.export_settings.include_labels
        ? `${getBlockLabel(block)}: ${block.content.trim()}`
        : block.content.trim()
    )
    .join(payload.export_settings.separator);
}
