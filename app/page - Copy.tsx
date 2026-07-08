"use client";

import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState, useRef } from "react";

import { supabase } from "../lib/supabase";
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

function walletToColors(wallet: string): [string, string] {
  let h1 = 0, h2 = 0;
  for (let i = 0; i < wallet.length; i++) {
    h1 = (h1 * 31 + wallet.charCodeAt(i)) & 0xffff;
    h2 = (h2 * 37 + wallet.charCodeAt(wallet.length - 1 - i)) & 0xffff;
  }
  const hue1 = h1 % 360;
  const hue2 = (hue1 + 60 + (h2 % 60)) % 360;
  return [`hsl(${hue1},70%,55%)`, `hsl(${hue2},70%,40%)`];
}

function Avatar({ wallet, profile, size = 36 }: { wallet: string; profile?: any; size?: number }) {
  const [c1, c2] = walletToColors(wallet);
  const initials = profile?.username ? profile.username.slice(0, 2).toUpperCase() : wallet.slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "#fff",
      flexShrink: 0, userSelect: "none",
    }}>{initials}</div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-zinc-800 rounded-xl w-fit">
      {[0, 1, 2].map((i) => (
        <div key={i} className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }} />
      ))}
    </div>
  );
}

const EMOJI_CATEGORIES = [
  { label: "😀", emojis: ["😀","😂","😍","🥰","😎","🤔","😅","🥺","😭","😡","🤩","🥳","😴","🤯","🫡","❤️","🔥","✅","👍","👎","🙏","💪","🎉","💯","⭐","🚀","💎","🌙","☀️","🌈"] },
  { label: "🐶", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🦋","🐝","🦄","🦊","🐺"] },
  { label: "🍕", emojis: ["🍕","🍔","🌮","🌯","🍜","🍣","🍩","🍪","🎂","🍫","🍬","🍭","☕","🧃","🍺","🥂","🍾","🎁","🎈","🎮"] },
];

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const [cat, setCat] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute bottom-full mb-2 left-0 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-xl z-50 w-72">
      <div className="flex gap-1 mb-2">
        {EMOJI_CATEGORIES.map((c, i) => (
          <button key={i} onClick={() => setCat(i)} className={`px-2 py-1 rounded text-sm ${cat === i ? "bg-zinc-700" : "hover:bg-zinc-800"}`}>{c.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1">
        {EMOJI_CATEGORIES[cat].emojis.map((e) => (
          <button key={e} onClick={() => onSelect(e)} className="text-lg hover:bg-zinc-800 rounded p-0.5 transition-colors">{e}</button>
        ))}
      </div>
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
// IMPORTANT: every component below is declared at MODULE scope (outside Home).
// If a component is declared *inside* another component's function body, React
// treats it as a brand-new component type on every render of the parent — which
// means every keystroke in a controlled <input>/<textarea> unmounts the old DOM
// node and mounts a new one, killing focus after a single character. Keeping
// these at module scope and passing state down via props fixes that.

function ChatMessages({ messages, publicKey, reactions, selectedMsgs, selectionMode, toggleSelectMsg, toggleReaction, setContextMenu, contextMenu, getDisplayName }: any) {
  return (
    <>
      {messages.map((msg: any, i: number) => {
        const isMine = msg.sender === publicKey?.toBase58();
        const msgDate = new Date(msg.created_at).toDateString();
        const prevDate = i > 0 ? new Date(messages[i - 1].created_at).toDateString() : null;
        const showDateSep = msgDate !== prevDate;
        const msgReactions = reactions[msg.id] || {};
        const isSelected = selectedMsgs.has(msg.id);
        return (
          <div key={msg.id}>
            {showDateSep && (
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-zinc-800" />
                <div className="text-[10px] text-zinc-600">{new Date(msg.created_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}</div>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
            )}
            <div
              id={`msg-${msg.id}`}
              className={`flex items-end gap-1 rounded-lg px-0.5 py-0.5 transition-colors ${isSelected ? "bg-zinc-800/60" : ""} ${isMine ? "flex-row-reverse" : "flex-row"}`}
              onClick={(e) => {
                if (msg.deleted_for_all) return;
                if (selectionMode) { toggleSelectMsg(msg.id); return; }
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setContextMenu(contextMenu?.msgId === msg.id ? null : { msgId: msg.id, x: e.clientX, y: rect.top });
              }}
            >
              {selectionMode && !msg.deleted_for_all && (
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? "bg-green-500 border-green-500" : "border-zinc-600"}`}>
                  {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
              )}
              <div className={`flex flex-col gap-0.5 min-w-0 max-w-[80%] ${isMine ? "items-end" : "items-start"}`}>
                {msg.deleted_for_all ? (
                  <div className="px-3 py-2 rounded-2xl bg-zinc-800/50 border border-zinc-700 text-zinc-500 text-xs italic">🚫 Message deleted</div>
                ) : (
                  <div className={`px-3 py-2 rounded-2xl break-words text-sm max-w-full ${isMine ? "bg-green-600 rounded-br-sm" : "bg-zinc-800 rounded-bl-sm"} ${isSelected ? "opacity-70" : ""}`}>
                    {msg.reply_content && (
                      <div className={`mb-2 px-2 py-1 rounded-lg text-xs border-l-2 ${isMine ? "border-green-300 bg-green-700/50" : "border-zinc-500 bg-zinc-700/50"}`}>
                        <div className="text-zinc-400 mb-0.5">{getDisplayName(msg.reply_sender)}</div>
                        <div className="truncate opacity-80">{msg.reply_content}</div>
                      </div>
                    )}
                    {msg.content}
                  </div>
                )}
                {Object.keys(msgReactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                    {Object.entries(msgReactions).map(([emoji, wallets]: [string, any]) => (
                      <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border ${wallets.includes(publicKey?.toBase58()) ? "bg-green-900 border-green-700 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-300"}`}>
                        {emoji} <span className="text-[10px]">{wallets.length}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!msg.deleted_for_all && (
                  <div className={`flex items-center gap-1 px-1 ${isMine ? "flex-row-reverse" : ""}`}>
                    <div className="text-[10px] text-zinc-600">{new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
                    {isMine && i === messages.length - 1 && (
                      <div className={`text-[10px] font-bold ${msg.seen ? "text-green-400" : "text-zinc-600"}`}>{msg.seen ? "✓✓" : "✓"}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

function ChatInput({
  message, handleMessageInput, textareaRef, showEmojiPicker, setShowEmojiPicker,
  replyTo, setReplyTo, publicKey, getDisplayName, autoResize, setMessage, onSend,
}: any) {
  return (
    <div className="border-t border-zinc-800 px-3 py-3 flex-shrink-0">
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 bg-zinc-800 border-l-2 border-green-500 rounded-lg px-3 py-2">
          <div className="flex-1 min-w-0 pl-1">
            <div className="text-green-400 text-xs">{replyTo.sender === publicKey?.toBase58() ? "You" : getDisplayName(replyTo.sender)}</div>
            <div className="text-zinc-400 text-xs truncate">{replyTo.content}</div>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-zinc-500 hover:text-white">✕</button>
        </div>
      )}
      <div className="flex gap-2 items-end">
        <div className="relative flex-shrink-0">
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="bg-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm">😊</button>
          {showEmojiPicker && (
            <EmojiPicker onSelect={(e) => { setMessage((prev: string) => prev + e); setShowEmojiPicker(false); setTimeout(autoResize, 0); }} onClose={() => setShowEmojiPicker(false)} />
          )}
        </div>
        <textarea ref={textareaRef} value={message}
          onChange={(e) => handleMessageInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="Message..."
          rows={1}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm resize-none overflow-hidden focus:outline-none"
          style={{ minHeight: "56px", maxHeight: "160px" }} />
        <button onClick={onSend} className="bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 py-2.5 font-bold flex-shrink-0 transition-colors">↑</button>
      </div>
    </div>
  );
}

function TabChats({
  receiver, setReceiver, loadConversation, inboxMessages, profiles, isOnline, unreadCounts, getDisplayName, formatInboxTime,
}: any) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0 flex items-center justify-between">
        <h1 className="text-xl font-bold">Chats</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
        <div className="flex gap-2 mb-2">
          <input value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="Wallet address..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
          <button onClick={() => { loadConversation(receiver); setReceiver(""); }}
            className="bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 text-sm font-bold transition-colors">Open</button>
        </div>
        {inboxMessages.length === 0 && <div className="text-zinc-500 text-sm text-center py-8">No conversations yet</div>}
        {inboxMessages.map((msg: any) => (
          <button key={msg.otherWallet} onClick={() => loadConversation(msg.otherWallet)}
            className={`border rounded-xl p-3 text-left hover:border-zinc-700 transition-colors ${
              unreadCounts[msg.otherWallet] > 0
                ? "bg-zinc-800 border-green-800"
                : "bg-zinc-900 border-zinc-800"
            }`}>
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <Avatar wallet={msg.otherWallet} profile={profiles[msg.otherWallet]} size={44} />
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900 ${isOnline(msg.otherWallet) ? "bg-green-400" : "bg-zinc-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="text-white text-sm font-semibold truncate">{getDisplayName(msg.otherWallet)}</div>
                  <div className="text-[10px] text-zinc-500 flex-shrink-0 ml-1">{msg.created_at ? formatInboxTime(msg.created_at) : ""}</div>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <div className="truncate text-xs text-zinc-400">{msg.content}</div>
                  {unreadCounts[msg.otherWallet] > 0 && (
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TabFriends({
  friendRequests, publicKey, profiles, getDisplayName, acceptFriend, rejectFriend,
  receiver, setReceiver, addFriend, friends, isOnline, loadConversation, setActiveTab, unfriend,
}: any) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <h1 className="text-xl font-bold">Friends</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-3">
        {friendRequests.filter((r: any) => r.receiver === publicKey?.toBase58()).length > 0 && (
          <div>
            <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wide mb-2 px-1">Requests</div>
            {friendRequests.filter((r: any) => r.receiver === publicKey?.toBase58()).map((r: any) => (
              <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3 mb-2">
                <Avatar wallet={r.sender} profile={profiles[r.sender]} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{getDisplayName(r.sender)}</div>
                  <div className="text-zinc-500 text-xs truncate">{r.sender}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => acceptFriend(r.id)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Accept</button>
                  <button onClick={() => rejectFriend(r.id)} className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1.5 rounded-lg text-xs transition-colors">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div>
          <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wide mb-2 px-1">Add Friend</div>
          <div className="flex gap-2">
            <input value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="Wallet address..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            <button onClick={() => { addFriend(receiver); setReceiver(""); }}
              className="bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 text-sm font-bold transition-colors">Add</button>
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wide mb-2 px-1">Friends ({friends.length})</div>
          {friends.length === 0 && <div className="text-zinc-500 text-sm text-center py-4">No friends yet</div>}
          {friends.map((f: any) => {
            const other = f.sender === publicKey?.toBase58() ? f.receiver : f.sender;
            return (
              <div key={other} onClick={() => { loadConversation(other); setActiveTab("chats"); }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 transition-colors mb-2 flex items-center gap-3 cursor-pointer">
                <div className="relative flex-shrink-0">
                  <Avatar wallet={other} profile={profiles[other]} size={44} />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900 ${isOnline(other) ? "bg-green-400" : "bg-zinc-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-semibold">{getDisplayName(other)}</div>
                  <div className="text-zinc-500 text-xs">
                    {profiles[other]?.status === "busy" ? "🔴 Busy" : profiles[other]?.status === "away" ? "🟡 Away" : isOnline(other) ? "🟢 Online" : "⚫ Offline"}
                    {profiles[other]?.status_text ? ` — ${profiles[other].status_text}` : ""}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); unfriend(other); }} className="text-zinc-600 hover:text-red-400 text-xs transition-colors p-1">✕</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TabGroups({
  setShowCreateGroup, searchGroupQuery, setSearchGroupQuery, searchPublicGroups, searchingGroups,
  searchGroupResults, groups, openGroup, requestJoinGroup, publicKey,
  showCreateGroup, newGroupName, setNewGroupName, newGroupDesc, setNewGroupDesc,
  groupIsPublic, setGroupIsPublic, groupRequiresApproval, setGroupRequiresApproval,
  friends, profiles, getDisplayName, createGroup, creatingGroup,
}: any) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0 flex items-center justify-between">
        <h1 className="text-xl font-bold">Groups</h1>
        <button onClick={() => setShowCreateGroup(true)} className="bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors">+ New</button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
        {/* Search public groups */}
        <div className="mb-2">
          <div className="flex gap-2">
            <input value={searchGroupQuery}
              onChange={(e) => { setSearchGroupQuery(e.target.value); searchPublicGroups(e.target.value); }}
              placeholder="🔍 Search public groups..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
          </div>
          {searchGroupQuery && (
            <div className="mt-2 flex flex-col gap-1">
              {searchingGroups && <div className="text-zinc-500 text-xs text-center py-2">Searching...</div>}
              {searchGroupResults.map((g: any) => {
                const isMember = groups.some((myG: any) => myG.id === g.id);
                return (
                  <div key={g.id} className="bg-zinc-800 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${g.avatar_color}, #14F195)` }}>
                      {g.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-semibold">{g.name}</div>
                      <div className="text-zinc-500 text-xs">{g.description || "No description"}</div>
                      <div className="text-[10px] text-zinc-600 mt-0.5">
                        {g.requires_approval ? "🔒 Requires approval" : "🟢 Open"}
                      </div>
                    </div>
                    {isMember ? (
                      <button onClick={() => openGroup(g)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Open</button>
                    ) : (
                      <button onClick={() => requestJoinGroup(g.id)} className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                        {g.requires_approval ? "Request" : "Join"}
                      </button>
                    )}
                  </div>
                );
              })}
              {!searchingGroups && searchGroupResults.length === 0 && searchGroupQuery && (
                <div className="text-zinc-500 text-xs text-center py-3">No public groups found</div>
              )}
            </div>
          )}
        </div>
        {groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="text-5xl">👥</div>
            <div className="text-zinc-400 text-sm text-center">No groups yet.<br/>Create one to chat with multiple people!</div>
            <button onClick={() => setShowCreateGroup(true)} className="bg-green-600 hover:bg-green-500 text-white rounded-xl px-6 py-3 text-sm font-bold transition-colors">Create Group</button>
          </div>
        )}
        {groups.map((group: any) => (
          <button key={group.id} onClick={() => openGroup(group)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-left hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${group.avatar_color}, #14F195)` }}>
                {group.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold">{group.name}</div>
                <div className="text-zinc-500 text-xs truncate">{group.description || "No description"}</div>
              </div>
              {group.owner === publicKey?.toBase58() && <div className="text-[10px] text-yellow-500 font-bold flex-shrink-0">ADMIN</div>}
            </div>
          </button>
        ))}
      </div>
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-50" onClick={() => setShowCreateGroup(false)}>
          <div className="w-full md:max-w-md bg-zinc-900 border-t md:border border-zinc-700 rounded-t-2xl md:rounded-2xl p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-bold">Create Group</div>
            <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name *"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500" />
            <input value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="Description (optional)"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500" />
            {/* Public/Private toggle */}
            <div className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3">
              <div>
                <div className="text-white text-sm font-medium">Public Group</div>
                <div className="text-zinc-500 text-xs">Anyone can find and join this group</div>
              </div>
              <button onClick={() => setGroupIsPublic(!groupIsPublic)}
                className={`w-12 h-6 rounded-full transition-colors ${groupIsPublic ? "bg-green-500" : "bg-zinc-600"}`}>
                <div className={`w-5 h-5 rounded-full bg-white mx-0.5 transition-transform ${groupIsPublic ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>

            {/* Requires approval toggle */}
            <div className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3">
              <div>
                <div className="text-white text-sm font-medium">Require Approval</div>
                <div className="text-zinc-500 text-xs">New members need admin approval</div>
              </div>
              <button onClick={() => setGroupRequiresApproval(!groupRequiresApproval)}
                className={`w-12 h-6 rounded-full transition-colors ${groupRequiresApproval ? "bg-green-500" : "bg-zinc-600"}`}>
                <div className={`w-5 h-5 rounded-full bg-white mx-0.5 transition-transform ${groupRequiresApproval ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>
            {/* Add friends to group */}
            {friends.length > 0 && (
              <div>
                <div className="text-xs text-zinc-500 mb-2">Add friends to group</div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {friends.map((f: any) => {
                    const other = f.sender === publicKey?.toBase58() ? f.receiver : f.sender;
                    return (
                      <div key={other} className="flex items-center gap-1.5 bg-zinc-800 rounded-lg px-2 py-1">
                        <Avatar wallet={other} profile={profiles[other]} size={20} />
                        <span className="text-xs text-white">{getDisplayName(other)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowCreateGroup(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-3 text-sm font-medium transition-colors">Cancel</button>
              <button onClick={createGroup} disabled={creatingGroup || !newGroupName.trim()} className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-xl py-3 text-sm font-bold disabled:opacity-50 transition-colors">
                {creatingGroup ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabSettings({
  publicKey, profiles, savedUsername, username, setUsername, saveProfile,
  myStatus, myStatusText, setMyStatusText, saveStatus, messageExpiryDays, saveMessageExpiry,
}: any) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="font-semibold text-sm text-zinc-400 uppercase tracking-wide">Profile</div>
          {publicKey && (
            <div className="flex items-center gap-3">
              <Avatar wallet={publicKey.toBase58()} profile={profiles[publicKey.toBase58()]} size={52} />
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold">{savedUsername ? `@${savedUsername}` : "No username"}</div>
                <div className="text-zinc-500 text-xs truncate">{publicKey.toBase58()}</div>
              </div>
            </div>
          )}
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
          <button onClick={saveProfile} className="w-full bg-green-600 hover:bg-green-500 text-white rounded-xl py-2.5 text-sm font-bold transition-colors">Save Profile</button>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="font-semibold text-sm text-zinc-400 uppercase tracking-wide">Status</div>
          <div className="grid grid-cols-2 gap-2">
            {[{ value: "online", label: "Online", emoji: "🟢" }, { value: "away", label: "Away", emoji: "🟡" }, { value: "busy", label: "Busy", emoji: "🔴" }, { value: "offline", label: "Invisible", emoji: "⚫" }].map((s) => (
              <button key={s.value} onClick={() => saveStatus(s.value, myStatusText)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${myStatus === s.value ? "bg-green-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>
                <span>{s.emoji}</span><span>{s.label}</span>
              </button>
            ))}
          </div>
          <input value={myStatusText} onChange={(e) => setMyStatusText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveStatus(myStatus, myStatusText); }}
            placeholder="Custom status text..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
          <button onClick={() => saveStatus(myStatus, myStatusText)} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl py-2.5 text-sm font-bold transition-colors">Save Status</button>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="font-semibold text-sm text-zinc-400 uppercase tracking-wide">Message Expiry</div>
          <select value={messageExpiryDays} onChange={(e) => saveMessageExpiry(Number(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
            <option value={0}>Never</option>
            <option value={1}>After 1 day</option>
            <option value={7}>After 7 days</option>
            <option value={30}>After 30 days</option>
            <option value={90}>After 90 days</option>
          </select>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
          <div className="font-semibold text-sm text-zinc-400 uppercase tracking-wide">Wallet</div>
          <WalletMultiButtonDynamic />
        </div>
      </div>
    </div>
  );
}

function ChatWindow({
  activeChat, setActiveChat, setActiveTab, profiles, isOnline, getDisplayName, otherIsTyping,
  showSearch, setShowSearch, searchQuery, setSearchQuery, chatMessages, publicKey,
  fetchNFTs, fetchOtherWalletTokens, showNFTs, setShowNFTs, nftWallet, setNftTab, nftTab,
  isFriend, unfriend, addFriend, isBlocked, blockUser, unblockUser,
  loadingNFTs, nfts, loadingOtherTokens, otherTokens,
  messagesContainerRef, hasMoreMessages, loadMoreMessages, loadingMore,
  reactions, selectedMsgs, selectionMode, toggleSelectMsg, toggleReaction, setContextMenu, contextMenu,
  ContextMenuUI, clearSelection, showDeleteConfirm, setShowDeleteConfirm, deleteSelected,
  amIBlocked, didIBlock, showSendSol, setShowSendSol, loadingTokens, walletTokens,
  selectedToken, setSelectedToken, solAmount, setSolAmount, sendSol, sendingSol, fetchWalletTokens,
  message, handleMessageInput, textareaRef, showEmojiPicker, setShowEmojiPicker,
  replyTo, setReplyTo, autoResize, setMessage, sendMessage,
}: any) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-zinc-800 px-3 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => { setActiveChat(""); setActiveTab("chats"); }} className="text-zinc-400 hover:text-white text-xl flex-shrink-0">←</button>
          <div className="relative flex-shrink-0">
            <Avatar wallet={activeChat} profile={profiles[activeChat]} size={38} />
            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${isOnline(activeChat) ? "bg-green-400" : "bg-zinc-600"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm">{getDisplayName(activeChat)}</div>
            <div className="text-xs text-zinc-500">
              {otherIsTyping ? <span className="text-green-400 animate-pulse">typing...</span>
                : profiles[activeChat]?.status === "busy" ? <span className="text-red-400">🔴 Busy</span>
                : profiles[activeChat]?.status === "away" ? <span className="text-yellow-400">🟡 Away</span>
                : isOnline(activeChat) ? <span className="text-green-400">🟢 Online</span>
                : "Offline"}
            </div>
          </div>
          <button onClick={() => { setShowSearch(!showSearch); setSearchQuery(""); }} className="text-zinc-400 hover:text-white p-1.5">🔍</button>
          <button onClick={() => { if (!showNFTs || nftWallet !== activeChat) { fetchNFTs(activeChat); fetchOtherWalletTokens(activeChat); } setShowNFTs(!showNFTs); setNftTab("nfts"); }} className="text-zinc-400 hover:text-white p-1.5">🖼</button>
        </div>
        {showSearch && (
          <div className="mt-2">
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages..." autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none" />
            {searchQuery && (
              <div className="mt-1 max-h-40 overflow-y-auto flex flex-col gap-1">
                {chatMessages.filter((m: any) => !m.deleted_for_all && m.content?.toLowerCase().includes(searchQuery.toLowerCase())).map((m: any) => (
                  <button key={m.id} onClick={() => { document.getElementById(`msg-${m.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); setShowSearch(false); setSearchQuery(""); }}
                    className="text-left bg-zinc-800 rounded-lg px-3 py-2 text-xs">
                    <div className="text-zinc-500 mb-0.5">{m.sender === publicKey?.toBase58() ? "You" : getDisplayName(m.sender)}</div>
                    <div className="text-white">{m.content}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex gap-2 mt-2 flex-wrap">
          {isFriend(activeChat) ? (
            <button onClick={() => unfriend(activeChat)} className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-lg text-xs transition-colors">Unfriend</button>
          ) : (
            <button onClick={() => addFriend(activeChat)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs transition-colors">Add Friend</button>
          )}
          {!isBlocked(activeChat) ? (
            <button onClick={() => blockUser(activeChat)} className="bg-red-800 text-white px-3 py-1 rounded-lg text-xs transition-colors">Block</button>
          ) : (
            <button onClick={() => unblockUser(activeChat)} className="bg-zinc-700 text-white px-3 py-1 rounded-lg text-xs transition-colors">Unblock</button>
          )}
        </div>
      </div>
      {showNFTs && (
        <div className="border-b border-zinc-800 p-3 bg-zinc-900 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Wallet — {getDisplayName(activeChat)}</div>
            <button onClick={() => setShowNFTs(false)} className="text-zinc-500 text-xs">✕</button>
          </div>
          <div className="flex gap-1 mb-2">
            <button onClick={() => setNftTab("nfts")} className={`px-3 py-1 rounded-lg text-xs font-medium ${nftTab === "nfts" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>🖼 NFTs {!loadingNFTs && `(${nfts.length})`}</button>
            <button onClick={() => setNftTab("tokens")} className={`px-3 py-1 rounded-lg text-xs font-medium ${nftTab === "tokens" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>💰 Tokens {!loadingOtherTokens && `(${otherTokens.length})`}</button>
          </div>
          {nftTab === "nfts" && (loadingNFTs ? <div className="text-zinc-500 text-xs text-center py-2">Loading...</div> : nfts.length === 0 ? <div className="text-zinc-500 text-xs text-center py-2">No NFTs</div> :
            <div className="grid grid-cols-5 gap-1.5 max-h-32 overflow-y-auto">
              {nfts.map((nft: any) => (
                <div key={nft.id} className="rounded-lg overflow-hidden bg-zinc-800 aspect-square">
                  {nft.image && <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" onError={(e: any) => { e.target.style.display = "none"; }} />}
                </div>
              ))}
            </div>
          )}
          {nftTab === "tokens" && (
            <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
              {otherTokens.map((token: any) => (
                <div key={token.mint} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-2 py-1.5">
                  {token.logo && <img src={token.logo} alt={token.symbol} className="w-5 h-5 rounded-full" onError={(e: any) => { e.target.style.display = "none"; }} />}
                  <span className="text-white text-xs font-medium">{token.symbol}</span>
                  <span className="text-green-400 text-xs ml-auto">{token.balance.toFixed(3)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1 min-h-0">
        {hasMoreMessages && (
          <div className="flex justify-center py-2">
            <button onClick={loadMoreMessages} disabled={loadingMore} className="text-xs text-zinc-400 bg-zinc-800 px-4 py-2 rounded-full disabled:opacity-50">
              {loadingMore ? "Loading..." : "⬆ Load older"}
            </button>
          </div>
        )}
        <ChatMessages messages={chatMessages} publicKey={publicKey} reactions={reactions} selectedMsgs={selectedMsgs} selectionMode={selectionMode} toggleSelectMsg={toggleSelectMsg} toggleReaction={toggleReaction} setContextMenu={setContextMenu} contextMenu={contextMenu} getDisplayName={getDisplayName} />
      </div>
      {ContextMenuUI}
      {selectionMode && (
        <div className="flex items-center justify-between bg-zinc-800 border-t border-zinc-700 px-4 py-2 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm text-white font-medium">{selectedMsgs.size} selected</span>
            <button onClick={clearSelection} className="text-xs text-zinc-400">Cancel</button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowDeleteConfirm("me")} disabled={selectedMsgs.size === 0} className="bg-zinc-700 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-40">🗑 For me</button>
            <button onClick={() => setShowDeleteConfirm("all")} disabled={selectedMsgs.size === 0} className="bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-40">🗑 For all</button>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-bold text-white mb-2">Delete messages?</div>
            <div className="text-zinc-400 text-sm mb-6">{showDeleteConfirm === "all" ? `Delete ${selectedMsgs.size} message(s) for everyone?` : `Delete ${selectedMsgs.size} message(s) for you only?`}</div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 bg-zinc-800 text-white py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={() => deleteSelected(showDeleteConfirm)} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
      {otherIsTyping && (
        <div className="flex items-end gap-2 px-3 py-1 flex-shrink-0">
          <Avatar wallet={activeChat} profile={profiles[activeChat]} size={20} />
          <TypingIndicator />
        </div>
      )}
      {amIBlocked ? (
        <div className="border-t border-zinc-800 px-3 py-3 flex-shrink-0 text-zinc-500 text-sm text-center">You have been blocked by this user.</div>
      ) : didIBlock ? (
        <div className="border-t border-zinc-800 px-3 py-3 flex-shrink-0 text-zinc-500 text-sm text-center">You have blocked this user.</div>
      ) : (
        <div className="border-t border-zinc-800 px-3 py-3 flex-shrink-0">
          {showSendSol && (
            <div className="bg-zinc-900 border border-yellow-600 rounded-xl p-3 flex flex-col gap-2 mb-2">
              {loadingTokens ? <div className="text-zinc-400 text-sm text-center">Loading...</div> : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {walletTokens.map((token: any) => (
                      <button key={token.mint} onClick={() => setSelectedToken(token)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${selectedToken?.mint === token.mint ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-300"}`}>
                        {token.logo && <img src={token.logo} alt={token.symbol} className="w-3.5 h-3.5 rounded-full" onError={(e: any) => e.target.style.display = "none"} />}
                        <span>{token.symbol}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={solAmount} onChange={(e) => setSolAmount(e.target.value)} placeholder={`Amount ${selectedToken?.symbol || "SOL"}`} type="number" min="0" step="0.01"
                      className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none" />
                    <button onClick={sendSol} disabled={sendingSol || !solAmount} className="bg-yellow-500 text-black px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50">{sendingSol ? "..." : "Send"}</button>
                    <button onClick={() => { setShowSendSol(false); setSolAmount(""); }} className="text-zinc-500 px-2">✕</button>
                  </div>
                </>
              )}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <button onClick={() => { if (!showSendSol) fetchWalletTokens(); setShowSendSol(!showSendSol); }} className="bg-yellow-500 text-black rounded-xl px-3 py-2.5 font-bold text-sm flex-shrink-0">💸</button>
            <ChatInput
              message={message} handleMessageInput={handleMessageInput} textareaRef={textareaRef}
              showEmojiPicker={showEmojiPicker} setShowEmojiPicker={setShowEmojiPicker}
              replyTo={replyTo} setReplyTo={setReplyTo} publicKey={publicKey}
              getDisplayName={getDisplayName} autoResize={autoResize} setMessage={setMessage}
              onSend={sendMessage}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function GroupWindow({
  activeGroup, setActiveGroup, setActiveTab, groupMembers, showGroupInfo, setShowGroupInfo,
  profiles, getDisplayName, publicKey, removeMemberFromGroup, groupRequests,
  approveGroupRequest, rejectGroupRequest, addMemberWallet, setAddMemberWallet, addMemberToGroup,
  friends, addFriendToGroup, deleteGroup, leaveGroup, groupMessages, messagesContainerRef,
  message, handleMessageInput, textareaRef, showEmojiPicker, setShowEmojiPicker,
  replyTo, setReplyTo, autoResize, setMessage, sendGroupMessage, fetchGroups,
}: any) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-zinc-800 px-3 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => { setActiveGroup(null); setActiveTab("groups"); }} className="text-zinc-400 hover:text-white text-xl flex-shrink-0">←</button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${activeGroup.avatar_color}, #14F195)` }}>
            {activeGroup.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm">{activeGroup.name}</div>
            <div className="text-zinc-500 text-xs">{groupMembers.length} members</div>
          </div>
          <button onClick={() => setShowGroupInfo(!showGroupInfo)} className="text-zinc-400 hover:text-white p-1.5">⚙️</button>
        </div>
        {showGroupInfo && (
          <div className="mt-3 bg-zinc-800 rounded-xl p-3 flex flex-col gap-3">
            {activeGroup.owner === publicKey?.toBase58() ? (
              <div>
                <input
                  key={activeGroup.id}
                  defaultValue={activeGroup.description || ""}
                  onBlur={async (e) => {
                    const newDesc = e.target.value.trim();
                    await supabase.from("groups").update({ description: newDesc }).eq("id", activeGroup.id);
                    setActiveGroup({ ...activeGroup, description: newDesc });
                    fetchGroups();
                  }}
                  placeholder="Group description..."
                  className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-xs focus:outline-none mt-1"
                />
                <div className="text-[10px] text-zinc-500 mt-0.5">Click outside in
                  
                  put to save</div>
              </div>
            ) : (
              activeGroup.description && <div className="text-zinc-400 text-xs mt-1">{activeGroup.description}</div>
            )}
            <div className="text-xs text-zinc-500 font-semibold uppercase">Members ({groupMembers.length})</div>
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
              {groupMembers.map((m: any) => (
                <div key={m.wallet} className="flex items-center gap-2">
                  <Avatar wallet={m.wallet} profile={profiles[m.wallet]} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-medium">{getDisplayName(m.wallet)}</div>
                    {m.role === "owner" && <div className="text-yellow-500 text-[10px]">Admin</div>}
                  </div>
                  {activeGroup.owner === publicKey?.toBase58() && m.wallet !== publicKey?.toBase58() && (
                    <button onClick={() => removeMemberFromGroup(m.wallet)} className="text-zinc-600 hover:text-red-400 text-xs">✕</button>
                  )}
                </div>
              ))}
            </div>
            {/* Pending join requests */}
            {activeGroup.owner === publicKey?.toBase58() && groupRequests.length > 0 && (
              <div>
                <div className="text-xs text-zinc-500 font-semibold uppercase mb-1.5">Join Requests ({groupRequests.length})</div>
                <div className="flex flex-col gap-1.5 max-h-24 overflow-y-auto">
                  {groupRequests.map((req: any) => (
                    <div key={req.id} className="flex items-center gap-2">
                      <Avatar wallet={req.wallet} profile={profiles[req.wallet]} size={24} />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs">{getDisplayName(req.wallet)}</div>
                      </div>
                      <button onClick={() => approveGroupRequest(req.id, req.wallet)}
                        className="bg-green-600 text-white rounded px-2 py-0.5 text-[10px] font-bold">✓</button>
                      <button onClick={() => rejectGroupRequest(req.id)}
                        className="bg-red-700 text-white rounded px-2 py-0.5 text-[10px] font-bold">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeGroup.owner === publicKey?.toBase58() && (
              <>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between bg-zinc-700 rounded-xl px-3 py-2">
                    <div>
                      <div className="text-white text-xs font-medium">Public Group</div>
                      <div className="text-zinc-400 text-[10px]">Anyone can find and join</div>
                    </div>
                    <button
                      onClick={async () => {
                        const newVal = !activeGroup.is_public;
                        await supabase.from("groups").update({ is_public: newVal }).eq("id", activeGroup.id);
                        setActiveGroup({ ...activeGroup, is_public: newVal });
                      }}
                      className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${activeGroup.is_public ? "bg-green-500" : "bg-zinc-500"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white mx-0.5 transition-transform ${activeGroup.is_public ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-zinc-700 rounded-xl px-3 py-2">
                    <div>
                      <div className="text-white text-xs font-medium">Require Approval</div>
                      <div className="text-zinc-400 text-[10px]">Members need your approval</div>
                    </div>
                    <button
                      onClick={async () => {
                        const newVal = !activeGroup.requires_approval;
                        await supabase.from("groups").update({ requires_approval: newVal }).eq("id", activeGroup.id);
                        setActiveGroup({ ...activeGroup, requires_approval: newVal });
                      }}
                      className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${activeGroup.requires_approval ? "bg-green-500" : "bg-zinc-500"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white mx-0.5 transition-transform ${activeGroup.requires_approval ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input value={addMemberWallet} onChange={(e) => setAddMemberWallet(e.target.value)} placeholder="Add by wallet..."
                    className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                  <button onClick={() => addMemberToGroup(addMemberWallet)} className="bg-green-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold">Add</button>
                </div>
                {friends.length > 0 && (
                  <div>
                    <div className="text-xs text-zinc-500 mb-1.5">Add from friends:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {friends.filter((f: any) => {
                        const other = f.sender === publicKey?.toBase58() ? f.receiver : f.sender;
                        return !groupMembers.find((m: any) => m.wallet === other);
                      }).map((f: any) => {
                        const other = f.sender === publicKey?.toBase58() ? f.receiver : f.sender;
                        return (
                          <button key={other} onClick={() => addFriendToGroup(other)}
                            className="flex items-center gap-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg px-2 py-1 transition-colors">
                            <Avatar wallet={other} profile={profiles[other]} size={18} />
                            <span className="text-xs text-white">{getDisplayName(other)}</span>
                            <span className="text-green-400 text-xs">+</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="flex gap-2">
              {activeGroup.owner === publicKey?.toBase58() ? (
                <button onClick={deleteGroup} className="flex-1 bg-red-800 hover:bg-red-700 text-white rounded-lg py-2 text-xs font-bold transition-colors">Delete Group</button>
              ) : (
                <button onClick={leaveGroup} className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg py-2 text-xs font-bold transition-colors">Leave Group</button>
              )}
            </div>
          </div>
        )}
      </div>
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1 min-h-0">
        {groupMessages.map((msg: any, i: number) => {
          const isMine = msg.sender === publicKey?.toBase58();
          const msgDate = new Date(msg.created_at).toDateString();
          const prevDate = i > 0 ? new Date(groupMessages[i - 1].created_at).toDateString() : null;
          const showDateSep = msgDate !== prevDate;
          return (
            <div key={msg.id}>
              {showDateSep && (
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <div className="text-[10px] text-zinc-600">{new Date(msg.created_at).toLocaleDateString("en-US", { day: "numeric", month: "long" })}</div>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>
              )}
              <div className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                {!isMine && <Avatar wallet={msg.sender} profile={profiles[msg.sender]} size={24} />}
                <div className={`flex flex-col gap-0.5 max-w-[80%] ${isMine ? "items-end" : "items-start"}`}>
                  {!isMine && <div className="text-[10px] text-zinc-500 px-1">{getDisplayName(msg.sender)}</div>}
                  {msg.deleted_for_all ? (
                    <div className="px-3 py-2 rounded-2xl bg-zinc-800/50 border border-zinc-700 text-zinc-500 text-xs italic">🚫 Deleted</div>
                  ) : (
                    <div className={`px-3 py-2 rounded-2xl break-words text-sm ${isMine ? "bg-green-600 rounded-br-sm" : "bg-zinc-800 rounded-bl-sm"}`}>
                      {msg.reply_content && (
                        <div className={`mb-2 px-2 py-1 rounded-lg text-xs border-l-2 ${isMine ? "border-green-300 bg-green-700/50" : "border-zinc-500 bg-zinc-700/50"}`}>
                          <div className="text-zinc-400 mb-0.5">{getDisplayName(msg.reply_sender)}</div>
                          <div className="truncate opacity-80">{msg.reply_content}</div>
                        </div>
                      )}
                      {msg.content}
                    </div>
                  )}
                  <div className="text-[10px] text-zinc-600 px-1">{new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ChatInput
        message={message} handleMessageInput={handleMessageInput} textareaRef={textareaRef}
        showEmojiPicker={showEmojiPicker} setShowEmojiPicker={setShowEmojiPicker}
        replyTo={replyTo} setReplyTo={setReplyTo} publicKey={publicKey}
        getDisplayName={getDisplayName} autoResize={autoResize} setMessage={setMessage}
        onSend={sendGroupMessage}
      />
    </div>
  );
}

function BottomNav({ unreadCounts, friendRequests, publicKey, activeTab, setActiveTab, setActiveChat, setActiveGroup }: any) {
  return (
    <div className="flex-shrink-0 border-t border-zinc-800 bg-zinc-950 flex items-center justify-around px-2 py-2">
      {([
        {
          key: "chats",
          icon: "💬",
          label: "Chats",
          badge: (Object.values(unreadCounts) as number[]).reduce((a, b) => a + b, 0),
        },
        {
          key: "friends",
          icon: "👥",
          label: "Friends",
          badge: friendRequests.filter((r: any) => r.receiver === publicKey?.toBase58()).length,
        },
        {
          key: "groups",
          icon: "🏠",
          label: "Groups",
          badge: 0,
        },
        {
          key: "settings",
          icon: "⚙️",
          label: "Settings",
          badge: 0,
        },
      ] as const).map((tab) => (
        <button
          key={tab.key}
          onClick={() => { if (tab.key !== "chats") { setActiveChat(""); setActiveGroup(null); } setActiveTab(tab.key); }}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors relative ${
            activeTab === tab.key ? "text-green-400" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <span className="text-xl">{tab.icon}</span>
          <span className="text-[10px] font-medium">{tab.label}</span>
          {tab.badge > 0 && (
            <div className="absolute -top-0.5 right-1 w-2.5 h-2.5 rounded-full bg-red-500" />
          )}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const { publicKey, sendTransaction } = useWallet();

  const [showSendSol, setShowSendSol] = useState(false);
  const [solAmount, setSolAmount] = useState("");
  const [sendingSol, setSendingSol] = useState(false);
  const [walletTokens, setWalletTokens] = useState<any[]>([]);
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [showNFTs, setShowNFTs] = useState(false);
  const [nftTab, setNftTab] = useState<"nfts" | "tokens">("nfts");
  const [nfts, setNfts] = useState<any[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [nftWallet, setNftWallet] = useState("");
  const [otherTokens, setOtherTokens] = useState<any[]>([]);
  const [loadingOtherTokens, setLoadingOtherTokens] = useState(false);
  const [gateEnabled, setGateEnabled] = useState(false);
  const [gateAccess, setGateAccess] = useState<"checking" | "allowed" | "denied">("checking");
  const [missingTokens, setMissingTokens] = useState<any[]>([]);
  const [messageExpiryDays, setMessageExpiryDays] = useState(0);
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactions, setReactions] = useState<any>({});
  const [selectedMsgs, setSelectedMsgs] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<"me" | "all" | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeNotif, setActiveNotif] = useState<any>(null);
  const [myStatus, setMyStatus] = useState("online");
  const [myStatusText, setMyStatusText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"chats" | "friends" | "groups" | "settings">("chats");
  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [addMemberWallet, setAddMemberWallet] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  // Group advanced
  const [groupIsPublic, setGroupIsPublic] = useState(true);
  const [groupRequiresApproval, setGroupRequiresApproval] = useState(false);
  const [groupRequests, setGroupRequests] = useState<any[]>([]);
const [unreadGroups, setUnreadGroups] = useState<Set<string>>(new Set());


  const [searchGroupQuery, setSearchGroupQuery] = useState("");
  const [searchGroupResults, setSearchGroupResults] = useState<any[]>([]);
  const [searchingGroups, setSearchingGroups] = useState(false);
  const [receiver, setReceiver] = useState("");
  const [message, setMessage] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState("");
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [blockedByUsers, setBlockedByUsers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any>({});
  const [inboxMessages, setInboxMessages] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState("");
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<any>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [otherIsTyping, setOtherIsTyping] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeChatRef = useRef(activeChat);
const chatMessagesRef = useRef(chatMessages);
const activeGroupRef = useRef(activeGroup);


useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);
useEffect(() => { activeGroupRef.current = activeGroup; }, [activeGroup]);
  useEffect(() => { if (publicKey && activeChat) loadConversation(activeChat); }, [publicKey]);

  function autoResize() {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }
  }

  function formatInboxTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  }

  function isOnline(wallet: string) { return onlineUsers.has(wallet); }

  async function updatePresence() {
    if (!publicKey) return;
    await supabase.from("presence").upsert({ wallet: publicKey.toBase58(), last_seen: new Date().toISOString() });
  }

  async function fetchPresence() {
    const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data } = await supabase.from("presence").select("wallet").gte("last_seen", cutoff);
    setOnlineUsers(new Set(data?.map((r: any) => r.wallet) || []));
  }

  async function pollLastMessageSeen() {
    if (!publicKey || !activeChatRef.current) return;
    const lastMine = [...chatMessagesRef.current].reverse().find((m: any) => m.sender === publicKey.toBase58() && !m.seen);
    if (!lastMine) { if (seenPollingRef.current) { clearInterval(seenPollingRef.current); seenPollingRef.current = null; } return; }
    const { data } = await supabase.from("messages").select("id, seen").eq("id", lastMine.id).single();
    if (data?.seen) {
      setChatMessages((prev) => prev.map((m: any) => m.sender === publicKey.toBase58() && m.receiver === activeChatRef.current ? { ...m, seen: true } : m));
      if (seenPollingRef.current) { clearInterval(seenPollingRef.current); seenPollingRef.current = null; }
    }
  }

  async function sendTyping(isTyping: boolean) {
    if (!publicKey || !activeChatRef.current) return;
    if (isTyping) await supabase.from("typing").upsert({ wallet: publicKey.toBase58(), receiver: activeChatRef.current, updated_at: new Date().toISOString() });
    else await supabase.from("typing").delete().eq("wallet", publicKey.toBase58());
  }

  function handleMessageInput(val: string) {
    setMessage(val);
    sendTyping(true);
    if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
    myTypingTimeoutRef.current = setTimeout(() => sendTyping(false), 2000);
    setTimeout(autoResize, 0);
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  useEffect(() => {
    if (chatMessages.length > 0) scrollToBottom("smooth");
    if (!publicKey) return;
    const hasUnseenSent = chatMessages.some((m: any) => m.sender === publicKey.toBase58() && !m.seen);
    if (hasUnseenSent && !seenPollingRef.current) seenPollingRef.current = setInterval(pollLastMessageSeen, 2000);
  }, [chatMessages]);

  useEffect(() => {
    if (groupMessages.length > 0) scrollToBottom("smooth");
  }, [groupMessages]);

  function toggleSelectMsg(msgId: string) {
    setSelectedMsgs((prev) => { const next = new Set(prev); if (next.has(msgId)) next.delete(msgId); else next.add(msgId); return next; });
  }

  function clearSelection() { setSelectedMsgs(new Set()); setSelectionMode(false); }

  function copyMessage(content: string) { navigator.clipboard.writeText(content); setContextMenu(null); }

  async function deleteSelected(mode: "me" | "all") {
    if (!publicKey) return;
    for (const msgId of Array.from(selectedMsgs)) {
      if (mode === "all") {
        await supabase.from("messages").update({ deleted_for_all: true, deleted_at: new Date().toISOString() }).eq("id", msgId);
        setChatMessages((prev: any[]) => prev.map((m: any) => m.id === msgId ? { ...m, deleted_for_all: true } : m));
      } else {
        const msg = chatMessages.find((m: any) => m.id === msgId);
        if (!msg) continue;
        const field = msg.sender === publicKey.toBase58() ? "deleted_for_sender" : "deleted_for_receiver";
        await supabase.from("messages").update({ [field]: true, deleted_at: new Date().toISOString() }).eq("id", msgId);
        setChatMessages((prev: any[]) => prev.filter((m: any) => m.id !== msgId));
      }
    }
    clearSelection(); setShowDeleteConfirm(null);
  }

  async function fetchReactions(messageIds: string[]) {
    if (!messageIds.length) return;
    const { data } = await supabase.from("reactions").select("*").in("message_id", messageIds);
    const map: any = {};
    data?.forEach((r: any) => {
      if (!map[r.message_id]) map[r.message_id] = {};
      if (!map[r.message_id][r.emoji]) map[r.message_id][r.emoji] = [];
      map[r.message_id][r.emoji].push(r.wallet);
    });
    setReactions(map);
  }

  async function toggleReaction(msgId: string, emoji: string) {
    if (!publicKey) return;
    const me = publicKey.toBase58();
    const existing = reactions[msgId]?.[emoji]?.includes(me);
    await supabase.from("reactions").delete().eq("message_id", msgId).eq("wallet", me);
    if (!existing) await supabase.from("reactions").insert({ message_id: msgId, wallet: me, emoji });
    fetchReactions([msgId]);
    setContextMenu(null);
  }

  async function fetchNotifications() {
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(5);
    setNotifications(data || []);
    if (data && data.length > 0) {
      const lastSeen = localStorage.getItem("last_notif_seen");
      const newest = data[0];
      if (!lastSeen || new Date(newest.created_at) > new Date(lastSeen)) setActiveNotif(newest);
    }
  }

  function dismissNotif() {
    if (activeNotif) { localStorage.setItem("last_notif_seen", activeNotif.created_at); setActiveNotif(null); }
  }

  async function loadMyStatus() {
    if (!publicKey) return;
    const { data } = await supabase.from("profiles").select("status, status_text").eq("wallet", publicKey.toBase58()).single();
    if (data) { setMyStatus(data.status || "online"); setMyStatusText(data.status_text || ""); }
  }

  async function saveStatus(status: string, statusText: string) {
    if (!publicKey) return;
    setMyStatus(status); setMyStatusText(statusText);
    await supabase.from("profiles").upsert({ wallet: publicKey.toBase58(), status, status_text: statusText });
    fetchProfiles();
  }

  function getStatusEmoji(status: string) {
    if (status === "online") return "🟢";
    if (status === "away") return "🟡";
    if (status === "busy") return "🔴";
    return "⚫";
  }

  async function fetchGroups() {
    if (!publicKey) return;
    const { data } = await supabase.from("group_members").select("group_id").eq("wallet", publicKey.toBase58());
    if (!data?.length) { setGroups([]); return; }
    const groupIds = data.map((m: any) => m.group_id);
    const { data: groupData } = await supabase.from("groups").select("*").in("id", groupIds).order("created_at", { ascending: false });
    setGroups(groupData || []);
  }

  async function createGroup() {
    if (!publicKey || !newGroupName.trim()) return;
    setCreatingGroup(true);
    const colors = ["#9945FF", "#14F195", "#00C2FF", "#FF6B6B", "#FFD93D"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const { data: group, error } = await supabase.from("groups")
      .insert({ name: newGroupName.trim(), description: newGroupDesc.trim(), owner: publicKey.toBase58(), avatar_color: color, is_public: groupIsPublic, requires_approval: groupRequiresApproval })
      .select().single();
    if (error) { alert("Error: " + error.message); setCreatingGroup(false); return; }
    await supabase.from("group_members").insert({ group_id: group.id, wallet: publicKey.toBase58(), role: "owner" });
    setNewGroupName(""); setNewGroupDesc(""); setShowCreateGroup(false); setCreatingGroup(false);
    fetchGroups(); openGroup(group);
  }

  async function openGroup(group: any) {
    setActiveGroup(group); setActiveChat("");
    setUnreadGroups((prev) => { const next = new Set(prev); next.delete(group.id); return next; });
    loadGroupMessages(group.id); fetchGroupMembers(group.id);
    if (group.owner === publicKey?.toBase58()) fetchGroupRequests(group.id);
  }

  async function loadGroupMessages(groupId: string) {
    const { data } = await supabase.from("group_messages").select("*").eq("group_id", groupId)
      .order("created_at", { ascending: false }).limit(50);
    setGroupMessages((data || []).reverse());
  }

  async function fetchGroupMembers(groupId: string) {
    const { data } = await supabase.from("group_members").select("*").eq("group_id", groupId);
    setGroupMembers(data || []);
  }

  async function sendGroupMessage() {
    if (!publicKey || !activeGroup || !message.trim()) return;
    const { error } = await supabase.from("group_messages").insert({
      group_id: activeGroup.id, sender: publicKey.toBase58(), content: message.trim(),
      reply_to: replyTo?.id || null, reply_content: replyTo?.content || null, reply_sender: replyTo?.sender || null,
    });
    if (error) { alert(JSON.stringify(error)); return; }
    setMessage(""); setReplyTo(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  async function addMemberToGroup(wallet: string) {
    if (!activeGroup || !wallet.trim()) return;
    const { error } = await supabase.from("group_members").insert({ group_id: activeGroup.id, wallet: wallet.trim(), role: "member" });
    if (error) { alert("Error: " + error.message); return; }
    setAddMemberWallet(""); fetchGroupMembers(activeGroup.id); fetchGroups();
  }

  async function addFriendToGroup(wallet: string) {
    await addMemberToGroup(wallet);
  }

  async function removeMemberFromGroup(wallet: string) {
    if (!activeGroup || !confirm("Remove this member?")) return;
    await supabase.from("group_members").delete().eq("group_id", activeGroup.id).eq("wallet", wallet);
    fetchGroupMembers(activeGroup.id);
  }

  async function leaveGroup() {
    if (!publicKey || !activeGroup || !confirm("Leave this group?")) return;
    await supabase.from("group_members").delete().eq("group_id", activeGroup.id).eq("wallet", publicKey.toBase58());
    setActiveGroup(null); setGroupMessages([]); fetchGroups();
  }

  async function deleteGroup() {
    if (!activeGroup || !confirm("Delete this group permanently?")) return;
    await supabase.from("groups").delete().eq("id", activeGroup.id);
    setActiveGroup(null); setGroupMessages([]); fetchGroups();
  }

  async function searchPublicGroups(query: string) {
    if (!query.trim()) { setSearchGroupResults([]); return; }
    setSearchingGroups(true);
    const { data } = await supabase.from("groups")
      .select("*")
      .eq("is_public", true)
      .ilike("name", `%${query}%`)
      .limit(10);
    setSearchGroupResults(data || []);
    setSearchingGroups(false);
  }

  async function requestJoinGroup(groupId: string) {
    if (!publicKey) return;
    const { data: group } = await supabase.from("groups").select("requires_approval").eq("id", groupId).single();
    if (!group) return;

    if (!group.requires_approval) {
      const { error } = await supabase.from("group_members").insert({ group_id: groupId, wallet: publicKey.toBase58(), role: "member" });
      if (error) { alert("Error joining group"); return; }
      fetchGroups();
      const { data: g } = await supabase.from("groups").select("*").eq("id", groupId).single();
      if (g) openGroup(g);
    } else {
      const { error } = await supabase.from("group_requests").insert({ group_id: groupId, wallet: publicKey.toBase58() });
      if (error && error.code !== "23505") { alert("Error sending request"); return; }
      alert("Request sent! Waiting for admin approval.");
    }
    setSearchGroupResults([]);
    setSearchGroupQuery("");
  }

  async function fetchGroupRequests(groupId: string) {
    const { data } = await supabase.from("group_requests").select("*").eq("group_id", groupId).eq("status", "pending");
    setGroupRequests(data || []);
  }

  async function approveGroupRequest(requestId: string, wallet: string) {
    if (!activeGroup) return;
    await supabase.from("group_members").insert({ group_id: activeGroup.id, wallet, role: "member" });
    await supabase.from("group_requests").update({ status: "approved" }).eq("id", requestId);
    fetchGroupRequests(activeGroup.id);
    fetchGroupMembers(activeGroup.id);
  }

  async function rejectGroupRequest(requestId: string) {
    await supabase.from("group_requests").update({ status: "rejected" }).eq("id", requestId);
    fetchGroupRequests(activeGroup?.id || "");
  }

  async function fetchProfiles() {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) { console.error(error); return; }
    const map: any = {};
    data?.forEach((p) => { map[p.wallet] = p; });
    setProfiles(map);
  }

  function getDisplayName(wallet?: string) {
    if (!wallet) return "Unknown";
    const profile = profiles[wallet];
    if (profile?.username) return `@${profile.username}`;
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  }

  async function addFriend(wallet: string) {
    if (!publicKey) return;
    const me = publicKey.toBase58();
    const { data } = await supabase.from("friends").select("*")
      .or(`and(sender.eq.${me},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${me})`).maybeSingle();
    if (data) return;
    await supabase.from("friends").insert({ sender: me, receiver: wallet, accepted: false });
    fetchFriends(); fetchFriendRequests();
  }

  async function unfriend(wallet: string) {
    if (!publicKey) return;
    await supabase.from("friends").delete()
      .or(`and(sender.eq.${publicKey.toBase58()},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${publicKey.toBase58()})`);
    fetchFriends();
  }

  async function fetchFriends() {
    if (!publicKey) return;
    const me = publicKey.toBase58();
    const { data } = await supabase.from("friends").select("*").eq("accepted", true).or(`sender.eq.${me},receiver.eq.${me}`);
    setFriends(data || []);
  }

  function isFriend(wallet: string) {
    const me = publicKey?.toBase58();
    return friends.some((f) => (f.sender === me && f.receiver === wallet) || (f.receiver === me && f.sender === wallet));
  }

  async function fetchFriendRequests() {
    if (!publicKey) return;
    const me = publicKey.toBase58();
    const { data } = await supabase.from("friends").select("*").eq("accepted", false).or(`sender.eq.${me},receiver.eq.${me}`);
    setFriendRequests(data || []);
  }

  async function acceptFriend(id: string) {
    await supabase.from("friends").update({ accepted: true }).eq("id", id);
    fetchFriends(); fetchFriendRequests();
  }

  async function rejectFriend(id: string) {
    await supabase.from("friends").delete().eq("id", id);
    fetchFriendRequests();
  }

  async function fetchBlockedUsers() {
    if (!publicKey) return;
    const { data } = await supabase.from("blocked_users").select("*").eq("blocker", publicKey.toBase58());
    setBlockedUsers(data || []);
  }

  async function fetchBlockedByUsers() {
    if (!publicKey) return;
    const { data } = await supabase.from("blocked_users").select("*").eq("blocked", publicKey.toBase58());
    setBlockedByUsers(data || []);
  }

  function isBlocked(wallet: string) { return blockedUsers.some((b) => b.blocked === wallet); }
  function isBlockedByThem(wallet: string) { return blockedByUsers.some((b) => b.blocker === wallet); }

  async function blockUser(wallet: string) {
    if (!publicKey) return;
    const me = publicKey.toBase58();
    await supabase.from("friends").delete().or(`and(sender.eq.${me},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${me})`);
    await supabase.from("blocked_users").insert({ blocker: me, blocked: wallet });
    fetchBlockedUsers(); fetchFriends();
  }

  async function unblockUser(wallet: string) {
    if (!publicKey) return;
    await supabase.from("blocked_users").delete().eq("blocker", publicKey.toBase58()).eq("blocked", wallet);
    fetchBlockedUsers();
  }

  async function saveProfile() {
    if (!publicKey) return;
    const { error } = await supabase.from("profiles").upsert({ wallet: publicKey.toBase58(), username });
    if (error) { alert("Error saving profile"); return; }
    setSavedUsername(username); fetchProfiles(); alert("Profile saved!");
  }

  async function loadProfile() {
    if (!publicKey) return;
    const { data } = await supabase.from("profiles").select("*").eq("wallet", publicKey.toBase58()).single();
    if (data) { setUsername(data.username || ""); setSavedUsername(data.username || ""); }
  }

  async function loadMessageExpiry() {
    if (!publicKey) return;
    const { data } = await supabase.from("profiles").select("message_expiry_days").eq("wallet", publicKey.toBase58()).single();
    setMessageExpiryDays(data?.message_expiry_days || 0);
  }

  async function saveMessageExpiry(days: number) {
    if (!publicKey) return;
    setMessageExpiryDays(days);
    await supabase.from("profiles").upsert({ wallet: publicKey.toBase58(), message_expiry_days: days });
  }

  async function markMessagesAsSeen(wallet: string) {
    if (!publicKey) return;
    setTimeout(async () => {
      await supabase.from("messages").update({ seen: true }).eq("sender", wallet).eq("receiver", publicKey.toBase58()).eq("seen", false);
    }, 300);
  }

  async function fetchNFTs(wallet: string) {
    if (!wallet) return;
    setLoadingNFTs(true); setNfts([]); setNftWallet(wallet);
    try {
      const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAssetsByOwner", params: { ownerAddress: wallet, page: 1, limit: 50, displayOptions: { showFungible: false } } }),
      });
      const json = await res.json();
      const items = json?.result?.items || [];
      setNfts(items.filter((item: any) => {
        const validInterface = ["V1_NFT","ProgrammableNFT","V1_PRINT"].includes(item.interface);
        if (!validInterface) return false;
        if (item.royalty?.basis_points === 0 && !item.grouping?.length) return false;
        const name = (item.content?.metadata?.name || "").toLowerCase();
        if (["spam","airdrop","claim","free","visit","www.","http",".com",".io","token","reward"].some(w => name.includes(w))) return false;
        return !!(item.content?.links?.image || item.content?.files?.[0]?.uri);
      }).map((item: any) => ({ id: item.id, name: item.content?.metadata?.name || "Unknown NFT", image: item.content?.links?.image || item.content?.files?.[0]?.uri || null })));
    } catch (err) { setNfts([]); } finally { setLoadingNFTs(false); }
  }

  async function fetchOtherWalletTokens(wallet: string) {
    if (!wallet) return;
    setLoadingOtherTokens(true); setOtherTokens([]);
    try {
      const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, "confirmed");
      const lamports = await connection.getBalance(new PublicKey(wallet));
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "searchAssets", params: { ownerAddress: wallet, tokenType: "fungible", page: 1, limit: 50 } }),
      });
      const json = await res.json();
      const tokens = (json?.result?.items || [])
        .filter((item: any) => { const b = item.token_info?.balance / Math.pow(10, item.token_info?.decimals ?? 0); return b > 0.000001; })
        .map((item: any) => { const dec = item.token_info?.decimals ?? 0; return { mint: item.id, symbol: item.token_info?.symbol || "???", name: item.content?.metadata?.name || "Unknown", balance: item.token_info?.balance / Math.pow(10, dec), decimals: dec, logo: item.content?.links?.image || null }; });
      setOtherTokens([{ mint: "SOL", symbol: "SOL", name: "Solana", balance: lamports / LAMPORTS_PER_SOL, decimals: 9, logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" }, ...tokens]);
    } catch (err) { setOtherTokens([]); } finally { setLoadingOtherTokens(false); }
  }

  async function fetchWalletTokens() {
    if (!publicKey) return;
    setLoadingTokens(true);
    try {
      const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, "confirmed");
      const lamports = await connection.getBalance(publicKey);
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "searchAssets", params: { ownerAddress: publicKey.toBase58(), tokenType: "fungible", page: 1, limit: 50 } }),
      });
      const json = await res.json();
      const tokens = (json?.result?.items || [])
        .filter((item: any) => { const b = item.token_info?.balance / Math.pow(10, item.token_info?.decimals ?? 0); return b > 0.000001; })
        .map((item: any) => { const dec = item.token_info?.decimals ?? 0; return { mint: item.id, symbol: item.token_info?.symbol || "???", name: item.content?.metadata?.name || "Unknown", balance: item.token_info?.balance / Math.pow(10, dec), decimals: dec, logo: item.content?.links?.image || null, isSol: false }; });
      const solToken = { mint: "SOL", symbol: "SOL", name: "Solana", balance: lamports / LAMPORTS_PER_SOL, decimals: 9, isSol: true, logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" };
      setWalletTokens([solToken, ...tokens]); setSelectedToken(solToken);
    } catch (err) {
      const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
      const lamports = await connection.getBalance(publicKey);
      const sol = { mint: "SOL", symbol: "SOL", name: "Solana", balance: lamports / LAMPORTS_PER_SOL, decimals: 9, isSol: true, logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" };
      setWalletTokens([sol]); setSelectedToken(sol);
    } finally { setLoadingTokens(false); }
  }

  async function sendSol() {
    if (!publicKey || !activeChat || !solAmount || !selectedToken) return;
    const amount = parseFloat(solAmount);
    if (isNaN(amount) || amount <= 0) { alert("Invalid amount"); return; }
    if (amount > selectedToken.balance) { alert(`Insufficient balance. You have ${selectedToken.balance.toFixed(4)} ${selectedToken.symbol}`); return; }
    setSendingSol(true);
    try {
      const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, "confirmed");
      const toPublicKey = new PublicKey(activeChat);
      const transaction = new Transaction();
      if (selectedToken.isSol) {
        transaction.add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: toPublicKey, lamports: Math.round(amount * LAMPORTS_PER_SOL) }));
      } else {
        const { createTransferInstruction, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } = await import("@solana/spl-token");
        const mintPubkey = new PublicKey(selectedToken.mint);
        const fromAta = await getOrCreateAssociatedTokenAccount(connection, { publicKey, signTransaction: async (tx: any) => tx } as any, mintPubkey, publicKey);
        const toAta = await getOrCreateAssociatedTokenAccount(connection, { publicKey, signTransaction: async (tx: any) => tx } as any, mintPubkey, toPublicKey);
        transaction.add(createTransferInstruction(fromAta.address, toAta.address, publicKey, Math.round(amount * Math.pow(10, selectedToken.decimals)), [], TOKEN_PROGRAM_ID));
      }
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash; transaction.feePayer = publicKey;
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      await supabase.from("messages").insert([{ sender: publicKey.toBase58(), receiver: activeChat, content: `💸 Sent ${amount} ${selectedToken.symbol}`, seen: false }]);
      setSolAmount(""); setShowSendSol(false); alert(`✅ ${amount} ${selectedToken.symbol} sent successfully!`);
    } catch (err: any) { alert("Error: " + (err.message || "Transaction failed")); } finally { setSendingSol(false); }
  }

  async function checkGateAccess() {
    if (!publicKey) return;
    const { data: settings } = await supabase.from("app_settings").select("value").eq("key", "token_gate_enabled").single();
    if (settings?.value !== "true") { setGateEnabled(false); setGateAccess("allowed"); return; }
    setGateEnabled(true);
    const { data: gates } = await supabase.from("token_gates").select("*").eq("active", true).in("feature", ["all", "chat_access"]);
    if (!gates || gates.length === 0) { setGateAccess("allowed"); return; }
    const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";
    try {
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "searchAssets", params: { ownerAddress: publicKey.toBase58(), tokenType: "fungible", page: 1, limit: 100 } }) });
      const json = await res.json();
      const items = json?.result?.items || [];
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, "confirmed");
      const solBalance = (await connection.getBalance(publicKey)) / LAMPORTS_PER_SOL;
      const missing: any[] = [];
      for (const gate of gates) {
        if (gate.token_mint === "SOL") { if (solBalance < gate.min_amount) missing.push(gate); }
        else { const found = items.find((item: any) => item.id === gate.token_mint); if (!found) { missing.push(gate); continue; } const bal = (found.token_info?.balance || 0) / Math.pow(10, found.token_info?.decimals ?? 0); if (bal < gate.min_amount) missing.push(gate); }
      }
      if (missing.length === 0) { setGateAccess("allowed"); setMissingTokens([]); } else { setGateAccess("denied"); setMissingTokens(missing); }
    } catch { setGateAccess("allowed"); }
  }

  async function sendMessage() {
    if (!publicKey) { alert("Connect wallet first"); return; }
    if (!activeChat || !message.trim()) return;
    if (isBlocked(activeChat)) { alert("You have blocked this user."); return; }
    if (isBlockedByThem(activeChat)) { alert("You cannot send messages to this user."); return; }
    const { error } = await supabase.from("messages").insert([{ sender: publicKey.toBase58(), receiver: activeChat, content: message.trim(), seen: false, reply_to: replyTo?.id || null, reply_content: replyTo?.content || null, reply_sender: replyTo?.sender || null }]);
    if (error) { alert(JSON.stringify(error)); return; }
    sendTyping(false);
    if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
    setMessage(""); setReplyTo(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  async function fetchInbox() {
    if (!publicKey) return;
    const { data, error } = await supabase.from("messages").select("*").or(`sender.eq.${publicKey.toBase58()},receiver.eq.${publicKey.toBase58()}`).order("created_at", { ascending: false });
    if (error) { console.error(error); return; }
    const latestMessages = new Map();
    data?.forEach((msg) => { const otherWallet = msg.sender === publicKey.toBase58() ? msg.receiver : msg.sender; if (!latestMessages.has(otherWallet)) latestMessages.set(otherWallet, { ...msg, otherWallet }); });
    setInboxMessages(Array.from(latestMessages.values()));
  }

  async function loadConversation(wallet: string) {
    if (!wallet) return;
    if (!publicKey) { setActiveChat(wallet); return; }
    setActiveChat(wallet); setActiveGroup(null);
    setUnreadCounts((prev: any) => ({ ...prev, [wallet]: 0 }));
    const { data, error } = await supabase.from("messages").select("*")
      .or(`and(sender.eq.${publicKey.toBase58()},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${publicKey.toBase58()})`)
      .order("created_at", { ascending: false }).limit(50);
    if (error) { console.error(error); return; }
    const me = publicKey.toBase58();
    const msgs = (data || []).filter((m: any) => {
      if (m.deleted_for_all) return true;
      if (m.sender === me && m.deleted_for_sender) return false;
      if (m.receiver === me && m.deleted_for_receiver) return false;
      return true;
    }).reverse();
    setChatMessages(msgs); setHasMoreMessages(msgs.length === 50);
    await markMessagesAsSeen(wallet);
    if (msgs.length) fetchReactions(msgs.map((m: any) => m.id));
    setTimeout(() => scrollToBottom("auto"), 50);
  }

  async function loadMoreMessages() {
    if (!publicKey || !activeChat || loadingMore) return;
    setLoadingMore(true);
    const oldest = chatMessages[0];
    if (!oldest) { setLoadingMore(false); return; }
    const { data, error } = await supabase.from("messages").select("*")
      .or(`and(sender.eq.${publicKey.toBase58()},receiver.eq.${activeChat}),and(sender.eq.${activeChat},receiver.eq.${publicKey.toBase58()})`)
      .lt("created_at", oldest.created_at).order("created_at", { ascending: false }).limit(50);
    if (error) { setLoadingMore(false); return; }
    const older = (data || []).reverse();
    setChatMessages((prev) => [...older, ...prev]); setHasMoreMessages(older.length === 50); setLoadingMore(false);
    if (older.length) fetchReactions(older.map((m: any) => m.id));
    setTimeout(() => { const el = messagesContainerRef.current; if (el) el.scrollTop = 120; }, 50);
  }

  useEffect(() => {
    fetchInbox(); fetchFriends(); fetchFriendRequests();
    fetchBlockedUsers(); fetchBlockedByUsers();
    fetchProfiles(); loadProfile(); fetchPresence();
    checkGateAccess(); loadMessageExpiry();
    fetchNotifications(); loadMyStatus(); fetchGroups();

    if (!publicKey) return;
    updatePresence();
    const presenceInterval = setInterval(updatePresence, 30000);
    const onlineInterval = setInterval(fetchPresence, 10000);

    const channel = supabase.channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const newMessage = payload.new as any;
        const me = publicKey.toBase58();
        const { data: blockCheck } = await supabase.from("blocked_users").select("*").eq("blocker", me).eq("blocked", newMessage.sender).maybeSingle();
        if (blockCheck) return;
        if (newMessage.receiver === me) {
          const { data: profileData } = await supabase.from("profiles").select("*").eq("wallet", newMessage.sender).maybeSingle();
          if (profileData) setProfiles((prev: any) => ({ ...prev, [profileData.wallet]: profileData }));
          if (newMessage.sender === activeChatRef.current) supabase.from("messages").update({ seen: true }).eq("id", newMessage.id);
          setInboxMessages((prev) => {
            if (newMessage.sender !== activeChatRef.current) setUnreadCounts((prevCounts: any) => ({ ...prevCounts, [newMessage.sender]: (prevCounts[newMessage.sender] || 0) + 1 }));
            const filtered = prev.filter((m) => m.otherWallet !== newMessage.sender);
            return [{ ...newMessage, otherWallet: newMessage.sender }, ...filtered];
          });
        }
        if (activeChatRef.current && ((newMessage.sender === activeChatRef.current && newMessage.receiver === me) || (newMessage.sender === me && newMessage.receiver === activeChatRef.current))) {
          setChatMessages((prev) => { if (prev.find((m) => m.id === newMessage.id)) return prev; return [...prev, newMessage]; });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const updated = payload.new as any;
        const me = publicKey.toBase58();
        if (updated.seen === true) setChatMessages((prev) => prev.map((m: any) => m.id === updated.id ? { ...m, seen: true } : m));
        if (updated.deleted_for_all === true) setChatMessages((prev) => prev.map((m: any) => m.id === updated.id ? { ...m, deleted_for_all: true } : m));
        if ((updated.deleted_for_sender === true && updated.sender === me) || (updated.deleted_for_receiver === true && updated.receiver === me)) setChatMessages((prev) => prev.filter((m: any) => m.id !== updated.id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, (payload) => { const r = (payload.new || payload.old) as any; if (r?.message_id) fetchReactions([r.message_id]); })
      .on("postgres_changes", { event: "*", schema: "public", table: "typing" }, async () => {
        const me = publicKey.toBase58();
        const { data } = await supabase.from("typing").select("*").eq("receiver", me);
        const someoneTyping = data?.some((row: any) => { const age = Date.now() - new Date(row.updated_at).getTime(); return row.wallet !== me && age < 3000 && row.wallet === activeChatRef.current; });
        setOtherIsTyping(!!someoneTyping);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (someoneTyping) typingTimeoutRef.current = setTimeout(() => setOtherIsTyping(false), 3000);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => { const notif = payload.new as any; setActiveNotif(notif); setNotifications((prev) => [notif, ...prev.slice(0, 4)]); })
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_users" }, () => { fetchBlockedUsers(); fetchBlockedByUsers(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "friends" }, () => { fetchFriends(); fetchFriendRequests(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => { const updated = payload.new as any; if (updated?.wallet) setProfiles((prev: any) => ({ ...prev, [updated.wallet]: { ...prev[updated.wallet], ...updated } })); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages" }, (payload) => {
  const msg = payload.new as any;
  if (activeGroupRef.current && msg.group_id === activeGroupRef.current.id) setGroupMessages((prev) => { if (prev.find((m: any) => m.id === msg.id)) return prev; return [...prev, msg]; });
  if (!activeGroupRef.current || msg.group_id !== activeGroupRef.current.id) {
    setUnreadGroups((prev) => new Set([...prev, msg.group_id]));
  }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(presenceInterval); clearInterval(onlineInterval);
      if (seenPollingRef.current) clearInterval(seenPollingRef.current);
      sendTyping(false);
    };
  }, [publicKey]);

  const amIBlocked = activeChat ? isBlockedByThem(activeChat) : false;
  const didIBlock = activeChat ? isBlocked(activeChat) : false;

  if (gateEnabled && gateAccess === "checking") {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <div className="text-2xl animate-pulse">🔐</div>
        <div className="text-zinc-400 text-sm">Checking access...</div>
      </main>
    );
  }

  if (gateAccess === "denied") {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold mb-2">Access restricted</h1>
          <p className="text-zinc-400 text-sm mb-6">To access Wallet Chat you must hold:</p>
          <div className="flex flex-col gap-3 mb-8">
            {missingTokens.map((gate) => (
              <div key={gate.id} className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 flex items-center gap-3">
                {gate.token_logo ? <img src={gate.token_logo} className="w-8 h-8 rounded-full" alt="" /> : <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold">{gate.token_symbol.slice(0, 2)}</div>}
                <div className="text-left">
                  <div className="font-bold text-white">{gate.token_symbol}</div>
                  <div className="text-zinc-500 text-xs">Minimum: {gate.min_amount} {gate.token_symbol}</div>
                </div>
              </div>
            ))}
          </div>
          <WalletMultiButtonDynamic />
          <button onClick={checkGateAccess} className="mt-3 w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg p-3 text-sm transition-colors">↻ Check again</button>
        </div>
      </main>
    );
  }

  // ── Shared UI pieces ──────────────────────────────────────────────────────
  const NotifBanner = activeNotif ? (
    <div className="w-full bg-zinc-900 border-b border-green-700 px-4 py-2 flex items-center justify-between gap-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="text-lg">📢</div>
        <div>
          <div className="text-white font-semibold text-xs">{activeNotif.title}</div>
          <div className="text-zinc-400 text-xs">{activeNotif.message}</div>
        </div>
      </div>
      <button onClick={dismissNotif} className="text-zinc-500 hover:text-white text-xs flex-shrink-0">✕</button>
    </div>
  ) : null;

  const ContextMenuUI = contextMenu && (() => {
    const msg = chatMessages.find((m: any) => m.id === contextMenu.msgId);
    if (!msg) return null;
    return (
      <>
        <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
        <div className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1 min-w-[180px]"
          style={{ top: Math.min(contextMenu.y - 10, window.innerHeight - 300), left: Math.min(contextMenu.x, window.innerWidth - 200) }}>
          <button onClick={() => { setReplyTo(msg); setContextMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-sm text-white">↩️ Reply</button>
          <button onClick={() => copyMessage(msg.content)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-sm text-white">📋 Copy</button>
          <div className="px-3 py-1.5 flex flex-wrap gap-1">
            {["❤️","😂","😮","😢","👍","👎","🔥","🎉"].map((e) => (
              <button key={e} onClick={() => { toggleReaction(msg.id, e); setContextMenu(null); }} className="text-lg hover:bg-zinc-800 rounded p-0.5">{e}</button>
            ))}
          </div>
          <div className="h-px bg-zinc-800 mx-2 my-1" />
          <button onClick={() => { setContextMenu(null); setSelectionMode(true); toggleSelectMsg(msg.id); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-sm text-red-400">🗑 Delete</button>
        </div>
      </>
    );
  })();

  // ── Prop bundles passed to module-scope components ────────────────────────
  const chatWindowProps = {
    activeChat, setActiveChat, setActiveTab, profiles, isOnline, getDisplayName, otherIsTyping,
    showSearch, setShowSearch, searchQuery, setSearchQuery, chatMessages, publicKey,
    fetchNFTs, fetchOtherWalletTokens, showNFTs, setShowNFTs, nftWallet, setNftTab, nftTab,
    isFriend, unfriend, addFriend, isBlocked, blockUser, unblockUser,
    loadingNFTs, nfts, loadingOtherTokens, otherTokens,
    messagesContainerRef, hasMoreMessages, loadMoreMessages, loadingMore,
    reactions, selectedMsgs, selectionMode, toggleSelectMsg, toggleReaction, setContextMenu, contextMenu,
    ContextMenuUI, clearSelection, showDeleteConfirm, setShowDeleteConfirm, deleteSelected,
    amIBlocked, didIBlock, showSendSol, setShowSendSol, loadingTokens, walletTokens,
    selectedToken, setSelectedToken, solAmount, setSolAmount, sendSol, sendingSol, fetchWalletTokens,
    message, handleMessageInput, textareaRef, showEmojiPicker, setShowEmojiPicker,
    replyTo, setReplyTo, autoResize, setMessage, sendMessage,
  };

  const groupWindowProps = {
    activeGroup, setActiveGroup, setActiveTab, groupMembers, showGroupInfo, setShowGroupInfo,
    profiles, getDisplayName, publicKey, removeMemberFromGroup, groupRequests,
    approveGroupRequest, rejectGroupRequest, addMemberWallet, setAddMemberWallet, addMemberToGroup,
    friends, addFriendToGroup, deleteGroup, leaveGroup, groupMessages, messagesContainerRef,
    message, handleMessageInput, textareaRef, showEmojiPicker, setShowEmojiPicker,
    replyTo, setReplyTo, autoResize, setMessage, sendGroupMessage, fetchGroups,
  };

  // NOTE: this is a plain JSX value, not a component function. If it were
  // declared as `const MainContent = () => (...)` and rendered as
  // `<MainContent />`, React would treat it as a brand-new component type on
  // every render of Home (i.e. every keystroke), unmounting and remounting
  // everything inside it — including the message textarea — and killing
  // focus after one character. Embedding the JSX directly as `{mainContent}`
  // avoids that.
  const mainContent = (
    <>
      {activeTab === "chats" && !activeChat && !activeGroup && (
        <TabChats receiver={receiver} setReceiver={setReceiver} loadConversation={loadConversation}
          inboxMessages={inboxMessages} profiles={profiles} isOnline={isOnline} unreadCounts={unreadCounts}
          getDisplayName={getDisplayName} formatInboxTime={formatInboxTime} />
      )}
      {activeTab === "friends" && !activeChat && !activeGroup && (
        <TabFriends friendRequests={friendRequests} publicKey={publicKey} profiles={profiles}
          getDisplayName={getDisplayName} acceptFriend={acceptFriend} rejectFriend={rejectFriend}
          receiver={receiver} setReceiver={setReceiver} addFriend={addFriend} friends={friends}
          isOnline={isOnline} loadConversation={loadConversation} setActiveTab={setActiveTab} unfriend={unfriend} />
      )}
      {activeTab === "groups" && !activeGroup && !activeChat && (
        <TabGroups setShowCreateGroup={setShowCreateGroup} searchGroupQuery={searchGroupQuery}
          setSearchGroupQuery={setSearchGroupQuery} searchPublicGroups={searchPublicGroups}
          searchingGroups={searchingGroups} searchGroupResults={searchGroupResults} groups={groups}
          openGroup={openGroup} requestJoinGroup={requestJoinGroup} publicKey={publicKey}
          showCreateGroup={showCreateGroup} newGroupName={newGroupName} setNewGroupName={setNewGroupName}
          newGroupDesc={newGroupDesc} setNewGroupDesc={setNewGroupDesc} groupIsPublic={groupIsPublic}
          setGroupIsPublic={setGroupIsPublic} groupRequiresApproval={groupRequiresApproval}
          setGroupRequiresApproval={setGroupRequiresApproval} friends={friends} profiles={profiles}
          getDisplayName={getDisplayName} createGroup={createGroup} creatingGroup={creatingGroup} />
      )}
      {activeTab === "settings" && !activeChat && !activeGroup && (
        <TabSettings publicKey={publicKey} profiles={profiles} savedUsername={savedUsername}
          username={username} setUsername={setUsername} saveProfile={saveProfile} myStatus={myStatus}
          myStatusText={myStatusText} setMyStatusText={setMyStatusText} saveStatus={saveStatus}
          messageExpiryDays={messageExpiryDays} saveMessageExpiry={saveMessageExpiry} />
      )}
      {activeChat && <ChatWindow {...chatWindowProps} />}
      {activeGroup && !activeChat && <GroupWindow {...groupWindowProps} />}
    </>
  );
  // ^ mainContent ends here (was previously wrapped in an inline component)

  return (
    <main className="bg-black text-white flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      {NotifBanner}

      {/* Desktop */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-zinc-800 flex flex-col overflow-hidden flex-shrink-0">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <div className="text-lg font-bold flex-1">Wallet Chat</div>
            <WalletMultiButtonDynamic />
          </div>
          <div className="flex border-b border-zinc-800">
            {([
              { key: "chats", label: "Chats", badge: (Object.values(unreadCounts) as number[]).reduce((a, b) => a + b, 0) },
              { key: "friends", label: "Friends", badge: friendRequests.filter((r: any) => r.receiver === publicKey?.toBase58()).length },
              { key: "groups", label: "Groups", badge: 0 },
            ] as const).map((t) => (
              <button key={t.key} onClick={() => { if (t.key === "friends" || t.key === "groups") { setActiveChat(""); setActiveGroup(null); } setActiveTab(t.key); }}
                className={`flex-1 py-2 text-xs font-medium capitalize transition-colors relative ${activeTab === t.key ? "text-green-400 border-b-2 border-green-400" : "text-zinc-500 hover:text-white"}`}>
                {t.label}
                {t.badge > 0 && (
                  <span className="absolute top-1 right-1 min-w-3.5 h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold">
                    {t.badge > 99 ? "99+" : t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {activeTab === "chats" && (
              <div className="p-3 flex flex-col gap-2">
                <div className="flex gap-2">
                  <input value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="Wallet..."
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  <button onClick={() => { loadConversation(receiver); setReceiver(""); }} className="bg-green-600 text-white rounded-lg px-3 text-sm font-bold">Open</button>
                </div>
                {inboxMessages.map((msg) => (
                  <button key={msg.otherWallet} onClick={() => loadConversation(msg.otherWallet)}
                    className={`border rounded-lg p-3 text-left transition-colors ${
                      activeChat === msg.otherWallet || unreadCounts[msg.otherWallet] > 0
                        ? "bg-zinc-800 border-green-800"
                        : "bg-zinc-900 border-zinc-800"
                    }`}>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-shrink-0">
                        <Avatar wallet={msg.otherWallet} profile={profiles[msg.otherWallet]} size={36} />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${isOnline(msg.otherWallet) ? "bg-green-400" : "bg-zinc-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="text-white text-sm font-medium truncate">{getDisplayName(msg.otherWallet)}</div>
                          <div className="text-[10px] text-zinc-500">{formatInboxTime(msg.created_at)}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="truncate text-xs text-zinc-400">{msg.content}</div>
                          {unreadCounts[msg.otherWallet] > 0 && <div className="min-w-4 h-4 px-1 rounded-full bg-green-600 text-white text-[9px] flex items-center justify-center">{unreadCounts[msg.otherWallet]}</div>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {activeTab === "friends" && (
              <div className="p-3 flex flex-col gap-2">
                {friends.map((f) => {
                  const other = f.sender === publicKey?.toBase58() ? f.receiver : f.sender;
                  return (
                    <div key={other} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex items-center gap-2 cursor-pointer hover:border-zinc-700" onClick={() => loadConversation(other)}>
                      <Avatar wallet={other} profile={profiles[other]} size={32} />
                      <div className="flex-1 min-w-0"><div className="text-white text-sm">{getDisplayName(other)}</div></div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeTab === "groups" && (
              <div className="p-3 flex flex-col gap-2">
                <button onClick={() => setShowCreateGroup(true)} className="w-full bg-green-600 text-white rounded-lg py-2 text-sm font-bold">+ New Group</button>
                {groups.map((group) => (
                  <button key={group.id} onClick={() => openGroup(group)}
                    className={`bg-zinc-900 border rounded-lg p-3 text-left transition-colors ${activeGroup?.id === group.id ? "border-green-700" : "border-zinc-800 hover:border-zinc-700"}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${group.avatar_color}, #14F195)` }}>
                        {group.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium">{group.name}</div>
                        <div className="text-zinc-500 text-xs truncate">{group.description || "No description"}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => { setActiveChat(""); setActiveGroup(null); setActiveTab("settings"); }}
            className={`flex items-center gap-2 px-4 py-3 border-t border-zinc-800 text-sm transition-colors ${activeTab === "settings" ? "text-green-400" : "text-zinc-500 hover:text-white"}`}>
            ⚙️ Settings
          </button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          {mainContent}
        </div>
      </div>

      {/* Mobile */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden">
        {mainContent}
        {!activeChat && !activeGroup && (
          <BottomNav unreadCounts={unreadCounts} friendRequests={friendRequests} publicKey={publicKey}
            activeTab={activeTab} setActiveTab={setActiveTab} setActiveChat={setActiveChat} setActiveGroup={setActiveGroup} />
        )}
      </div>
    </main>
  );
}
