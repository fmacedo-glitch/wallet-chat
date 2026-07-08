export function BottomNav({ unreadCounts, friendRequests, publicKey, activeTab, setActiveTab, setActiveChat, setActiveGroup }: any) {
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
