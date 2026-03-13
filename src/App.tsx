import { useEffect, useMemo, useState } from "react";
import {
  AiSettingsModal,
  AssetContextMenu,
  AssetEditorPane,
  AssetList,
  CreateLibraryModal,
  CurrentFolderOverview,
  FolderContextMenu,
  ImportPanel,
  Sidebar
} from "./components";
import { loadAiSettings } from "./lib/ai";
import {
  useAiAssistant,
  useAssetDraft,
  useWorkbench,
  useWorkbenchActions,
  useWorkbenchSettings,
  useWorkbenchUiState
} from "./hooks";
import type { AiSettingsSnapshot } from "./types/ai";
import type { FolderRecord, PromptAsset } from "./types/storage";

function hasPrimaryModifier(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

export default function App() {
  const [aiSettings, setAiSettings] = useState<AiSettingsSnapshot>({ default_profile_id: null, profiles: [] });
  const [selectedCreateAssetTemplateId, setSelectedCreateAssetTemplateId] = useState("");
  const {
    snapshot,
    storageDescriptor,
    selectedFolderId,
    setSelectedFolderId,
    searchQuery,
    setSearchQuery,
    favoritesOnly,
    setFavoritesOnly,
    statusMessage,
    setStatusMessage,
    folders,
    assets,
    selectedFolder,
    folderAssets,
    trashedFolderAssets,
    visibleAssets,
    visibleTrashedAssets,
    favoriteCount,
    projectDuration,
    applySnapshot
  } = useWorkbench();
  const {
    workbenchSettings,
    selectedTemplateId,
    blockTemplateDraft,
    setBlockTemplateDraft,
    startNewBlockTemplate,
    selectBlockTemplate,
    saveCurrentBlockTemplate,
    deleteCurrentBlockTemplate,
    selectedAssetTemplateId,
    assetTemplateDraft,
    setAssetTemplateDraft,
    startNewAssetTemplate,
    selectAssetTemplate,
    saveCurrentAssetTemplate,
    deleteCurrentAssetTemplate,
    resolveFolderTemplateId,
    saveFolderDefaultTemplate
  } = useWorkbenchSettings({
    setStatusMessage
  });
  const {
    activeAssetId,
    setActiveAssetId,
    drawerOpen,
    createLibraryModalOpen,
    createLibraryName,
    setCreateLibraryName,
    createLibraryTemplateId,
    setCreateLibraryTemplateId,
    importPanelOpen,
    importRaw,
    importTitle,
    editingFolderId,
    editingFolderName,
    setEditingFolderName,
    folderContextMenu,
    assetContextMenu,
    trashViewOpen,
    openAsset,
    closeDrawer,
    openCreateLibraryModal,
    closeCreateLibraryModal,
    resetCreateLibraryDraft,
    openImportPanel,
    closeImportPanel,
    resetImportDraft,
    setImportRaw,
    setImportTitle,
    beginFolderRename,
    cancelFolderRename,
    completeFolderRename,
    openFolderContextMenu,
    closeFolderContextMenu,
    confirmFolderDelete,
    openAssetContextMenu,
    closeAssetContextMenu,
    toggleTrashView,
    closeTrashView
  } = useWorkbenchUiState();

  const folderDefaultTemplateId = useMemo(
    () => resolveFolderTemplateId(selectedFolderId),
    [resolveFolderTemplateId, selectedFolderId]
  );

  useEffect(() => {
    void loadAiSettings().then((nextAiSettings) => {
      setAiSettings(nextAiSettings);
    });
  }, []);

  useEffect(() => {
    setSelectedCreateAssetTemplateId(folderDefaultTemplateId);
  }, [folderDefaultTemplateId]);

  const activeAsset = assets.find((asset) => asset.id === activeAssetId) ?? null;
  const {
    assetDraft,
    setAssetDraft,
    exportPreview,
    saveStateLabel,
    copyFeedback,
    isManualSaving,
    confirmPermanentDelete,
    versionName,
    setVersionName,
    copyTargetFolderId,
    setCopyTargetFolderId,
    isEditingAssetTitle,
    setIsEditingAssetTitle,
    draggingBlockId,
    dragOverBlockId,
    canUndo,
    canRedo,
    resetDraftUiState,
    saveAsset,
    moveAssetToTrash,
    restoreAsset,
    permanentlyDeleteAsset,
    copyExport,
    updateBlock,
    removeBlock,
    addBlock,
    duplicateBlock,
    toggleBlockLock,
    beginBlockDrag,
    updateBlockDragTarget,
    clearBlockDragState,
    createVersion,
    restoreVersion,
    undoDraft,
    redoDraft
  } = useAssetDraft({
    activeAsset,
    folderAssets,
    selectedFolderId,
    storageMode: storageDescriptor?.mode,
    applySnapshot,
    setSelectedFolderId,
    setStatusMessage,
    onDeleteAssetSuccess: () => {
      closeDrawer();
      setAiPanelOpen(false);
    },
    onRestoreAssetSuccess: () => {
      closeDrawer();
      setAiPanelOpen(false);
    }
  });
  const {
    aiSettingsOpen,
    setAiSettingsOpen,
    selectedAiProfileId,
    setSelectedAiProfileId,
    aiProfileDraft,
    setAiProfileDraft,
    aiTaskType,
    setAiTaskType,
    aiTargetBlockId,
    setAiTargetBlockId,
    aiInstruction,
    setAiInstruction,
    aiResult,
    aiRunning,
    aiRunMessage,
    aiTesting,
    aiTestMessage,
    aiPanelOpen,
    setAiPanelOpen,
    activeAiProfile,
    openAiSettings,
    startNewAiProfile,
    selectAiProfile,
    saveAiProfile,
    deleteAiProfile,
    testAiProfile,
    runAi,
    applyAiToTargetBlock,
    appendAiAsBlock,
    copyAiResult
  } = useAiAssistant({
    aiSettings,
    setAiSettings,
    assetDraft,
    setAssetDraft,
    selectedFolderType: selectedFolder?.type,
    setStatusMessage
  });

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }

      if (aiSettingsOpen) {
        setAiSettingsOpen(false);
        return;
      }

      if (createLibraryModalOpen) {
        closeCreateLibraryModal();
        resetCreateLibraryDraft();
        return;
      }

      if (importPanelOpen) {
        closeImportPanel();
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

      if (trashViewOpen) {
        closeTrashView();
        return;
      }

      closeEditor();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [aiPanelOpen, aiSettingsOpen, assetContextMenu, closeCreateLibraryModal, createLibraryModalOpen, folderContextMenu, importPanelOpen, isEditingAssetTitle, resetCreateLibraryDraft, trashViewOpen]);

  function closeEditor(): void {
    closeDrawer();
    resetDraftUiState();
    setAiPanelOpen(false);
  }

  function openAssetEditor(assetId: string): void {
    openAsset(assetId);
    setAiPanelOpen(false);
  }

  function toggleTrashMode(): void {
    closeEditor();
    closeFolderContextMenu();
    closeAssetContextMenu();
    toggleTrashView();
  }

  function startFolderRename(folder: FolderRecord): void {
    setSelectedFolderId(folder.id);
    beginFolderRename(folder);
  }

  function stopFolderRename(): void {
    cancelFolderRename();
  }

  function openFolderMenu(event: React.MouseEvent, folder: FolderRecord): void {
    setSelectedFolderId(folder.id);
    setActiveAssetId(null);
    closeEditor();
    stopFolderRename();
    closeAssetContextMenu();
    openFolderContextMenu(event, folder);
  }

  function openAssetMenu(event: React.MouseEvent, asset: PromptAsset): void {
    stopFolderRename();
    openAssetContextMenu(event, asset);
  }

  async function createLibrary(): Promise<void> {
    const nextFolder = await createFolder("library", {
      name: createLibraryName.trim() || "新提示词库"
    });

    if (nextFolder && createLibraryTemplateId) {
      await saveFolderDefaultTemplate(nextFolder.id, createLibraryTemplateId);
      setSelectedCreateAssetTemplateId(createLibraryTemplateId);
    }

    closeCreateLibraryModal();
    resetCreateLibraryDraft();
  }

  async function removeFolderWithSettings(folder: FolderRecord): Promise<void> {
    await removeFolder(folder);
    await saveFolderDefaultTemplate(folder.id, null);
  }

  function changeSelectedCreateAssetTemplateId(value: string): void {
    setSelectedCreateAssetTemplateId(value);

    if (selectedFolder?.type === "library") {
      void saveFolderDefaultTemplate(selectedFolder.id, value || null);
    }
  }

  const {
    renameFolder,
    createFolder,
    removeFolder,
    removeAsset,
    createAsset,
    copyStoragePath,
    copyWorkbenchJson,
    downloadWorkbenchJson,
    duplicateAsset,
    duplicateCurrentAsset,
    toggleFavorite,
    copyProjectScript,
    importAssets,
    restoreAsset: restoreAssetFromTrash,
    permanentlyDeleteAsset: permanentlyDeleteAssetFromTrash
  } = useWorkbenchActions({
    snapshot,
    storageDescriptor,
    folders,
    assets,
    selectedFolder,
    folderAssets,
    activeAsset,
    activeAssetId,
    copyTargetFolderId,
    editingFolderName,
    importRaw,
    importTitle,
    assetTemplates: workbenchSettings.asset_templates,
    selectedCreateAssetTemplateId,
    applySnapshot,
    setSelectedFolderId,
    setActiveAssetId,
    setStatusMessage,
    onOpenAsset: openAssetEditor,
    onCloseDrawer: closeEditor,
    onCloseFolderContextMenu: closeFolderContextMenu,
    onCloseAssetContextMenu: closeAssetContextMenu,
    onCloseImportPanel: closeImportPanel,
    onResetImportDraft: resetImportDraft,
    onCancelFolderRename: stopFolderRename,
    onCompleteFolderRename: completeFolderRename
  });

  useEffect(() => {
    if (!drawerOpen || !assetDraft) {
      return;
    }

    const handleEditorShortcuts = (event: KeyboardEvent) => {
      if (!hasPrimaryModifier(event) || event.defaultPrevented || event.isComposing) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "s") {
        event.preventDefault();
        void saveAsset();
        return;
      }

      if (key === "d") {
        event.preventDefault();
        void duplicateCurrentAsset();
        return;
      }

      if (key === "enter") {
        if (!aiPanelOpen) {
          return;
        }

        event.preventDefault();
        void runAi();
        return;
      }

      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoDraft();
        } else {
          undoDraft();
        }
      }
    };

    window.addEventListener("keydown", handleEditorShortcuts);
    return () => window.removeEventListener("keydown", handleEditorShortcuts);
  }, [aiPanelOpen, assetDraft, drawerOpen, duplicateCurrentAsset, redoDraft, runAi, saveAsset, undoDraft]);

  if (!snapshot) {
    return (
      <div className="grid h-screen place-items-center bg-[#f4efe7] text-sm text-[#8b8379]">
        {statusMessage}
      </div>
    );
  }

  const displayedAssets = trashViewOpen ? visibleTrashedAssets : visibleAssets;
  const displayedFolderAssets = trashViewOpen ? trashedFolderAssets : folderAssets;
  const overviewCountMetric = trashViewOpen
    ? displayedAssets.length
    : favoriteCount;

  return (
    <div className="h-screen overflow-hidden bg-[#f4efe7] text-[#5f584f]">
      <div className="flex h-full">
        <Sidebar
          folders={folders}
          selectedFolderId={selectedFolderId}
          editingFolderId={editingFolderId}
          editingFolderName={editingFolderName}
          statusMessage={statusMessage}
          searchQuery={searchQuery}
          favoritesOnly={favoritesOnly}
          trashViewOpen={trashViewOpen}
          onCreateLibrary={openCreateLibraryModal}
          onOpenAiSettings={openAiSettings}
          onToggleTrashView={toggleTrashMode}
          onChangeSearchQuery={setSearchQuery}
          onChangeFavoritesOnly={setFavoritesOnly}
          onSelectFolder={(folderId) => {
            setSelectedFolderId(folderId);
            setActiveAssetId(null);
            closeEditor();
            closeFolderContextMenu();
            closeAssetContextMenu();
          }}
          onOpenFolderContextMenu={openFolderMenu}
          onBeginFolderRename={startFolderRename}
          onChangeEditingFolderName={setEditingFolderName}
          onCommitFolderRename={(folder) => void renameFolder(folder)}
          onCancelFolderRename={stopFolderRename}
        />

        <FolderContextMenu
          menu={folderContextMenu}
          onClose={closeFolderContextMenu}
          onBeginRename={startFolderRename}
          onToggleConfirmDelete={confirmFolderDelete}
          onDelete={(folder) => void removeFolderWithSettings(folder)}
          onCopyStoragePath={() => {
            closeFolderContextMenu();
            void copyStoragePath();
          }}
          onCopyWorkbenchJson={() => {
            closeFolderContextMenu();
            void copyWorkbenchJson();
          }}
          onDownloadWorkbenchJson={() => {
            closeFolderContextMenu();
            void downloadWorkbenchJson();
          }}
        />

        <AssetContextMenu
          menu={assetContextMenu}
          isTrashViewOpen={trashViewOpen}
          onClose={closeAssetContextMenu}
          onDuplicateAsset={(asset) => void duplicateAsset(asset)}
          onMoveAssetToTrash={(asset) => void removeAsset(asset)}
          onRestoreAsset={(asset) => void restoreAssetFromTrash(asset)}
          onPermanentlyDeleteAsset={(asset) => void permanentlyDeleteAssetFromTrash(asset)}
        />

        <AiSettingsModal
          open={aiSettingsOpen}
          aiSettings={aiSettings}
          aiProfileDraft={aiProfileDraft}
          aiTesting={aiTesting}
          aiTestMessage={aiTestMessage}
          onClose={() => setAiSettingsOpen(false)}
          onBeginCreateProfile={startNewAiProfile}
          onSelectProfile={selectAiProfile}
          onChangeDraft={(patch) => setAiProfileDraft((current) => ({ ...current, ...patch }))}
          onTest={() => void testAiProfile()}
          onSave={() => void saveAiProfile()}
          onDelete={() => void deleteAiProfile()}
          workbenchSettings={workbenchSettings}
          selectedTemplateId={selectedTemplateId}
          blockTemplateDraft={blockTemplateDraft}
          onBeginCreateBlockTemplate={startNewBlockTemplate}
          onSelectBlockTemplate={selectBlockTemplate}
          onChangeBlockTemplateDraft={(patch) =>
            setBlockTemplateDraft((current) => ({
              ...current,
              ...patch
            }))
          }
          onSaveBlockTemplate={() => void saveCurrentBlockTemplate()}
          onDeleteBlockTemplate={() => void deleteCurrentBlockTemplate()}
          selectedAssetTemplateId={selectedAssetTemplateId}
          assetTemplateDraft={assetTemplateDraft}
          onBeginCreateAssetTemplate={startNewAssetTemplate}
          onSelectAssetTemplate={selectAssetTemplate}
          onChangeAssetTemplateDraft={(patch) =>
            setAssetTemplateDraft((current) => ({
              ...current,
              ...patch
            }))
          }
          onSaveAssetTemplate={() => void saveCurrentAssetTemplate()}
          onDeleteAssetTemplate={() => void deleteCurrentAssetTemplate()}
        />

        <CreateLibraryModal
          open={createLibraryModalOpen}
          libraryName={createLibraryName}
          selectedTemplateId={createLibraryTemplateId}
          assetTemplates={workbenchSettings.asset_templates}
          onClose={() => {
            closeCreateLibraryModal();
            resetCreateLibraryDraft();
          }}
          onChangeLibraryName={setCreateLibraryName}
          onChangeSelectedTemplateId={setCreateLibraryTemplateId}
          onCreate={() => void createLibrary()}
        />

        <ImportPanel
          open={importPanelOpen}
          selectedFolderName={selectedFolder?.name ?? "--"}
          importTitle={importTitle}
          importRaw={importRaw}
          onClose={closeImportPanel}
          onChangeImportTitle={setImportTitle}
          onChangeImportRaw={setImportRaw}
          onImport={() => void importAssets()}
        />

        <main className="relative flex h-full flex-1 overflow-hidden">
          <div className="flex h-full flex-1 flex-col overflow-hidden px-6 py-6">
            {!drawerOpen ? (
              <CurrentFolderOverview
                selectedFolder={selectedFolder}
                trashViewOpen={trashViewOpen}
                visibleAssetCount={displayedAssets.length}
                folderAssetCount={displayedFolderAssets.length}
                favoriteCount={overviewCountMetric}
                projectDuration={projectDuration}
                searchQuery={searchQuery}
                favoritesOnly={favoritesOnly}
                storageDescriptor={storageDescriptor}
                assetTemplates={workbenchSettings.asset_templates}
                selectedAssetTemplateId={selectedCreateAssetTemplateId}
                onChangeSelectedAssetTemplateId={changeSelectedCreateAssetTemplateId}
                onRenameFolder={() => selectedFolder && startFolderRename(selectedFolder)}
                onCopyProjectScript={() => void copyProjectScript()}
                onOpenImport={openImportPanel}
                onCreateAsset={() => void createAsset()}
              />
            ) : null}

            <section className={`${drawerOpen ? "mt-0" : "mt-6"} min-h-0 flex-1 overflow-hidden pr-1`}>
              {drawerOpen && assetDraft ? (
                <AssetEditorPane
                  assetDraft={assetDraft}
                  selectedFolderType={selectedFolder?.type}
                  setAssetDraft={setAssetDraft}
                  isEditingAssetTitle={isEditingAssetTitle}
                  setIsEditingAssetTitle={setIsEditingAssetTitle}
                  saveStateLabel={saveStateLabel}
                  onBack={closeEditor}
                  draggingBlockId={draggingBlockId}
                  dragOverBlockId={dragOverBlockId}
                  blockTemplates={workbenchSettings.block_templates}
                  onAddBlock={addBlock}
                  onBlockPointerDown={beginBlockDrag}
                  onBlockPointerEnter={updateBlockDragTarget}
                  onUpdateBlock={updateBlock}
                  onToggleBlockLock={toggleBlockLock}
                  onDuplicateBlock={duplicateBlock}
                  onRemoveBlock={removeBlock}
                  onClearDragState={clearBlockDragState}
                  exportPreview={exportPreview}
                  copyFeedback={copyFeedback}
                  onCopyExport={() => void copyExport()}
                  isTrashViewOpen={trashViewOpen}
                  aiPanelOpen={aiPanelOpen}
                  onToggleAiPanel={() => setAiPanelOpen((current) => !current)}
                  onOpenAiSettings={openAiSettings}
                  activeAiProfile={activeAiProfile}
                  selectedAiProfileId={selectedAiProfileId}
                  aiProfiles={aiSettings.profiles}
                  aiTaskType={aiTaskType}
                  onSelectAiProfile={setSelectedAiProfileId}
                  onSelectAiTaskType={setAiTaskType}
                  aiTargetBlockId={aiTargetBlockId}
                  onSelectAiTargetBlock={setAiTargetBlockId}
                  aiInstruction={aiInstruction}
                  onChangeAiInstruction={setAiInstruction}
                  aiRunning={aiRunning}
                  onRunAi={() => void runAi()}
                  aiRunMessage={aiRunMessage}
                  aiResult={aiResult}
                  onApplyAiToTargetBlock={applyAiToTargetBlock}
                  onAppendAiAsBlock={appendAiAsBlock}
                  onCopyAiResult={() => void copyAiResult()}
                  isManualSaving={isManualSaving}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndoDraft={undoDraft}
                  onRedoDraft={redoDraft}
                  onSaveAsset={() => void saveAsset()}
                  onDuplicateCurrentAsset={() => void duplicateCurrentAsset()}
                  copyTargetFolderId={copyTargetFolderId}
                  onChangeCopyTargetFolderId={setCopyTargetFolderId}
                  folders={folders}
                  confirmPermanentDelete={confirmPermanentDelete}
                  onMoveAssetToTrash={() => void moveAssetToTrash()}
                  onRestoreAsset={() => void restoreAsset()}
                  onPermanentlyDeleteAsset={() => void permanentlyDeleteAsset()}
                  versionName={versionName}
                  onChangeVersionName={setVersionName}
                  onCreateVersion={() => void createVersion()}
                  versions={assetDraft.payload.versions ?? []}
                  onRestoreVersion={(versionId) => void restoreVersion(versionId)}
                />
              ) : (
                <AssetList
                  visibleAssets={displayedAssets}
                  folderAssets={displayedFolderAssets}
                  selectedFolderType={selectedFolder?.type}
                  isTrashViewOpen={trashViewOpen}
                  onOpenAsset={openAssetEditor}
                  onOpenAssetContextMenu={openAssetMenu}
                  onToggleFavorite={(asset) => void toggleFavorite(asset)}
                />
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
