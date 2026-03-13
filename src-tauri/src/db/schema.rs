pub const CREATE_FOLDERS_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('library', 'project')),
    created_at INTEGER NOT NULL
);
"#;

pub const CREATE_PROMPT_ASSETS_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS prompt_assets (
    id TEXT PRIMARY KEY,
    folder_id TEXT NOT NULL,
    title TEXT NOT NULL,
    payload TEXT NOT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);
"#;

pub const CREATE_INDEXES_SQL: &str = r#"
CREATE INDEX IF NOT EXISTS idx_prompt_assets_folder_id ON prompt_assets(folder_id);
CREATE INDEX IF NOT EXISTS idx_prompt_assets_updated_at ON prompt_assets(updated_at DESC);
"#;
