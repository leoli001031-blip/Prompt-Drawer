import type { MouseEvent } from "react";
import type { FolderRecord } from "../../types/storage";
import { FolderCard } from "./FolderCard";

export interface FolderListProps {
  folders: FolderRecord[];
  selectedFolderId: string | null;
  editingFolderId: string | null;
  editingFolderName: string;
  onSelectFolder: (folderId: string) => void;
  onOpenFolderContextMenu: (event: MouseEvent, folder: FolderRecord) => void;
  onBeginFolderRename: (folder: FolderRecord) => void;
  onChangeEditingFolderName: (value: string) => void;
  onCommitFolderRename: (folder: FolderRecord) => void;
  onCancelFolderRename: () => void;
}

export function FolderList({
  folders,
  selectedFolderId,
  editingFolderId,
  editingFolderName,
  onSelectFolder,
  onOpenFolderContextMenu,
  onBeginFolderRename,
  onChangeEditingFolderName,
  onCommitFolderRename,
  onCancelFolderRename
}: FolderListProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-xs uppercase tracking-[0.22em] text-[#9a9085]">Folders</span>
        <span className="rounded-full border border-[#d8cfc5] px-2 py-1 text-[11px] text-[#8b8379]">
          {folders.length}
        </span>
      </div>

      <div className="space-y-2">
        {folders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            isActive={folder.id === selectedFolderId}
            isEditing={folder.id === editingFolderId}
            editingFolderName={editingFolderName}
            onSelectFolder={onSelectFolder}
            onOpenFolderContextMenu={onOpenFolderContextMenu}
            onBeginFolderRename={onBeginFolderRename}
            onChangeEditingFolderName={onChangeEditingFolderName}
            onCommitFolderRename={onCommitFolderRename}
            onCancelFolderRename={onCancelFolderRename}
          />
        ))}
      </div>
    </div>
  );
}
