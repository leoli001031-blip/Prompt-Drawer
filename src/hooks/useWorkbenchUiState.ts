import { useState, type MouseEvent } from "react";
import type { AssetContextMenuState } from "../components/overlays/AssetContextMenu";
import type { FolderContextMenuState } from "../components/overlays/FolderContextMenu";
import type { FolderRecord, PromptAsset } from "../types/storage";

export function useWorkbenchUiState() {
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importPanelOpen, setImportPanelOpen] = useState(false);
  const [importRaw, setImportRaw] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [folderContextMenu, setFolderContextMenu] = useState<FolderContextMenuState | null>(null);
  const [assetContextMenu, setAssetContextMenu] = useState<AssetContextMenuState | null>(null);

  function openAsset(assetId: string): void {
    setAssetContextMenu(null);
    setFolderContextMenu(null);
    setActiveAssetId(assetId);
    setDrawerOpen(true);
  }

  function closeDrawer(): void {
    setDrawerOpen(false);
    setActiveAssetId(null);
  }

  function openImportPanel(): void {
    setImportPanelOpen(true);
  }

  function closeImportPanel(): void {
    setImportPanelOpen(false);
  }

  function resetImportDraft(): void {
    setImportRaw("");
    setImportTitle("");
  }

  function beginFolderRename(folder: FolderRecord): void {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
    setFolderContextMenu(null);
    setAssetContextMenu(null);
  }

  function cancelFolderRename(): void {
    setEditingFolderId(null);
    setEditingFolderName("");
  }

  function completeFolderRename(): void {
    setEditingFolderId(null);
    setEditingFolderName("");
  }

  function openFolderContextMenu(event: MouseEvent, folder: FolderRecord): void {
    event.preventDefault();
    setAssetContextMenu(null);
    setFolderContextMenu({
      folder,
      x: Math.min(event.clientX, window.innerWidth - 196),
      y: Math.min(event.clientY, window.innerHeight - 148),
      confirmDelete: false
    });
  }

  function closeFolderContextMenu(): void {
    setFolderContextMenu(null);
  }

  function confirmFolderDelete(): void {
    setFolderContextMenu((current) =>
      current
        ? {
            ...current,
            confirmDelete: true
          }
        : current
    );
  }

  function openAssetContextMenu(event: MouseEvent, asset: PromptAsset): void {
    event.preventDefault();
    event.stopPropagation();
    setFolderContextMenu(null);
    setAssetContextMenu({
      asset,
      x: Math.min(event.clientX, window.innerWidth - 196),
      y: Math.min(event.clientY, window.innerHeight - 96)
    });
  }

  function closeAssetContextMenu(): void {
    setAssetContextMenu(null);
  }

  return {
    activeAssetId,
    setActiveAssetId,
    drawerOpen,
    setDrawerOpen,
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
  };
}
