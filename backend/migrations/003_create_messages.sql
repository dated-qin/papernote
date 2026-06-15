/* ============================================
   纸条 PaperNote — 迁移 003：消息、消息回应、群公告、消息序号
   ============================================ */

-- 消息表
CREATE TABLE messages (
    id              BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT  NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       BIGINT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    msg_type        SMALLINT NOT NULL DEFAULT 0,  -- 0文本 1图片 2视频 3文件 4系统
    content         TEXT    NOT NULL,
    file_id         BIGINT,
    reply_to        BIGINT REFERENCES messages(id),
    thread_root_id  BIGINT REFERENCES messages(id),
    reply_count     INT NOT NULL DEFAULT 0,
    mention_ids     JSONB NOT NULL DEFAULT '[]'::jsonb,
    msg_status      SMALLINT NOT NULL DEFAULT 0,  -- 0正常 1撤回
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_thread ON messages(thread_root_id);
CREATE INDEX idx_messages_mentions ON messages USING gin(mention_ids);
CREATE INDEX idx_messages_search ON messages USING gin(to_tsvector('simple', content));

-- 消息回应表（emoji 互动）
CREATE TABLE message_reactions (
    id         BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji      VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- 群公告
CREATE TABLE announcements (
    id              BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    publisher_id    BIGINT NOT NULL REFERENCES users(id),
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 群公告已读记录
CREATE TABLE announcement_reads (
    id              BIGSERIAL PRIMARY KEY,
    announcement_id BIGINT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(announcement_id, user_id)
);

-- 消息序列号持久化备份（主数据在 Redis user:{id}:msg_seq）
CREATE TABLE msg_sequences (
    user_id  BIGINT PRIMARY KEY REFERENCES users(id),
    last_seq BIGINT NOT NULL DEFAULT 0
);
