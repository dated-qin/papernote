/* ============================================
   纸条 PaperNote — 迁移 001：用户、好友关系、好友请求
   ============================================ */

-- 用户表
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(32)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    nickname        VARCHAR(64)  NOT NULL,
    avatar          VARCHAR(512),
    phone           VARCHAR(20),
    email           VARCHAR(128),
    status          SMALLINT     NOT NULL DEFAULT 0,  -- 0正常 1封禁
    role            VARCHAR(16)  NOT NULL DEFAULT 'user',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- 好友关系表（双向确认后插入两条记录，或由应用层保证双向可见）
CREATE TABLE friendships (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remark      VARCHAR(64),
    blocked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

CREATE INDEX idx_friendships_user ON friendships(user_id);
CREATE INDEX idx_friendships_friend ON friendships(friend_id);

-- 好友请求表
CREATE TABLE friend_requests (
    id           BIGSERIAL PRIMARY KEY,
    from_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message      VARCHAR(128),
    status       SMALLINT NOT NULL DEFAULT 0, -- 0待处理 1同意 2拒绝
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    handled_at   TIMESTAMPTZ,
    UNIQUE(from_user_id, to_user_id, status)
);

CREATE INDEX idx_friend_requests_to ON friend_requests(to_user_id, status);
