import type {
  PromptBlock,
  PromptBlockType,
  PromptPayload,
  PromptVersionSnapshot,
  StoryboardMeta
} from "../types/prompt";
import type { FolderType, PromptAsset, PromptAssetRow } from "../types/storage";
import type { AssetTemplate, BlockTemplate } from "../types/settings";

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
  versions: [],
  export_settings: {
    separator: "\n",
    include_labels: true
  }
};

export interface ImportedAssetDraft {
  title: string;
  payload: PromptPayload;
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeStoryboardMeta(raw: Partial<StoryboardMeta> | undefined, folderType: FolderType): StoryboardMeta | undefined {
  if (folderType !== "project" && !raw) {
    return undefined;
  }

  return {
    shot_number:
      typeof raw?.shot_number === "number" && Number.isFinite(raw.shot_number) ? raw.shot_number : 1,
    duration_seconds:
      typeof raw?.duration_seconds === "number" && Number.isFinite(raw.duration_seconds)
        ? raw.duration_seconds
        : undefined,
    transition: typeof raw?.transition === "string" ? raw.transition : ""
  };
}

function normalizeVersion(raw: Partial<PromptVersionSnapshot>): PromptVersionSnapshot {
  const payload = parsePromptPayload(JSON.stringify(raw.payload ?? EMPTY_PAYLOAD));
  return {
    id: typeof raw.id === "string" ? raw.id : makeId("version"),
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : "未命名版本",
    created_at:
      typeof raw.created_at === "number" && Number.isFinite(raw.created_at) ? raw.created_at : Date.now(),
    asset_title: typeof raw.asset_title === "string" ? raw.asset_title : "未命名资产",
    payload: (({ versions: _versions, ...rest }) => rest)(payload)
  };
}

function parseImportedPayload(raw: unknown): PromptPayload | null {
  if (typeof raw === "string") {
    return parsePromptPayload(raw);
  }

  if (raw && typeof raw === "object") {
    return parsePromptPayload(JSON.stringify(raw));
  }

  return null;
}

export function getBlockTypeLabel(type: PromptBlockType): string {
  return BLOCK_TYPE_LABELS[type];
}

export function getBlockLabel(block: Pick<PromptBlock, "type" | "label">): string {
  return block.label?.trim() || "";
}

export function parsePromptPayload(raw: string): PromptPayload {
  try {
    const parsed = JSON.parse(raw) as Partial<PromptPayload>;

    return {
      blocks: (parsed.blocks ?? []).map((block, index) => ({
        ...block,
        id: typeof block.id === "string" ? block.id : makeId("block"),
        type: block.type ?? "custom",
        label: typeof block.label === "string" ? block.label : "",
        content: typeof block.content === "string" ? block.content : "",
        isActive: block.isActive ?? true,
        template_id: typeof block.template_id === "string" ? block.template_id : undefined,
        is_locked: Boolean(block.is_locked),
        project_lock_id: typeof block.project_lock_id === "string" ? block.project_lock_id : undefined
      })),
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((tag): tag is string => typeof tag === "string") : [],
      remark: typeof parsed.remark === "string" ? parsed.remark : undefined,
      storyboard: normalizeStoryboardMeta(parsed.storyboard, parsed.storyboard ? "project" : "library"),
      versions: Array.isArray(parsed.versions) ? parsed.versions.map(normalizeVersion) : [],
      export_settings: {
        separator: parsed.export_settings?.separator ?? EMPTY_PAYLOAD.export_settings.separator,
        include_labels:
          parsed.export_settings?.include_labels ?? EMPTY_PAYLOAD.export_settings.include_labels
      }
    };
  } catch {
    return cloneValue(EMPTY_PAYLOAD);
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

export function createBlock(type: PromptBlockType = "custom"): PromptBlock {
  return {
    id: makeId("block"),
    type,
    label: "",
    content: "",
    isActive: true
  };
}

export function createBlockFromTemplate(template: BlockTemplate): PromptBlock {
  return {
    id: makeId("block"),
    type: template.type,
    label: template.label,
    content: template.content,
    isActive: true,
    template_id: template.id
  };
}

export function createBlocksFromAssetTemplate(template: AssetTemplate): PromptBlock[] {
  return template.blocks.map((block) => ({
    id: makeId("block"),
    type: block.type,
    label: block.label,
    content: block.content,
    isActive: true
  }));
}

function stripProjectLockMetadataFromBlock(block: PromptBlock): PromptBlock {
  const nextBlock = cloneValue(block);
  delete nextBlock.is_locked;
  delete nextBlock.project_lock_id;
  return nextBlock;
}

export function isProjectLockedBlock(block: PromptBlock): boolean {
  return Boolean(block.is_locked && block.project_lock_id);
}

export function toggleProjectLock(block: PromptBlock): PromptBlock {
  if (isProjectLockedBlock(block)) {
    return stripProjectLockMetadataFromBlock(block);
  }

  return {
    ...cloneValue(block),
    is_locked: true,
    project_lock_id: block.project_lock_id ?? makeId("project_lock")
  };
}

export function stripProjectLockMetadata(payload: PromptPayload): PromptPayload {
  return {
    ...cloneValue(payload),
    blocks: payload.blocks.map(stripProjectLockMetadataFromBlock)
  };
}

function dedupeProjectLockedBlocks(blocks: PromptBlock[]): PromptBlock[] {
  const byLockId = new Map<string, PromptBlock>();

  blocks.forEach((block) => {
    if (!isProjectLockedBlock(block)) {
      return;
    }

    if (!byLockId.has(block.project_lock_id!)) {
      byLockId.set(block.project_lock_id!, cloneValue(block));
    }
  });

  return [...byLockId.values()];
}

export function extractProjectLockedBlocks(assets: PromptAsset[], folderId: string): PromptBlock[] {
  return dedupeProjectLockedBlocks(
    assets
      .filter((asset) => asset.folder_id === folderId && !asset.deleted_at)
      .flatMap((asset) => asset.payload.blocks)
  );
}

export function applyProjectLockedBlocksToPayload(
  payload: PromptPayload,
  lockedBlocks: PromptBlock[]
): PromptPayload {
  const canonicalLockedBlocks = dedupeProjectLockedBlocks(lockedBlocks);
  const existingLockedBlocks = new Map(
    payload.blocks
      .filter(isProjectLockedBlock)
      .map((block) => [block.project_lock_id!, block] as const)
  );

  const nextLockedBlocks = canonicalLockedBlocks.map((block) => {
    const existingBlock = existingLockedBlocks.get(block.project_lock_id!);
    return {
      ...cloneValue(block),
      id: existingBlock?.id ?? makeId("block"),
      is_locked: true,
      project_lock_id: block.project_lock_id!
    };
  });

  const unlockedBlocks = payload.blocks
    .filter((block) => !block.project_lock_id && !block.is_locked)
    .map(stripProjectLockMetadataFromBlock);

  return {
    ...cloneValue(payload),
    blocks: [...nextLockedBlocks, ...unlockedBlocks]
  };
}

export function syncProjectLockedBlocks(
  projectAssets: PromptAsset[],
  currentDraft: PromptAsset
): PromptAsset[] {
  const scopedAssets = projectAssets.filter(
    (asset) => asset.folder_id === currentDraft.folder_id && !asset.deleted_at
  );
  const canonicalLockedBlocks = dedupeProjectLockedBlocks(currentDraft.payload.blocks);

  return scopedAssets.map((asset) => {
    const sourceAsset = asset.id === currentDraft.id ? currentDraft : asset;
    return {
      ...cloneValue(sourceAsset),
      payload: applyProjectLockedBlocksToPayload(sourceAsset.payload, canonicalLockedBlocks)
    };
  });
}

export function createDefaultPayload(folderType: FolderType, shotNumber = 1): PromptPayload {
  return {
    blocks:
      folderType === "project"
        ? [createBlock("camera"), createBlock("style"), createBlock("format")]
        : [createBlock("character"), createBlock("style"), createBlock("format")],
    tags: [],
    remark: folderType === "project" ? "" : undefined,
    storyboard: folderType === "project" ? normalizeStoryboardMeta({ shot_number: shotNumber }, "project") : undefined,
    versions: [],
    export_settings: {
      separator: "\n",
      include_labels: true
    }
  };
}

export function createPayloadFromAssetTemplate(
  template: AssetTemplate,
  folderType: FolderType,
  shotNumber = 1
): PromptPayload {
  const payload = createDefaultPayload(folderType, shotNumber);
  return {
    ...payload,
    blocks: createBlocksFromAssetTemplate(template)
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
    .map((block) => {
      const content = block.content.trim();
      const label = getBlockLabel(block);

      if (!payload.export_settings.include_labels || !label) {
        return content;
      }

      return `${label}: ${content}`;
    })
    .join(payload.export_settings.separator);
}

export function getNextShotNumber(assets: PromptAsset[], folderId: string): number {
  const max = assets
    .filter((asset) => asset.folder_id === folderId)
    .map((asset) => asset.payload.storyboard?.shot_number ?? 0)
    .reduce((current, next) => Math.max(current, next), 0);

  return max + 1;
}

export function sortAssetsForDisplay(assets: PromptAsset[], folderType: FolderType, sortMode: "updated_desc" | "title_asc" | "favorites_first" | "shot_number"): PromptAsset[] {
  const next = [...assets];

  if (folderType === "project" || sortMode === "shot_number") {
    next.sort((left, right) => {
      const leftShot = left.payload.storyboard?.shot_number ?? Number.MAX_SAFE_INTEGER;
      const rightShot = right.payload.storyboard?.shot_number ?? Number.MAX_SAFE_INTEGER;
      return leftShot - rightShot || right.updated_at - left.updated_at;
    });
    return next;
  }

  switch (sortMode) {
    case "title_asc":
      next.sort((left, right) => left.title.localeCompare(right.title, "zh-CN"));
      return next;
    case "favorites_first":
      next.sort((left, right) => Number(right.is_favorite) - Number(left.is_favorite) || right.updated_at - left.updated_at);
      return next;
    case "updated_desc":
    default:
      next.sort((left, right) => right.updated_at - left.updated_at);
      return next;
  }
}

export function extractAssetTags(assets: PromptAsset[]): string[] {
  return [...new Set(assets.flatMap((asset) => asset.payload.tags).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "zh-CN")
  );
}

export function createVersionSnapshot(asset: Pick<PromptAsset, "title" | "payload">, explicitName?: string): PromptVersionSnapshot {
  const { versions: _versions, ...rest } = cloneValue(asset.payload);
  const timestamp = Date.now();
  const defaultName = `版本 ${new Date(timestamp).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })}`;

  return {
    id: makeId("version"),
    name: explicitName?.trim() || defaultName,
    created_at: timestamp,
    asset_title: asset.title.trim() || "未命名资产",
    payload: rest
  };
}

export function appendVersion(payload: PromptPayload, version: PromptVersionSnapshot): PromptPayload {
  return {
    ...cloneValue(payload),
    versions: [version, ...(payload.versions ?? [])]
  };
}

export function restoreFromVersion(payload: PromptPayload, versionId: string): { title: string; payload: PromptPayload } | null {
  const versions = payload.versions ?? [];
  const found = versions.find((version) => version.id === versionId);

  if (!found) {
    return null;
  }

  return {
    title: found.asset_title,
    payload: {
      ...cloneValue(found.payload),
      versions
    }
  };
}

export function duplicatePayload(payload: PromptPayload): PromptPayload {
  const cloned = cloneValue(payload);
  cloned.blocks = cloned.blocks.map((block) => ({
    ...block,
    id: makeId("block")
  }));
  cloned.versions = cloned.versions?.map((version) => ({
    ...version,
    id: makeId("version")
  }));
  return cloned;
}

export function duplicateBlock(block: PromptBlock): PromptBlock {
  return {
    ...stripProjectLockMetadataFromBlock(block),
    id: makeId("block"),
    label: block.label?.trim() ? `${block.label} 副本` : ""
  };
}

export function buildProjectScript(assets: PromptAsset[]): string {
  const ordered = [...assets].sort((left, right) => {
    const leftShot = left.payload.storyboard?.shot_number ?? Number.MAX_SAFE_INTEGER;
    const rightShot = right.payload.storyboard?.shot_number ?? Number.MAX_SAFE_INTEGER;
    return leftShot - rightShot || right.updated_at - left.updated_at;
  });

  if (ordered.length === 0) {
    return "";
  }

  return ordered
    .map((asset) => {
      const shotNumber = asset.payload.storyboard?.shot_number ?? "-";
      const duration = asset.payload.storyboard?.duration_seconds;
      const transition = asset.payload.storyboard?.transition?.trim();
      const body = buildExportPreview(asset.payload) || "暂无内容";
      const remark = asset.payload.remark?.trim();

      return [
        `## 镜头 ${shotNumber} · ${asset.title}`,
        duration ? `时长：${duration} 秒` : "",
        transition ? `转场：${transition}` : "",
        remark ? `备注：${remark}` : "",
        "",
        body
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");
}

function createTextImportPayload(text: string, folderType: FolderType): ImportedAssetDraft[] {
  const chunks = text
    .split(/\n\s*\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const payload = createDefaultPayload(folderType);
  payload.blocks =
    chunks.length > 0
      ? chunks.map((chunk, index) => ({
          id: makeId("block"),
          type: folderType === "project" && index === 0 ? "camera" : "custom",
          label: "",
          content: chunk,
          isActive: true
        }))
      : payload.blocks;

  return [
    {
      title: `导入资产 ${new Date().toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      })}`,
      payload
    }
  ];
}

export function parseImportedAssets(raw: string, folderType: FolderType): ImportedAssetDraft[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;

    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { prompt_assets?: unknown[] }).prompt_assets)) {
      const snapshot = parsed as { prompt_assets: Array<{ title?: string; payload?: unknown }> };
      return snapshot.prompt_assets
        .map((asset, index) => {
          const payload = parseImportedPayload(asset.payload);
          if (!payload) {
            return null;
          }

          return {
            title: typeof asset.title === "string" && asset.title.trim() ? asset.title : `导入资产 ${index + 1}`,
            payload
          };
        })
        .filter((value): value is ImportedAssetDraft => value !== null);
    }

    if (Array.isArray(parsed)) {
      return parsed
        .map((item, index) => {
          if (item && typeof item === "object" && "payload" in item) {
            const candidate = item as { title?: string; payload?: unknown };
            const payload = parseImportedPayload(candidate.payload);
            if (!payload) {
              return null;
            }
            return {
              title: typeof candidate.title === "string" && candidate.title.trim() ? candidate.title : `导入资产 ${index + 1}`,
              payload
            };
          }

          const payload = parseImportedPayload(item);
          if (!payload) {
            return null;
          }

          return {
            title: `导入资产 ${index + 1}`,
            payload
          };
        })
        .filter((value): value is ImportedAssetDraft => value !== null);
    }

    if (parsed && typeof parsed === "object" && "payload" in parsed) {
      const candidate = parsed as { title?: string; payload?: unknown };
      const payload = parseImportedPayload(candidate.payload);
      if (payload) {
        return [
          {
            title: typeof candidate.title === "string" && candidate.title.trim() ? candidate.title : "导入资产",
            payload
          }
        ];
      }
    }

    const payload = parseImportedPayload(parsed);
    if (payload) {
      return [{ title: "导入资产", payload }];
    }
  } catch {
    return createTextImportPayload(trimmed, folderType);
  }

  return [];
}
