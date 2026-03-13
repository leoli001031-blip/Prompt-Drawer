import { invoke } from "@tauri-apps/api/core";
import type {
  AssetTemplate,
  AssetTemplateBlock,
  AssetTemplateDraft,
  BlockTemplate,
  BlockTemplateDraft,
  FolderTemplateBinding,
  WorkbenchSettingsSnapshot
} from "../types/settings";

const SETTINGS_STORAGE_KEY = "prompt-workbench:settings:v1";

const EMPTY_WORKBENCH_SETTINGS: WorkbenchSettingsSnapshot = {
  block_templates: [],
  asset_templates: [],
  folder_template_bindings: []
};

function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTemplate(template: Partial<BlockTemplate>): BlockTemplate {
  const now = Date.now();

  return {
    id: typeof template.id === "string" && template.id.trim() ? template.id : makeId("template"),
    name: typeof template.name === "string" && template.name.trim() ? template.name.trim() : "未命名模板",
    type:
      template.type === "character" ||
      template.type === "camera" ||
      template.type === "style" ||
      template.type === "format" ||
      template.type === "custom"
        ? template.type
        : "custom",
    label: typeof template.label === "string" ? template.label : "",
    content: typeof template.content === "string" ? template.content : "",
    created_at:
      typeof template.created_at === "number" && Number.isFinite(template.created_at)
        ? template.created_at
        : now,
    updated_at:
      typeof template.updated_at === "number" && Number.isFinite(template.updated_at)
        ? template.updated_at
        : now
  };
}

function normalizeAssetTemplateBlock(block: Partial<AssetTemplateBlock>): AssetTemplateBlock {
  return {
    type:
      block.type === "character" ||
      block.type === "camera" ||
      block.type === "style" ||
      block.type === "format" ||
      block.type === "custom"
        ? block.type
        : "custom",
    label: typeof block.label === "string" ? block.label : "",
    content: typeof block.content === "string" ? block.content : ""
  };
}

export function createEmptyAssetTemplateBlock(): AssetTemplateBlock {
  return normalizeAssetTemplateBlock({
    type: "custom",
    label: "",
    content: ""
  });
}

function parseAssetTemplateStructure(structure: string): AssetTemplateBlock[] {
  return structure
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawLabel, ...contentParts] = line.split("::");
      return normalizeAssetTemplateBlock({
        type: "custom",
        label: rawLabel?.trim() ?? "",
        content: contentParts.join("::").trim()
      });
    });
}

function normalizeAssetTemplate(template: Partial<AssetTemplate>): AssetTemplate {
  const now = Date.now();
  const normalizedBlocks = Array.isArray(template.blocks)
    ? template.blocks.map(normalizeAssetTemplateBlock)
    : [];
  const normalizedStructure =
    typeof template.structure === "string"
      ? template.structure
      : normalizedBlocks
          .map((block) => (block.content.trim() ? `${block.label}::${block.content}` : block.label))
          .join("\n");

  return {
    id: typeof template.id === "string" && template.id.trim() ? template.id : makeId("asset_template"),
    name: typeof template.name === "string" && template.name.trim() ? template.name.trim() : "未命名模板",
    blocks: normalizedBlocks.length > 0 ? normalizedBlocks : parseAssetTemplateStructure(normalizedStructure),
    structure: normalizedStructure,
    created_at:
      typeof template.created_at === "number" && Number.isFinite(template.created_at)
        ? template.created_at
        : now,
    updated_at:
      typeof template.updated_at === "number" && Number.isFinite(template.updated_at)
        ? template.updated_at
        : now
  };
}

function normalizeFolderTemplateBinding(
  binding: Partial<FolderTemplateBinding>
): FolderTemplateBinding | null {
  const folderId =
    typeof binding.folder_id === "string" ? binding.folder_id.trim() : "";
  const assetTemplateId =
    typeof binding.asset_template_id === "string" ? binding.asset_template_id.trim() : "";

  if (!folderId || !assetTemplateId) {
    return null;
  }

  return {
    folder_id: folderId,
    asset_template_id: assetTemplateId
  };
}

function normalizeSettings(snapshot: WorkbenchSettingsSnapshot): WorkbenchSettingsSnapshot {
  const normalizedAssetTemplates = (snapshot.asset_templates ?? []).map(normalizeAssetTemplate);
  const assetTemplateIds = new Set(normalizedAssetTemplates.map((template) => template.id));

  return {
    block_templates: (snapshot.block_templates ?? []).map(normalizeTemplate),
    asset_templates: normalizedAssetTemplates,
    folder_template_bindings: (snapshot.folder_template_bindings ?? [])
      .map(normalizeFolderTemplateBinding)
      .filter((binding): binding is FolderTemplateBinding => binding !== null)
      .filter((binding) => assetTemplateIds.has(binding.asset_template_id))
  };
}

function readLocalSettings(): WorkbenchSettingsSnapshot {
  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) {
    return EMPTY_WORKBENCH_SETTINGS;
  }

  try {
    return normalizeSettings(JSON.parse(raw) as WorkbenchSettingsSnapshot);
  } catch {
    return EMPTY_WORKBENCH_SETTINGS;
  }
}

function writeLocalSettings(snapshot: WorkbenchSettingsSnapshot): WorkbenchSettingsSnapshot {
  const normalized = normalizeSettings(snapshot);
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function createBlockTemplateDraft(template?: BlockTemplate | null): BlockTemplateDraft {
  return {
    id: template?.id,
    name: template?.name ?? "",
    type: template?.type ?? "custom",
    label: template?.label ?? "",
    content: template?.content ?? ""
  };
}

export function createAssetTemplateDraft(template?: AssetTemplate | null): AssetTemplateDraft {
  return {
    id: template?.id,
    name: template?.name ?? "",
    blocks:
      template?.blocks?.length && Array.isArray(template.blocks)
        ? template.blocks.map(normalizeAssetTemplateBlock)
        : [createEmptyAssetTemplateBlock()]
  };
}

export function getFolderTemplateId(
  settings: WorkbenchSettingsSnapshot,
  folderId: string | null | undefined
): string {
  if (!folderId) {
    return "";
  }

  return (
    settings.folder_template_bindings.find((binding) => binding.folder_id === folderId)
      ?.asset_template_id ?? ""
  );
}

export async function loadWorkbenchSettings(): Promise<WorkbenchSettingsSnapshot> {
  if (isTauriAvailable()) {
    return normalizeSettings(await invoke<WorkbenchSettingsSnapshot>("preferences_load"));
  }

  return readLocalSettings();
}

export async function saveWorkbenchSettings(
  snapshot: WorkbenchSettingsSnapshot
): Promise<WorkbenchSettingsSnapshot> {
  const normalized = normalizeSettings(snapshot);

  if (isTauriAvailable()) {
    return normalizeSettings(await invoke<WorkbenchSettingsSnapshot>("preferences_save", { snapshot: normalized }));
  }

  return writeLocalSettings(normalized);
}

export async function saveBlockTemplate(draft: BlockTemplateDraft): Promise<WorkbenchSettingsSnapshot> {
  const current = await loadWorkbenchSettings();
  const existing = draft.id ? current.block_templates.find((template) => template.id === draft.id) : null;
  const now = Date.now();
  const nextTemplate = normalizeTemplate({
    id: draft.id ?? existing?.id,
    name: draft.name,
    type: draft.type,
    label: draft.label,
    content: draft.content,
    created_at: existing?.created_at ?? now,
    updated_at: now
  });

  const nextTemplates = existing
    ? current.block_templates.map((template) => (template.id === nextTemplate.id ? nextTemplate : template))
    : [nextTemplate, ...current.block_templates];

  return saveWorkbenchSettings({
    block_templates: nextTemplates,
    asset_templates: current.asset_templates,
    folder_template_bindings: current.folder_template_bindings
  });
}

export async function deleteBlockTemplate(templateId: string): Promise<WorkbenchSettingsSnapshot> {
  const current = await loadWorkbenchSettings();
  return saveWorkbenchSettings({
    block_templates: current.block_templates.filter((template) => template.id !== templateId),
    asset_templates: current.asset_templates,
    folder_template_bindings: current.folder_template_bindings
  });
}

export async function saveAssetTemplate(draft: AssetTemplateDraft): Promise<WorkbenchSettingsSnapshot> {
  const current = await loadWorkbenchSettings();
  const existing = draft.id ? current.asset_templates.find((template) => template.id === draft.id) : null;
  const now = Date.now();
  const normalizedBlocks = draft.blocks
    .map(normalizeAssetTemplateBlock)
    .filter((block) => block.label.trim() || block.content.trim());
  const nextTemplate = normalizeAssetTemplate({
    id: draft.id ?? existing?.id,
    name: draft.name,
    structure: normalizedBlocks
      .map((block) => (block.content.trim() ? `${block.label}::${block.content}` : block.label))
      .join("\n"),
    blocks: normalizedBlocks,
    created_at: existing?.created_at ?? now,
    updated_at: now
  });

  const nextTemplates = existing
    ? current.asset_templates.map((template) => (template.id === nextTemplate.id ? nextTemplate : template))
    : [nextTemplate, ...current.asset_templates];

  return saveWorkbenchSettings({
    block_templates: current.block_templates,
    asset_templates: nextTemplates,
    folder_template_bindings: current.folder_template_bindings
  });
}

export async function deleteAssetTemplate(templateId: string): Promise<WorkbenchSettingsSnapshot> {
  const current = await loadWorkbenchSettings();
  return saveWorkbenchSettings({
    block_templates: current.block_templates,
    asset_templates: current.asset_templates.filter((template) => template.id !== templateId),
    folder_template_bindings: current.folder_template_bindings.filter(
      (binding) => binding.asset_template_id !== templateId
    )
  });
}

export function buildAssetTemplateBlocks(structure: string): AssetTemplateBlock[] {
  return parseAssetTemplateStructure(structure);
}

export async function setFolderTemplateBinding(
  folderId: string,
  assetTemplateId: string | null
): Promise<WorkbenchSettingsSnapshot> {
  const current = await loadWorkbenchSettings();
  const trimmedTemplateId = assetTemplateId?.trim() ?? "";
  const nextBindings = current.folder_template_bindings.filter(
    (binding) => binding.folder_id !== folderId
  );

  if (trimmedTemplateId) {
    nextBindings.unshift({
      folder_id: folderId,
      asset_template_id: trimmedTemplateId
    });
  }

  return saveWorkbenchSettings({
    block_templates: current.block_templates,
    asset_templates: current.asset_templates,
    folder_template_bindings: nextBindings
  });
}
