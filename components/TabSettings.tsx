"use client";
import dynamic from "next/dynamic";
import { useRef } from "react";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const PREMIUM_WALLET = "3WDy3rzCYY5TpLJAJ6MwhWUoAHrVi7rrxtNhQ5BhizqJ";
const PREMIUM_AMOUNT = 0.05;

export function TabSettings({
  publicKey, profiles, savedUsername, username, setUsername, saveProfile,
  displayName, setDisplayName, avatarUrl, handleAvatarUpload,
  isPremium, premiumExpires,
  walletPrivate, setWalletPrivate,
  messageExpiryDays, saveMessageExpiry,
}: any) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function formatExpiry(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        {/* Profile */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
          <div className="font-semibold text-sm text-zinc-400 uppercase tracking-wide">Profile</div>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-zinc-700" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-green-400 flex items-center justify-center text-white text-2xl font-bold border-2 border-zinc-700">
                  {(displayName || username || publicKey?.toBase58() || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-medium">Edit</span>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
            <div className="flex-1">
              <div className="text-white font-semibold">{displayName || (username ? `@${username}` : "No name set")}</div>
              {isPremium && <div className="text-green-400 text-xs mt-0.5">✅ Premium Member</div>}
              {!isPremium && <div className="text-zinc-500 text-xs mt-0.5">Free Account</div>}
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Display Name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name (shown in chat)"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500" />
          </div>

          {/* Username */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
              <input value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                placeholder="username_here"
                maxLength={30}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500" />
            </div>
            <div className="text-[10px] text-zinc-600 mt-1">Only letters, numbers and underscores. No spaces.</div>
          </div>

          <button onClick={saveProfile}
            className="w-full bg-green-600 hover:bg-green-500 text-white rounded-xl py-2.5 text-sm font-bold transition-colors">
            Save Profile
          </button>
        </div>

        {/* Privacy */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="font-semibold text-sm text-zinc-400 uppercase tracking-wide">Privacy</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm font-medium">Private Wallet</div>
              <div className="text-zinc-500 text-xs">Hide your NFTs and tokens from others</div>
              {!isPremium && <div className="text-yellow-500 text-xs mt-0.5">⭐ Premium only</div>}
            </div>
            <button
              disabled={!isPremium}
              onClick={() => setWalletPrivate(!walletPrivate)}
              className={`w-12 h-6 rounded-full transition-colors ${
                isPremium ? (walletPrivate ? "bg-green-500" : "bg-zinc-600") : "bg-zinc-700 opacity-50 cursor-not-allowed"
              }`}>
              <div className={`w-5 h-5 rounded-full bg-white mx-0.5 transition-transform ${walletPrivate && isPremium ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

        {/* Premium */}
        <div className={`border rounded-xl p-4 flex flex-col gap-3 ${isPremium ? "bg-green-950 border-green-800" : "bg-zinc-900 border-zinc-800"}`}>
          <div className="font-semibold text-sm text-zinc-400 uppercase tracking-wide">
            {isPremium ? "✅ Premium Active" : "⭐ Premium"}
          </div>
          {isPremium ? (
            <>
              <div className="text-green-400 text-sm font-medium">Your premium is active!</div>
              {premiumExpires && <div className="text-zinc-400 text-xs">Expires: {formatExpiry(premiumExpires)}</div>}
              <div className="flex flex-col gap-1.5 text-xs text-zinc-300">
                <div>✅ Verified badge on your profile</div>
                <div>✅ Private wallet mode</div>
                <div>✅ Unlimited profile views</div>
                <div>✅ Priority support</div>
              </div>
            </>
          ) : (
            <>
              <div className="text-zinc-300 text-sm">Unlock premium features for <span className="text-yellow-400 font-bold">0.05 SOL/month</span></div>
              <div className="flex flex-col gap-1.5 text-xs text-zinc-400">
                <div>✅ Verified badge on your profile</div>
                <div>✅ Private wallet (hide NFTs & tokens)</div>
                <div>✅ Unlimited profile views (free = 5/day)</div>
                <div>✅ Priority support</div>
              </div>
              <div className="bg-zinc-800 rounded-xl p-3 mt-1">
                <div className="text-xs text-zinc-400 mb-2">Send exactly <span className="text-yellow-400 font-bold">0.05 SOL</span> to:</div>
                <div className="font-mono text-xs text-white break-all bg-zinc-900 rounded-lg px-3 py-2 select-all">
                  {PREMIUM_WALLET}
                </div>
                <div className="text-[10px] text-zinc-500 mt-2">
                  Include your wallet address in the memo field. Premium activates within 24h after payment verification.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Message Expiry */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="font-semibold text-sm text-zinc-400 uppercase tracking-wide">Message Expiry</div>
          <div className="text-xs text-zinc-500">Messages will be automatically deleted after the selected period</div>
          <select value={messageExpiryDays} onChange={(e) => saveMessageExpiry(Number(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
            <option value={0}>Never</option>
            <option value={1}>After 1 day</option>
            <option value={7}>After 7 days</option>
            <option value={30}>After 30 days</option>
            <option value={90}>After 90 days</option>
          </select>
        </div>

        {/* Wallet */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="font-semibold text-sm text-zinc-400 uppercase tracking-wide">Wallet</div>
          {publicKey && (
            <div className="text-zinc-500 text-xs font-mono break-all">{publicKey.toBase58()}</div>
          )}
          <WalletMultiButtonDynamic />
        </div>

      </div>
    </div>
  );
}
