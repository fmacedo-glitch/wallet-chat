import { Avatar } from "./Avatar";
import { TypingIndicator } from "./TypingIndicator";
import { useEffect, useRef } from "react";
import { EmojiPicker } from "./EmojiPicker";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";

export function ChatWindow({
  activeChat, setActiveChat, setActiveTab, profiles, isOnline, getDisplayName, otherIsTyping,
  showSearch, setShowSearch, searchQuery, setSearchQuery, chatMessages, publicKey,
  fetchNFTs, fetchOtherWalletTokens, showNFTs, setShowNFTs, nftWallet, setNftTab, nftTab,
  isFriend, unfriend, addFriend, isBlocked, blockUser, unblockUser, friendRequests,
  loadingNFTs, nfts, loadingOtherTokens, otherTokens,
  hasMoreMessages, loadMoreMessages, loadingMore,
  reactions, selectedMsgs, selectionMode, setSelectionMode, toggleSelectMsg, toggleReaction, setContextMenu, contextMenu,
  ContextMenuUI, clearSelection, showDeleteConfirm, setShowDeleteConfirm, deleteSelected,
  amIBlocked, didIBlock, showSendSol, setShowSendSol, loadingTokens, walletTokens,
  selectedToken, setSelectedToken, solAmount, setSolAmount, sendSol, sendingSol, fetchWalletTokens,
  message, handleMessageInput, textareaRef, showEmojiPicker, setShowEmojiPicker,
  replyTo, setReplyTo, autoResize, setMessage, sendMessage,
  handleViewProfile, getUserBadge, isPremium,
  clearConversation, deleteMessageForMe, deleteMessageForAll,
}: any) {
  // Internal scroll ref
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!messagesContainerRef?.current) return;
    const el = messagesContainerRef.current;
    setTimeout(() => { el.scrollTop = el.scrollHeight; }, 100);
  }, [chatMessages]);

  // Scroll to bottom when chat opens
  useEffect(() => {
    if (!messagesContainerRef?.current) return;
    setTimeout(() => {
      const el = messagesContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 150);
  }, [activeChat]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-zinc-800 px-3 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => { setActiveChat(""); setActiveTab("chats"); }} className="text-zinc-400 hover:text-white text-xl flex-shrink-0">←</button>
          <div className="relative flex-shrink-0">
            <Avatar wallet={activeChat} profile={profiles[activeChat]} size={38} />
            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${isOnline(activeChat) ? "bg-green-400" : "bg-zinc-600"}`} />
          </div>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleViewProfile(activeChat)}>
            <div className="text-white font-semibold text-sm flex items-center gap-1.5 flex-wrap">
              <span>{getDisplayName(activeChat)}</span>
              {profiles[activeChat]?.is_premium && <span className="text-green-400 text-xs">✅</span>}
              {profiles[activeChat]?.rank_title && (
                <span className="text-[10px] bg-purple-500/20 border border-purple-400/30 text-purple-300 font-extrabold px-1.5 py-0.5 rounded-full">
                  {profiles[activeChat]?.rank_title}
                </span>
              )}
              {profiles[activeChat]?.play_points !== undefined && (
                <span className="text-[10px] text-amber-400 font-extrabold">
                  🪙 {profiles[activeChat]?.play_points}
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-500">
              {otherIsTyping ? <span className="text-green-400 animate-pulse">typing...</span>
                : isOnline(activeChat) ? <span className="text-green-400">● Online</span>
                : <span className="text-zinc-600">● Offline</span>}
            </div>
          </div>
          <button onClick={() => { setShowSearch(!showSearch); setSearchQuery(""); }} className="text-zinc-400 hover:text-white p-1.5">🔍</button>
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
        <div className="flex items-center gap-2 mt-1">
          <div className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors" onClick={() => handleViewProfile(activeChat)}>
            View profile →
          </div>
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
            {chatMessages.filter((m: any) => selectedMsgs.has(m.id)).every((m: any) => m.sender === publicKey?.toBase58()) && (
              <button onClick={() => setShowDeleteConfirm("all")} disabled={selectedMsgs.size === 0} className="bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-40">🗑 For all</button>
            )}
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-bold text-white mb-2">Delete messages?</div>
            <div className="text-zinc-400 text-sm mb-6">{showDeleteConfirm === "all" ? `Delete ${selectedMsgs.size} message(s) for everyone?` : `Delete ${selectedMsgs.size} message(s) for you only?`}</div>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 bg-zinc-800 text-white py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={() => { setShowDeleteConfirm(null); setSelectionMode?.(true); }} className="flex-1 bg-zinc-700 text-zinc-200 py-2.5 rounded-xl text-sm font-medium">☑️ Select</button>
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
            <button onClick={() => { if (!showSendSol) fetchWalletTokens(); setShowSendSol(!showSendSol); }}
              className="bg-yellow-500 text-black rounded-xl px-3 py-2.5 font-bold text-sm flex-shrink-0 self-end">💸</button>
            <div className="relative flex-shrink-0 self-end">
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="bg-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm">😊</button>
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={(e: string) => { setMessage((prev: string) => prev + e); setShowEmojiPicker(false); setTimeout(autoResize, 0); }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </div>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => handleMessageInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Message..."
              rows={1}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm resize-none overflow-hidden focus:outline-none"
              style={{ minHeight: "56px", maxHeight: "160px" }}
            />
            <button onClick={sendMessage}
              className="bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 py-2.5 font-bold flex-shrink-0 self-end transition-colors">↑</button>
          </div>
        </div>
      )}
    </div>
  );
}
