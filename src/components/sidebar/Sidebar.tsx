import type { MouseEvent } from "react";
import type { FolderRecord } from "../../types/storage";
import { FolderList } from "./FolderList";
import { SearchPanel } from "./SearchPanel";
import { SidebarActions } from "./SidebarActions";
import { SidebarHeader } from "./SidebarHeader";

export interface SidebarProps {
  folders: FolderRecord[];
  selectedFolderId: string | null;
  editingFolderId: string | null;
  editingFolderName: string;
  statusMessage: string;
  searchQuery: string;
  favoritesOnly: boolean;
  trashViewOpen: boolean;
  onCreateLibrary: () => void;
  onOpenAiSettings: () => void;
  onToggleTrashView: () => void;
  onChangeSearchQuery: (value: string) => void;
  onChangeFavoritesOnly: (value: boolean) => void;
  onSelectFolder: (folderId: string) => void;
  onOpenFolderContextMenu: (event: MouseEvent, folder: FolderRecord) => void;
  onBeginFolderRename: (folder: FolderRecord) => void;
  onChangeEditingFolderName: (value: string) => void;
  onCommitFolderRename: (folder: FolderRecord) => void;
  onCancelFolderRename: () => void;
}

export function Sidebar({
  folders,
  selectedFolderId,
  editingFolderId,
  editingFolderName,
  statusMessage,
  searchQuery,
  favoritesOnly,
  trashViewOpen,
  onCreateLibrary,
  onOpenAiSettings,
  onToggleTrashView,
  onChangeSearchQuery,
  onChangeFavoritesOnly,
  onSelectFolder,
  onOpenFolderContextMenu,
  onBeginFolderRename,
  onChangeEditingFolderName,
  onCommitFolderRename,
  onCancelFolderRename
}: SidebarProps) {
  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-[#d8cfc5] bg-[#ebe4dc]/95 backdrop-blur-sm">
      <SidebarHeader />

      <SidebarActions
        onCreateLibrary={onCreateLibrary}
        onOpenAiSettings={onOpenAiSettings}
        trashViewOpen={trashViewOpen}
        onToggleTrashView={onToggleTrashView}
      />

      <SearchPanel
        searchQuery={searchQuery}
        favoritesOnly={favoritesOnly}
        onChangeSearchQuery={onChangeSearchQuery}
        onChangeFavoritesOnly={onChangeFavoritesOnly}
      />

      <FolderList
        folders={folders}
        selectedFolderId={selectedFolderId}
        editingFolderId={editingFolderId}
        editingFolderName={editingFolderName}
        onSelectFolder={onSelectFolder}
        onOpenFolderContextMenu={onOpenFolderContextMenu}
        onBeginFolderRename={onBeginFolderRename}
        onChangeEditingFolderName={onChangeEditingFolderName}
        onCommitFolderRename={onCommitFolderRename}
        onCancelFolderRename={onCancelFolderRename}
      />

      <div className="border-t border-[#d8cfc5] px-3 py-2.5 text-xs text-[#988f84]">{statusMessage}</div>
    </aside>
  );
}
