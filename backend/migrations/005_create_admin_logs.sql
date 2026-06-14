/* ============================================
   纸条 PaperNote — 迁移 005：管理员操作日志
   ============================================ */

-- 管理员操作日志表（用于审计追溯）
CREATE TABLE admin_logs (
    id          BIGSERIAL PRIMARY KEY,
    admin_id    BIGINT NOT NULL REFERENCES users(id),
    action      VARCHAR(32) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id   BIGINT NOT NULL,
    detail      VARCHAR(512),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_admin ON admin_logs(admin_id, created_at DESC);
