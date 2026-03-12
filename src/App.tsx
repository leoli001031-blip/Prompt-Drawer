import { useEffect, useState } from "react";
import {
  AiSettingsModal,
  AssetContextMenu,
  AssetEditorPane,
  AssetList,
  CurrentFolderOverview,
  FolderContextMenu,
  ImportPanel,
  Sidebar
} from "./components";
import { loadAiSettings } from "./lib/ai";
import { useAiAssistant, useAssetDraft, useWorkbench, useWorkbenchActions, useWorkbenchUiState } from "./hooks";
import type { AiSettingsSnapshot } from "./types/ai";
import type { FolderRecord, PromptAsset } from "./types/storage";

export default function App() {
  const [aiSettings, setAiSettings] = useState<AiSettingsSnapshot>({ default_profile_id: null, profiles: [] });
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
    visibleAssets,
    favoriteCount,
    projectDuration,
    applySnapshot
  } = useWorkbench();
  const {
    activeAssetId,
    setActiveAssetId,
    drawerOpen,
    importPanelOpen,
    importRaw,
    importTitle,
    editingFolderId,
    editingFolderName,
    setEditingFolderName,
    folderContextMenu,
    assetContextMenu,
    openAsset,
    closeDrawer,
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
    closeAssetContextMenu
  } = useWorkbenchUiState();

  useEffect(() => {
    void loadAiSettings().then((nextAiSettings) => {
      setAiSettings(nextAiSettings);
    });
  }, []);

  const activeAsset = assets.find((asset) => asset.id === activeAssetId) ?? null;
  const {
    assetDraft,
    setAssetDraft,
    exportPreview,
    saveStateLabel,
    copyFeedback,
    isManualSaving,
    confirmAssetDelete,
    versionName,
    setVersionName,
    copyTargetFolderId,
    setCopyTargetFolderId,
    isEditingAssetTitle,
    setIsEditingAssetTitle,
    draggingBlockId,
    dragOverBlockId,
    resetDraftUiState,
    saveAsset,
    deleteAsset,
    copyExport,
    updateBlock,
    removeBlock,
    addBlock,
    duplicateBlock,
    beginBlockDrag,
    updateBlockDragTarget,
    clearBlockDragState,
    createVersion,
    restoreVersion
  } = useAssetDraft({
    activeAsset,
    selectedFolderId,
    storageMode: storageDescriptor?.mode,
    applySnapshot,
    setSelectedFolderId,
    setStatusMessage,
    onDeleteAssetSuccess: () => {
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

      closeEditor();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [aiPanelOpen, aiSettingsOpen, assetContextMenu, drawerOpen, folderContextMenu, importPanelOpen, isEditingAssetTitle]);

  function closeEditor(): void {
    closeDrawer();
    resetDraftUiState();
    setAiPanelOpen(false);
  }

  function openAssetEditor(assetId: string): void {
    openAsset(assetId);
    setAiPanelOpen(false);
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
    importAssets
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
        <Sidebar
          folders={folders}
          selectedFolderId={selectedFolderId}
          editingFolderId={editingFolderId}
          editingFolderName={editingFolderName}
          statusMessage={statusMessage}
          searchQuery={searchQuery}
          favoritesOnly={favoritesOnly}
          onCreateLibrary={() => void createFolder("library")}
          onOpenAiSettings={openAiSettings}
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
          onDelete={(folder) => void removeFolder(folder)}
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
          onClose={closeAssetContextMenu}
          onDuplicateAsset={(asset) => void duplicateAsset(asset)}
          onDeleteAsset={(asset) => void removeAsset(asset)}
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
                visibleAssetCount={visibleAssets.length}
                folderAssetCount={folderAssets.length}
                favoriteCount={favoriteCount}
                projectDuration={projectDuration}
                searchQuery={searchQuery}
                favoritesOnly={favoritesOnly}
                storageDescriptor={storageDescriptor}
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
                  onAddBlock={addBlock}
                  onBlockPointerDown={beginBlockDrag}
                  onBlockPointerEnter={updateBlockDragTarget}
                  onUpdateBlock={updateBlock}
                  onDuplicateBlock={duplicateBlock}
                  onRemoveBlock={removeBlock}
                  onClearDragState={clearBlockDragState}
                  exportPreview={exportPreview}
                  copyFeedback={copyFeedback}
                  onCopyExport={() => void copyExport()}
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
                        onSaveAsset={() => void saveAsset()}
                        onDuplicateCurrentAsset={() => void duplicateCurrentAsset()}
                  copyTargetFolderId={copyTargetFolderId}
                  onChangeCopyTargetFolderId={setCopyTargetFolderId}
                  folders={folders}
                  confirmAssetDelete={confirmAssetDelete}
                  onDeleteAsset={() => void deleteAsset()}
                  versionName={versionName}
                  onChangeVersionName={setVersionName}
                  onCreateVersion={() => void createVersion()}
                  versions={assetDraft.payload.versions ?? []}
                  onRestoreVersion={(versionId) => void restoreVersion(versionId)}
                />
              ) : (
                <AssetList
                  visibleAssets={visibleAssets}
                  folderAssets={folderAssets}
                  selectedFolderType={selectedFolder?.type}
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
