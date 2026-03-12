export interface SearchPanelProps {
  searchQuery: string;
  favoritesOnly: boolean;
  onChangeSearchQuery: (value: string) => void;
  onChangeFavoritesOnly: (value: boolean) => void;
}

export function SearchPanel({
  searchQuery,
  favoritesOnly,
  onChangeSearchQuery,
  onChangeFavoritesOnly
}: SearchPanelProps) {
  return (
    <div className="border-b border-[#d8cfc5] px-3 py-3">
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[#9a9085]">Search</span>
        <input
          value={searchQuery}
          onChange={(event) => onChangeSearchQuery(event.target.value)}
          placeholder="搜索标题、标签、备注、Block"
          className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-3 py-2.5 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
        />
      </label>
      <label className="mt-3 flex items-center gap-3 rounded-2xl border border-[#d8cfc5] bg-[#f6f0e8] px-3 py-2.5 text-sm text-[#6a645c]">
        <input
          type="checkbox"
          checked={favoritesOnly}
          onChange={(event) => onChangeFavoritesOnly(event.target.checked)}
          className="h-4 w-4"
        />
        仅看收藏资产
      </label>
    </div>
  );
}
