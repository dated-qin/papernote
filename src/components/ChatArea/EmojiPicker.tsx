/* ============================================
   纸条 PaperNote — 表情选择器
   分类标签 + 搜索 + 最近使用(localStorage)
   ============================================ */

import React, { useState, useEffect, useMemo } from 'react';

export interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  /** 最近使用的 key，用于区分不同场景（如 'input', 'reaction'） */
  recentKey?: string;
}

// ---------- emoji 数据 ----------

const EMOJI_DATA: Record<string, string[]> = {
  '最近': [],
  '笑脸': '😀😃😄😁😆😅🤣😂🙂🙃😉😊😇🥰😍🤩😘😗😚😋😛😜🤪😝🤑🤗🤭🤫🤔🤐🤨😐😑😶😏😒🙄😬🤥😌😔😪🤤😴😷🤒🤕🤢🤮🤧🥵🥶🥴😵🤯🤠🥳🥸😎🤓🧐😕😟🙁😮😯😲😳🥺😦😧😨😰😥😢😭😱😖😣😞😓😩😫🥱😤😡😠🤬'.match(/[\p{Emoji}]/gu) || [],
  '手势': '👋🤚✋🖐🖖👌🤌🤏✌🤞🤟🤘🤙👈👉👆🖕👇☝👍👎✊👊🤛🤜👏🙌👐🤲🤝🙏✍💅🤳💪🦾🦵🦿🦶👣👀👁👅👄'.match(/[\p{Emoji}]/gu) || [],
  '人物': '👶🧒👦👧🧑👱👨🧔👩🧓👴👵🙍🙎🙅🙆💁🙋🧏🙇🤦🤷👮🕵💂🥷👷🤴👸👳👲🧕🤵👰🤰🤱👼🎅🤶🦸🦹🧙🧚🧛🧜🧝🧞🧟'.match(/[\p{Emoji}]/gu) || [],
  '动物': '🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🙈🙉🙊🐒🐔🐧🐦🐤🐣🐥🦆🦅🦉🦇🐺🐗🐴🦄🐝🪱🐛🦋🐌🐞🐜🦟🦗🕷🕸🦂🐢🐍🦎🦖🦕🐙🦑🦐🦞🦀🐡🐠🐟🐬🐳🐋🦈🐊🐅🐆🦓🦍🦧🐘🦛🦏🐪🐫🦒🦘🐃🐂🐄🐎🐖🐏🐑🦙🐐🦌🐕🐩🦮🐕‍🦺🐈🐓🦃🦚🦜🦢🦩🕊🐇🦝🦨🦡🦦🦥🐁🐀🐿🦔🐾🐉🐲'.match(/[\p{Emoji}‍]/gu) || [],
  '食物': '🍏🍎🍐🍊🍋🍌🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝🍅🍆🥑🥦🥬🥒🌶🫑🌽🥕🫒🧄🧅🥔🍠🥐🍞🥖🥨🧀🥚🍳🧈🥞🧇🥓🥩🍗🍖🦴🌭🍔🍟🍕🫓🥪🥙🧆🌮🌯🫔🥗🥘🫕🥫🍝🍜🍲🍛🍣🍱🥟🦪🍤🍙🍚🍘🍥🥠🥮🍢🍡🍧🍨🍦🥧🧁🍰🎂🍮🍭🍬🍫🍿🍩🍪🌰🥜🍯🥛🍼🫖☕🍵🧃🥤🧋🍶🍺🍻🥂🍷🥃🍸🍹🧉🍾🧊🥄🍴🍽🥣🥡🥢🧂'.match(/[\p{Emoji}]/gu) || [],
  '活动': '⚽🏀🏈⚾🥎🎾🏐🏉🥏🎱🪀🏓🏸🏒🏑🥍🏏🪃🥅⛳🪁🏹🎣🤿🥊🥋🎽🛹🛼🛷⛸🥌🎿⛷🏂🪂🏋🤺🤼🤸⛹🤾🏌🧘🏄🏊🤽🚣🧗🚵🚴🏇🏆🥇🥈🥉🏅🎖🏵🎗🎫🎟🎪🤹🎭🩰🎨🎬🎤🎧🎼🎹🥁🪘🎷🎺🪗🎸🪕🎻🎲♟🎯🎳🎮🎰🧩'.match(/[\p{Emoji}]/gu) || [],
  '旅行': '🚗🚕🚙🚌🚎🏎🚓🚑🚒🚐🛻🚚🚛🚜🏍🛵🚲🛴🛹🛼🛣🛤🛢⛽🚨🚥🚦🛑🚧⚓⛵🛶🚤🛳⛴🛥🚢✈🛩🛫🛬🪂💺🚁🚟🚠🚡🛰🚀🛸🏕🏖🏜🏝🏞🏟🏛🏗🧱🏘🏚🏠🏡🏢🏣🏤🏥🏦🏨🏩🏪🏫🏬🏭🏯🏰💒🗼🗽⛪🕌🛕🕍⛩🕋⛲⛺🌁🌃🏙🌄🌅🌆🌇🌉♨🌌🎠🎡🎢💈🎪🚂🚃🚄🚅🚆🚇🚈🚉🚊🚝🚞🚋🚌🚍🚎🚐🚑🚒🚓🚔🚕🚖🚗🚘🚙🛻🚚🚛🚜'.match(/[\p{Emoji}]/gu) || [],
  '物品': '⌚📱💻⌨🖥🖨🖱🖲🕹🗜💽💾💿📀📼📷📸📹🎥📽🎞📞☎📟📠📺📻🎙🎚🎛🧭⏱⏲⏰🕰⌛📡🔋🔌💡🔦🕯🪔🧯🛢💸💵💴💶💷🪙💰💳💎⚖🪜🧰🪛🔧🔨⚒🛠⛏🪚🔩⚙🪤🧱⛓🧲🔫💣🧨🪓🔪🗡⚔🛡🚬⚰🪦⚱🏺🔮📿🧿💈⚗🔭🔬🕳🩹🩺💊💉🩸🧬🦠🧫🧪🌡🧹🪠🧺🧻🚽🚰🚿🛁🛀🧼🪥🪒🧽🪣🧴🛎🔑🗝🚪🪑🛋🛏🛌🧸🪆🖼🪞🪟🛍🛒🎁🎈🎏🎀🪄🪅🎊🎉🎎🏮🎐🧧✉📩📨📧💌📥📤📦🏷🪧📪📫📬📭📮📯📜📃📄📑🧾📊📈📉🗒🗓📆📅🗑📇🗃🗳🗄📋📁📂🗂🗞📰📕📗📘📙📚📖🔖🧷🔗📎🖇📐📏🧮📌📍✂🖊🖋✒🖌🖍📝✏🔍🔎🔏🔐🔒🔓'.match(/[\p{Emoji}]/gu) || [],
  '符号': '❤🧡💛💚💙💜🖤🤍🤎💔❣💕💞💓💗💖💘💝💟☮✝☪🕉☸✡🔯🕎☯☦🛐⛎♈♉♊♋♌♍♎♏♐♑♒♓🆔⚛🉑☢☣📴📳🈶🈚🈸🈺🈷✴🆚💮🉐㊙㊗🈴🈵🈹🈲🅰🅱🆎🆑🅾🆘❌⭕🛑⛔📛🚫💯💢♨🚷🚯🚳🚱🔞📵🚭❗❕❓❔‼⁉🔅🔆〽⚠🚸🔱⚜🔰♻✅🈯💹❇✳❎🌐💠Ⓜ🌀💤🏧🚾♿🅿🈳🈂🛂🛃🛄🛅🚹🚺🚼⚧🚻🚮🎦📶🈁🔣ℹ🔤🔡🔠🆖🆗🆙🆒🆕🆓0️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣9️⃣🔟🔢#️⃣*️⃣⏏▶⏸⏯⏹⏺⏭⏮⏩⏪⏫⏬◀🔼🔽➡⬅⬆⬇↗↘↙↖↕↔↪↩⤴⤵🔀🔁🔂🔄🔃🎵🎶➕➖➗✖🟰♾💲💱™©®〰➰➿🔚🔙🔛🔝🔜✔☑🔘🔴🟠🟡🟢🔵🟣⚫⚪🟤🔺🔻🔸🔹🔶🔷🔳🔲▪▫◾◽◼◻🟥🟧🟨🟩🟦🟪⬛⬜🟫🔈🔇🔉🔊🔔🔕📣📢💬💭🗯♠♣♥♦🃏🎴🀄🕐🕑🕒🕓🕔🕕🕖🕗🕘🕙🕚🕛🕜🕝🕞🕟🕠🕡🕢🕣🕤🕥🕦🕧'.match(/[\p{Emoji}]/gu) || [],
};

const RECENT_MAX = 24;

function loadRecent(key: string): string[] {
  try {
    const raw = localStorage.getItem(`emoji_recent_${key}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(key: string, emojis: string[]): void {
  try {
    localStorage.setItem(`emoji_recent_${key}`, JSON.stringify(emojis.slice(0, RECENT_MAX)));
  } catch { /* ignore */ }
}

function addRecent(key: string, emoji: string): string[] {
  const list = loadRecent(key).filter((e) => e !== emoji);
  list.unshift(emoji);
  saveRecent(key, list);
  return list;
}

// ---------- 组件 ----------

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose, recentKey = 'default' }) => {
  const [activeTab, setActiveTab] = useState('最近');
  const [search, setSearch] = useState('');
  const [recent, setRecent] = useState<string[]>(() => loadRecent(recentKey));

  const categories = useMemo(() => Object.keys(EMOJI_DATA), []);

  // ESC 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const displayRecent = recentKey !== 'reaction' || recent.length > 0;
  const tabs = displayRecent ? categories : categories.filter((c) => c !== '最近');

  // 如果选中了 "最近" 但没有最近数据，切到第一个有数据的 tab
  useEffect(() => {
    if (activeTab === '最近' && recent.length === 0) {
      setActiveTab('笑脸');
    }
  }, [activeTab, recent.length]);

  const handleSelect = (emoji: string) => {
    const updated = addRecent(recentKey, emoji);
    setRecent(updated);
    onSelect(emoji);
  };

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const results: string[] = [];
    for (const cat of categories) {
      if (cat === '最近') continue;
      const emojis = EMOJI_DATA[cat];
      for (const e of emojis) {
        if (results.includes(e)) continue;
        // 简单匹配：搜索 emoji 本身
        if (e.includes(q) || e === q) {
          results.push(e);
        }
      }
      if (results.length >= 30) break;
    }
    return results;
  }, [search, categories]);

  const gridEmojis = searchResults ?? (activeTab === '最近' ? recent : EMOJI_DATA[activeTab] ?? []);

  return (
    <>
      <div style={backdropStyle} onClick={onClose} />
      <div style={pickerStyle}>
        {/* 搜索栏 */}
        <div style={searchBarStyle}>
          <input
            style={searchInputStyle}
            placeholder="搜索表情..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* 分类标签 */}
        {!search.trim() && (
          <div style={tabsStyle}>
            {tabs.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                style={{
                  ...tabStyle,
                  borderBottom: activeTab === cat ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeTab === cat ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Emoji 网格 */}
        <div style={gridStyle}>
          {gridEmojis.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>
              暂无表情
            </div>
          ) : (
            gridEmojis.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                onClick={() => handleSelect(emoji)}
                title={emoji}
                style={emojiBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {emoji}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
};

// ---------- 样式 ----------

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 90,
};

const pickerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '100%',
  left: 0,
  marginBottom: 8,
  width: 320,
  maxHeight: 360,
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-lg)',
  zIndex: 91,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const searchBarStyle: React.CSSProperties = {
  padding: 'var(--space-sm)',
  borderBottom: '1px solid var(--border-default)',
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  height: 32,
  padding: '0 var(--space-sm)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--font-size-sm)',
  outline: 'none',
  backgroundColor: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-family)',
};

const tabsStyle: React.CSSProperties = {
  display: 'flex',
  overflowX: 'auto',
  borderBottom: '1px solid var(--border-default)',
  padding: '0 var(--space-xs)',
  flexShrink: 0,
};

const tabStyle: React.CSSProperties = {
  padding: '6px 10px',
  border: 'none',
  backgroundColor: 'transparent',
  fontSize: 'var(--font-size-sm)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  fontFamily: 'var(--font-family)',
  transition: 'color 0.15s, border-color 0.15s',
  flexShrink: 0,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(8, 1fr)',
  gap: 2,
  padding: 'var(--space-sm)',
  overflowY: 'auto',
  flex: 1,
};

const emojiBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  backgroundColor: 'transparent',
  fontSize: 20,
  cursor: 'pointer',
  borderRadius: 'var(--radius-sm)',
  padding: 0,
  transition: 'background-color 0.1s',
};
