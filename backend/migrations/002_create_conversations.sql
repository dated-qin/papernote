/* ============================================
   纸条 PaperNote — 迁移 002：会话、会话成员
   ============================================ */

-- 会话表（私聊 dm / 频道 channel）
CREATE TABLE conversations (
    id          BIGSERIAL PRIMARY KEY,
    type        VARCHAR(8)   NOT NULL,              -- 'dm' / 'channel'
    title       VARCHAR(128) NOT NULL DEFAULT '',
    avatar      VARCHAR(512),
    description VARCHAR(512),
    owner_id    BIGINT REFERENCES users(id),
    last_msg_id BIGINT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_type ON conversations(type);

-- 会话成员表（含未读计数、静音/置顶等每用户偏好）
CREATE TABLE conversation_members (
    id              BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(16) NOT NULL DEFAULT 'member',
    muted           BOOLEAN NOT NULL DEFAULT FALSE,
    pinned          BOOLEAN NOT NULL DEFAULT FALSE,
    unread_count    INT NOT NULL DEFAULT 0,
    last_read_msg_id BIGINT,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conv_members_user ON conversation_members(user_id);
CREATE INDEX idx_conv_members_conv ON conversation_members(conversation_id);
