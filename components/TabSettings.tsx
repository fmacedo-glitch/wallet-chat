import { Avatar } from "./Avatar";
import dynamic from "next/dynamic";
const WalletMultiButtonDynamic = dynamic(async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton, { ssr: false });

export function TabSettings({
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
