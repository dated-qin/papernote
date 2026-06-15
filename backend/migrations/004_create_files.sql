/* ============================================
   纸条 PaperNote — 迁移 004：文件附件
   ============================================ */

-- 文件表（上传至 OSS 后记录元数据）
CREATE TABLE files (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id),
    file_name  VARCHAR(256) NOT NULL,
    file_size  BIGINT NOT NULL,
    mime_type  VARCHAR(64) NOT NULL,
    oss_key    VARCHAR(512) NOT NULL,
    width      INT,
    height     INT,
    duration   INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_user ON files(user_id, created_at DESC);

-- 补充 messages.file_id 外键
ALTER TABLE messages ADD CONSTRAINT fk_messages_file
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL;
