/* ============================================
   纸条 PaperNote — 群设置页面
   群信息编辑 / 公告 / 成员管理 / 权限操作 / 禁言 / 解散
   ============================================ */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useChatStore } from '../store/chatStore';
import { Avatar } from '../components/common';
import type { GroupMember, Announcement, MemberRole } from '../types';

// ---------- 内联样式 ----------

const S = {
  page: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    height: '100%',
    minWidth: 0,
    overflowY: 'auto' as const,
  } as React.CSSProperties,

  header: {
    height: 52,
    padding: '0 var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    borderBottom: '1px solid var(--border-default)',
    flexShrink: 0,
    backgroundColor: 'var(--bg-primary)',
  } as React.CSSProperties,

  headerTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
    color: 'var(--text-primary)',
  },

  section: {
    padding: 'var(--space-lg)',
    borderBottom: '1px solid var(--border-default)',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-md)',
  },

  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    marginBottom: 'var(--space-md)',
  } as React.CSSProperties,

  input: {
    flex: 1,
    height: 36,
    padding: '0 var(--space-md)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-default)',
    fontSize: 'var(--font-size-md)',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-secondary)',
    outline: 'none',
    fontFamily: 'var(--font-family)',
    maxWidth: 400,
  } as React.CSSProperties,

  textarea: {
    width: '100%',
    maxWidth: 400,
    minHeight: 60,
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-default)',
    fontSize: 'var(--font-size-md)',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-secondary)',
    outline: 'none',
    fontFamily: 'var(--font-family)',
    resize: 'vertical' as const,
  },

  saveBtn: {
    height: 28,
    padding: '0 var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--accent-primary)',
    color: 'var(--white)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
  },

  annCard: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-md)',
    marginTop: 'var(--space-sm)',
  } as React.CSSProperties,

  annReadText: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-muted)',
    marginTop: 'var(--space-sm)',
  },

  memberRow: {
    height: 52,
    padding: '0 var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    backgroundColor: 'transparent',
  } as React.CSSProperties,

  roleTag: (role: MemberRole): React.CSSProperties => ({
    fontSize: 'var(--font-size-xs)',
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: role === 'owner' ? 'var(--accent-primary)' : 'transparent',
    color: role === 'owner' ? 'var(--white)' : role === 'admin' ? 'var(--text-muted)' : 'transparent',
    border: role === 'admin' ? '1px solid var(--border-default)' : 'none',
    fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
  }),

  memberName: {
    fontSize: 'var(--font-size-md)',
    color: 'var(--text-primary)',
    fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
  },

  menuBtn: {
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
    marginLeft: 'auto',
  },

  dropdown: {
    position: 'absolute' as const,
    right: 0,
    top: 32,
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md)',
    zIndex: 20,
    minWidth: 140,
    overflow: 'hidden',
  } as React.CSSProperties,

  dropdownItem: {
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

  dangerBtn: {
    width: '100%',
    padding: 'var(--space-md)',
    textAlign: 'center' as const,
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--accent-red)',
    fontSize: 'var(--font-size-md)',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
    marginTop: 'var(--space-xl)',
    marginBottom: 'var(--space-xl)',
  },

  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  } as React.CSSProperties,

  modalCard: {
    backgroundColor: 'var(--bg-primary)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-xl)',
    minWidth: 300,
    maxWidth: 400,
    boxShadow: 'var(--shadow-lg)',
  } as React.CSSProperties,

  modalTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-lg)',
  },
};

// ---------- 禁言时长选项 ----------

const MUTE_OPTIONS = [
  { label: '10 分钟', seconds: 600 },
  { label: '1 小时', seconds: 3600 },
  { label: '12 小时', seconds: 43200 },
  { label: '24 小时', seconds: 86400 },
  { label: '自定义', seconds: -1 },
];

// ---------- 页面组件 ----------

export const GroupSettingsPage: React.FC = () => {
  const { convId } = useParams<{ convId: string }>();
  const navigate = useNavigate();
  const conversation = useChatStore((s) =>
    s.conversations.find((c) => c.id === convId),
  );
  const currentUserId = useChatStore((s) => s.currentUser?.id ?? '');
  const updateGroupInfo = useChatStore((s) => s.updateGroupInfo);
  const getMembers = useChatStore((s) => s.getMembers);
  const manageMember = useChatStore((s) => s.manageMember);
  const getAnnouncements = useChatStore((s) => s.getAnnouncements);
  const publishAnnouncement = useChatStore((s) => s.publishAnnouncement);
  const markAnnouncementRead = useChatStore((s) => s.markAnnouncementRead);
  const dissolveGroup = useChatStore((s) => s.dissolveGroup);

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [groupName, setGroupName] = useState(conversation?.name ?? '');
  const [groupDesc, setGroupDesc] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');

  // 弹窗状态
  const [muteTarget, setMuteTarget] = useState<GroupMember | null>(null);
  const [confirmDissolve, setConfirmDissolve] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    member: GroupMember;
    action: string;
    label: string;
  } | null>(null);

  // 下拉菜单
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const currentUserRole: MemberRole =
    members.find((m) => m.userId === currentUserId)?.role ?? 'member';
  const isAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';

  // 加载数据
  useEffect(() => {
    if (!convId) return;
    getMembers(convId).then(setMembers);
    getAnnouncements(convId).then((a) => {
      setAnnouncements(a);
      // 自动标记最新公告已读
      if (a.length > 0) {
        markAnnouncementRead(convId, a[0].id);
      }
    });
  }, [convId, getMembers, getAnnouncements, markAnnouncementRead]);

  // 关闭菜单
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  // 输入框聚焦
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'var(--accent-primary)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'var(--border-default)';
  };

  // 快捷操作
  const doAction = useCallback(
    (member: GroupMember, action: string, label: string) => {
      setConfirmAction({ member, action, label });
      setMenuOpen(null);
    },
    [],
  );

  const executeAction = useCallback(async () => {
    if (!convId || !confirmAction) return;
    await manageMember(convId, confirmAction.member.userId, confirmAction.action);
    setConfirmAction(null);
    // 刷新成员列表
    getMembers(convId).then(setMembers);
  }, [convId, confirmAction, manageMember, getMembers]);

  if (!convId || !conversation || conversation.type !== 'channel') {
    return (
      <div style={S.page}>
        <div style={S.header}>
          <button
            onClick={() => navigate('/')}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 16,
              cursor: 'pointer',
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            ←
          </button>
          <span style={S.headerTitle}>群不存在或非群聊</span>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* ====== 顶部栏 ====== */}
      <div style={S.header}>
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
        <span style={S.headerTitle}>群设置</span>
      </div>

      {/* ====== 群信息编辑 ====== */}
      <div style={S.section}>
        <p style={S.sectionTitle}>群信息</p>

        {/* 群头像 */}
        <div style={S.fieldRow}>
          <Avatar src={conversation.avatarUrl} name={groupName} size={48} />
          {isAdmin && (
            <button
              style={{
                ...S.saveBtn,
                backgroundColor: 'transparent',
                color: 'var(--accent-link)',
                border: '1px solid var(--border-default)',
              }}
              onClick={() => {
                setAvatarUrl(conversation.avatarUrl ?? '');
                setAvatarDialogOpen(true);
              }}
            >
              更换头像
            </button>
          )}
        </div>

        {/* 群名 */}
        {isAdmin ? (
          <div style={S.fieldRow}>
            <span style={{ ...S.sectionTitle, marginBottom: 0, minWidth: 40 }}>名称</span>
            <input
              style={S.input}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onFocus={onFocus}
              onBlur={onBlur}
            />
            <button
              style={S.saveBtn}
              onClick={() => convId && updateGroupInfo(convId, { name: groupName })}
            >
              保存
            </button>
          </div>
        ) : (
          <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
            {conversation.name}
          </p>
        )}

        {/* 群简介 */}
        {isAdmin && (
          <div style={{ marginTop: 'var(--space-sm)' }}>
            <span style={S.sectionTitle}>简介</span>
            <textarea
              style={S.textarea}
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              placeholder="群简介（可选）"
              onFocus={onFocus}
              onBlur={onBlur}
            />
            <button
              style={{ ...S.saveBtn, marginTop: 'var(--space-sm)' }}
              onClick={() => convId && updateGroupInfo(convId, { description: groupDesc })}
            >
              保存简介
            </button>
          </div>
        )}
      </div>

      {/* ====== 群公告 ====== */}
      <div style={S.section}>
        <p style={S.sectionTitle}>
          群公告
          {announcements.length > 0 && (
            <span style={{ fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: 8 }}>
              ({announcements.length})
            </span>
          )}
        </p>

        {announcements.length > 0 ? (
          announcements.map((ann) => (
            <div key={ann.id} style={S.annCard}>
              <p
                style={{
                  fontSize: 'var(--font-size-md)',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                }}
              >
                {ann.content}
              </p>
              <p style={S.annReadText}>
                {ann.publisherName} ·{' '}
                {new Date(ann.updatedAt).toLocaleDateString('zh-CN')} · 已读{' '}
                {ann.readCount}/{ann.totalCount} 人
              </p>
            </div>
          ))
        ) : (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>暂无公告</p>
        )}

        {isAdmin && (
          <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)' }}>
            <textarea
              style={{ ...S.textarea, maxWidth: 360 }}
              value={newAnnContent}
              onChange={(e) => setNewAnnContent(e.target.value)}
              placeholder="输入新公告…"
              onFocus={onFocus}
              onBlur={onBlur}
            />
            <button
              style={{ ...S.saveBtn, alignSelf: 'flex-end' }}
              onClick={async () => {
                if (!newAnnContent.trim() || !convId) return;
                await publishAnnouncement(convId, newAnnContent.trim());
                setNewAnnContent('');
                getAnnouncements(convId).then(setAnnouncements);
              }}
            >
              发布
            </button>
          </div>
        )}
      </div>

      {/* ====== 成员列表 ====== */}
      <div style={{ ...S.section, padding: 0 }}>
        <p style={{ ...S.sectionTitle, padding: 'var(--space-md) var(--space-lg)', marginBottom: 0 }}>
          成员列表 ({members.length} 人)
        </p>

        {members.map((member) => {
          const isSelf = member.userId === currentUserId;
          const canOperate = isAdmin && !isSelf;
          // 仅群主可管理管理员，群主不可操作群主
          const canManage =
            canOperate &&
            (isOwner ||
              (currentUserRole === 'admin' && member.role === 'member'));

          return (
            <div
              key={member.userId}
              style={{ ...S.memberRow, position: 'relative' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor =
                  'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor =
                  'transparent';
              }}
            >
              <Avatar src={member.avatarUrl} name={member.nickname} size={36} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span style={S.memberName}>
                  {member.nickname}
                  {isSelf && (
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', marginLeft: 4 }}>
                      (你)
                    </span>
                  )}
                </span>
                {member.role !== 'member' && (
                  <span style={S.roleTag(member.role)}>
                    {member.role === 'owner' ? '群主' : '管理员'}
                  </span>
                )}
                {member.muted && <span title="已禁言">🔇</span>}
              </div>

              {/* 操作菜单 */}
              {canManage && member.userId !== currentUserId && (
                <div style={{ position: 'relative' }}>
                  <button
                    style={S.menuBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === member.userId ? null : member.userId);
                    }}
                    onMouseEnter={(e2) => {
                      (e2.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e2) => {
                      (e2.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    ⋮
                  </button>

                  {menuOpen === member.userId && (
                    <div style={S.dropdown} onClick={(e) => e.stopPropagation()}>
                      {isOwner && member.role !== 'admin' && (
                        <button
                          style={S.dropdownItem}
                          onClick={() => doAction(member, 'promote_admin', '设为管理员')}
                          onMouseEnter={(e2) => {
                            (e2.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
                          }}
                          onMouseLeave={(e2) => {
                            (e2.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                          }}
                        >
                          设为管理员
                        </button>
                      )}
                      {isOwner && member.role === 'admin' && (
                        <button
                          style={S.dropdownItem}
                          onClick={() => doAction(member, 'demote_admin', '取消管理员')}
                          onMouseEnter={(e2) => {
                            (e2.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
                          }}
                          onMouseLeave={(e2) => {
                            (e2.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                          }}
                        >
                          取消管理员
                        </button>
                      )}
                      {isOwner && (
                        <button
                          style={{ ...S.dropdownItem, color: 'var(--accent-red)' }}
                          onClick={() =>
                            doAction(member, 'transfer_owner', `将群主转让给 ${member.nickname}`)
                          }
                          onMouseEnter={(e2) => {
                            (e2.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
                          }}
                          onMouseLeave={(e2) => {
                            (e2.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                          }}
                        >
                          转让群主
                        </button>
                      )}
                      {!member.muted && (
                        <button
                          style={S.dropdownItem}
                          onClick={() => {
                            setMuteTarget(member);
                            setMenuOpen(null);
                          }}
                          onMouseEnter={(e2) => {
                            (e2.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
                          }}
                          onMouseLeave={(e2) => {
                            (e2.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                          }}
                        >
                          禁言
                        </button>
                      )}
                      {member.muted && (
                        <button
                          style={S.dropdownItem}
                          onClick={() => doAction(member, 'unmute', '解除禁言')}
                          onMouseEnter={(e2) => {
                            (e2.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
                          }}
                          onMouseLeave={(e2) => {
                            (e2.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                          }}
                        >
                          解除禁言
                        </button>
                      )}
                      <button
                        style={{ ...S.dropdownItem, color: 'var(--accent-red)' }}
                        onClick={() =>
                          doAction(member, 'remove', `将 ${member.nickname} 移出群聊`)
                        }
                        onMouseEnter={(e2) => {
                          (e2.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e2) => {
                          (e2.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                        }}
                      >
                        移出群聊
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ====== 解散群聊（仅群主） ====== */}
      {isOwner && (
        <button
          style={S.dangerBtn}
          onClick={() => setConfirmDissolve(true)}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.textDecoration = 'none';
          }}
        >
          解散群聊
        </button>
      )}

      {/* ====== 禁言时长选择弹窗 ====== */}
      {muteTarget && convId && (
        <MuteDurationPicker
          memberName={muteTarget.nickname}
          onSelect={async (seconds) => {
            if (seconds > 0) {
              await manageMember(convId, muteTarget.userId, 'mute', seconds);
              getMembers(convId).then(setMembers);
            }
            setMuteTarget(null);
          }}
          onCancel={() => setMuteTarget(null)}
        />
      )}

      {/* ====== 二次确认弹窗 ====== */}
      {confirmDissolve && convId && (
        <ConfirmDialog
          title="解散群聊"
          message="确定解散该群聊？此操作不可撤销。"
          confirmLabel="解散"
          confirmColor="var(--accent-red)"
          onConfirm={async () => {
            await dissolveGroup(convId);
            navigate('/');
          }}
          onCancel={() => setConfirmDissolve(false)}
        />
      )}

      {confirmAction && convId && (
        <ConfirmDialog
          title="确认操作"
          message={`确定${confirmAction.label}？`}
          confirmLabel="确认"
          onConfirm={executeAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {avatarDialogOpen && convId && (
        <InputDialog
          title="更换头像"
          placeholder="输入新的头像 URL"
          value={avatarUrl}
          onChange={setAvatarUrl}
          onConfirm={async () => {
            const url = avatarUrl.trim();
            if (!url) return;
            await updateGroupInfo(convId, { avatar: url });
            setAvatarDialogOpen(false);
          }}
          onCancel={() => setAvatarDialogOpen(false)}
        />
      )}
    </div>
  );
};

// ===================== 禁言时长选择弹窗 =====================

const MuteDurationPicker: React.FC<{
  memberName: string;
  onSelect: (seconds: number) => void;
  onCancel: () => void;
}> = ({ memberName, onSelect, onCancel }) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customSeconds, setCustomSeconds] = useState('');

  const submitCustom = () => {
    const seconds = Number.parseInt(customSeconds, 10);
    if (Number.isFinite(seconds) && seconds > 0) {
      onSelect(seconds);
    }
  };

  return (
    <div style={S.modal} onClick={onCancel}>
      <div style={S.modalCard} onClick={(e) => e.stopPropagation()}>
        <p style={S.modalTitle}>禁言 {memberName}</p>
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          选择禁言时长：
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {MUTE_OPTIONS.map((opt) => (
            opt.seconds === -1 ? (
              <div key={opt.label} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <button
                  style={{
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: showCustom ? 'var(--bg-hover)' : 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--font-size-md)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-family)',
                  }}
                  onClick={() => setShowCustom((v) => !v)}
                >
                  {opt.label}
                </button>
                {showCustom && (
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <input
                      value={customSeconds}
                      onChange={(e) => setCustomSeconds(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitCustom();
                      }}
                      placeholder="秒"
                      autoFocus
                      style={{
                        ...S.input,
                        maxWidth: 'none',
                        width: 0,
                        flex: 1,
                      }}
                    />
                    <button
                      style={S.saveBtn}
                      onClick={submitCustom}
                    >
                      确定
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                key={opt.label}
                style={{
                  height: 40,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-md)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)',
                  transition: 'background-color 0.1s',
                }}
                onClick={() => onSelect(opt.seconds)}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                {opt.label}
              </button>
            )
          ))}
          <button
            style={{
              height: 40,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-md)',
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
            }}
            onClick={onCancel}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

// ===================== 输入弹窗 =====================

const InputDialog: React.FC<{
  title: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, placeholder, value, onChange, onConfirm, onCancel }) => (
  <div style={S.modal} onClick={onCancel}>
    <div style={S.modalCard} onClick={(e) => e.stopPropagation()}>
      <p style={S.modalTitle}>{title}</p>
      <input
        style={{ ...S.input, width: '100%', maxWidth: 'none' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onConfirm();
          if (e.key === 'Escape') onCancel();
        }}
        placeholder={placeholder}
        autoFocus
      />
      <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
        <button
          style={{
            height: 36,
            padding: '0 var(--space-lg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-size-md)',
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
          }}
          onClick={onCancel}
        >
          取消
        </button>
        <button
          style={{
            height: 36,
            padding: '0 var(--space-lg)',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--white)',
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-semibold)' as any,
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
          }}
          onClick={onConfirm}
        >
          确定
        </button>
      </div>
    </div>
  </div>
);

// ===================== 二次确认弹窗 =====================

const ConfirmDialog: React.FC<{
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, message, confirmLabel, confirmColor, onConfirm, onCancel }) => (
  <div style={S.modal} onClick={onCancel}>
    <div style={S.modalCard} onClick={(e) => e.stopPropagation()}>
      <p style={S.modalTitle}>{title}</p>
      <p
        style={{
          fontSize: 'var(--font-size-md)',
          color: 'var(--text-secondary)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        {message}
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
        <button
          style={{
            height: 36,
            padding: '0 var(--space-lg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-size-md)',
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
          }}
          onClick={onCancel}
        >
          取消
        </button>
        <button
          style={{
            height: 36,
            padding: '0 var(--space-lg)',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: confirmColor || 'var(--accent-primary)',
            color: 'var(--white)',
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-semibold)' as any,
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
          }}
          onClick={onConfirm}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.opacity = '0.85';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.opacity = '1';
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);
