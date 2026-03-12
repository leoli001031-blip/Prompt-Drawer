use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

pub type CommandResult<T> = Result<T, String>;

pub fn now_ts() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

pub fn make_id(prefix: &str) -> String {
    format!("{}_{}", prefix, Uuid::new_v4().simple())
}

pub fn bool_to_sql(flag: bool) -> i64 {
    if flag { 1 } else { 0 }
}
