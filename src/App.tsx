import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  createAiProfileDraft,
  deleteAiProfile,
  findAiProfile,
  getDefaultAiProfile,
  loadAiSettings,
  runAiTask,
  saveAiProfile,
  testAiProfile
} from "./lib/ai";
import {
  appendVersion,
  buildExportPreview,
  buildProjectScript,
  createBlock,
  createDefaultPayload,
  createVersionSnapshot,
  duplicateBlock,
  duplicatePayload,
  getBlockLabel,
  getBlockTypeLabel,
  getNextShotNumber,
  parseImportedAssets,
  reorderBlocks,
  restoreFromVersion,
  sortAssetsForDisplay
} from "./lib/payload";
import {
  createFolder,
  createPromptAsset,
  deleteFolder,
  deletePromptAsset,
  exportWorkbenchJson,
  getStorageDescriptor,
  loadWorkbenchSnapshot,
  mapPromptAssets,
  updateFolder,
  updatePromptAsset
} from "./lib/workbench";
import type {
  AiProfileDraft,
  AiSettingsSnapshot,
  AiTaskResult,
  AiTaskType
} from "./types/ai";
import type { PromptBlock } from "./types/prompt";
import type {
  FolderRecord,
  FolderType,
  PromptAsset,
  StorageDescriptor,
  WorkbenchSnapshot
} from "./types/storage";

function cloneAsset(asset: PromptAsset): PromptAsset {
  return JSON.parse(JSON.stringify(asset)) as PromptAsset;
}

function splitTags(value: string): string[] {
  return value
    .split(/[,\n，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatFolderType(type: FolderType): string {
  return type === "library" ? "提示词库" : "项目分镜";
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function isBlockControlTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("textarea, select, input, button"));
}

function stopPointerPropagation(event: ReactPointerEvent<HTMLElement>): void {
  event.stopPropagation();
}

interface FolderContextMenuState {
  folder: FolderRecord;
  x: number;
  y: number;
  confirmDelete: boolean;
}

interface AssetContextMenuState {
  asset: PromptAsset;
  x: number;
  y: number;
}

function assetFingerprint(asset: PromptAsset | null): string {
  return asset ? JSON.stringify(asset) : "";
}

function matchesAssetQuery(asset: PromptAsset, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [
    asset.title,
    asset.payload.remark ?? "",
    asset.payload.tags.join(" "),
    asset.payload.blocks.map((block) => block.content).join(" "),
    asset.payload.blocks.map((block) => block.label ?? "").join(" "),
    asset.payload.blocks.map((block) => getBlockTypeLabel(block.type)).join(" ")
  ]
    .join("\n")
    .toLowerCase();

  return haystack.includes(normalized);
}

function downloadJsonFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

async function copyText(value: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) {
    return false;
  }

  await navigator.clipboard.writeText(value);
  return true;
}

function formatAiTaskLabel(taskType: AiTaskType): string {
  switch (taskType) {
    case "rewrite_block":
      return "改写当前 Block";
    case "expand_block":
      return "扩写当前 Block";
    case "compress_block":
      return "压缩当前 Block";
    case "generate_from_asset":
    default:
      return "生成完整提示词";
  }
}

export default function App() {
  const [snapshot, setSnapshot] = useState<WorkbenchSnapshot | null>(null);
  const [storageDescriptor, setStorageDescriptor] = useState<StorageDescriptor | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettingsSnapshot>({ default_profile_id: null, profiles: [] });
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assetDraft, setAssetDraft] = useState<PromptAsset | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("正在加载工作台...");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"updated_desc" | "title_asc" | "favorites_first" | "shot_number">("updated_desc");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [confirmAssetDelete, setConfirmAssetDelete] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [copyTargetFolderId, setCopyTargetFolderId] = useState<string | null>(null);
  const [importPanelOpen, setImportPanelOpen] = useState(false);
  const [importRaw, setImportRaw] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [isEditingAssetTitle, setIsEditingAssetTitle] = useState(false);
  const [folderContextMenu, setFolderContextMenu] = useState<FolderContextMenuState | null>(null);
  const [assetContextMenu, setAssetContextMenu] = useState<AssetContextMenuState | null>(null);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [selectedAiProfileId, setSelectedAiProfileId] = useState<string | null>(null);
  const [aiProfileDraft, setAiProfileDraft] = useState<AiProfileDraft>(() => createAiProfileDraft());
  const [aiTaskType, setAiTaskType] = useState<AiTaskType>("rewrite_block");
  const [aiTargetBlockId, setAiTargetBlockId] = useState<string | null>(null);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiResult, setAiResult] = useState<AiTaskResult | null>(null);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiRunMessage, setAiRunMessage] = useState("");
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestMessage, setAiTestMessage] = useState("");
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  useEffect(() => {
    void Promise.all([loadWorkbenchSnapshot(), getStorageDescriptor(), loadAiSettings()]).then(
      ([nextSnapshot, nextStorageDescriptor, nextAiSettings]) => {
        setSnapshot(nextSnapshot);
        setStorageDescriptor(nextStorageDescriptor);
        setAiSettings(nextAiSettings);
        setSelectedAiProfileId(
          getDefaultAiProfile(nextAiSettings)?.id ?? nextAiSettings.profiles[0]?.id ?? null
        );
        setAiProfileDraft(createAiProfileDraft(getDefaultAiProfile(nextAiSettings)));
        setSelectedFolderId(nextSnapshot.folders[0]?.id ?? null);
        setStatusMessage("工作台已加载。");
      }
    );
  }, []);

  const folders = snapshot?.folders ?? [];
  const assets = useMemo(() => (snapshot ? mapPromptAssets(snapshot) : []), [snapshot]);
  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) ?? null;
  const folderAssets = useMemo(
    () => assets.filter((asset) => asset.folder_id === selectedFolderId),
    [assets, selectedFolderId]
  );
  const visibleAssets = useMemo(
    () => {
      const filtered = folderAssets.filter(
        (asset) => (!favoritesOnly || asset.is_favorite) && matchesAssetQuery(asset, searchQuery)
      );

      return sortAssetsForDisplay(filtered, selectedFolder?.type ?? "library", sortMode);
    },
    [favoritesOnly, folderAssets, searchQuery, selectedFolder?.type, sortMode]
  );
  const favoriteCount = useMemo(
    () => folderAssets.filter((asset) => asset.is_favorite).length,
    [folderAssets]
  );
  const projectDuration = useMemo(
    () =>
      folderAssets.reduce(
        (total, asset) => total + (selectedFolder?.type === "project" ? asset.payload.storyboard?.duration_seconds ?? 0 : 0),
        0
      ),
    [folderAssets, selectedFolder?.type]
  );
  const activeAsset = assets.find((asset) => asset.id === activeAssetId) ?? null;
  const activeAiProfile =
    findAiProfile(aiSettings, selectedAiProfileId) ??
    getDefaultAiProfile(aiSettings) ??
    aiSettings.profiles[0] ??
    null;
  const exportPreview = assetDraft ? buildExportPreview(assetDraft.payload) : "";
  const draftIsDirty = useMemo(
    () => assetFingerprint(assetDraft) !== assetFingerprint(activeAsset),
    [activeAsset, assetDraft]
  );
  const saveStateLabel = isManualSaving || isAutoSaving ? "保存中" : draftIsDirty ? "待保存" : "已保存";

  useEffect(() => {
    if (activeAsset) {
      setAssetDraft(cloneAsset(activeAsset));
      setIsEditingAssetTitle(false);
      setConfirmAssetDelete(false);
    } else {
      setAssetDraft(null);
      setIsEditingAssetTitle(false);
      setConfirmAssetDelete(false);
    }
  }, [activeAsset]);

  useEffect(() => {
    setCopyTargetFolderId(selectedFolderId);
    if (selectedFolder?.type === "project") {
      setSortMode("shot_number");
    } else if (sortMode === "shot_number") {
      setSortMode("updated_desc");
    }
  }, [selectedFolder?.type, selectedFolderId]);

  useEffect(() => {
    if (activeAiProfile) {
      setSelectedAiProfileId(activeAiProfile.id);
    }
  }, [activeAiProfile?.id]);

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

  useEffect(() => {
    if (!assetDraft || !activeAsset || !draftIsDirty) {
      return;
    }

    const timer = window.setTimeout(() => {
      const draftToSave = cloneAsset(assetDraft);
      setIsAutoSaving(true);
      void updatePromptAsset({
        id: draftToSave.id,
        folder_id: draftToSave.folder_id,
        title: draftToSave.title.trim() || "未命名资产",
        payload: draftToSave.payload,
        is_favorite: draftToSave.is_favorite
      })
        .then((nextSnapshot) => {
          applySnapshot(
            nextSnapshot,
            storageDescriptor?.mode === "sqlite" ? "已自动保存到 SQLite。" : "已自动保存。"
          );
          setSelectedFolderId(draftToSave.folder_id);
        })
        .catch(() => {
          setStatusMessage("自动保存失败。");
        })
        .finally(() => {
          setIsAutoSaving(false);
        });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [activeAsset, assetDraft, draftIsDirty, storageDescriptor?.mode]);

  useEffect(() => {
    if (!draftIsDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [draftIsDirty]);

  useEffect(() => {
    if (!drawerOpen && !aiSettingsOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }

      if (aiSettingsOpen) {
        setAiSettingsOpen(false);
        return;
      }

      if (importPanelOpen) {
        setImportPanelOpen(false);
        return;
      }

      if (folderContextMenu) {
        closeFolderContextMenu();
        return;
      }

      if (assetContextMenu) {
        closeAssetContextMenu();
        return;
      }

      if (isEditingAssetTitle) {
        setIsEditingAssetTitle(false);
        return;
      }

      if (aiPanelOpen) {
        setAiPanelOpen(false);
        return;
      }

      closeDrawer();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [aiPanelOpen, aiSettingsOpen, assetContextMenu, drawerOpen, folderContextMenu, importPanelOpen, isEditingAssetTitle]);

  function applySnapshot(nextSnapshot: WorkbenchSnapshot, message: string): WorkbenchSnapshot {
    setSnapshot(nextSnapshot);
    setStatusMessage(message);
    return nextSnapshot;
  }

  function openAsset(assetId: string): void {
    closeAssetContextMenu();
    closeFolderContextMenu();
    setActiveAssetId(assetId);
    setDrawerOpen(true);
    setAiPanelOpen(false);
  }

  function closeDrawer(): void {
    setDrawerOpen(false);
    setActiveAssetId(null);
    setDraggingBlockId(null);
    setDragOverBlockId(null);
    setIsEditingAssetTitle(false);
    setConfirmAssetDelete(false);
    setAiPanelOpen(false);
  }

  function closeFolderContextMenu(): void {
    setFolderContextMenu(null);
  }

  function closeAssetContextMenu(): void {
    setAssetContextMenu(null);
  }

  function beginFolderRename(folder: FolderRecord): void {
    setSelectedFolderId(folder.id);
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
    closeFolderContextMenu();
    closeAssetContextMenu();
  }

  function cancelFolderRename(): void {
    setEditingFolderId(null);
    setEditingFolderName("");
  }

  async function commitFolderRename(folder: FolderRecord): Promise<void> {
    const nextName = editingFolderName.trim() || folder.name;
    if (nextName === folder.name) {
      cancelFolderRename();
      return;
    }

    applySnapshot(
      await updateFolder({
        id: folder.id,
        name: nextName,
        type: folder.type
      }),
      "目录名称已更新。"
    );
    setEditingFolderId(null);
    setEditingFolderName("");
  }

  function openFolderContextMenu(event: React.MouseEvent, folder: FolderRecord): void {
    event.preventDefault();
    setSelectedFolderId(folder.id);
    setActiveAssetId(null);
    closeDrawer();
    cancelFolderRename();
    closeAssetContextMenu();
    setFolderContextMenu({
      folder,
      x: Math.min(event.clientX, window.innerWidth - 196),
      y: Math.min(event.clientY, window.innerHeight - 148),
      confirmDelete: false
    });
  }

  function openAssetContextMenu(event: React.MouseEvent, asset: PromptAsset): void {
    event.preventDefault();
    event.stopPropagation();
    cancelFolderRename();
    closeFolderContextMenu();
    setAssetContextMenu({
      asset,
      x: Math.min(event.clientX, window.innerWidth - 196),
      y: Math.min(event.clientY, window.innerHeight - 96)
    });
  }

  async function handleCreateFolder(type: FolderType): Promise<void> {
    const nextSnapshot = applySnapshot(
      await createFolder({
        name: type === "library" ? "新提示词库" : "新项目",
        type
      }),
      "已创建目录。"
    );
    const nextFolder = [...nextSnapshot.folders].sort((left, right) => right.created_at - left.created_at)[0];
    setSelectedFolderId(nextFolder?.id ?? null);
  }

  async function handleDeleteFolder(folder: FolderRecord): Promise<void> {
    const nextSnapshot = applySnapshot(await deleteFolder(folder.id), "目录已删除。");
    setSelectedFolderId(nextSnapshot.folders[0]?.id ?? null);
    if (activeAsset && activeAsset.folder_id === folder.id) {
      setActiveAssetId(null);
      closeDrawer();
    }
    closeFolderContextMenu();
  }

  async function handleDeleteAssetDirect(asset: PromptAsset): Promise<void> {
    applySnapshot(await deletePromptAsset(asset.id), "资产已删除。");
    closeAssetContextMenu();

    if (activeAssetId === asset.id) {
      closeDrawer();
    }
  }

  async function handleCreateAsset(): Promise<void> {
    if (!selectedFolder) {
      return;
    }

    const nextShotNumber =
      selectedFolder.type === "project" ? getNextShotNumber(assets, selectedFolder.id) : 1;

    const nextSnapshot = applySnapshot(
      await createPromptAsset({
        folder_id: selectedFolder.id,
        title:
          selectedFolder.type === "project"
            ? `镜头 ${String(nextShotNumber).padStart(2, "0")} / 新分镜卡片`
            : "新提示词资产",
        payload: createDefaultPayload(selectedFolder.type, nextShotNumber),
        is_favorite: false
      }),
      "已创建资产。"
    );
    const nextAsset = mapPromptAssets(nextSnapshot).find((asset) => asset.folder_id === selectedFolder.id);
    if (nextAsset) {
      setActiveAssetId(nextAsset.id);
      setDrawerOpen(true);
    }
  }

  async function persistAssetDraft(mode: "manual" | "auto"): Promise<void> {
    if (!assetDraft) {
      return;
    }

    const draftToSave = cloneAsset(assetDraft);
    if (mode === "manual") {
      setIsManualSaving(true);
    }

    try {
      const nextSnapshot = applySnapshot(
        await updatePromptAsset({
          id: draftToSave.id,
          folder_id: draftToSave.folder_id,
          title: draftToSave.title.trim() || "未命名资产",
          payload: draftToSave.payload,
          is_favorite: draftToSave.is_favorite
        }),
        mode === "manual"
          ? storageDescriptor?.mode === "sqlite"
            ? "资产已保存到 SQLite。"
            : "资产已保存。"
          : storageDescriptor?.mode === "sqlite"
            ? "已自动保存到 SQLite。"
            : "已自动保存。"
      );
      setSelectedFolderId(draftToSave.folder_id);
      const refreshed = mapPromptAssets(nextSnapshot).find((asset) => asset.id === draftToSave.id) ?? null;
      setAssetDraft(refreshed ? cloneAsset(refreshed) : null);
    } finally {
      if (mode === "manual") {
        setIsManualSaving(false);
      }
    }
  }

  async function handleSaveAsset(): Promise<void> {
    await persistAssetDraft("manual");
  }

  async function handleDeleteAsset(): Promise<void> {
    if (!assetDraft) {
      return;
    }

    if (!confirmAssetDelete) {
      setConfirmAssetDelete(true);
      setStatusMessage("再次点击“确认删除”以删除当前资产。");
      return;
    }

    const deletedAssetId = assetDraft.id;
    applySnapshot(await deletePromptAsset(deletedAssetId), "资产已删除。");
    setConfirmAssetDelete(false);
    closeDrawer();
  }

  async function handleCopy(): Promise<void> {
    if (!exportPreview) {
      return;
    }

    if (await copyText(exportPreview)) {
      setCopyFeedback("导出预览已复制");
      window.setTimeout(() => setCopyFeedback(""), 1800);
    }
  }

  async function handleCopyStoragePath(): Promise<void> {
    if (!storageDescriptor?.path) {
      return;
    }

    if (await copyText(storageDescriptor.path)) {
      setStatusMessage("存储路径已复制。");
    }
  }

  async function handleCopyWorkbenchJson(): Promise<void> {
    const json = await exportWorkbenchJson();
    if (await copyText(json)) {
      setStatusMessage("全量 JSON 已复制。");
    }
  }

  async function handleDownloadWorkbenchJson(): Promise<void> {
    const json = await exportWorkbenchJson();
    downloadJsonFile(json, `prompt-workbench-${new Date().toISOString().slice(0, 10)}.json`);
    setStatusMessage("全量 JSON 已下载。");
  }

  async function handleDuplicateAsset(asset: PromptAsset, targetFolderId = asset.folder_id): Promise<void> {
    const targetFolder = folders.find((folder) => folder.id === targetFolderId) ?? selectedFolder;
    const duplicatedPayload = duplicatePayload(asset.payload);

    if (targetFolder?.type === "project") {
      duplicatedPayload.storyboard = {
        ...(duplicatedPayload.storyboard ?? { shot_number: 1 }),
        shot_number: getNextShotNumber(assets, targetFolderId)
      };
    } else {
      duplicatedPayload.storyboard = undefined;
    }

    const nextSnapshot = applySnapshot(
      await createPromptAsset({
        folder_id: targetFolderId,
        title: `${asset.title} 副本`,
        payload: duplicatedPayload,
        is_favorite: false
      }),
      targetFolderId === asset.folder_id ? "已复制资产。" : "已复制到目标目录。"
    );

    const duplicatedAsset =
      mapPromptAssets(nextSnapshot).find(
        (nextAsset) => nextAsset.folder_id === targetFolderId && nextAsset.title === `${asset.title} 副本`
      ) ?? null;

    if (duplicatedAsset) {
      setSelectedFolderId(targetFolderId);
      setActiveAssetId(duplicatedAsset.id);
      setDrawerOpen(true);
    }
    closeAssetContextMenu();
  }

  async function handleDuplicateCurrentAsset(): Promise<void> {
    if (!activeAsset) {
      return;
    }

    await handleDuplicateAsset(activeAsset, copyTargetFolderId ?? activeAsset.folder_id);
  }

  function duplicateDraftBlock(blockId: string): void {
    if (!assetDraft) {
      return;
    }

    const blockIndex = assetDraft.payload.blocks.findIndex((block) => block.id === blockId);
    if (blockIndex === -1) {
      return;
    }

    const nextBlocks = [...assetDraft.payload.blocks];
    nextBlocks.splice(blockIndex + 1, 0, duplicateBlock(nextBlocks[blockIndex]));
    setAssetDraft({
      ...assetDraft,
      payload: {
        ...assetDraft.payload,
        blocks: nextBlocks
      }
    });
  }

  async function handleCreateVersion(): Promise<void> {
    if (!assetDraft) {
      return;
    }

    const version = createVersionSnapshot(assetDraft, versionName);
    const nextDraft = {
      ...assetDraft,
      payload: appendVersion(assetDraft.payload, version)
    };

    setVersionName("");
    setAssetDraft(nextDraft);
    const nextSnapshot = applySnapshot(
      await updatePromptAsset({
        id: nextDraft.id,
        folder_id: nextDraft.folder_id,
        title: nextDraft.title.trim() || "未命名资产",
        payload: nextDraft.payload,
        is_favorite: nextDraft.is_favorite
      }),
      "已创建版本快照。"
    );

    const refreshed = mapPromptAssets(nextSnapshot).find((asset) => asset.id === nextDraft.id) ?? null;
    setAssetDraft(refreshed ? cloneAsset(refreshed) : nextDraft);
  }

  async function handleRestoreVersion(versionId: string): Promise<void> {
    if (!assetDraft) {
      return;
    }

    const restored = restoreFromVersion(assetDraft.payload, versionId);
    if (!restored) {
      return;
    }

    const nextDraft = {
      ...assetDraft,
      title: restored.title,
      payload: restored.payload
    };

    setAssetDraft(nextDraft);
    const nextSnapshot = applySnapshot(
      await updatePromptAsset({
        id: nextDraft.id,
        folder_id: nextDraft.folder_id,
        title: nextDraft.title.trim() || "未命名资产",
        payload: nextDraft.payload,
        is_favorite: nextDraft.is_favorite
      }),
      "已恢复到所选版本。"
    );

    const refreshed = mapPromptAssets(nextSnapshot).find((asset) => asset.id === nextDraft.id) ?? null;
    setAssetDraft(refreshed ? cloneAsset(refreshed) : nextDraft);
  }

  async function handleCopyProjectScript(): Promise<void> {
    if (selectedFolder?.type !== "project") {
      return;
    }

    const script = buildProjectScript(folderAssets);
    if (!script) {
      setStatusMessage("当前项目没有可导出的分镜脚本。");
      return;
    }

    if (await copyText(script)) {
      setStatusMessage("项目分镜脚本已复制。");
    }
  }

  async function handleImportAssets(): Promise<void> {
    if (!selectedFolder) {
      return;
    }

    const importedAssets = parseImportedAssets(importRaw, selectedFolder.type);
    if (importedAssets.length === 0) {
      setStatusMessage("没有识别到可导入的内容。");
      return;
    }

    let nextSnapshot: WorkbenchSnapshot | null = null;

    for (let index = 0; index < importedAssets.length; index += 1) {
      const item = importedAssets[index];
      const title = importedAssets.length === 1 && importTitle.trim() ? importTitle.trim() : item.title;
      const payload =
        selectedFolder.type === "project"
          ? {
              ...item.payload,
              storyboard: {
                ...(item.payload.storyboard ?? {}),
                shot_number:
                  item.payload.storyboard?.shot_number ??
                  getNextShotNumber(mapPromptAssets(nextSnapshot ?? snapshot!), selectedFolder.id)
              }
            }
          : item.payload;

      nextSnapshot = await createPromptAsset({
        folder_id: selectedFolder.id,
        title,
        payload,
        is_favorite: false
      });
    }

    if (nextSnapshot) {
      applySnapshot(nextSnapshot, `已导入 ${importedAssets.length} 条资产。`);
      setImportPanelOpen(false);
      setImportRaw("");
      setImportTitle("");
    }
  }

  function beginCreateAiProfile(): void {
    setAiProfileDraft({
      ...createAiProfileDraft(),
      is_default: aiSettings.profiles.length === 0
    });
    setAiTestMessage("");
  }

  function selectAiProfile(profileId: string): void {
    const profile = findAiProfile(aiSettings, profileId);
    if (!profile) {
      return;
    }

    setSelectedAiProfileId(profile.id);
    setAiProfileDraft(createAiProfileDraft(profile));
    setAiTestMessage("");
  }

  async function handleSaveAiProfile(): Promise<void> {
    const nextSettings = await saveAiProfile(aiProfileDraft);
    const nextProfile =
      (aiProfileDraft.id
        ? findAiProfile(nextSettings, aiProfileDraft.id)
        : nextSettings.profiles[0]) ?? null;
    setAiSettings(nextSettings);
    const profileId = nextProfile?.id ?? nextSettings.default_profile_id ?? nextSettings.profiles[0]?.id ?? null;
    setSelectedAiProfileId(profileId);
    setAiProfileDraft(createAiProfileDraft(findAiProfile(nextSettings, profileId)));
    setAiTestMessage("AI 配置已保存。");
    setStatusMessage("AI 配置已保存。");
  }

  async function handleDeleteAiProfile(): Promise<void> {
    if (!aiProfileDraft.id) {
      setAiProfileDraft(createAiProfileDraft());
      return;
    }

    const nextSettings = await deleteAiProfile(aiProfileDraft.id);
    const nextProfileId = nextSettings.default_profile_id ?? nextSettings.profiles[0]?.id ?? null;
    setAiSettings(nextSettings);
    setSelectedAiProfileId(nextProfileId);
    setAiProfileDraft(createAiProfileDraft(findAiProfile(nextSettings, nextProfileId)));
    setAiTestMessage("AI 配置已删除。");
    setStatusMessage("AI 配置已删除。");
  }

  async function handleTestAiProfile(): Promise<void> {
    setAiTesting(true);
    setAiTestMessage("");
    try {
      const result = await testAiProfile(aiProfileDraft);
      setAiTestMessage(`连接成功：${result}`);
    } catch (error) {
      setAiTestMessage(error instanceof Error ? error.message : "连接测试失败。");
    } finally {
      setAiTesting(false);
    }
  }

  async function handleRunAi(): Promise<void> {
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
        folder_type: selectedFolder?.type ?? "library",
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

  function handleApplyAiToTargetBlock(): void {
    if (!assetDraft || !aiResult?.text || !aiTargetBlockId) {
      return;
    }

    const nextBlocks = assetDraft.payload.blocks.map((block) =>
      block.id === aiTargetBlockId ? { ...block, content: aiResult.text } : block
    );
    applyAiVersionSnapshot(formatAiTaskLabel(aiTaskType), assetDraft.title, nextBlocks);
  }

  function handleAppendAiAsBlock(): void {
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

  async function handleCopyAiResult(): Promise<void> {
    if (!aiResult?.text) {
      return;
    }

    if (await copyText(aiResult.text)) {
      setAiRunMessage("AI 结果已复制。");
    }
  }

  function updateDraftBlock(blockId: string, patch: Partial<PromptBlock>): void {
    if (!assetDraft) {
      return;
    }

    setAssetDraft({
      ...assetDraft,
      payload: {
        ...assetDraft.payload,
        blocks: assetDraft.payload.blocks.map((block) =>
          block.id === blockId ? { ...block, ...patch } : block
        )
      }
    });
  }

  function removeDraftBlock(blockId: string): void {
    if (!assetDraft) {
      return;
    }

    setAssetDraft({
      ...assetDraft,
      payload: {
        ...assetDraft.payload,
        blocks: assetDraft.payload.blocks.filter((block) => block.id !== blockId)
      }
    });
  }

  function addDraftBlock(): void {
    if (!assetDraft) {
      return;
    }

    setAssetDraft({
      ...assetDraft,
      payload: {
        ...assetDraft.payload,
        blocks: [...assetDraft.payload.blocks, createBlock("custom")]
      }
    });
  }

  function moveDraftBlock(sourceBlockId: string, targetBlockId: string): void {
    setAssetDraft((current) => {
      if (!current) {
        return current;
      }

      const fromIndex = current.payload.blocks.findIndex((block) => block.id === sourceBlockId);
      const toIndex = current.payload.blocks.findIndex((block) => block.id === targetBlockId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return current;
      }

      return {
        ...current,
        payload: {
          ...current.payload,
          blocks: reorderBlocks(current.payload.blocks, fromIndex, toIndex)
        }
      };
    });
  }

  function handleBlockPointerDown(event: ReactPointerEvent<HTMLElement>, blockId: string): void {
    if (isBlockControlTarget(event.target)) {
      return;
    }

    event.preventDefault();
    setDraggingBlockId(blockId);
    setDragOverBlockId(null);
  }

  function handleBlockPointerEnter(event: ReactPointerEvent<HTMLElement>, blockId: string): void {
    if (!draggingBlockId || draggingBlockId === blockId || event.buttons === 0) {
      return;
    }

    if (dragOverBlockId === blockId) {
      return;
    }

    setDragOverBlockId(blockId);
    moveDraftBlock(draggingBlockId, blockId);
  }

  function handleBlockDragEnd(): void {
    setDraggingBlockId(null);
    setDragOverBlockId(null);
  }

  function clearBlockDragState(): void {
    setDraggingBlockId(null);
    setDragOverBlockId(null);
  }

  useEffect(() => {
    if (!draggingBlockId) {
      return;
    }

    const clearDragging = () => {
      handleBlockDragEnd();
    };

    window.addEventListener("pointerup", clearDragging);
    window.addEventListener("pointercancel", clearDragging);

    return () => {
      window.removeEventListener("pointerup", clearDragging);
      window.removeEventListener("pointercancel", clearDragging);
    };
  }, [draggingBlockId]);

  if (!snapshot) {
    return (
      <div className="grid h-screen place-items-center bg-[#f4efe7] text-sm text-[#8b8379]">
        {statusMessage}
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#f4efe7] text-[#5f584f]">
      <div className="flex h-full">
        <aside className="flex h-full w-52 shrink-0 flex-col border-r border-[#d8cfc5] bg-[#ebe4dc]/95 backdrop-blur-sm">
          <div className="border-b border-[#d8cfc5] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#8ca29a]">AI Prompt Workbench</p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-[#5a544d]">本地提示词工作台</h1>
            <p className="mt-2 text-sm leading-6 text-[#8b8379]">
              左侧切目录，主区浏览与内联编辑，数据直接落在 SQLite 两表结构中。
            </p>
          </div>

          <div className="border-b border-[#d8cfc5] p-3">
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => void handleCreateFolder("library")}
                className="rounded-2xl bg-[#a8b7ad] px-5 py-2 text-sm font-medium text-[#4e4943] hover:bg-[#97a79d]"
              >
                新建提示词库
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiSettingsOpen(true);
                  setAiProfileDraft(createAiProfileDraft(activeAiProfile));
                  setAiTestMessage("");
                }}
                className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-5 py-2 text-sm text-[#6a645c] hover:bg-[#efe8df]"
              >
                AI 配置
              </button>
            </div>
          </div>

          <div className="border-b border-[#d8cfc5] px-3 py-3">
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[#9a9085]">Search</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索标题、标签、备注、Block"
                className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-3 py-2.5 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
              />
            </label>
            <label className="mt-3 flex items-center gap-3 rounded-2xl border border-[#d8cfc5] bg-[#f6f0e8] px-3 py-2.5 text-sm text-[#6a645c]">
              <input
                type="checkbox"
                checked={favoritesOnly}
                onChange={(event) => setFavoritesOnly(event.target.checked)}
                className="h-4 w-4"
              />
              仅看收藏资产
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-xs uppercase tracking-[0.22em] text-[#9a9085]">Folders</span>
              <span className="rounded-full border border-[#d8cfc5] px-2 py-1 text-[11px] text-[#8b8379]">
                {folders.length}
              </span>
            </div>

            <div className="space-y-2">
              {folders.map((folder) => {
                const isActive = folder.id === selectedFolderId;
                const isEditing = folder.id === editingFolderId;
                return (
                  <div
                    key={folder.id}
                    onClick={() => {
                      setSelectedFolderId(folder.id);
                      setActiveAssetId(null);
                      closeDrawer();
                      closeFolderContextMenu();
                      closeAssetContextMenu();
                    }}
                    onContextMenu={(event) => openFolderContextMenu(event, folder)}
                    onKeyDown={(event) => {
                      if ((event.key === "Enter" || event.key === " ") && !isEditing) {
                        event.preventDefault();
                        setSelectedFolderId(folder.id);
                        setActiveAssetId(null);
                        closeDrawer();
                        closeFolderContextMenu();
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={[
                      "w-full rounded-2xl border px-3 py-3 text-left transition",
                      isActive
                        ? "border-[#adbbb0] bg-[#dde5df] shadow-[0_0_0_1px_rgba(168,183,173,0.28)]"
                        : "border-[#ddd5cc] bg-[#f8f3ed] hover:border-[#cbc0b4] hover:bg-[#f1ebe3]"
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editingFolderName}
                          onChange={(event) => setEditingFolderName(event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          onBlur={() => void commitFolderRename(folder)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void commitFolderRename(folder);
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              cancelFolderRename();
                            }
                          }}
                          className="min-w-0 flex-1 rounded-xl border border-[#cbc0b4] bg-[#fcf8f4] px-3 py-2 text-sm font-medium text-[#5b554e] outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            beginFolderRename(folder);
                          }}
                          className="min-w-0 truncate text-sm font-medium text-[#5b554e]"
                        >
                          {folder.name}
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-[#988f84]">{formatFolderType(folder.type)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[#d8cfc5] px-3 py-2.5 text-xs text-[#988f84]">{statusMessage}</div>
        </aside>

        {folderContextMenu ? (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={closeFolderContextMenu}
              onContextMenu={(event) => {
                event.preventDefault();
                closeFolderContextMenu();
              }}
            />
            <div
              className="fixed z-50 min-w-[220px] rounded-2xl border border-[#d8cfc5] bg-[#fffaf5] p-2 shadow-[0_18px_50px_rgba(116,106,94,0.12)]"
              style={{ left: folderContextMenu.x, top: folderContextMenu.y }}
            >
              {folderContextMenu.confirmDelete ? (
                <>
                  <div className="px-3 py-2 text-xs leading-6 text-[#8b8379]">
                    确认删除「{folderContextMenu.folder.name}」及其下所有资产？
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteFolder(folderContextMenu.folder)}
                    className="mt-1 w-full rounded-xl bg-[#efe2da] px-3 py-2 text-left text-sm text-[#9b7769] hover:bg-[#e8d9d0]"
                  >
                    确认删除
                  </button>
                  <button
                    type="button"
                    onClick={closeFolderContextMenu}
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-[#5f584f] hover:bg-[#f2ebe3]"
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => beginFolderRename(folderContextMenu.folder)}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#5f584f] hover:bg-[#f2ebe3]"
                  >
                    重命名
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFolderContextMenu((current) =>
                        current
                          ? {
                              ...current,
                              confirmDelete: true
                            }
                          : current
                      )
                    }
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-[#9b7769] hover:bg-[#efe2da]"
                  >
                    删除目录
                  </button>
                  <div className="my-2 border-t border-[#e2d8ce]" />
                  <button
                    type="button"
                    onClick={() => {
                      closeFolderContextMenu();
                      void handleCopyStoragePath();
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#5f584f] hover:bg-[#f2ebe3]"
                  >
                    复制存储路径
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeFolderContextMenu();
                      void handleCopyWorkbenchJson();
                    }}
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-[#5f584f] hover:bg-[#f2ebe3]"
                  >
                    复制全量 JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeFolderContextMenu();
                      void handleDownloadWorkbenchJson();
                    }}
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-[#5f584f] hover:bg-[#f2ebe3]"
                  >
                    下载全量 JSON
                  </button>
                </>
              )}
            </div>
          </>
        ) : null}

        {assetContextMenu ? (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={closeAssetContextMenu}
              onContextMenu={(event) => {
                event.preventDefault();
                closeAssetContextMenu();
              }}
            />
            <div
              className="fixed z-50 min-w-[180px] rounded-2xl border border-[#d8cfc5] bg-[#fffaf5] p-2 shadow-[0_18px_50px_rgba(116,106,94,0.12)]"
              style={{ left: assetContextMenu.x, top: assetContextMenu.y }}
            >
              <button
                type="button"
                onClick={() => void handleDuplicateAsset(assetContextMenu.asset)}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#5f584f] hover:bg-[#f2ebe3]"
              >
                复制资产
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAssetDirect(assetContextMenu.asset)}
                className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-[#9b7769] hover:bg-[#efe2da]"
              >
                直接删除
              </button>
            </div>
          </>
        ) : null}

        {aiSettingsOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-[#5f584f]/18 backdrop-blur-[2px]"
              onClick={() => setAiSettingsOpen(false)}
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
                  onClick={() => setAiSettingsOpen(false)}
                  className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-3 py-2 text-sm text-[#6a645c] hover:bg-[#efe8df]"
                >
                  关闭
                </button>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={beginCreateAiProfile}
                    className="w-full rounded-2xl bg-[#e2ddd5] px-4 py-3 text-sm font-medium text-[#5a544d] hover:bg-[#d6cec5]"
                  >
                    新建模型配置
                  </button>
                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {aiSettings.profiles.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => selectAiProfile(profile.id)}
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
                        onChange={(event) => setAiProfileDraft({ ...aiProfileDraft, name: event.target.value })}
                        placeholder="例如：OpenAI 主力模型"
                        className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Model</span>
                      <input
                        value={aiProfileDraft.model}
                        onChange={(event) => setAiProfileDraft({ ...aiProfileDraft, model: event.target.value })}
                        placeholder="例如：gpt-4.1-mini"
                        className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Base URL</span>
                    <input
                      value={aiProfileDraft.base_url}
                      onChange={(event) => setAiProfileDraft({ ...aiProfileDraft, base_url: event.target.value })}
                      placeholder="https://api.openai.com/v1"
                      className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">API Key</span>
                    <input
                      type="password"
                      value={aiProfileDraft.api_key}
                      onChange={(event) => setAiProfileDraft({ ...aiProfileDraft, api_key: event.target.value })}
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
                        onChange={(event) =>
                          setAiProfileDraft({
                            ...aiProfileDraft,
                            temperature: Number(event.target.value || 0)
                          })
                        }
                        className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Max Tokens</span>
                      <input
                        value={aiProfileDraft.max_tokens}
                        onChange={(event) => setAiProfileDraft({ ...aiProfileDraft, max_tokens: event.target.value })}
                        placeholder="留空使用模型默认值"
                        className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
                      />
                    </label>
                    <label className="flex items-center gap-3 self-end rounded-2xl border border-[#d8cfc5] bg-[#f3ede6] px-4 py-3 text-sm text-[#6a645c]">
                      <input
                        type="checkbox"
                        checked={aiProfileDraft.is_default}
                        onChange={(event) =>
                          setAiProfileDraft({ ...aiProfileDraft, is_default: event.target.checked })
                        }
                        className="h-4 w-4"
                      />
                      设为默认模型
                    </label>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => void handleTestAiProfile()}
                      disabled={aiTesting}
                      className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-4 py-3 text-sm text-[#6a645c] hover:bg-[#efe8df] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {aiTesting ? "测试中..." : "测试连接"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveAiProfile()}
                      className="rounded-2xl bg-[#a8b7ad] px-4 py-3 text-sm font-medium text-[#4e4943] hover:bg-[#97a79d]"
                    >
                      保存配置
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAiProfile()}
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
        ) : null}

        {importPanelOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-[#5f584f]/18 backdrop-blur-[2px]"
              onClick={() => setImportPanelOpen(false)}
            />
            <div className="fixed inset-x-0 top-10 z-50 mx-auto w-[min(720px,calc(100vw-40px))] rounded-[28px] border border-[#d8cfc5] bg-[#fffaf5] p-5 shadow-[0_24px_80px_rgba(116,106,94,0.18)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Import Assets</div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#5b554e]">导入 / 迁移资产</h3>
                  <p className="mt-2 text-sm leading-6 text-[#8b8379]">
                    支持粘贴 JSON 快照、单条 payload JSON、Markdown 或普通纯文本。导入目标：{selectedFolder?.name ?? "--"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setImportPanelOpen(false)}
                  className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-3 py-2 text-sm text-[#6a645c] hover:bg-[#efe8df]"
                >
                  关闭
                </button>
              </div>
              <div className="mt-5 grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Asset Title</span>
                  <input
                    value={importTitle}
                    onChange={(event) => setImportTitle(event.target.value)}
                    placeholder="单条导入时可覆盖标题；批量导入时忽略"
                    className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Raw Content</span>
                  <textarea
                    rows={12}
                    value={importRaw}
                    onChange={(event) => setImportRaw(event.target.value)}
                    placeholder="把 JSON、Markdown 或纯文本粘贴到这里"
                    className="w-full rounded-3xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-4 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
                  />
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setImportPanelOpen(false)}
                  className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-4 py-3 text-sm text-[#6a645c] hover:bg-[#efe8df]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void handleImportAssets()}
                  className="rounded-2xl bg-[#a8b7ad] px-4 py-3 text-sm font-medium text-[#4e4943] hover:bg-[#97a79d]"
                >
                  开始导入
                </button>
              </div>
            </div>
          </>
        ) : null}

        <main className="relative flex h-full flex-1 overflow-hidden">
          <div className="flex h-full flex-1 flex-col overflow-hidden px-6 py-6">
            {!drawerOpen ? (
              <header className="shrink-0">
                <section className="rounded-[28px] border border-[#d8cfc5] bg-[#f8f3ed]/90 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-[#9a9085]">Current Folder</p>
                      <button
                        type="button"
                        onClick={() => selectedFolder && beginFolderRename(selectedFolder)}
                        className="mt-2 text-left text-3xl font-semibold tracking-tight text-[#5a544d]"
                      >
                        {selectedFolder?.name ?? "未选择目录"}
                      </button>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8b8379]">
                        点击下方 Prompt Asset 后，会在当前列表区域直接展开编辑器，不再从右侧抽屉滑出。
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-3">
                      {selectedFolder?.type === "project" ? (
                        <button
                          type="button"
                          onClick={() => void handleCopyProjectScript()}
                          className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-4 py-3 text-sm text-[#6a645c] hover:bg-[#efe8df]"
                        >
                          复制项目脚本
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setImportPanelOpen(true)}
                        disabled={!selectedFolder}
                        className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-4 py-3 text-sm text-[#6a645c] hover:bg-[#efe8df] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        导入资产
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCreateAsset()}
                        disabled={!selectedFolder}
                        className="rounded-2xl bg-[#a8b7ad] px-4 py-3 text-sm font-medium text-[#4e4943] hover:bg-[#97a79d] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        新建资产
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl bg-[#efe8e1] p-4">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-[#9a9085]">Type</div>
                      <div className="mt-3 text-lg font-semibold text-[#5b554e]">
                        {selectedFolder ? formatFolderType(selectedFolder.type) : "--"}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-[#efe8e1] p-4">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-[#9a9085]">Assets</div>
                      <div className="mt-3 text-lg font-semibold text-[#5b554e]">{folderAssets.length}</div>
                    </div>
                    <div className="rounded-2xl bg-[#efe8e1] p-4">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-[#9a9085]">Favorites</div>
                      <div className="mt-3 text-lg font-semibold text-[#5b554e]">{favoriteCount}</div>
                    </div>
                    <div className="rounded-2xl bg-[#efe8e1] p-4">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-[#9a9085]">Storage</div>
                      <div className="mt-3 text-lg font-semibold text-[#5b554e]">
                        {storageDescriptor?.mode === "sqlite" ? "SQLite" : "localStorage"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#8b8379]">
                    <span className="rounded-full border border-[#d8cfc5] bg-[#f3ede6] px-3 py-1.5">
                      当前显示 {visibleAssets.length} / {folderAssets.length}
                    </span>
                    {selectedFolder?.type === "project" ? (
                      <span className="rounded-full border border-[#bfd0c7] bg-[#e6eeea] px-3 py-1.5 text-[#74877d]">
                        总时长 {projectDuration} 秒
                      </span>
                    ) : null}
                    {searchQuery ? (
                      <span className="rounded-full border border-[#bfd0c7] bg-[#e6eeea] px-3 py-1.5 text-[#74877d]">
                        关键词: {searchQuery}
                      </span>
                    ) : null}
                    {favoritesOnly ? (
                      <span className="rounded-full border border-[#d8c4b5] bg-[#efe4db] px-3 py-1.5 text-[#9a7e6e]">
                        已启用收藏过滤
                      </span>
                    ) : null}
                  </div>
                </section>
              </header>
            ) : null}

            <section className={`${drawerOpen ? "mt-0" : "mt-6"} min-h-0 flex-1 overflow-hidden pr-1`}>
              {drawerOpen && assetDraft ? (
                <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-[#d8cfc5] bg-[#f2ece4] shadow-[0_18px_60px_rgba(116,106,94,0.06)]">
                  <div className="min-h-0 flex-1 px-6 py-5">
                    <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[minmax(0,1.18fr)_360px]">
                      <section className="min-h-0 overflow-y-auto pr-1">
                        <div className="space-y-5 pb-2">
                          <article className="rounded-[28px] border border-[#d8cfc5] bg-[#f8f3ed]/90 p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Header</div>
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                  {isEditingAssetTitle ? (
                                    <input
                                      autoFocus
                                      value={assetDraft.title}
                                      onChange={(event) =>
                                        setAssetDraft({ ...assetDraft, title: event.target.value })
                                      }
                                      onBlur={() => setIsEditingAssetTitle(false)}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          event.preventDefault();
                                          setIsEditingAssetTitle(false);
                                        }
                                        if (event.key === "Escape") {
                                          event.preventDefault();
                                          setIsEditingAssetTitle(false);
                                        }
                                      }}
                                      aria-label="标题"
                                      placeholder="未命名资产"
                                      className="min-w-[280px] flex-[1.1] rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-2xl font-semibold tracking-tight text-[#5e5851] placeholder:text-[#b0a598]"
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setIsEditingAssetTitle(true)}
                                      className="min-w-[280px] flex-[1.1] rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-left text-2xl font-semibold tracking-tight text-[#5e5851]"
                                    >
                                      {assetDraft.title.trim() || "未命名资产"}
                                    </button>
                                  )}
                                  <span
                                    className={[
                                      "rounded-full border px-2.5 py-1 text-[11px]",
                                      saveStateLabel === "已保存"
                                        ? "border-[#bfd0c7] bg-[#e6eeea] text-[#74877d]"
                                        : saveStateLabel === "保存中"
                                          ? "border-[#c6d2cc] bg-[#e8eeeb] text-[#7a8b82]"
                                          : "border-[#d8c4b5] bg-[#efe4db] text-[#9a7e6e]"
                                    ].join(" ")}
                                  >
                                    {saveStateLabel}
                                  </span>
                                  <label className="flex shrink-0 items-center gap-3 rounded-2xl border border-[#d8cfc5] bg-[#f3ede6] px-4 py-3 text-sm text-[#6a645c]">
                                    <input
                                      type="checkbox"
                                      checked={assetDraft.is_favorite}
                                      onChange={(event) =>
                                        setAssetDraft({
                                          ...assetDraft,
                                          is_favorite: event.target.checked
                                        })
                                      }
                                      className="h-4 w-4"
                                    />
                                    收藏
                                  </label>
                                  <input
                                    value={assetDraft.payload.tags.join(", ")}
                                    onChange={(event) =>
                                      setAssetDraft({
                                        ...assetDraft,
                                        payload: {
                                          ...assetDraft.payload,
                                          tags: splitTags(event.target.value)
                                        }
                                      })
                                    }
                                    placeholder="标签：角色, 生图, 镜头01"
                                    aria-label="标签"
                                    className="min-w-[260px] flex-1 rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
                                  />
                                </div>
                                {selectedFolder?.type === "project" ? (
                                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                                    <label className="block">
                                      <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">
                                        镜头编号
                                      </span>
                                      <input
                                        type="number"
                                        min={1}
                                        value={assetDraft.payload.storyboard?.shot_number ?? 1}
                                        onChange={(event) =>
                                          setAssetDraft({
                                            ...assetDraft,
                                            payload: {
                                              ...assetDraft.payload,
                                              storyboard: {
                                                shot_number: Number(event.target.value || 1),
                                                duration_seconds: assetDraft.payload.storyboard?.duration_seconds,
                                                transition: assetDraft.payload.storyboard?.transition ?? ""
                                              }
                                            }
                                          })
                                        }
                                        className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
                                      />
                                    </label>
                                    <label className="block">
                                      <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">
                                        时长（秒）
                                      </span>
                                      <input
                                        type="number"
                                        min={0}
                                        value={assetDraft.payload.storyboard?.duration_seconds ?? ""}
                                        onChange={(event) =>
                                          setAssetDraft({
                                            ...assetDraft,
                                            payload: {
                                              ...assetDraft.payload,
                                              storyboard: {
                                                shot_number: assetDraft.payload.storyboard?.shot_number ?? 1,
                                                duration_seconds: event.target.value ? Number(event.target.value) : undefined,
                                                transition: assetDraft.payload.storyboard?.transition ?? ""
                                              }
                                            }
                                          })
                                        }
                                        className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
                                      />
                                    </label>
                                    <label className="block">
                                      <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">
                                        转场
                                      </span>
                                      <input
                                        value={assetDraft.payload.storyboard?.transition ?? ""}
                                        onChange={(event) =>
                                          setAssetDraft({
                                            ...assetDraft,
                                            payload: {
                                              ...assetDraft.payload,
                                              storyboard: {
                                                shot_number: assetDraft.payload.storyboard?.shot_number ?? 1,
                                                duration_seconds: assetDraft.payload.storyboard?.duration_seconds,
                                                transition: event.target.value
                                              }
                                            }
                                          })
                                        }
                                        placeholder="如：硬切、淡入"
                                        className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
                                      />
                                    </label>
                                  </div>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                onClick={closeDrawer}
                                className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-3 py-2 text-sm text-[#6a645c] hover:bg-[#efe8df]"
                              >
                                返回列表
                              </button>
                            </div>
                          </article>

                          <article className="rounded-[28px] border border-[#d8cfc5] bg-[#f8f3ed]/90 p-5">
                            <div className="mb-4 flex items-center justify-between gap-4">
                              <div>
                                <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Blocks</div>
                                <p className="mt-2 text-sm text-[#8b8379]">按住整张卡片拖动即可调整顺序。</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => addDraftBlock()}
                                className="rounded-2xl bg-[#e2ddd5] px-4 py-2.5 text-sm font-medium text-[#5a544d] hover:bg-[#d6cec5]"
                              >
                                新增 Block
                              </button>
                            </div>

                            <div className="space-y-3">
                              {assetDraft.payload.blocks.map((block, index) => (
                                <article
                                  key={block.id}
                                  onPointerDown={(event) => handleBlockPointerDown(event, block.id)}
                                  onPointerEnter={(event) => handleBlockPointerEnter(event, block.id)}
                                  className={[
                                    "rounded-3xl border border-[#d8cfc5] bg-[#f3ede6] p-4 transition select-none",
                                    draggingBlockId === block.id ? "cursor-grabbing opacity-60" : "cursor-grab",
                                    dragOverBlockId === block.id
                                      ? "border-[#9eb0a5] bg-[#edf3ee] shadow-[0_0_0_1px_rgba(158,176,165,0.35)]"
                                      : ""
                                  ].join(" ")}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                  <input
                                    value={block.label ?? ""}
                                    onChange={(event) =>
                                      updateDraftBlock(block.id, {
                                        label: event.target.value
                                      })
                                    }
                                    onFocus={clearBlockDragState}
                                    onPointerDownCapture={(event) => {
                                      clearBlockDragState();
                                      stopPointerPropagation(event);
                                    }}
                                    aria-label={`Block ${index + 1} 标签`}
                                    placeholder="点击命名 Block"
                                    className="min-w-[180px] w-1/2 max-w-[560px] rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-2.5 text-lg font-semibold tracking-tight text-[#5e5851] placeholder:text-[#b0a598] select-text"
                                  />
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => duplicateDraftBlock(block.id)}
                                        className="rounded-full border border-[#d8cfc5] bg-[#f8f3ed] px-3 py-1.5 text-xs text-[#7f786f] hover:bg-[#ece5dd]"
                                      >
                                        复制
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeDraftBlock(block.id)}
                                        className="rounded-full border border-[#d5b8aa] bg-[#efe2da] px-3 py-1.5 text-xs text-[#9b7769] hover:bg-[#e8d9d0]"
                                      >
                                        删除
                                      </button>
                                    </div>
                                  </div>

                                  <textarea
                                    rows={5}
                                    value={block.content}
                                    onChange={(event) =>
                                      updateDraftBlock(block.id, { content: event.target.value })
                                    }
                                    onFocus={clearBlockDragState}
                                    onPointerDownCapture={(event) => {
                                      clearBlockDragState();
                                      stopPointerPropagation(event);
                                    }}
                                    placeholder="输入这一段提示词内容"
                                    className="mt-3 w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598] select-text"
                                  />
                                </article>
                              ))}
                            </div>
                          </article>
                        </div>
                      </section>

                      <section className="min-h-0 overflow-y-auto pr-1 space-y-5">
                        <article className="rounded-[28px] border border-[#d8cfc5] bg-[#efe8e1] p-5">
                          <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Export Preview</div>
                          <pre className="mt-4 max-h-[280px] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7 text-[#655f58]">
                            {exportPreview || "当前没有可导出的内容。"}
                          </pre>
                          <button
                            type="button"
                            onClick={() => void handleCopy()}
                            className="mt-4 w-full rounded-2xl bg-[#a8b7ad] px-4 py-3 text-sm font-medium text-[#4e4943] hover:bg-[#97a79d]"
                          >
                            复制导出结果
                          </button>
                          <div className="mt-2 text-xs text-[#988f84]">{copyFeedback || "复制到剪贴板"}</div>
                        </article>

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
                              onClick={() => setAiPanelOpen((current) => !current)}
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

                        {aiPanelOpen ? (
                          <>
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
                                  onClick={() => {
                                    setAiSettingsOpen(true);
                                    setAiProfileDraft(createAiProfileDraft(activeAiProfile));
                                    setAiTestMessage("");
                                  }}
                                  className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-3 py-2 text-sm text-[#6a645c] hover:bg-[#efe8df]"
                                >
                                  配置
                                </button>
                              </div>

                              <div className="mt-4 grid gap-4">
                                <label className="block">
                                  <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Model</span>
                                  <select
                                    value={activeAiProfile?.id ?? ""}
                                    onChange={(event) => setSelectedAiProfileId(event.target.value)}
                                    className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
                                  >
                                    {aiSettings.profiles.length > 0 ? (
                                      aiSettings.profiles.map((profile) => (
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
                                    onChange={(event) => setAiTaskType(event.target.value as AiTaskType)}
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
                                      onChange={(event) => setAiTargetBlockId(event.target.value)}
                                      className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
                                    >
                                      {assetDraft.payload.blocks.map((block, index) => (
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
                                    onChange={(event) => setAiInstruction(event.target.value)}
                                    placeholder="例如：更电影感、更适合 Midjourney、保持中文、增强光影层次"
                                    className="w-full rounded-3xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-4 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
                                  />
                                </label>

                                <button
                                  type="button"
                                  onClick={() => void handleRunAi()}
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

                            <article className="rounded-[28px] border border-[#d8cfc5] bg-[#efe8e1] p-5">
                              <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">AI Result</div>
                              <pre className="mt-4 max-h-[280px] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7 text-[#655f58]">
                                {aiResult?.text || "AI 返回的结果会显示在这里。"}
                              </pre>
                              <div className="mt-4 grid gap-3">
                                <button
                                  type="button"
                                  onClick={handleApplyAiToTargetBlock}
                                  disabled={!aiResult?.text || (aiTaskType !== "generate_from_asset" && !aiTargetBlockId)}
                                  className="rounded-2xl bg-[#e2ddd5] px-4 py-3 text-sm font-medium text-[#5a544d] hover:bg-[#d6cec5] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  应用到当前 Block
                                </button>
                                <button
                                  type="button"
                                  onClick={handleAppendAiAsBlock}
                                  disabled={!aiResult?.text}
                                  className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-4 py-3 text-sm text-[#6a645c] hover:bg-[#efe8df] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  追加为新 Block
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleCopyAiResult()}
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
                          </>
                        ) : null}

                        <article className="rounded-[28px] border border-[#d8cfc5] bg-[#f8f3ed]/90 p-5">
                          <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Actions</div>
                          <div className="mt-4 grid gap-3">
                            <button
                              type="button"
                              onClick={() => void handleSaveAsset()}
                              disabled={isManualSaving}
                              className="rounded-2xl bg-[#e2ddd5] px-4 py-3 text-sm font-medium text-[#5a544d] hover:bg-[#d6cec5] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isManualSaving ? "保存中..." : "立即保存"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDuplicateCurrentAsset()}
                              disabled={!copyTargetFolderId}
                              className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-4 py-3 text-sm text-[#6a645c] hover:bg-[#efe8df] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              复制资产
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteAsset()}
                              className="rounded-2xl border border-[#d5b8aa] bg-[#efe2da] px-4 py-3 text-sm text-[#9b7769] hover:bg-[#e8d9d0]"
                            >
                              {confirmAssetDelete ? "确认删除" : "删除资产"}
                            </button>
                          </div>
                          <label className="mt-3 block">
                            <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">
                              复制到目录
                            </span>
                            <select
                              value={copyTargetFolderId ?? ""}
                              onChange={(event) => setCopyTargetFolderId(event.target.value)}
                              className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
                            >
                              {folders.map((folder) => (
                                <option key={folder.id} value={folder.id}>
                                  {folder.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="mt-3 text-xs text-[#988f84]">
                            自动保存已开启，编辑停止约 0.9 秒后会自动落库。
                          </div>
                        </article>

                        <article className="rounded-[28px] border border-[#d8cfc5] bg-[#f8f3ed]/90 p-5">
                          <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Version History</div>
                          <div className="mt-4 flex gap-2">
                            <input
                              value={versionName}
                              onChange={(event) => setVersionName(event.target.value)}
                              placeholder="版本名称（可选）"
                              className="min-w-0 flex-1 rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
                            />
                            <button
                              type="button"
                              onClick={() => void handleCreateVersion()}
                              className="rounded-2xl bg-[#e2ddd5] px-4 py-3 text-sm font-medium text-[#5a544d] hover:bg-[#d6cec5]"
                            >
                              创建版本
                            </button>
                          </div>
                          <div className="mt-4 max-h-[240px] space-y-2 overflow-y-auto">
                            {(assetDraft.payload.versions ?? []).length > 0 ? (
                              (assetDraft.payload.versions ?? []).map((version) => (
                                <div
                                  key={version.id}
                                  className="rounded-2xl border border-[#d8cfc5] bg-[#f7f1ea] px-4 py-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-medium text-[#5b554e]">{version.name}</div>
                                      <div className="mt-1 text-xs text-[#988f84]">
                                        {formatTime(version.created_at)}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => void handleRestoreVersion(version.id)}
                                      className="rounded-full border border-[#d8cfc5] bg-[#fcf8f4] px-3 py-1 text-xs text-[#6a645c] hover:bg-[#efe8df]"
                                    >
                                      恢复
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-2xl border border-dashed border-[#d8cfc5] bg-[#fbf7f2] px-4 py-5 text-sm text-[#988f84]">
                                当前还没有版本快照。
                              </div>
                            )}
                          </div>
                        </article>
                      </section>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto">
                  <div className="space-y-3">
                    {visibleAssets.map((asset) => {
                      return (
                        <article
                          key={asset.id}
                          onClick={() => openAsset(asset.id)}
                          onContextMenu={(event) => openAssetContextMenu(event, asset)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openAsset(asset.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className={[
                            "group flex h-[106px] items-stretch gap-4 rounded-[28px] border border-[#d8cfc5] bg-gradient-to-r from-[#fbf7f2] to-[#f1ebe3] px-4 py-3 text-left transition hover:border-[#afbbb0] hover:bg-[#f6f0e9]",
                            "focus:outline-none focus:ring-2 focus:ring-[#b8c4bb]"
                          ].join(" ")}
                        >
                          <div className="flex min-w-0 flex-1 flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">
                                    {selectedFolder?.type === "project" ? "Storyboard Asset" : "Prompt Asset"}
                                  </p>
                                  <h3 className="mt-1 truncate text-xl font-semibold text-[#5b554e]">
                                    {asset.title}
                                  </h3>
                                </div>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void updatePromptAsset({
                                      id: asset.id,
                                      folder_id: asset.folder_id,
                                      title: asset.title,
                                      payload: asset.payload,
                                      is_favorite: !asset.is_favorite
                                    }).then((nextSnapshot) => {
                                      applySnapshot(nextSnapshot, "收藏状态已更新。");
                                    });
                                  }}
                                  className={[
                                    "shrink-0 rounded-full border px-2.5 py-1 text-[11px]",
                                    asset.is_favorite
                                      ? "border-[#d8c4b5] bg-[#efe4db] text-[#9a7e6e]"
                                      : "border-[#d8cfc5] bg-[#f7f1ea] text-[#8b8379]"
                                  ].join(" ")}
                                >
                                  {asset.is_favorite ? "已收藏" : "收藏"}
                                </button>
                              </div>
                            </div>

                            <div className="mt-2 flex items-center gap-2 overflow-hidden">
                              {(asset.payload.tags.length > 0 ? asset.payload.tags : ["未设置标签"])
                                .slice(0, 3)
                                .map((tag) => (
                                  <span
                                    key={tag}
                                    className="truncate rounded-full border border-[#d8cfc5] bg-[#f6efe7] px-2.5 py-1 text-xs text-[#746d65]"
                                  >
                                    {tag === "未设置标签" ? tag : `#${tag}`}
                                  </span>
                                ))}
                            </div>
                          </div>

                          <div className="grid w-[320px] shrink-0 grid-cols-2 gap-3">
                            <div className="flex h-full flex-col justify-center rounded-2xl bg-[#efe8e1] px-4">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Blocks</div>
                              <div className="mt-2 text-2xl font-semibold text-[#5b554e]">
                                {asset.payload.blocks.length}
                              </div>
                            </div>
                            <div className="flex h-full flex-col justify-center rounded-2xl bg-[#efe8e1] px-4">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">
                                {selectedFolder?.type === "project" ? "Shot" : "Updated"}
                              </div>
                              <div className="mt-2 text-sm font-medium text-[#6d665e]">
                                {selectedFolder?.type === "project"
                                  ? `#${String(asset.payload.storyboard?.shot_number ?? 1).padStart(2, "0")}`
                                  : formatTime(asset.updated_at)}
                              </div>
                              {selectedFolder?.type === "project" && asset.payload.storyboard?.duration_seconds ? (
                                <div className="mt-1 text-xs text-[#988f84]">
                                  {asset.payload.storyboard.duration_seconds} 秒
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}

                    {visibleAssets.length === 0 ? (
                      <div className="flex min-h-[180px] items-center justify-center rounded-[28px] border border-dashed border-[#d8cfc5] bg-[#f7f1ea] px-8 text-center text-sm leading-7 text-[#988f84]">
                        {folderAssets.length === 0
                          ? "当前目录下还没有 Prompt Asset，先在上方创建一条。"
                          : "当前筛选条件下没有匹配资产，试试清空关键词或关闭收藏过滤。"}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
