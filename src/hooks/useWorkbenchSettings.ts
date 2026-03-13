import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  createAssetTemplateDraft,
  createBlockTemplateDraft,
  deleteAssetTemplate,
  deleteBlockTemplate,
  getFolderTemplateId,
  loadWorkbenchSettings,
  saveAssetTemplate,
  saveBlockTemplate,
  setFolderTemplateBinding
} from "../lib/settings";
import type {
  AssetTemplateDraft,
  BlockTemplateDraft,
  WorkbenchSettingsSnapshot
} from "../types/settings";

export interface UseWorkbenchSettingsArgs {
  setStatusMessage: Dispatch<SetStateAction<string>>;
}

export function useWorkbenchSettings({ setStatusMessage }: UseWorkbenchSettingsArgs) {
  const [workbenchSettings, setWorkbenchSettings] = useState<WorkbenchSettingsSnapshot>({
    block_templates: [],
    asset_templates: [],
    folder_template_bindings: []
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [blockTemplateDraft, setBlockTemplateDraft] = useState<BlockTemplateDraft>(() => createBlockTemplateDraft());
  const [selectedAssetTemplateId, setSelectedAssetTemplateId] = useState<string | null>(null);
  const [assetTemplateDraft, setAssetTemplateDraft] = useState<AssetTemplateDraft>(() => createAssetTemplateDraft());

  useEffect(() => {
    void loadWorkbenchSettings().then((nextSettings) => {
      setWorkbenchSettings(nextSettings);
      const firstTemplate = nextSettings.block_templates[0] ?? null;
      setSelectedTemplateId(firstTemplate?.id ?? null);
      setBlockTemplateDraft(createBlockTemplateDraft(firstTemplate));
      const firstAssetTemplate = nextSettings.asset_templates[0] ?? null;
      setSelectedAssetTemplateId(firstAssetTemplate?.id ?? null);
      setAssetTemplateDraft(createAssetTemplateDraft(firstAssetTemplate));
    });
  }, []);

  function startNewBlockTemplate(): void {
    setSelectedTemplateId(null);
    setBlockTemplateDraft(createBlockTemplateDraft());
  }

  function selectBlockTemplate(templateId: string): void {
    const template = workbenchSettings.block_templates.find((item) => item.id === templateId) ?? null;
    if (!template) {
      return;
    }

    setSelectedTemplateId(template.id);
    setBlockTemplateDraft(createBlockTemplateDraft(template));
  }

  async function saveCurrentBlockTemplate(): Promise<void> {
    const nextSettings = await saveBlockTemplate(blockTemplateDraft);
    const nextTemplate =
      (blockTemplateDraft.id
        ? nextSettings.block_templates.find((item) => item.id === blockTemplateDraft.id)
        : nextSettings.block_templates[0]) ?? null;
    setWorkbenchSettings(nextSettings);
    setSelectedTemplateId(nextTemplate?.id ?? null);
    setBlockTemplateDraft(createBlockTemplateDraft(nextTemplate));
    setStatusMessage("Block 模板已保存。");
  }

  async function deleteCurrentBlockTemplate(): Promise<void> {
    if (!blockTemplateDraft.id) {
      startNewBlockTemplate();
      return;
    }

    const nextSettings = await deleteBlockTemplate(blockTemplateDraft.id);
    const nextTemplate = nextSettings.block_templates[0] ?? null;
    setWorkbenchSettings(nextSettings);
    setSelectedTemplateId(nextTemplate?.id ?? null);
    setBlockTemplateDraft(createBlockTemplateDraft(nextTemplate));
    setStatusMessage("Block 模板已删除。");
  }

  function startNewAssetTemplate(): void {
    setSelectedAssetTemplateId(null);
    setAssetTemplateDraft(createAssetTemplateDraft());
  }

  function selectAssetTemplate(templateId: string): void {
    const template = workbenchSettings.asset_templates.find((item) => item.id === templateId) ?? null;
    if (!template) {
      return;
    }

    setSelectedAssetTemplateId(template.id);
    setAssetTemplateDraft(createAssetTemplateDraft(template));
  }

  async function saveCurrentAssetTemplate(): Promise<void> {
    const nextSettings = await saveAssetTemplate(assetTemplateDraft);
    const nextTemplate =
      (assetTemplateDraft.id
        ? nextSettings.asset_templates.find((item) => item.id === assetTemplateDraft.id)
        : nextSettings.asset_templates[0]) ?? null;
    setWorkbenchSettings(nextSettings);
    setSelectedAssetTemplateId(nextTemplate?.id ?? null);
    setAssetTemplateDraft(createAssetTemplateDraft(nextTemplate));
    setStatusMessage("提示词模板已保存。");
  }

  async function deleteCurrentAssetTemplate(): Promise<void> {
    if (!assetTemplateDraft.id) {
      startNewAssetTemplate();
      return;
    }

    const nextSettings = await deleteAssetTemplate(assetTemplateDraft.id);
    const nextTemplate = nextSettings.asset_templates[0] ?? null;
    setWorkbenchSettings(nextSettings);
    setSelectedAssetTemplateId(nextTemplate?.id ?? null);
    setAssetTemplateDraft(createAssetTemplateDraft(nextTemplate));
    setStatusMessage("提示词模板已删除。");
  }

  function resolveFolderTemplateId(folderId: string | null | undefined): string {
    return getFolderTemplateId(workbenchSettings, folderId);
  }

  async function saveFolderDefaultTemplate(
    folderId: string,
    assetTemplateId: string | null
  ): Promise<void> {
    const nextSettings = await setFolderTemplateBinding(folderId, assetTemplateId);
    setWorkbenchSettings(nextSettings);
    setStatusMessage(assetTemplateId ? "词库默认模板已更新。" : "已取消词库默认模板。");
  }

  return {
    workbenchSettings,
    selectedTemplateId,
    setSelectedTemplateId,
    blockTemplateDraft,
    setBlockTemplateDraft,
    startNewBlockTemplate,
    selectBlockTemplate,
    saveCurrentBlockTemplate,
    deleteCurrentBlockTemplate,
    selectedAssetTemplateId,
    setSelectedAssetTemplateId,
    assetTemplateDraft,
    setAssetTemplateDraft,
    startNewAssetTemplate,
    selectAssetTemplate,
    saveCurrentAssetTemplate,
    deleteCurrentAssetTemplate,
    resolveFolderTemplateId,
    saveFolderDefaultTemplate
  };
}
