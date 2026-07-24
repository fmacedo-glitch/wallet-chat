import { Avatar } from "./Avatar";

export function TabGroups({
  setShowCreateGroup, searchGroupQuery, setSearchGroupQuery, searchPublicGroups, searchingGroups,
  searchGroupResults, groups, openGroup, requestJoinGroup, publicKey,
  showCreateGroup, newGroupName, setNewGroupName, newGroupDesc, setNewGroupDesc,
  groupIsPublic, setGroupIsPublic, groupRequiresApproval, setGroupRequiresApproval,
  friends, profiles, getDisplayName, createGroup, creatingGroup, unreadGroupCounts,
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
        {groups.map((group: any) => {
          const count = unreadGroupCounts?.[group.id] || 0;
          return (
            <button key={group.id} onClick={() => openGroup(group)}
              className={`border rounded-xl p-3 text-left hover:border-zinc-700 transition-colors ${
                count > 0 ? "bg-zinc-800/90 border-green-800" : "bg-zinc-900 border-zinc-800"
              }`}>
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: `linear-gradient(135deg, ${group.avatar_color}, #14F195)` }}>
                    {group.name.slice(0, 1).toUpperCase()}
                  </div>
                  {count > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-zinc-900 shadow">
                      {count > 99 ? "99+" : count}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-semibold">{group.name}</div>
                  <div className="text-zinc-500 text-xs truncate">{group.description || "No description"}</div>
                </div>
                {group.owner === publicKey?.toBase58() && <div className="text-[10px] text-yellow-500 font-bold flex-shrink-0">ADMIN</div>}
                {count > 0 && (
                  <div className="min-w-5 h-5 px-1.5 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow">
                    {count > 99 ? "99+" : count}
                  </div>
                )}
              </div>
            </button>
          );
        })}
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
