import { Avatar } from "./Avatar";

export function TabFriends({
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
