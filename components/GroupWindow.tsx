import { useEffect, useRef } from "react";
import { Avatar } from "./Avatar";
import { EmojiPicker } from "./EmojiPicker";
import { ChatInput } from "./ChatInput";
import { supabase } from "../lib/supabase";

export function GroupWindow({
  activeGroup, setActiveGroup, setActiveTab, groupMembers, showGroupInfo, setShowGroupInfo,
  profiles, getDisplayName, publicKey, removeMemberFromGroup, groupRequests,
  approveGroupRequest, rejectGroupRequest, addMemberWallet, setAddMemberWallet, addMemberToGroup,
  friends, addFriendToGroup, deleteGroup, leaveGroup, groupMessages,
  message, handleMessageInput, textareaRef, showEmojiPicker, setShowEmojiPicker,
  replyTo, setReplyTo, autoResize, setMessage, sendGroupMessage, fetchGroups,
  contextMenu, setContextMenu, toggleReaction, reactions, copyMessage,
  selectedMsgs, selectionMode, setSelectionMode, toggleSelectMsg, clearSelection,
  showDeleteConfirm, setShowDeleteConfirm, deleteSelected,
  handleViewProfile, loadConversation,
}: any) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const groupContextMenu = contextMenu;

  useEffect(() => {
    if (!messagesContainerRef?.current) return;
    setTimeout(() => {
      const el = messagesContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 100);
  }, [groupMessages]);

  useEffect(() => {
    if (!messagesContainerRef?.current) return;
    setTimeout(() => {
      const el = messagesContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 150);
  }, [activeGroup?.id]);
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
                  <div className="cursor-pointer" onClick={() => handleViewProfile && handleViewProfile(m.wallet)}>
                    <Avatar wallet={m.wallet} profile={profiles[m.wallet]} size={28} />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleViewProfile && handleViewProfile(m.wallet)}>
                    <div className="text-white text-xs font-medium hover:text-green-400 transition-colors flex items-center gap-1 flex-wrap">
                      <span>{getDisplayName(m.wallet)}</span>
                      {profiles[m.wallet]?.rank_title && (
                        <span className="text-[9px] bg-purple-500/20 border border-purple-400/30 text-purple-300 font-extrabold px-1.5 py-0.2 rounded-full">
                          {profiles[m.wallet]?.rank_title}
                        </span>
                      )}
                      {profiles[m.wallet]?.play_points !== undefined && (
                        <span className="text-[9px] text-amber-400 font-extrabold">
                          🪙{profiles[m.wallet]?.play_points}
                        </span>
                      )}
                    </div>
                    {m.role === "owner" && <div className="text-yellow-500 text-[10px]">Admin</div>}
                  </div>
                  {m.wallet !== publicKey?.toBase58() && (
                    <button onClick={() => { loadConversation && loadConversation(m.wallet); setShowGroupInfo(false); setActiveGroup(null); setActiveTab("chats"); }}
                      className="text-green-600 hover:text-green-400 text-[10px] transition-colors flex-shrink-0 px-1.5 py-0.5 bg-zinc-700 rounded">
                      PM
                    </button>
                  )}
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
              <div
                id={`msg-${msg.id}`}
                className={`flex items-end gap-2 rounded-lg px-0.5 py-0.5 transition-colors cursor-pointer ${
                  selectedMsgs?.has(msg.id) ? "bg-zinc-800/60" : "hover:bg-zinc-900/40"
                } ${isMine ? "flex-row-reverse" : "flex-row"}`}
                onClick={(e) => {
                  if (msg.deleted_for_all) return;
                  if (selectionMode) { toggleSelectMsg(msg.id); return; }
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setContextMenu(contextMenu?.msgId === msg.id ? null : { msgId: msg.id, x: e.clientX, y: rect.top });
                }}
              >
                {selectionMode && !msg.deleted_for_all && (
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedMsgs?.has(msg.id) ? "bg-green-500 border-green-500" : "border-zinc-600"}`}>
                    {selectedMsgs?.has(msg.id) && <span className="text-white text-[10px] font-bold">✓</span>}
                  </div>
                )}
                {!isMine && (
                  <div className="cursor-pointer flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleViewProfile && handleViewProfile(msg.sender); }}>
                    <Avatar wallet={msg.sender} profile={profiles[msg.sender]} size={24} />
                  </div>
                )}
                <div className={`flex flex-col gap-0.5 max-w-[80%] min-w-0 ${isMine ? "items-end" : "items-start"}`}>
                  {!isMine && (
                    <div className="text-[10px] text-zinc-500 px-1 cursor-pointer hover:text-zinc-300 transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleViewProfile && handleViewProfile(msg.sender); }}>
                      {getDisplayName(msg.sender)}
                    </div>
                  )}
                  {msg.deleted_for_all ? (
                    <div className="px-3 py-2 rounded-2xl bg-zinc-800/50 border border-zinc-700 text-zinc-500 text-xs italic">🚫 Message deleted</div>
                  ) : (
                    <div className={`px-3 py-2 rounded-2xl break-words text-sm max-w-full ${
                      selectedMsgs?.has(msg.id)
                        ? isMine ? "bg-green-700" : "bg-zinc-700"
                        : isMine ? "bg-green-600 rounded-br-sm" : "bg-zinc-800 rounded-bl-sm"
                    }`}>
                      {msg.reply_content && (
                        <div className={`mb-2 px-2 py-1 rounded-lg text-xs border-l-2 ${isMine ? "border-green-300 bg-green-700/50" : "border-zinc-500 bg-zinc-700/50"}`}>
                          <div className="text-zinc-400 mb-0.5">{getDisplayName(msg.reply_sender)}</div>
                          <div className="truncate opacity-80">{msg.reply_content}</div>
                        </div>
                      )}
                      {msg.content}
                    </div>
                  )}
                  {/* Reactions */}
                  {reactions && reactions[msg.id] && Object.keys(reactions[msg.id]).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                      {Object.entries(reactions[msg.id]).map(([emoji, wallets]: [string, any]) => (
                        <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border ${
                            wallets.includes(publicKey?.toBase58()) ? "bg-green-900 border-green-700 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-300"
                          }`}>
                          {emoji} <span className="text-[10px]">{wallets.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-zinc-600 px-1">{new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Context menu */}
      {contextMenu && (() => {
        const msg = groupMessages.find((m: any) => m.id === contextMenu.msgId);
        if (!msg) return null;
        const isMine = msg.sender === publicKey?.toBase58();
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
            <div className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1 min-w-[180px]"
              style={{ top: Math.min(contextMenu.y - 10, window.innerHeight - 300), left: Math.min(contextMenu.x, window.innerWidth - 200) }}>
              <button onClick={() => { setReplyTo(msg); setContextMenu(null); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-sm text-white">↩️ Reply</button>
              <button onClick={() => { copyMessage(msg.content); setContextMenu(null); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-sm text-white">📋 Copy</button>
              <div className="px-3 py-1.5 flex flex-wrap gap-1">
                {["❤️","😂","😮","😢","👍","👎","🔥","🎉"].map((e) => (
                  <button key={e} onClick={() => { toggleReaction(msg.id, e); setContextMenu(null); }}
                    className="text-lg hover:bg-zinc-800 rounded p-0.5">{e}</button>
                ))}
              </div>
              <div className="h-px bg-zinc-800 mx-2 my-1" />
              <button onClick={() => { setContextMenu(null); setSelectionMode?.(true); if (!selectedMsgs?.has(msg.id)) toggleSelectMsg(msg.id); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-sm text-zinc-200 font-medium">☑️ Select</button>
              <button onClick={() => { setContextMenu(null); setSelectionMode?.(true); if (!selectedMsgs?.has(msg.id)) toggleSelectMsg(msg.id); setShowDeleteConfirm("me"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-sm text-red-400">🗑 For me</button>
              {isMine && (
                <button onClick={() => { setContextMenu(null); setSelectionMode?.(true); if (!selectedMsgs?.has(msg.id)) toggleSelectMsg(msg.id); setShowDeleteConfirm("all"); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-sm text-red-400">🗑 For everyone</button>
              )}
            </div>
          </>
        );
      })()}

      {/* Selection toolbar */}
      {selectionMode && (() => {
        const allSelectedMine = Array.from(selectedMsgs || []).every((id) => {
          const m = groupMessages.find((msg: any) => msg.id === id);
          return m && m.sender === publicKey?.toBase58();
        });
        return (
          <div className="flex items-center justify-between bg-zinc-800 border-t border-zinc-700 px-4 py-2 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm text-white font-medium">{selectedMsgs?.size} selected</span>
              <button onClick={clearSelection} className="text-xs text-zinc-400">Cancel</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm("me")} disabled={!selectedMsgs?.size}
                className="bg-zinc-700 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-40">🗑 For me</button>
              {allSelectedMine && (
                <button onClick={() => setShowDeleteConfirm("all")} disabled={!selectedMsgs?.size}
                  className="bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-40">🗑 For all</button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-bold text-white mb-2">Delete messages?</div>
            <div className="text-zinc-400 text-sm mb-6">
              {showDeleteConfirm === "all"
                ? `Delete ${selectedMsgs?.size || 1} message(s) for everyone?`
                : `Delete ${selectedMsgs?.size || 1} message(s) for you only?`}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 bg-zinc-800 text-white py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={() => { setShowDeleteConfirm(null); setSelectionMode?.(true); }} className="flex-1 bg-zinc-700 text-zinc-200 py-2.5 rounded-xl text-sm font-medium">☑️ Select</button>
              <button onClick={() => deleteSelected(showDeleteConfirm)} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

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
