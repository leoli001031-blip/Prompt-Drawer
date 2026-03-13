import { useEffect, useMemo, useState } from "react";
import { sortAssetsForDisplay } from "../lib/payload";
import {
  getStorageDescriptor,
  loadWorkbenchSnapshot,
  mapPromptAssets
} from "../lib/workbench";
import type { PromptAsset, StorageDescriptor, WorkbenchSnapshot } from "../types/storage";
import { matchesAssetQuery } from "../utils/asset";

export type WorkbenchSortMode =
  | "updated_desc"
  | "title_asc"
  | "favorites_first"
  | "shot_number";

export function useWorkbench() {
  const [snapshot, setSnapshot] = useState<WorkbenchSnapshot | null>(null);
  const [storageDescriptor, setStorageDescriptor] = useState<StorageDescriptor | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<WorkbenchSortMode>("updated_desc");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [statusMessage, setStatusMessage] = useState("正在加载工作台...");

  useEffect(() => {
    void Promise.all([loadWorkbenchSnapshot(), getStorageDescriptor()]).then(
      ([nextSnapshot, nextStorageDescriptor]) => {
        setSnapshot(nextSnapshot);
        setStorageDescriptor(nextStorageDescriptor);
        setSelectedFolderId(nextSnapshot.folders[0]?.id ?? null);
        setStatusMessage("工作台已加载。");
      }
    );
  }, []);

  const folders = snapshot?.folders ?? [];
  const assets = useMemo(() => (snapshot ? mapPromptAssets(snapshot) : []), [snapshot]);
  const activeAssets = useMemo(() => assets.filter((asset) => !asset.deleted_at), [assets]);
  const trashedAssets = useMemo(() => assets.filter((asset) => Boolean(asset.deleted_at)), [assets]);
  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) ?? null;
  const folderAssets = useMemo(
    () => activeAssets.filter((asset) => asset.folder_id === selectedFolderId),
    [activeAssets, selectedFolderId]
  );
  const trashedFolderAssets = useMemo(
    () => trashedAssets.filter((asset) => asset.folder_id === selectedFolderId),
    [selectedFolderId, trashedAssets]
  );
  const visibleAssets = useMemo(() => {
    const filtered = folderAssets.filter(
      (asset) => (!favoritesOnly || asset.is_favorite) && matchesAssetQuery(asset, searchQuery)
    );

    return sortAssetsForDisplay(filtered, selectedFolder?.type ?? "library", sortMode);
  }, [favoritesOnly, folderAssets, searchQuery, selectedFolder?.type, sortMode]);
  const visibleTrashedAssets = useMemo(() => {
    const filtered = trashedFolderAssets.filter(
      (asset) => (!favoritesOnly || asset.is_favorite) && matchesAssetQuery(asset, searchQuery)
    );

    return sortAssetsForDisplay(filtered, selectedFolder?.type ?? "library", sortMode);
  }, [favoritesOnly, trashedFolderAssets, searchQuery, selectedFolder?.type, sortMode]);
  const favoriteCount = useMemo(
    () => folderAssets.filter((asset) => asset.is_favorite).length,
    [folderAssets]
  );
  const projectDuration = useMemo(
    () =>
      folderAssets.reduce(
        (total, asset) =>
          total +
          (selectedFolder?.type === "project"
            ? asset.payload.storyboard?.duration_seconds ?? 0
            : 0),
        0
      ),
    [folderAssets, selectedFolder?.type]
  );

  useEffect(() => {
    if (selectedFolder?.type === "project") {
      setSortMode("shot_number");
    } else {
      setSortMode((current) => (current === "shot_number" ? "updated_desc" : current));
    }
  }, [selectedFolder?.type]);

  function applySnapshot(
    nextSnapshot: WorkbenchSnapshot,
    message: string
  ): WorkbenchSnapshot {
    setSnapshot(nextSnapshot);
    setStatusMessage(message);
    return nextSnapshot;
  }

  return {
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
    activeAssets,
    trashedAssets,
    selectedFolder,
    folderAssets,
    trashedFolderAssets,
    visibleAssets,
    visibleTrashedAssets,
    favoriteCount,
    projectDuration,
    applySnapshot
  };
}
