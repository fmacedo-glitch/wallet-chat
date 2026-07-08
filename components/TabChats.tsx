import { Avatar } from "./Avatar";

export function TabChats({
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
