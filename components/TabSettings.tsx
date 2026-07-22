"use client";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { supabase } from "../lib/supabase";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const PREMIUM_WALLET = "3WDy3rzCYY5TpLJAJ6MwhWUoAHrVi7rrxtNhQ5BhizqJ";
const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";

export function TabSettings({
  publicKey, profiles, savedUsername, username, setUsername, saveProfile,
  displayName, setDisplayName, avatarUrl, handleAvatarUpload,
  isPremium, premiumExpires, setIsPremium, setPremiumExpires,
  walletPrivate, setWalletPrivate,
  messageExpiryDays, saveMessageExpiry,
}: any) {
  const { sendTransaction } = useWallet();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function formatExpiry(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  }

  function daysUntilExpiry(dateStr: string) {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  async function handleGoPremium() {
    if (!publicKey || !sendTransaction) { alert("Connect your wallet first"); return; }

    // Fetch price from app_settings
    const { data: priceData } = await supabase.from("app_settings").select("value").eq("key", "premium_price_sol").single();
    const price = parseFloat(priceData?.value || "0.05");

    try {
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, "confirmed");
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(PREMIUM_WALLET),
          lamports: Math.round(price * LAMPORTS_PER_SOL),
        })
      );
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction - Phantom opens automatically
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");

      // Activate premium for 30 days
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);

      const { error } = await supabase.from("profiles").upsert({
        wallet: publicKey.toBase58(),
        is_premium: true,
        premium_expires_at: expires.toISOString(),
      });

      if (error) { alert("Payment confirmed but activation failed. Contact support with tx: " + signature); return; }

      setIsPremium(true);
      setPremiumExpires(expires.toISOString());
      alert(`✅ Premium activated! Valid until ${formatExpiry(expires.toISOString())}\n\nTx: ${signature}`);

    } catch (err: any) {
      if (err.message?.includes("User rejected")) {
        // User cancelled - do nothing
        return;
      }
      alert("Error: " + (err.message || "Transaction failed"));
    }
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
                placeholder="username_here" maxLength={30}
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
            <button disabled={!isPremium} onClick={() => setWalletPrivate(!walletPrivate)}
              className={`w-12 h-6 rounded-full transition-colors ${isPremium ? (walletPrivate ? "bg-green-500" : "bg-zinc-600") : "bg-zinc-700 opacity-50 cursor-not-allowed"}`}>
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
              {premiumExpires && (
                <>
                  <div className="text-zinc-400 text-xs">Expires: {formatExpiry(premiumExpires)}</div>
                  {daysUntilExpiry(premiumExpires) <= 7 && daysUntilExpiry(premiumExpires) > 0 && (
                    <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg px-3 py-2 text-xs text-yellow-300">
                      ⚠️ Your premium expires in {daysUntilExpiry(premiumExpires)} day{daysUntilExpiry(premiumExpires) !== 1 ? "s" : ""}! Renew now to keep your benefits.
                    </div>
                  )}
                  {daysUntilExpiry(premiumExpires) <= 0 && (
                    <div className="bg-red-900/50 border border-red-700 rounded-lg px-3 py-2 text-xs text-red-300">
                      ❌ Your premium has expired. Renew to restore your benefits.
                    </div>
                  )}
                </>
              )}
              <div className="flex flex-col gap-1.5 text-xs text-zinc-300">
                <div>✅ Verified badge on your profile</div>
                <div>✅ Private wallet mode</div>
                <div>✅ Unlimited wallet views</div>
                <div>✅ Priority support</div>
              </div>
              {/* Renew button if expiring soon */}
              {premiumExpires && daysUntilExpiry(premiumExpires) <= 7 && (
                <button onClick={handleGoPremium}
                  className="w-full bg-gradient-to-r from-purple-600 to-green-500 hover:from-purple-500 hover:to-green-400 text-white rounded-xl py-2.5 text-sm font-bold transition-all">
                  🔄 Renew Premium — 0.05 SOL
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5 text-xs text-zinc-400 mb-1">
                <div>✅ Verified badge on your profile</div>
                <div>✅ Private wallet (hide NFTs & tokens)</div>
                <div>✅ Unlimited profile views (free = 5/day)</div>
                <div>✅ Priority support</div>
              </div>
              <button onClick={handleGoPremium}
                className="w-full bg-gradient-to-r from-purple-600 to-green-500 hover:from-purple-500 hover:to-green-400 text-white rounded-xl py-3 text-sm font-bold transition-all shadow-lg">
                ⭐ Go Premium — 0.05 SOL / month
              </button>
              <div className="text-[10px] text-zinc-600 text-center">
                Phantom opens automatically. Premium activates instantly after payment confirmation.
              </div>
            </>
          )}
        </div>

        {/* Message Expiry */}
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

        {/* Wallet */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="font-semibold text-sm text-zinc-400 uppercase tracking-wide">Wallet</div>
          {publicKey && <div className="text-zinc-500 text-xs font-mono break-all">{publicKey.toBase58()}</div>}
          <WalletMultiButtonDynamic />
        </div>

      </div>
    </div>
  );
}
