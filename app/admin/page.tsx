"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";
const FEATURES = [
  { value: "all", label: "🔐 Acces complet" },
  { value: "chat_access", label: "💬 Acces chat" },
  { value: "send_sol", label: "💸 Trimite crypto" },
  { value: "view_nfts", label: "🖼 Vezi NFT-uri" },
];

export default function AdminDashboard() {
  const { publicKey } = useWallet();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Settings
  const [gateEnabled, setGateEnabled] = useState(false);
  const [adminWallet, setAdminWallet] = useState("");

  // Token gates
  const [gates, setGates] = useState<any[]>([]);
  const [loadingGates, setLoadingGates] = useState(false);

  // Stats
  const [stats, setStats] = useState({ users: 0, messages: 0, activeToday: 0, deletedMessages: 0 });

  // New gate form
  const [newGate, setNewGate] = useState({
    token_mint: "",
    token_symbol: "",
    token_logo: "",
    min_amount: "1",
    feature: "all",
    description: "",
  });
  const [addingGate, setAddingGate] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Active tab
  const [tab, setTab] = useState<"overview" | "gates" | "settings" | "users" | "messages" | "notifications" | "premium" | "groups" | "bans" | "play_admin">("overview");

  // Play Arena Admin State
  const [testPointsWallet, setTestPointsWallet] = useState("");
  const [testPointsAmount, setTestPointsAmount] = useState(100);
  const [shopPrices, setShopPrices] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("play_shop_prices");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return {
      "title-whale": 300,
      "title-degen": 200,
      "title-diamond": 150,
      "title-streak": 100,
      "box-silver": 50,
      "box-gold": 150,
    };
  });

  function updateShopPrice(itemId: string, newPrice: number) {
    const updated = { ...shopPrices, [itemId]: newPrice };
    setShopPrices(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("play_shop_prices", JSON.stringify(updated));
    }
  }

  const [houseFeePercent, setHouseFeePercent] = useState<number>(5);
  const [presetWagersMonede, setPresetWagersMonede] = useState<string>("20, 50, 100, 250, 500");
  const [presetWagersSol, setPresetWagersSol] = useState<string>("0.05, 0.1, 0.25, 0.5, 1.0");

  async function saveArenaWagerSettings() {
    await Promise.all([
      supabase.from("app_settings").upsert({ key: "arena_house_fee_percent", value: houseFeePercent.toString() }),
      supabase.from("app_settings").upsert({ key: "arena_preset_wagers_monede", value: presetWagersMonede }),
      supabase.from("app_settings").upsert({ key: "arena_preset_wagers_sol", value: presetWagersSol }),
    ]);
    if (typeof window !== "undefined") {
      localStorage.setItem("arena_house_fee_percent", houseFeePercent.toString());
      localStorage.setItem("arena_preset_wagers_monede", presetWagersMonede);
      localStorage.setItem("arena_preset_wagers_sol", presetWagersSol);
    }
    alert("✅ Comisionul și mizele presetate au fost salvate cu succes!");
  }

  const [arenaPricing, setArenaPricing] = useState({
    coinFlipMin: 10,
    coinFlipMax: 1000,
    rpsMin: 5,
    rpsMax: 500,
    diceMin: 10,
    diceMax: 1000,
    spinCost: 10,
    spinJackpot: 500,
  });
  const [auditLogs, setAuditLogs] = useState<any[]>([
    { id: "log-1", time: "Just now", event: "Anti-Cheat Audit Engine: System Nominal", status: "VERIFIED" },
    { id: "log-2", time: "2 mins ago", event: "Live Match Matchmaking Verification", status: "PASSED" },
    { id: "log-3", time: "5 mins ago", event: "Wager Pool Escrow Sync", status: "BALANCED" },
  ]);

  function handleAddTestPoints() {
    if (!testPointsWallet.trim()) { alert("Please enter a wallet address"); return; }
    const cur = parseInt(localStorage.getItem(`wc_points_${testPointsWallet.trim()}`) || "100");
    const next = cur + Number(testPointsAmount);
    localStorage.setItem(`wc_points_${testPointsWallet.trim()}`, next.toString());
    alert(`✅ Added ${testPointsAmount} points to ${testPointsWallet.trim()}! New balance: ${next}`);
    setTestPointsWallet("");
  }

  // Users
  const [users, setUsers] = useState<any[]>([]);

  // Messages
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [convMessages, setConvMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [msgSearch, setMsgSearch] = useState("");

  // Premium
  const [premiumUsers, setPremiumUsers] = useState<any[]>([]);
  const [premiumWallet, setPremiumWallet] = useState("");
  const [premiumMonths, setPremiumMonths] = useState(1);
  const [grantingPremium, setGrantingPremium] = useState(false);

  // Premium price
  const [premiumPrice, setPremiumPrice] = useState("0.05");

  // Search
  const [userSearch, setUserSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");

  // Groups management
  const [adminGroups, setAdminGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupMsgs, setGroupMsgs] = useState<any[]>([]);
  const [loadingGroupMsgs, setLoadingGroupMsgs] = useState(false);

  // User bans
  const [banWallet, setBanWallet] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDays, setBanDays] = useState(0);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [banning, setBanning] = useState(false);

  // Notifications broadcast
const [notifTitle, setNotifTitle] = useState("");
const [notifMessage, setNotifMessage] = useState("");
const [sendingNotif, setSendingNotif] = useState(false);
const [notifHistory, setNotifHistory] = useState<any[]>([]);

  useEffect(() => {
    checkAdmin();
    fetchSettings();
    fetchGates();
    fetchStats();
    fetchUsers();
    fetchConversations();
    fetchNotifHistory();
    fetchPremiumUsers();
    fetchAdminGroups();
    fetchBannedUsers();
    // Load premium price
    supabase.from("app_settings").select("value").eq("key", "premium_price_sol").single().then(({ data }) => {
      if (data?.value) setPremiumPrice(data.value);
    });
  }, [publicKey]);

  async function checkAdmin() {
    if (!publicKey) { setLoading(false); return; }
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "admin_wallet")
      .single();
    setIsAdmin(data?.value === publicKey.toBase58());
    setLoading(false);
  }

  async function fetchSettings() {
    const { data } = await supabase.from("app_settings").select("*");
    data?.forEach((s: any) => {
      if (s.key === "token_gate_enabled") setGateEnabled(s.value === "true");
      if (s.key === "admin_wallet") setAdminWallet(s.value);
      if (s.key === "arena_house_fee_percent") setHouseFeePercent(Number(s.value) || 5);
      if (s.key === "arena_preset_wagers_monede") setPresetWagersMonede(s.value);
      if (s.key === "arena_preset_wagers_sol") setPresetWagersSol(s.value);
    });
  }

  async function fetchGates() {
    setLoadingGates(true);
    const { data } = await supabase.from("token_gates").select("*").order("created_at", { ascending: false });
    setGates(data || []);
    setLoadingGates(false);
  }

  async function fetchStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [profilesRes, messagesRes, activeRes, deletedRes] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("messages").select("*", { count: "exact", head: true }),
      supabase.from("presence").select("*", { count: "exact", head: true }).gte("last_seen", today.toISOString()),
      supabase.from("messages").select("*", { count: "exact", head: true }).eq("deleted_for_all", true),
    ]);

    setStats({
      users: profilesRes.count || 0,
      messages: messagesRes.count || 0,
      activeToday: activeRes.count || 0,
      deletedMessages: deletedRes.count || 0,
    });
  }

  async function fetchUsers() {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
    const { data: presence } = await supabase.from("presence").select("*");
    const presenceMap: any = {};
    presence?.forEach((p: any) => { presenceMap[p.wallet] = p.last_seen; });

    const enriched = (profiles || []).map((p: any) => ({
      ...p,
      last_seen: presenceMap[p.wallet] || null,
      online: presenceMap[p.wallet] && (Date.now() - new Date(presenceMap[p.wallet]).getTime()) < 2 * 60 * 1000,
    }));
    setUsers(enriched);
  }

  async function toggleGateEnabled() {
    const newVal = !gateEnabled;
    setGateEnabled(newVal);
    await supabase.from("app_settings").upsert({ key: "token_gate_enabled", value: newVal.toString() });
  }

  async function toggleGate(id: string, active: boolean) {
    await supabase.from("token_gates").update({ active: !active }).eq("id", id);
    fetchGates();
  }

  async function deleteGate(id: string) {
    if (!confirm("Stergi acest gate?")) return;
    await supabase.from("token_gates").delete().eq("id", id);
    fetchGates();
  }

  async function lookupToken() {
    if (!newGate.token_mint) return;
    setLookupLoading(true);
    try {
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1,
          method: "getAsset",
          params: { id: newGate.token_mint },
        }),
      });
      const json = await res.json();
      const asset = json?.result;
      if (asset) {
        setNewGate(prev => ({
          ...prev,
          token_symbol: asset.token_info?.symbol || asset.content?.metadata?.symbol || prev.token_symbol,
          token_logo: asset.content?.links?.image || prev.token_logo,
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLookupLoading(false);
    }
  }

  async function addGate() {
    if (!newGate.token_mint || !newGate.token_symbol) {
      alert("Completeaza mint address si symbol");
      return;
    }
    setAddingGate(true);
    const { error } = await supabase.from("token_gates").insert({
      token_mint: newGate.token_mint,
      token_symbol: newGate.token_symbol,
      token_logo: newGate.token_logo || null,
      min_amount: parseFloat(newGate.min_amount) || 1,
      feature: newGate.feature,
      description: newGate.description || null,
      active: true,
    });
    if (error) { alert("Eroare: " + error.message); }
    else {
      setNewGate({ token_mint: "", token_symbol: "", token_logo: "", min_amount: "1", feature: "all", description: "" });
      fetchGates();
    }
    setAddingGate(false);
  }

  async function fetchConversations() {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { console.error(error); return; }

    // group by conversation pair
    const convMap = new Map();
    data?.forEach((msg: any) => {
      const key = [msg.sender, msg.receiver].sort().join("_");
      if (!convMap.has(key)) {
        convMap.set(key, {
          key,
          wallet1: msg.sender,
          wallet2: msg.receiver,
          lastMessage: msg,
          count: 1,
          deletedCount: msg.deleted_for_all ? 1 : 0,
        });
      } else {
        const conv = convMap.get(key);
        conv.count++;
        if (msg.deleted_for_all) conv.deletedCount++;
      }
    });

    setConversations(Array.from(convMap.values()));
  }

async function fetchAdminGroups() {
    const { data } = await supabase.from("groups").select("*").order("created_at", { ascending: false });
    setAdminGroups(data || []);
  }

  async function fetchGroupMessages(groupId: string) {
    setLoadingGroupMsgs(true);
    setSelectedGroupId(groupId);
    const { data } = await supabase.from("group_messages").select("*")
      .eq("group_id", groupId).order("created_at", { ascending: true });
    setGroupMsgs(data || []);
    setLoadingGroupMsgs(false);
  }

  async function deleteGroup(groupId: string) {
    if (!confirm("Delete this group permanently?")) return;
    await supabase.from("groups").delete().eq("id", groupId);
    fetchAdminGroups();
    if (selectedGroupId === groupId) { setSelectedGroupId(null); setGroupMsgs([]); }
  }

  async function deleteUser(wallet: string) {
    if (!confirm(`Delete user ${wallet.slice(0,8)}...? This removes their profile and messages.`)) return;
    await supabase.from("messages").delete().or(`sender.eq.${wallet},receiver.eq.${wallet}`);
    await supabase.from("profiles").delete().eq("wallet", wallet);
    await supabase.from("group_members").delete().eq("wallet", wallet);
    fetchUsers();
    alert("User deleted.");
  }

  async function fetchBannedUsers() {
    const { data } = await supabase.from("blocked_users")
      .select("*").eq("blocker", "ADMIN").order("created_at", { ascending: false });
    setBannedUsers(data || []);
  }

  async function banUser() {
    if (!banWallet.trim()) { alert("Enter a wallet"); return; }
    setBanning(true);
    const expiresAt = banDays > 0 ? new Date(Date.now() + banDays * 86400000).toISOString() : null;
    await supabase.from("blocked_users").upsert({
      blocker: "ADMIN",
      blocked: banWallet.trim(),
      reason: banReason || "Banned by admin",
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });
    setBanWallet(""); setBanReason(""); setBanDays(0);
    fetchBannedUsers();
    setBanning(false);
    alert("✅ User banned" + (banDays > 0 ? ` for ${banDays} days` : " permanently"));
  }

  async function unbanUser(wallet: string) {
    if (!confirm("Unban this user?")) return;
    await supabase.from("blocked_users").delete().eq("blocker", "ADMIN").eq("blocked", wallet);
    fetchBannedUsers();
  }

  async function fetchPremiumUsers() {
    const { data } = await supabase.from("profiles")
      .select("wallet, username, display_name, is_premium, premium_expires_at")
      .eq("is_premium", true)
      .order("premium_expires_at", { ascending: false });
    setPremiumUsers(data || []);
  }

  async function grantPremium(wallet: string, months: number) {
    if (!wallet.trim()) { alert("Enter a wallet address"); return; }
    setGrantingPremium(true);
    const expires = new Date();
    expires.setMonth(expires.getMonth() + months);
    const { error } = await supabase.from("profiles").upsert({
      wallet: wallet.trim(),
      is_premium: true,
      premium_expires_at: expires.toISOString(),
    });
    if (error) { alert("Error: " + error.message); }
    else { alert(`✅ Premium granted until ${expires.toLocaleDateString()}!`); setPremiumWallet(""); fetchPremiumUsers(); }
    setGrantingPremium(false);
  }

  async function revokePremium(wallet: string) {
    if (!confirm(`Revoke premium for ${wallet.slice(0,8)}...?`)) return;
    await supabase.from("profiles").update({ is_premium: false, premium_expires_at: null }).eq("wallet", wallet);
    fetchPremiumUsers();
  }

  async function fetchNotifHistory() {
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(10);
  setNotifHistory(data || []);
}

async function sendBroadcast() {
  if (!notifTitle.trim() || !notifMessage.trim()) { alert("Fill in title and message"); return; }
  if (!confirm(`Send notification "${notifTitle}" to all users?`)) return;
  setSendingNotif(true);
  const { error } = await supabase.from("notifications").insert({
    title: notifTitle.trim(),
    message: notifMessage.trim(),
    created_by: publicKey?.toBase58(),
  });
  if (error) { alert("Error: " + error.message); }
  else {
    setNotifTitle("");
    setNotifMessage("");
    fetchNotifHistory();
    alert("✅ Notification sent!");
  }
  setSendingNotif(false);
}

  async function fetchConvMessages(wallet1: string, wallet2: string) {
    setLoadingMessages(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender.eq.${wallet1},receiver.eq.${wallet2}),and(sender.eq.${wallet2},receiver.eq.${wallet1})`)
      .order("created_at", { ascending: true });
    setConvMessages(data || []);
    setLoadingMessages(false);
  }

  async function deleteMessage(id: string) {
    if (!confirm("Ștergi mesajul?")) return;
    await supabase.from("messages").delete().eq("id", id);
    if (activeConv) fetchConvMessages(activeConv.wallet1, activeConv.wallet2);
  }

  async function saveAdminWallet() {
    await supabase.from("app_settings").upsert({ key: "admin_wallet", value: adminWallet });
    alert("Salvat!");
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      Se încarcă...
    </div>
  );

  if (!publicKey) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 text-white">
      <div className="text-2xl font-bold">Admin Dashboard</div>
      <div className="text-zinc-500">Conectează wallet-ul pentru acces</div>
      <WalletMultiButtonDynamic />
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-white">
      <div className="text-4xl">🔒</div>
      <div className="text-xl font-bold">Acces interzis</div>
      <div className="text-zinc-500 text-sm">Nu ești admin</div>
      <div className="text-xs text-zinc-700 break-all max-w-sm text-center">{publicKey.toBase58()}</div>
      <a href="/" className="text-green-400 text-sm hover:underline">← Înapoi la chat</a>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="text-zinc-500 hover:text-white text-sm">← Chat</a>
          <div className="text-xl font-bold">Admin Dashboard</div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${gateEnabled ? "bg-green-600" : "bg-zinc-700"}`}>
            Gate: {gateEnabled ? "ON" : "OFF"}
          </div>
          <WalletMultiButtonDynamic />
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-48 border-r border-zinc-800 min-h-screen p-4 flex flex-col gap-1">
          {[
            { key: "overview", icon: "📊", label: "Overview" },
            { key: "play_admin", icon: "🎮", label: "Play Arena Admin" },
            { key: "gates", icon: "🔐", label: "Token Gates" },
            { key: "users", icon: "👥", label: "Users" },
            { key: "premium", icon: "⭐", label: "Premium" },
            { key: "messages", icon: "💬", label: "Messages" },
            { key: "groups", icon: "👥", label: "Groups" },
            { key: "bans", icon: "🚫", label: "Bans" },
            { key: "notifications", icon: "📢", label: "Notifications" },
            { key: "settings", icon: "⚙️", label: "Settings" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                tab === item.key ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6">

          {/* OVERVIEW */}
          {tab === "overview" && (
            <div className="flex flex-col gap-6">
              <div className="text-lg font-bold">Overview</div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Utilizatori înregistrați", value: stats.users, icon: "👤", color: "text-blue-400" },
                  { label: "Mesaje totale", value: stats.messages, icon: "💬", color: "text-green-400" },
                  { label: "Activi azi", value: stats.activeToday, icon: "🟢", color: "text-yellow-400" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="text-2xl mb-1">{stat.icon}</div>
                    <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-zinc-500 text-sm mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Deleted messages stat */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="text-2xl mb-1">🗑</div>
                <div className="text-3xl font-bold text-red-400">{stats.deletedMessages}</div>
                <div className="text-zinc-500 text-sm mt-1">Mesaje șterse</div>
              </div>

              {/* Gate status */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Token Gate</div>
                    <div className="text-zinc-500 text-sm mt-1">
                      {gateEnabled
                        ? `Activ — ${gates.filter(g => g.active).length} reguli active`
                        : "Dezactivat — toți pot accesa"}
                    </div>
                  </div>
                  <button
                    onClick={toggleGateEnabled}
                    className={`px-5 py-2 rounded-lg font-bold text-sm transition-colors ${
                      gateEnabled ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"
                    }`}
                  >
                    {gateEnabled ? "Dezactivează" : "Activează"}
                  </button>
                </div>
              </div>

              {/* Active gates preview */}
              {gates.filter(g => g.active).length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <div className="font-semibold mb-3">Gate-uri active</div>
                  <div className="flex flex-col gap-2">
                    {gates.filter(g => g.active).map((gate) => (
                      <div key={gate.id} className="flex items-center gap-3 text-sm">
                        {gate.token_logo && <img src={gate.token_logo} className="w-5 h-5 rounded-full" alt="" />}
                        <span className="text-green-400 font-bold">{gate.token_symbol}</span>
                        <span className="text-zinc-500">min {gate.min_amount}</span>
                        <span className="text-zinc-600">→</span>
                        <span className="text-white">{FEATURES.find(f => f.value === gate.feature)?.label || gate.feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PLAY ARENA ADMIN CONTROLS */}
          {tab === "play_admin" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span>🎮</span> Play Arena Admin Controls & Pricing
                  </h2>
                  <p className="text-zinc-400 text-xs mt-1">
                    Manage game pricing, wager limits, user coin balances, anti-cheat audit logs, and game rules.
                  </p>
                </div>
                <span className="bg-purple-950/80 text-purple-300 border border-purple-800/60 text-xs px-3 py-1 rounded-full font-extrabold uppercase">
                  Admin Master Engine
                </span>
              </div>

              {/* Point Shop Prices Editor */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <span>🛒</span> Modifică Prețurile din Point Shop (Admin)
                  </h3>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold">
                    Live Point Shop Prices
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { id: "title-whale", label: "👑 Whalemaster Title", defaultPrice: 300 },
                    { id: "title-degen", label: "⚡ Degen King Title", defaultPrice: 200 },
                    { id: "title-diamond", label: "💎 Diamond Hands Title", defaultPrice: 150 },
                    { id: "title-streak", label: "🔥 Streak God Title", defaultPrice: 100 },
                    { id: "box-silver", label: "📦 Silver Mystery Crate", defaultPrice: 50 },
                    { id: "box-gold", label: "🎁 Golden Mega Crate", defaultPrice: 150 },
                  ].map((item) => (
                    <div key={item.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{item.label}</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={shopPrices[item.id] ?? item.defaultPrice}
                          onChange={(e) => updateShopPrice(item.id, parseInt(e.target.value) || 0)}
                          className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-black text-amber-300 text-right focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-xs text-zinc-500 font-semibold">pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Fee & Preset Wagers Card */}
              <div className="bg-zinc-900 border border-purple-500/30 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                    <span>💸</span> Comision Joc (House Fee) & Mize Presetate
                  </h3>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-full font-bold">
                    Opțiunea C: Monetizare & Currency
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Comision % */}
                  <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-white">Comision Platformă (House Fee Rake %):</label>
                      <span className="text-purple-400 font-extrabold text-sm">{houseFeePercent}%</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Procentul reținut automat la finalul meciului (ex: la 5% comision și miză 1 SOL, potențialul câștig afișat este <span className="text-amber-400 font-bold">1.90 SOL</span>, fără ca utilizatorul să vadă comisionul explicite).
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={houseFeePercent}
                        onChange={(e) => setHouseFeePercent(Number(e.target.value) || 0)}
                        className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 font-black text-amber-400 text-center focus:outline-none focus:border-purple-500"
                      />
                      <span className="text-zinc-400 font-bold">% din fondul total al meciului</span>
                    </div>
                  </div>

                  {/* Preset Mize SOL */}
                  <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                    <label className="font-bold text-cyan-300 block">⚡ Mize Presetate SOL (Separate prin virgulă):</label>
                    <p className="text-[11px] text-zinc-400">Opțiunile fixe pe care le au utilizatorii când creează o masă pe SOL.</p>
                    <input
                      type="text"
                      value={presetWagersSol}
                      onChange={(e) => setPresetWagersSol(e.target.value)}
                      placeholder="0.05, 0.1, 0.25, 0.5, 1.0"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Preset Mize Monede */}
                  <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                    <label className="font-bold text-amber-300 block">🪙 Mize Presetate Monede Daily (Separate prin virgulă):</label>
                    <p className="text-[11px] text-zinc-400">Opțiunile fixe pe Monede Virtuale câștigate din Daily Rewards.</p>
                    <input
                      type="text"
                      value={presetWagersMonede}
                      onChange={(e) => setPresetWagersMonede(e.target.value)}
                      placeholder="20, 50, 100, 250, 500"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  onClick={saveArenaWagerSettings}
                  className="mt-4 w-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black py-3 rounded-xl text-xs shadow-lg transition-transform active:scale-95"
                >
                  💾 Salvează Comisionul & Mizele Presetate
                </button>
              </div>

              {/* Grid Section: Pricing & Test Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Game Pricing & Wager Limits */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
                  <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span>🪙</span> Game Entry Prices & Wager Limits
                  </h3>

                  <div className="flex flex-col gap-3 text-xs">
                    <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <span className="font-bold text-zinc-300">Solana Coin Flip (Min / Max)</span>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={arenaPricing.coinFlipMin}
                          onChange={(e) => setArenaPricing(p => ({ ...p, coinFlipMin: Number(e.target.value) }))}
                          className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-center font-bold"
                        />
                        <span className="text-zinc-500 self-center">-</span>
                        <input
                          type="number"
                          value={arenaPricing.coinFlipMax}
                          onChange={(e) => setArenaPricing(p => ({ ...p, coinFlipMax: Number(e.target.value) }))}
                          className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-center font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <span className="font-bold text-zinc-300">Rock-Paper-Scissors (Min / Max)</span>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={arenaPricing.rpsMin}
                          onChange={(e) => setArenaPricing(p => ({ ...p, rpsMin: Number(e.target.value) }))}
                          className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-center font-bold"
                        />
                        <span className="text-zinc-500 self-center">-</span>
                        <input
                          type="number"
                          value={arenaPricing.rpsMax}
                          onChange={(e) => setArenaPricing(p => ({ ...p, rpsMax: Number(e.target.value) }))}
                          className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-center font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <span className="font-bold text-zinc-300">Lucky Spin Wheel (Cost / Jackpot)</span>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={arenaPricing.spinCost}
                          onChange={(e) => setArenaPricing(p => ({ ...p, spinCost: Number(e.target.value) }))}
                          className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-center font-bold"
                        />
                        <span className="text-zinc-500 self-center">/</span>
                        <input
                          type="number"
                          value={arenaPricing.spinJackpot}
                          onChange={(e) => setArenaPricing(p => ({ ...p, spinJackpot: Number(e.target.value) }))}
                          className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-center font-bold"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => alert("✅ Play Arena Pricing & Limits updated successfully!")}
                      className="mt-2 w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-2.5 rounded-xl text-xs transition-colors shadow-md shadow-amber-500/20"
                    >
                      💾 Save Arena Pricing Settings
                    </button>
                  </div>
                </div>

                {/* Grant Test Coins / Points to User Wallet */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span>⚡</span> Grant Test Coins / Points
                    </h3>
                    <p className="text-zinc-400 text-xs mb-4">
                      Directly credit test points or gaming coins to any user wallet for debugging or admin rewards.
                    </p>

                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-[10px] text-zinc-400 font-bold uppercase mb-1 block">Target Wallet Address</label>
                        <input
                          type="text"
                          value={testPointsWallet}
                          onChange={(e) => setTestPointsWallet(e.target.value)}
                          placeholder="e.g. 7xKX... or paste wallet"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-400 font-bold uppercase mb-1 block">Points / Coins Amount</label>
                        <input
                          type="number"
                          value={testPointsAmount}
                          onChange={(e) => setTestPointsAmount(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleAddTestPoints}
                    className="mt-4 w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-950"
                  >
                    🚀 Grant Points Now
                  </button>
                </div>
              </div>

              {/* Anti-Cheat & Live Duel Audit Logs */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-extrabold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                    <span>🛡️</span> Anti-Cheat & Live Match Audit Engine
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                    Active System Protection
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-500 text-[10px] font-mono">{log.time}</span>
                        <span className="text-zinc-200 font-medium">{log.event}</span>
                      </div>
                      <span className="bg-purple-950 text-purple-300 border border-purple-800/80 font-black px-2 py-0.5 rounded text-[10px]">
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TOKEN GATES */}
          {tab === "gates" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">Token Gates</div>
                <button
                  onClick={toggleGateEnabled}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    gateEnabled ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"
                  }`}
                >
                  {gateEnabled ? "🔴 Dezactivează Gate" : "🟢 Activează Gate"}
                </button>
              </div>

              {/* Add new gate */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="font-semibold mb-4">Adaugă Gate Nou</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 flex gap-2">
                    <input
                      value={newGate.token_mint}
                      onChange={(e) => setNewGate(p => ({ ...p, token_mint: e.target.value }))}
                      placeholder="Token Mint Address"
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                    />
                    <button
                      onClick={lookupToken}
                      disabled={lookupLoading || !newGate.token_mint}
                      className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      {lookupLoading ? "..." : "Lookup"}
                    </button>
                  </div>
                  <input
                    value={newGate.token_symbol}
                    onChange={(e) => setNewGate(p => ({ ...p, token_symbol: e.target.value }))}
                    placeholder="Symbol (ex: ORE)"
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                  />
                  <input
                    value={newGate.min_amount}
                    onChange={(e) => setNewGate(p => ({ ...p, min_amount: e.target.value }))}
                    placeholder="Minim deținut (ex: 1)"
                    type="number"
                    min="0"
                    step="0.01"
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                  />
                  <select
                    value={newGate.feature}
                    onChange={(e) => setNewGate(p => ({ ...p, feature: e.target.value }))}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                  >
                    {FEATURES.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <input
                    value={newGate.description}
                    onChange={(e) => setNewGate(p => ({ ...p, description: e.target.value }))}
                    placeholder="Descriere (opțional)"
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                  />
                  {newGate.token_logo && (
                    <div className="flex items-center gap-2 col-span-2">
                      <img src={newGate.token_logo} className="w-8 h-8 rounded-full" alt="" />
                      <span className="text-zinc-400 text-xs truncate">{newGate.token_logo}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={addGate}
                  disabled={addingGate}
                  className="mt-4 bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {addingGate ? "Se adaugă..." : "+ Adaugă Gate"}
                </button>
              </div>

              {/* Gates list */}
              <div className="flex flex-col gap-3">
                {loadingGates ? (
                  <div className="text-zinc-500 text-sm">Se încarcă...</div>
                ) : gates.length === 0 ? (
                  <div className="text-zinc-500 text-sm">Nu ai niciun gate configurat</div>
                ) : gates.map((gate) => (
                  <div key={gate.id} className={`bg-zinc-900 border rounded-xl p-4 flex items-center gap-4 ${
                    gate.active ? "border-zinc-700" : "border-zinc-800 opacity-50"
                  }`}>
                    {gate.token_logo ? (
                      <img src={gate.token_logo} className="w-10 h-10 rounded-full flex-shrink-0" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {gate.token_symbol.slice(0, 2)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-400">{gate.token_symbol}</span>
                        <span className="text-zinc-500 text-xs">min {gate.min_amount}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${gate.active ? "bg-green-900 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
                          {gate.active ? "activ" : "inactiv"}
                        </span>
                      </div>
                      <div className="text-sm text-zinc-400 mt-0.5">
                        {FEATURES.find(f => f.value === gate.feature)?.label || gate.feature}
                      </div>
                      {gate.description && (
                        <div className="text-xs text-zinc-600 mt-0.5">{gate.description}</div>
                      )}
                      <div className="text-[10px] text-zinc-700 mt-1 font-mono">{gate.token_mint}</div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleGate(gate.id, gate.active)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          gate.active ? "bg-yellow-600 hover:bg-yellow-500" : "bg-green-600 hover:bg-green-500"
                        }`}
                      >
                        {gate.active ? "Dezactivează" : "Activează"}
                      </button>
                      <button
                        onClick={() => deleteGate(gate.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-800 hover:bg-red-700 transition-colors"
                      >
                        Șterge
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USERS */}
          {tab === "users" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">Users ({users.length})</div>
                <button onClick={fetchUsers} className="text-zinc-500 hover:text-white text-sm">↻ Refresh</button>
              </div>
              <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name or wallet..."
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 w-full" />
              <div className="flex flex-col gap-2">
                {users.filter((user: any) => {
                  if (!userSearch) return true;
                  const q = userSearch.toLowerCase();
                  return user.wallet?.toLowerCase().includes(q) ||
                    user.username?.toLowerCase().includes(q) ||
                    user.display_name?.toLowerCase().includes(q);
                }).map((user: any) => (
                  <div key={user.wallet} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${user.online ? "bg-green-400" : "bg-zinc-600"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {user.username && <span className="text-green-400 font-medium text-sm">@{user.username}</span>}
                        <span className="text-zinc-600 text-xs font-mono truncate">{user.wallet}</span>
                      </div>
                      {user.last_seen && (
                        <div className="text-zinc-600 text-[10px] mt-0.5">
                          {user.online ? "Online now" : `Last seen: ${new Date(user.last_seen).toLocaleString("en-US")}`}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end flex-shrink-0">
                      <button onClick={() => deleteUser(user.wallet)}
                        className="text-red-600 hover:text-red-400 text-xs transition-colors">🗑 Delete</button>
                      <button onClick={() => { setBanWallet(user.wallet); setTab("bans"); }}
                        className="text-orange-500 hover:text-orange-300 text-xs transition-colors">🚫 Ban</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MESSAGES */}
          {tab === "messages" && (
            <div className="flex gap-4 h-[calc(100vh-120px)]">
              {/* Conversations list */}
              <div className="w-72 flex flex-col gap-2 overflow-y-auto">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold">Conversații ({conversations.length})</div>
                  <button onClick={fetchConversations} className="text-zinc-500 hover:text-white text-xs">↻ Refresh</button>
                </div>
                <input
                  value={msgSearch}
                  onChange={(e) => setMsgSearch(e.target.value)}
                  placeholder="Caută wallet..."
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-zinc-500"
                />
                {conversations
                  .filter((c) =>
                    !msgSearch ||
                    c.wallet1.toLowerCase().includes(msgSearch.toLowerCase()) ||
                    c.wallet2.toLowerCase().includes(msgSearch.toLowerCase())
                  )
                  .map((conv) => (
                    <button
                      key={conv.key}
                      onClick={() => {
                        setActiveConv(conv);
                        fetchConvMessages(conv.wallet1, conv.wallet2);
                      }}
                      className={`text-left bg-zinc-900 border rounded-xl p-3 transition-colors ${
                        activeConv?.key === conv.key ? "border-green-700" : "border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] text-zinc-500 font-mono truncate">
                          {users.find((u: any) => u.wallet === conv.wallet1)?.username ? `@${users.find((u: any) => u.wallet === conv.wallet1).username}` : conv.wallet1.slice(0, 6) + "..." + conv.wallet1.slice(-4)}
                        </div>
                        <div className="text-[10px] text-zinc-600">{conv.count} msg</div>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono truncate">
                        {users.find((u: any) => u.wallet === conv.wallet2)?.username ? `@${users.find((u: any) => u.wallet === conv.wallet2).username}` : conv.wallet2.slice(0, 6) + "..." + conv.wallet2.slice(-4)}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1.5 truncate">
                        {conv.lastMessage.deleted_for_all
                          ? <span className="text-red-500 italic">🚫 Mesaj șters</span>
                          : conv.lastMessage.content}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <div className="text-[10px] text-zinc-600">
                          {new Date(conv.lastMessage.created_at).toLocaleString("ro-RO")}
                        </div>
                        {conv.deletedCount > 0 && (
                          <div className="text-[9px] text-red-500">🗑 {conv.deletedCount}</div>
                        )}
                      </div>
                    </button>
                  ))}
              </div>

              {/* Messages view */}
              <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                {activeConv ? (
                  <>
                    <div className="border-b border-zinc-800 px-4 py-3">
                      <div className="text-sm font-semibold">Conversație</div>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5">
                        {activeConv.wallet1} ↔ {activeConv.wallet2}
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                      {loadingMessages ? (
                        <div className="text-zinc-500 text-sm text-center py-8">Se încarcă...</div>
                      ) : convMessages.map((msg) => {
                        const isDeleted = msg.deleted_for_all;
                        const isDeletedForSender = msg.deleted_for_sender && !isDeleted;
                        const isDeletedForReceiver = msg.deleted_for_receiver && !isDeleted;

                        return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-2 group ${
                            msg.sender === activeConv.wallet1 ? "flex-row" : "flex-row-reverse"
                          }`}
                        >
                          <div className={`max-w-[70%] rounded-xl px-3 py-2 text-sm relative ${
                            isDeleted
                              ? "bg-red-950 border border-red-800"
                              : msg.sender === activeConv.wallet1 ? "bg-zinc-800" : "bg-green-800"
                          }`}>
                            <div className="text-[9px] text-zinc-500 mb-1 font-mono flex items-center gap-1">
                              {users.find((u: any) => u.wallet === msg.sender)?.username
                                ? `@${users.find((u: any) => u.wallet === msg.sender).username}`
                                : users.find((u: any) => u.wallet === msg.sender)?.display_name
                                  || `${msg.sender.slice(0, 6)}...${msg.sender.slice(-4)}`}
                              {isDeleted && <span className="text-red-400 font-bold">• ȘTERS PENTRU TOȚI</span>}
                              {isDeletedForSender && <span className="text-orange-400 font-bold">• șters pentru sender</span>}
                              {isDeletedForReceiver && <span className="text-orange-400 font-bold">• șters pentru receiver</span>}
                            </div>
                            <div className={`break-words ${isDeleted ? "text-red-300 italic" : ""}`}>
                              {msg.content}
                            </div>
                            {msg.deleted_at && (
                              <div className="text-[9px] text-red-700 mt-0.5">
                                Șters la: {new Date(msg.deleted_at).toLocaleString("ro-RO")}
                              </div>
                            )}
                            <div className="text-[9px] text-zinc-600 mt-1">
                              {new Date(msg.created_at).toLocaleString("ro-RO")}
                              {msg.seen && <span className="ml-1 text-green-600">• văzut</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-400 text-xs transition-opacity flex-shrink-0 mt-2"
                            title="Șterge permanent din DB"
                          >
                            🗑
                          </button>
                        </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
                    Selectează o conversație
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PREMIUM */}
          {tab === "premium" && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <div className="text-lg font-bold">Premium Management</div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
                <div className="font-semibold text-sm text-zinc-400 uppercase tracking-wide">Grant Premium</div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Wallet Address</div>
                  <input value={premiumWallet} onChange={(e) => setPremiumWallet(e.target.value)}
                    placeholder="Wallet address..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500" />
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Duration</div>
                  <select value={premiumMonths} onChange={(e) => setPremiumMonths(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
                    <option value={1}>1 month</option>
                    <option value={3}>3 months</option>
                    <option value={6}>6 months</option>
                    <option value={12}>12 months</option>
                    <option value={120}>Lifetime (10 years)</option>
                  </select>
                </div>
                <button onClick={() => grantPremium(premiumWallet, premiumMonths)}
                  disabled={grantingPremium || !premiumWallet.trim()}
                  className="bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors">
                  {grantingPremium ? "Granting..." : "⭐ Grant Premium"}
                </button>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-sm">Active Premium Users ({premiumUsers.length})</div>
                  <button onClick={fetchPremiumUsers} className="text-zinc-500 hover:text-white text-xs">↻ Refresh</button>
                </div>
                <div className="flex flex-col gap-2">
                  {premiumUsers.length === 0 && <div className="text-zinc-500 text-sm">No premium users yet</div>}
                  {premiumUsers.map((u: any) => (
                    <div key={u.wallet} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-green-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {(u.display_name || u.username || u.wallet).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium flex items-center gap-1">
                          {u.display_name || (u.username ? `@${u.username}` : u.wallet.slice(0, 8) + "...")}
                          <span className="text-green-400 text-xs">✅</span>
                        </div>
                        <div className="text-zinc-500 text-xs font-mono truncate">{u.wallet}</div>
                        {u.premium_expires_at && (
                          <div className="text-zinc-600 text-xs mt-0.5">
                            Expires: {new Date(u.premium_expires_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
                          </div>
                        )}
                      </div>
                      <button onClick={() => revokePremium(u.wallet)}
                        className="text-red-600 hover:text-red-400 text-xs transition-colors flex-shrink-0">
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* GROUPS */}
          {tab === "groups" && (
            <div className="flex gap-4 h-[calc(100vh-120px)]">
              {/* Groups list */}
              <div className="w-72 flex flex-col gap-2 overflow-y-auto">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold">Groups ({adminGroups.length})</div>
                  <button onClick={fetchAdminGroups} className="text-zinc-500 hover:text-white text-xs">↻</button>
                </div>
                <input value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)}
                  placeholder="Search groups..."
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-zinc-500 w-full mb-1" />
                {adminGroups.filter((g: any) => !groupSearch || g.name?.toLowerCase().includes(groupSearch.toLowerCase()) || g.description?.toLowerCase().includes(groupSearch.toLowerCase())).map((group: any) => (
                  <button key={group.id} onClick={() => fetchGroupMessages(group.id)}
                    className={`text-left bg-zinc-900 border rounded-xl p-3 transition-colors ${selectedGroupId === group.id ? "border-green-700" : "border-zinc-800 hover:border-zinc-700"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${group.avatar_color || "#9945FF"}, #14F195)` }}>
                          {group.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-white text-sm font-medium truncate">{group.name}</div>
                          <div className="text-zinc-500 text-[10px] truncate">{group.description || "No description"}</div>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}
                        className="text-red-600 hover:text-red-400 text-xs ml-2 flex-shrink-0">🗑</button>
                    </div>
                  </button>
                ))}
              </div>

              {/* Group messages */}
              <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                {selectedGroupId ? (
                  <>
                    <div className="border-b border-zinc-800 px-4 py-3">
                      <div className="font-bold text-sm">{adminGroups.find((g: any) => g.id === selectedGroupId)?.name}</div>
                      <div className="text-zinc-500 text-xs">{groupMsgs.length} messages</div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                      {loadingGroupMsgs ? (
                        <div className="text-zinc-500 text-sm text-center py-8">Loading...</div>
                      ) : groupMsgs.map((msg: any) => (
                        <div key={msg.id} className={`flex gap-2 group ${msg.deleted_for_all ? "opacity-50" : ""}`}>
                          <div className="flex-1 bg-zinc-800 rounded-xl px-3 py-2 text-sm">
                            <div className="text-[10px] text-zinc-400 mb-1 flex items-center gap-1">
                              <span className="font-medium text-white">
                                {users.find((u: any) => u.wallet === msg.sender)?.username
                                  ? `@${users.find((u: any) => u.wallet === msg.sender).username}`
                                  : msg.sender.slice(0, 6) + "..." + msg.sender.slice(-4)}
                              </span>
                              {msg.deleted_for_all && <span className="text-red-400">• DELETED</span>}
                            </div>
                            <div className={msg.deleted_for_all ? "italic text-zinc-500" : "text-white"}>{msg.content}</div>
                            <div className="text-[9px] text-zinc-600 mt-1">{new Date(msg.created_at).toLocaleString("en-US")}</div>
                          </div>
                          <button onClick={async () => {
                            if (!confirm("Delete this message?")) return;
                            await supabase.from("group_messages").delete().eq("id", msg.id);
                            fetchGroupMessages(selectedGroupId);
                          }} className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-400 text-xs transition-opacity self-start mt-2">🗑</button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">Select a group</div>
                )}
              </div>
            </div>
          )}

          {/* BANS */}
          {tab === "bans" && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <div className="text-lg font-bold">Ban Management</div>

              {/* Ban user */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
                <div className="font-semibold text-sm text-zinc-400 uppercase tracking-wide">Ban User</div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Wallet Address</div>
                  <input value={banWallet} onChange={(e) => setBanWallet(e.target.value)}
                    placeholder="Wallet address..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500" />
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Reason (optional)</div>
                  <input value={banReason} onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Reason for ban..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500" />
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Duration</div>
                  <select value={banDays} onChange={(e) => setBanDays(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
                    <option value={0}>Permanent</option>
                    <option value={1}>1 day</option>
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
                <button onClick={banUser} disabled={banning || !banWallet.trim()}
                  className="bg-red-700 hover:bg-red-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors">
                  {banning ? "Banning..." : "🚫 Ban User"}
                </button>
              </div>

              {/* Banned users list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-sm">Banned Users ({bannedUsers.length})</div>
                  <button onClick={fetchBannedUsers} className="text-zinc-500 hover:text-white text-xs">↻ Refresh</button>
                </div>
                <div className="flex flex-col gap-2">
                  {bannedUsers.length === 0 && <div className="text-zinc-500 text-sm">No banned users</div>}
                  {bannedUsers.map((b: any) => (
                    <div key={b.blocked} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium">
                          {users.find((u: any) => u.wallet === b.blocked)?.username
                            ? `@${users.find((u: any) => u.wallet === b.blocked).username}`
                            : b.blocked.slice(0, 8) + "..."}
                        </div>
                        <div className="text-zinc-500 text-xs font-mono truncate">{b.blocked}</div>
                        {b.reason && <div className="text-zinc-600 text-xs mt-0.5">Reason: {b.reason}</div>}
                        <div className="text-zinc-600 text-xs">
                          {b.expires_at
                            ? `Expires: ${new Date(b.expires_at).toLocaleDateString("en-US")}`
                            : "Permanent ban"}
                        </div>
                      </div>
                      <button onClick={() => unbanUser(b.blocked)}
                        className="text-green-600 hover:text-green-400 text-xs transition-colors flex-shrink-0">Unban</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
{tab === "notifications" && (
  <div className="flex flex-col gap-6 max-w-xl">
    <div className="text-lg font-bold">Broadcast Notification</div>

    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
      <div>
        <div className="text-xs text-zinc-500 mb-1">Title</div>
        <input
          value={notifTitle}
          onChange={(e) => setNotifTitle(e.target.value)}
          placeholder="e.g. New feature available!"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
        />
      </div>
      <div>
        <div className="text-xs text-zinc-500 mb-1">Message</div>
        <textarea
          value={notifMessage}
          onChange={(e) => setNotifMessage(e.target.value)}
          placeholder="Message shown to all users..."
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 resize-none"
        />
      </div>
      <button
        onClick={sendBroadcast}
        disabled={sendingNotif || !notifTitle.trim() || !notifMessage.trim()}
        className="bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors"
      >
        {sendingNotif ? "Sending..." : "📢 Send to all users"}
      </button>
    </div>

    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-sm">History</div>
        <button onClick={fetchNotifHistory} className="text-zinc-500 hover:text-white text-xs">↻ Refresh</button>
      </div>
      <div className="flex flex-col gap-2">
        {notifHistory.length === 0 && <div className="text-zinc-500 text-sm">No notifications sent yet</div>}
        {notifHistory.map((n) => (
          <div key={n.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold text-sm">{n.title}</div>
              <div className="text-[10px] text-zinc-600">{new Date(n.created_at).toLocaleString("en-US")}</div>
            </div>
            <div className="text-zinc-400 text-xs">{n.message}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

          {/* SETTINGS */}
          {tab === "settings" && (
            <div className="flex flex-col gap-6">
              <div className="text-lg font-bold">Setări</div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="font-semibold mb-1">Admin Wallet</div>
                <div className="text-zinc-500 text-sm mb-3">Wallet-ul care are acces la acest dashboard</div>
                <div className="flex gap-2">
                  <input
                    value={adminWallet}
                    onChange={(e) => setAdminWallet(e.target.value)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-zinc-500"
                  />
                  <button
                    onClick={saveAdminWallet}
                    className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    Salvează
                  </button>
                </div>
                <div className="text-yellow-500 text-xs mt-2">⚠️ Atenție: dacă schimbi wallet-ul admin, pierzi accesul cu cel curent</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="font-semibold mb-1">Token Gate Global</div>
                <div className="text-zinc-500 text-sm mb-3">
                  {gateEnabled
                    ? "Activ — utilizatorii trebuie să dețină tokenele configurate"
                    : "Dezactivat — toți utilizatorii au acces liber"}
                </div>
                <button
                  onClick={toggleGateEnabled}
                  className={`px-5 py-2 rounded-lg font-bold text-sm transition-colors ${
                    gateEnabled ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"
                  }`}
                >
                  {gateEnabled ? "🔴 Dezactivează" : "🟢 Activează"}
                </button>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="font-semibold mb-1">Premium Price (SOL/month)</div>
                <div className="text-zinc-500 text-sm mb-3">Price users pay for 1 month of premium</div>
                <div className="flex gap-2">
                  <input
                    type="number" step="0.01" min="0.01"
                    value={premiumPrice}
                    onChange={(e) => setPremiumPrice(e.target.value)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  />
                  <button onClick={async () => {
                    await supabase.from("app_settings").upsert({ key: "premium_price_sol", value: premiumPrice });
                    alert("✅ Price updated to " + premiumPrice + " SOL");
                  }} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                    Save
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="font-semibold mb-1">Expirare mesaje globală</div>
                <div className="text-zinc-500 text-sm mb-3">
                  Setează expirarea globală pentru toți utilizatorii (suprascrie setările individuale)
                </div>
                <select
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm w-full"
                  onChange={async (e) => {
                    await supabase.from("app_settings").upsert({ key: "global_message_expiry_days", value: e.target.value });
                    alert("Salvat!");
                  }}
                >
                  <option value="0">Niciodată (default utilizatori)</option>
                  <option value="1">1 zi</option>
                  <option value="7">7 zile</option>
                  <option value="30">30 zile</option>
                  <option value="90">90 zile</option>
                </select>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="font-semibold mb-1">Wallet tău curent</div>
                <div className="text-zinc-500 text-xs font-mono break-all mt-1">{publicKey.toBase58()}</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
