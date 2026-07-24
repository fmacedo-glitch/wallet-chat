export function BottomNav({ unreadCounts, unreadGroupCounts, friendRequests, publicKey, activeTab, setActiveTab, setActiveChat, setActiveGroup }: any) {
  const groupBadge = Object.values(unreadGroupCounts || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  return (
    <div className="flex-shrink-0 border-t border-zinc-800 bg-zinc-950 flex items-center justify-around px-1 py-2">
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
          badge: groupBadge,
        },
        {
          key: "settings",
          icon: "⚙️",
          label: "Settings",
          badge: 0,
        },
        {
          key: "play",
          icon: "🎮",
          label: "Play",
          badge: 0,
        },
      ] as const).map((tab) => (
        <button
          key={tab.key}
          onClick={() => { if (tab.key !== "chats") { setActiveChat(""); setActiveGroup(null); } setActiveTab(tab.key); }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all relative ${
            activeTab === tab.key
              ? tab.key === "play"
                ? "text-purple-400 font-bold scale-105"
                : "text-green-400 font-bold"
              : tab.key === "play"
              ? "text-purple-400/80 hover:text-purple-300"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <span className="text-xl">{tab.icon}</span>
          <span className="text-[10px] font-medium">{tab.label}</span>
          {tab.badge > 0 && (
            <div className="absolute -top-1 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border border-zinc-950">
              {tab.badge > 99 ? "99+" : tab.badge}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
