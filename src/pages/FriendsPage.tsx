/* ============================================
   纸条 PaperNote — 好友页面
   标签切换：好友列表 / 好友请求 / 添加好友（搜索）
   ============================================ */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../store/chatStore';
import { Avatar, UnreadBadge } from '../components/common';
import type { Friend, FriendRequest, User } from '../types';

// ---------- 内联样式 ----------

const S = {
  page: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    height: '100%',
    minWidth: 0,
  } as React.CSSProperties,

  header: {
    height: 52,
    padding: '0 var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border-default)',
    flexShrink: 0,
  } as React.CSSProperties,

  headerTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
    color: 'var(--text-primary)',
  },

  searchInput: {
    width: 220,
    height: 32,
    padding: '0 var(--space-md)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-default)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-secondary)',
    outline: 'none',
    fontFamily: 'var(--font-family)',
  },

  body: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
  } as React.CSSProperties,

  tabs: {
    width: 160,
    borderRight: '1px solid var(--border-default)',
    backgroundColor: 'var(--bg-sidebar)',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 'var(--space-sm)',
    flexShrink: 0,
  } as React.CSSProperties,

  tab: {
    height: 36,
    padding: '0 var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-md)',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
    textAlign: 'left' as const,
  },

  tabActive: {
    backgroundColor: 'var(--bg-active)',
    color: 'var(--text-primary)',
    fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
  },

  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: 'var(--space-sm) 0',
  },

  listItem: {
    height: 56,
    padding: '0 var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    backgroundColor: 'transparent',
    border: 'none',
    width: '100%',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
    textAlign: 'left' as const,
  },

  itemName: {
    fontSize: 'var(--font-size-md)',
    fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
    color: 'var(--text-primary)',
  },

  itemSub: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-muted)',
  },

  onlineDot: (online: boolean): React.CSSProperties => ({
    width: 8,
    height: 8,
    borderRadius: 'var(--radius-full)',
    backgroundColor: online ? 'var(--accent-green)' : 'var(--accent-red)',
    flexShrink: 0,
  }),

  actionBtn: (primary: boolean): React.CSSProperties => ({
    height: 28,
    padding: '0 var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    border: primary ? 'none' : '1px solid var(--border-default)',
    backgroundColor: primary ? 'var(--accent-primary)' : 'transparent',
    color: primary ? 'var(--white)' : 'var(--text-secondary)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
    whiteSpace: 'nowrap' as const,
  }),

  emptyText: {
    color: 'var(--text-muted)',
    fontSize: 'var(--font-size-md)',
    textAlign: 'center' as const,
    paddingTop: 60,
  },

  searchResultItem: {
    height: 56,
    padding: '0 var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    backgroundColor: 'transparent',
    width: '100%',
  },

  moreMenu: {
    position: 'absolute' as const,
    right: 0,
    top: 36,
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md)',
    zIndex: 20,
    minWidth: 120,
    overflow: 'hidden',
  } as React.CSSProperties,

  menuItem: {
    width: '100%',
    height: 32,
    padding: '0 var(--space-md)',
    display: 'flex',
    alignItems: 'center',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
    whiteSpace: 'nowrap' as const,
  },
};

// ---------- 页面组件 ----------

type TabKey = 'friends' | 'requests' | 'add';

export const FriendsPage: React.FC = () => {
  const navigate = useNavigate();
  const friends = useChatStore((s) => s.friends);
  const friendRequests = useChatStore((s) => s.friendRequests);
  const fetchFriends = useChatStore((s) => s.fetchFriends);
  const searchUsers = useChatStore((s) => s.searchUsers);
  const sendFriendRequest = useChatStore((s) => s.sendFriendRequest);
  const handleFriendRequest = useChatStore((s) => s.handleFriendRequest);
  const deleteFriend = useChatStore((s) => s.deleteFriend);
  const blockUser = useChatStore((s) => s.blockUser);
  const createDM = useChatStore((s) => s.createDM);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [moreOpen, setMoreOpen] = useState<string | null>(null); // userId

  // 初始化加载好友数据
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // 防抖搜索
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const results = await searchUsers(searchQuery.trim());
      setSearchResults(results);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  // 发消息：创建/切换 DM
  const handleMessage = useCallback(
    async (userId: string) => {
      try {
        const convId = await createDM(userId);
        setActiveConversation(convId);
        navigate('/');
      } catch {
        // 失败静默
      }
    },
    [createDM, setActiveConversation, navigate],
  );

  // 关闭更多菜单（点击外部）
  useEffect(() => {
    if (!moreOpen) return;
    const close = () => setMoreOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [moreOpen]);

  // ========== 渲染 ==========

  const pendingCount = friendRequests.filter((r) => r.status === 'pending').length;

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: 'friends', label: '好友列表' },
    { key: 'requests', label: '好友请求', badge: pendingCount },
    { key: 'add', label: '添加好友' },
  ];

  return (
    <div style={S.page}>
      {/* 顶部栏 */}
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <button
            onClick={() => navigate('/')}
            title="返回聊天"
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            ←
          </button>
          <span style={S.headerTitle}>好友</span>
        </div>
        {activeTab === 'add' && (
          <input
            style={S.searchInput}
            type="text"
            placeholder="搜索纸条ID / 手机号…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent-primary)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-default)';
            }}
          />
        )}
        {activeTab !== 'add' && <div />}
      </div>

      {/* 主体 */}
      <div style={S.body}>
        {/* 左侧标签 */}
        <nav style={S.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              style={{
                ...S.tab,
                ...(activeTab === tab.key ? S.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <UnreadBadge count={tab.badge} />
              )}
            </button>
          ))}
        </nav>

        {/* 右侧内容 */}
        <div style={S.content}>
          {activeTab === 'friends' && (
            <FriendList
              friends={friends}
              onMessage={handleMessage}
              onDelete={deleteFriend}
              onBlock={(userId, blocked) => blockUser(userId, blocked)}
              moreOpen={moreOpen}
              onMoreToggle={(id) => setMoreOpen(moreOpen === id ? null : id)}
            />
          )}

          {activeTab === 'requests' && (
            <RequestList
              requests={friendRequests}
              onAccept={(id) => handleFriendRequest(id, 'accept')}
              onReject={(id) => handleFriendRequest(id, 'reject')}
            />
          )}

          {activeTab === 'add' && (
            <SearchResults
              query={searchQuery}
              results={searchResults}
              searching={searching}
              onAddFriend={async (userId, message) => {
                await sendFriendRequest(userId, message);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ===================== 好友列表 =====================

const FriendList: React.FC<{
  friends: Friend[];
  onMessage: (userId: string) => void;
  onDelete: (userId: string) => void;
  onBlock: (userId: string, blocked: boolean) => void;
  moreOpen: string | null;
  onMoreToggle: (userId: string) => void;
}> = ({ friends, onMessage, onDelete, onBlock, moreOpen, onMoreToggle }) => {
  if (friends.length === 0) {
    return <p style={S.emptyText}>暂无好友，去添加好友吧</p>;
  }

  return (
    <>
      {friends.map((f) => (
        <div
          key={f.userId}
          style={{ ...S.listItem, position: 'relative' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.backgroundColor =
              'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.backgroundColor =
              'transparent';
          }}
        >
          <Avatar src={f.avatarUrl} name={f.nickname || f.username} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span style={S.onlineDot(f.online)} />
              <span style={S.itemName}>
                {f.remark || f.nickname || f.username}
              </span>
              {f.blocked && (
                <span style={{ ...S.itemSub, color: 'var(--accent-red)' }}>已拉黑</span>
              )}
            </div>
            {f.remark && (
              <p style={S.itemSub}>
                {f.nickname} · {f.online ? '在线' : '离线'}
              </p>
            )}
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <button
              style={S.actionBtn(true)}
              onClick={(e) => {
                e.stopPropagation();
                onMessage(f.userId);
              }}
              onMouseEnter={(e2) => {
                (e2.target as HTMLButtonElement).style.backgroundColor =
                  'var(--accent-secondary)';
              }}
              onMouseLeave={(e2) => {
                (e2.target as HTMLButtonElement).style.backgroundColor =
                  'var(--accent-primary)';
              }}
            >
              发消息
            </button>
            <button
              style={S.actionBtn(false)}
              onClick={(e) => {
                e.stopPropagation();
                onMoreToggle(f.userId);
              }}
              onMouseEnter={(e2) => {
                (e2.target as HTMLButtonElement).style.backgroundColor =
                  'var(--bg-hover)';
              }}
              onMouseLeave={(e2) => {
                (e2.target as HTMLButtonElement).style.backgroundColor =
                  'transparent';
              }}
            >
              ⋯
            </button>
          </div>

          {/* 更多菜单 */}
          {moreOpen === f.userId && (
            <div
              style={S.moreMenu}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                style={S.menuItem}
                onClick={() => {
                  onDelete(f.userId);
                  onMoreToggle(f.userId);
                }}
                onMouseEnter={(e2) => {
                  (e2.target as HTMLButtonElement).style.backgroundColor =
                    'var(--bg-hover)';
                }}
                onMouseLeave={(e2) => {
                  (e2.target as HTMLButtonElement).style.backgroundColor =
                    'transparent';
                }}
              >
                删除好友
              </button>
              <button
                style={{
                  ...S.menuItem,
                  color: f.blocked ? 'var(--text-primary)' : 'var(--accent-red)',
                }}
                onClick={() => {
                  onBlock(f.userId, !f.blocked);
                  onMoreToggle(f.userId);
                }}
                onMouseEnter={(e2) => {
                  (e2.target as HTMLButtonElement).style.backgroundColor =
                    'var(--bg-hover)';
                }}
                onMouseLeave={(e2) => {
                  (e2.target as HTMLButtonElement).style.backgroundColor =
                    'transparent';
                }}
              >
                {f.blocked ? '取消拉黑' : '拉黑'}
              </button>
            </div>
          )}
        </div>
      ))}
    </>
  );
};

// ===================== 好友请求列表 =====================

const RequestList: React.FC<{
  requests: FriendRequest[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}> = ({ requests, onAccept, onReject }) => {
  const pending = requests.filter((r) => r.status === 'pending');

  if (pending.length === 0) {
    return <p style={S.emptyText}>暂无待处理的好友请求</p>;
  }

  return (
    <>
      {pending.map((req) => (
        <div
          key={req.id}
          style={S.listItem}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.backgroundColor =
              'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.backgroundColor =
              'transparent';
          }}
        >
          <Avatar src={req.fromAvatarUrl} name={req.fromNickname} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={S.itemName}>{req.fromNickname}</span>
            {req.message && (
              <p style={S.itemSub}>验证消息：{req.message}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button
              style={S.actionBtn(true)}
              onClick={(e) => {
                e.stopPropagation();
                onAccept(req.id);
              }}
              onMouseEnter={(e2) => {
                (e2.target as HTMLButtonElement).style.backgroundColor =
                  'var(--accent-secondary)';
              }}
              onMouseLeave={(e2) => {
                (e2.target as HTMLButtonElement).style.backgroundColor =
                  'var(--accent-primary)';
              }}
            >
              同意
            </button>
            <button
              style={S.actionBtn(false)}
              onClick={(e) => {
                e.stopPropagation();
                onReject(req.id);
              }}
              onMouseEnter={(e2) => {
                (e2.target as HTMLButtonElement).style.backgroundColor =
                  'var(--bg-hover)';
              }}
              onMouseLeave={(e2) => {
                (e2.target as HTMLButtonElement).style.backgroundColor =
                  'transparent';
              }}
            >
              拒绝
            </button>
          </div>
        </div>
      ))}
    </>
  );
};

// ===================== 搜索结果 =====================

const SearchResults: React.FC<{
  query: string;
  results: User[];
  searching: boolean;
  onAddFriend: (userId: string, message?: string) => void;
}> = ({ query, results, searching, onAddFriend }) => {
  const [addingId, setAddingId] = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg] = useState('');

  if (!query.trim()) {
    return <p style={S.emptyText}>输入纸条ID或手机号搜索用户</p>;
  }

  if (searching) {
    return <p style={S.emptyText}>搜索中…</p>;
  }

  if (results.length === 0) {
    return <p style={S.emptyText}>未找到匹配的用户</p>;
  }

  return (
    <>
      {results.map((user) => (
        <div key={user.id} style={S.searchResultItem}>
          <Avatar src={user.avatarUrl} name={user.nickname || user.username} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={S.itemName}>{user.nickname}</p>
            <p style={S.itemSub}>纸条ID：{user.username}</p>
          </div>
          {addingId === user.id ? (
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
              <input
                style={{
                  ...S.searchInput,
                  width: 120,
                  height: 28,
                  fontSize: 'var(--font-size-xs)',
                }}
                placeholder="验证消息（可选）"
                value={verifyMsg}
                onChange={(e) => setVerifyMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onAddFriend(user.id, verifyMsg || undefined);
                    setAddingId(null);
                    setVerifyMsg('');
                  }
                }}
                autoFocus
              />
              <button
                style={{ ...S.actionBtn(true), fontSize: 'var(--font-size-xs)' }}
                onClick={() => {
                  onAddFriend(user.id, verifyMsg || undefined);
                  setAddingId(null);
                  setVerifyMsg('');
                }}
              >
                发送
              </button>
              <button
                style={{ ...S.actionBtn(false), fontSize: 'var(--font-size-xs)' }}
                onClick={() => {
                  setAddingId(null);
                  setVerifyMsg('');
                }}
              >
                取消
              </button>
            </div>
          ) : (
            <button
              style={S.actionBtn(true)}
              onClick={() => setAddingId(user.id)}
              onMouseEnter={(e2) => {
                (e2.target as HTMLButtonElement).style.backgroundColor =
                  'var(--accent-secondary)';
              }}
              onMouseLeave={(e2) => {
                (e2.target as HTMLButtonElement).style.backgroundColor =
                  'var(--accent-primary)';
              }}
            >
              添加好友
            </button>
          )}
        </div>
      ))}
    </>
  );
};
