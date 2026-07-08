export function ChatMessages({ messages, publicKey, reactions, selectedMsgs, selectionMode, toggleSelectMsg, toggleReaction, setContextMenu, contextMenu, getDisplayName }: any) {
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
