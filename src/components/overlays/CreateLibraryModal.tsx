import type { AssetTemplate } from "../../types/settings";

export interface CreateLibraryModalProps {
  open: boolean;
  libraryName: string;
  selectedTemplateId: string;
  assetTemplates: AssetTemplate[];
  onClose: () => void;
  onChangeLibraryName: (value: string) => void;
  onChangeSelectedTemplateId: (value: string) => void;
  onCreate: () => void;
}

export function CreateLibraryModal({
  open,
  libraryName,
  selectedTemplateId,
  assetTemplates,
  onClose,
  onChangeLibraryName,
  onChangeSelectedTemplateId,
  onCreate
}: CreateLibraryModalProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#5f584f]/18 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 top-20 z-50 mx-auto w-[min(560px,calc(100vw-40px))] rounded-[28px] border border-[#d8cfc5] bg-[#fffaf5] p-5 shadow-[0_24px_80px_rgba(116,106,94,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Create Library</div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#5b554e]">新建提示词库</h3>
            <p className="mt-2 text-sm leading-6 text-[#8b8379]">
              可以在创建词库时直接指定一份默认模板。后续这个词库里新建的提示词资产都会自动按这份模板起步。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-3 py-2 text-sm text-[#6a645c] hover:bg-[#efe8df]"
          >
            关闭
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Library Name</span>
            <input
              value={libraryName}
              onChange={(event) => onChangeLibraryName(event.target.value)}
              placeholder="例如：角色提示词库"
              className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">Default Template</span>
            <select
              value={selectedTemplateId}
              onChange={(event) => onChangeSelectedTemplateId(event.target.value)}
              className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
            >
              <option value="">空白起步</option>
              {assetTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-dashed border-[#d8cfc5] bg-[#fbf7f2] px-4 py-3 text-sm text-[#8f867b]">
            提示词模板由多条 Block 组成。例如你可以定义：
            <span className="mt-1 block text-[#6a645c]">1. 主体  2. 场景  3. 风格  4. 约束</span>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-4 py-3 text-sm text-[#6a645c] hover:bg-[#efe8df]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onCreate}
              className="rounded-2xl bg-[#a8b7ad] px-4 py-3 text-sm font-medium text-[#4e4943] hover:bg-[#97a79d]"
            >
              创建词库
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
