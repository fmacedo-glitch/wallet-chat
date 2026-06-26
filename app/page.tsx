"use client";

import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState, useRef } from "react";

import { supabase } from "../lib/supabase";
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

// ── Avatar ────────────────────────────────────────────────────────────────────
function walletToColors(wallet: string): [string, string] {
  let h1 = 0, h2 = 0;
  for (let i = 0; i < wallet.length; i++) {
    h1 = (h1 * 31 + wallet.charCodeAt(i)) & 0xffff;
    h2 = (h2 * 37 + wallet.charCodeAt(wallet.length - 1 - i)) & 0xffff;
  }
  const hue1 = h1 % 360;
  const hue2 = (hue1 + 60 + (h2 % 60)) % 360;
  return [`hsl(${hue1},70%,55%)`, `hsl(${hue2},70%,40%)`];
}

function Avatar({ wallet, profile, size = 36 }: { wallet: string; profile?: any; size?: number }) {
  const [c1, c2] = walletToColors(wallet);
  const initials = profile?.username ? profile.username.slice(0, 2).toUpperCase() : wallet.slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "#fff",
      flexShrink: 0, userSelect: "none",
    }}>{initials}</div>
  );
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-zinc-800 rounded-xl w-fit">
      {[0, 1, 2].map((i) => (
        <div key={i} className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }} />
      ))}
    </div>
  );
}

// ── Emoji Picker ──────────────────────────────────────────────────────────────
const EMOJI_CATEGORIES = [
  { label: "😀", emojis: ["😀","😂","😍","🥰","😎","🤔","😅","🥺","😭","😡","🤩","🥳","😴","🤯","🫡","❤️","🔥","✅","👍","👎","🙏","💪","🎉","💯","⭐","🚀","💎","🌙","☀️","🌈"] },
  { label: "🐶", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🦋","🐝","🦄","🦊","🐺"] },
  { label: "🍕", emojis: ["🍕","🍔","🌮","🌯","🍜","🍣","🍩","🍪","🎂","🍫","🍬","🍭","☕","🧃","🍺","🥂","🍾","🎁","🎈","🎮"] },
];

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const [cat, setCat] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-full mb-2 left-0 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-xl z-50 w-72">
      <div className="flex gap-1 mb-2">
        {EMOJI_CATEGORIES.map((c, i) => (
          <button key={i} onClick={() => setCat(i)}
            className={`px-2 py-1 rounded text-sm ${cat === i ? "bg-zinc-700" : "hover:bg-zinc-800"}`}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1">
        {EMOJI_CATEGORIES[cat].emojis.map((e) => (
          <button key={e} onClick={() => onSelect(e)}
            className="text-lg hover:bg-zinc-800 rounded p-0.5 transition-colors">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { publicKey, sendTransaction } = useWallet();

  // Send SOL
  const [showSendSol, setShowSendSol] = useState(false);
  const [solAmount, setSolAmount] = useState("");
  const [sendingSol, setSendingSol] = useState(false);
  const [walletTokens, setWalletTokens] = useState<any[]>([]);
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // NFTs
  const [showNFTs, setShowNFTs] = useState(false);
  const [nftTab, setNftTab] = useState<"nfts" | "tokens">("nfts");
  const [nfts, setNfts] = useState<any[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [nftWallet, setNftWallet] = useState("");
  const [otherTokens, setOtherTokens] = useState<any[]>([]);
  const [loadingOtherTokens, setLoadingOtherTokens] = useState(false);

  // Gate
  const [gateEnabled, setGateEnabled] = useState(false);
  const [gateAccess, setGateAccess] = useState<"checking" | "allowed" | "denied">("checking");
  const [missingTokens, setMissingTokens] = useState<any[]>([]);

  // Message expiry + delete
  const [messageExpiryDays, setMessageExpiryDays] = useState(0);
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);

  // Emoji + reactions
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactions, setReactions] = useState<any>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);

  // Message selection + delete
  const [selectedMsgs, setSelectedMsgs] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<"me" | "all" | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);

  // Notifications
const [notifications, setNotifications] = useState<any[]>([]);
const [activeNotif, setActiveNotif] = useState<any>(null);

// Status
const [myStatus, setMyStatus] = useState("online");
const [myStatusText, setMyStatusText] = useState("");
const [showStatusPicker, setShowStatusPicker] = useState(false);

// Search
const [searchQuery, setSearchQuery] = useState("");
const [showSearch, setShowSearch] = useState(false);

// Context menu + reply
const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null);
const [replyTo, setReplyTo] = useState<any>(null);

// Mobile
const [showSidebar, setShowSidebar] = useState(false);

  const [receiver, setReceiver] = useState("");
  const [message, setMessage] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState("");
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [blockedByUsers, setBlockedByUsers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any>({});
  const [inboxMessages, setInboxMessages] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState("");
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<any>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [otherIsTyping, setOtherIsTyping] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeChatRef = useRef(activeChat);
  const chatMessagesRef = useRef(chatMessages);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);

  useEffect(() => {
    if (publicKey && activeChat) loadConversation(activeChat);
  }, [publicKey]);

  // Auto-resize textarea
  function autoResize() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }

  function formatInboxTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
    if (diffDays < 7) return date.toLocaleDateString("ro-RO", { weekday: "short" });
    return date.toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
  }

  function isOnline(wallet: string) { return onlineUsers.has(wallet); }

  async function updatePresence() {
    if (!publicKey) return;
    await supabase.from("presence").upsert({ wallet: publicKey.toBase58(), last_seen: new Date().toISOString() });
  }

  async function fetchPresence() {
    const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data } = await supabase.from("presence").select("wallet").gte("last_seen", cutoff);
    setOnlineUsers(new Set(data?.map((r: any) => r.wallet) || []));
  }

  async function pollLastMessageSeen() {
    if (!publicKey || !activeChatRef.current) return;
    const lastMine = [...chatMessagesRef.current].reverse().find(
      (m: any) => m.sender === publicKey.toBase58() && !m.seen
    );
    if (!lastMine) {
      if (seenPollingRef.current) { clearInterval(seenPollingRef.current); seenPollingRef.current = null; }
      return;
    }
    const { data } = await supabase.from("messages").select("id, seen").eq("id", lastMine.id).single();
    if (data?.seen) {
      setChatMessages((prev) => prev.map((m: any) =>
        m.sender === publicKey.toBase58() && m.receiver === activeChatRef.current ? { ...m, seen: true } : m
      ));
      if (seenPollingRef.current) { clearInterval(seenPollingRef.current); seenPollingRef.current = null; }
    }
  }

  async function sendTyping(isTyping: boolean) {
    if (!publicKey || !activeChatRef.current) return;
    if (isTyping) {
      await supabase.from("typing").upsert({ wallet: publicKey.toBase58(), receiver: activeChatRef.current, updated_at: new Date().toISOString() });
    } else {
      await supabase.from("typing").delete().eq("wallet", publicKey.toBase58());
    }
  }

  function handleMessageInput(val: string) {
    setMessage(val);
    sendTyping(true);
    if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
    myTypingTimeoutRef.current = setTimeout(() => sendTyping(false), 2000);
    setTimeout(autoResize, 0);
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  useEffect(() => {
    if (chatMessages.length > 0) scrollToBottom("smooth");
    if (!publicKey) return;
    const hasUnseenSent = chatMessages.some((m: any) => m.sender === publicKey.toBase58() && !m.seen);
    if (hasUnseenSent && !seenPollingRef.current) {
      seenPollingRef.current = setInterval(pollLastMessageSeen, 2000);
    }
  }, [chatMessages]);

  // ── Message selection ─────────────────────────────────────────────────────
  function toggleSelectMsg(msgId: string) {
    setSelectedMsgs((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }

  function clearSelection() {
    setSelectedMsgs(new Set());
    setSelectionMode(false);
  }

  function copyMessage(content: string) {
  navigator.clipboard.writeText(content);
  setContextMenu(null);
}

  async function deleteSelected(mode: "me" | "all") {
    if (!publicKey) return;
    const ids = Array.from(selectedMsgs);
    for (const msgId of ids) {
      if (mode === "all") {
        await supabase.from("messages").update({ deleted_for_all: true, deleted_at: new Date().toISOString() }).eq("id", msgId);
        setChatMessages((prev: any[]) => prev.map((m: any) => m.id === msgId ? { ...m, deleted_for_all: true } : m));
      } else {
        const msg = chatMessages.find((m: any) => m.id === msgId);
        if (!msg) continue;
        const field = msg.sender === publicKey.toBase58() ? "deleted_for_sender" : "deleted_for_receiver";
        await supabase.from("messages").update({ [field]: true, deleted_at: new Date().toISOString() }).eq("id", msgId);
        setChatMessages((prev: any[]) => prev.filter((m: any) => m.id !== msgId));
      }
    }
    clearSelection();
    setShowDeleteConfirm(null);
  }

  // ── Reactions ──────────────────────────────────────────────────────────────
  async function fetchReactions(messageIds: string[]) {
    if (!messageIds.length) return;
    const { data } = await supabase.from("reactions").select("*").in("message_id", messageIds);
    const map: any = {};
    data?.forEach((r: any) => {
      if (!map[r.message_id]) map[r.message_id] = {};
      if (!map[r.message_id][r.emoji]) map[r.message_id][r.emoji] = [];
      map[r.message_id][r.emoji].push(r.wallet);
    });
    setReactions(map);
  }

  async function toggleReaction(msgId: string, emoji: string) {
    if (!publicKey) return;
    const me = publicKey.toBase58();
    const existing = reactions[msgId]?.[emoji]?.includes(me);
    if (existing) {
      await supabase.from("reactions").delete().eq("message_id", msgId).eq("wallet", me).eq("emoji", emoji);
    } else {
      await supabase.from("reactions").upsert({ message_id: msgId, wallet: me, emoji });
    }
    fetchReactions([msgId]);
    setShowReactionPicker(null);
  }

  // ── Notifications ──────────────────────────────────────────────────────────
async function fetchNotifications() {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
  setNotifications(data || []);
  if (data && data.length > 0) {
    const lastSeen = localStorage.getItem("last_notif_seen");
    const newest = data[0];
    if (!lastSeen || new Date(newest.created_at) > new Date(lastSeen)) {
      setActiveNotif(newest);
    }
  }
}

function dismissNotif() {
  if (activeNotif) {
    localStorage.setItem("last_notif_seen", activeNotif.created_at);
    setActiveNotif(null);
  }
}

// ── Status ──────────────────────────────────────────────────────────────────
async function loadMyStatus() {
  if (!publicKey) return;
  const { data } = await supabase.from("profiles").select("status, status_text").eq("wallet", publicKey.toBase58()).single();
  if (data) { setMyStatus(data.status || "online"); setMyStatusText(data.status_text || ""); }
}

async function saveStatus(status: string, statusText: string) {
  if (!publicKey) return;
  setMyStatus(status); setMyStatusText(statusText); setShowStatusPicker(false);
  await supabase.from("profiles").upsert({ wallet: publicKey.toBase58(), status, status_text: statusText });
  fetchProfiles();
}

function getStatusEmoji(status: string) {
  if (status === "online") return "🟢";
  if (status === "away") return "🟡";
  if (status === "busy") return "🔴";
  return "⚫";
}

  // ── Profiles ───────────────────────────────────────────────────────────────
  async function fetchProfiles() {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) { console.error(error); return; }
    const map: any = {};
    data?.forEach((p) => { map[p.wallet] = p; });
    setProfiles(map);
  }

  function getDisplayName(wallet?: string) {
    if (!wallet) return "Unknown";
    const profile = profiles[wallet];
    if (profile?.username) return `@${profile.username}`;
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  }

  // ── Friends ────────────────────────────────────────────────────────────────
  async function addFriend(wallet: string) {
    if (!publicKey) return;
    const me = publicKey.toBase58();
    const { data } = await supabase.from("friends").select("*")
      .or(`and(sender.eq.${me},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${me})`).maybeSingle();
    if (data) return;
    await supabase.from("friends").insert({ sender: me, receiver: wallet, accepted: false });
    fetchFriends(); fetchFriendRequests();
  }

  async function unfriend(wallet: string) {
    if (!publicKey) return;
    await supabase.from("friends").delete()
      .or(`and(sender.eq.${publicKey.toBase58()},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${publicKey.toBase58()})`);
    fetchFriends();
  }

  async function fetchFriends() {
    if (!publicKey) return;
    const me = publicKey.toBase58();
    const { data } = await supabase.from("friends").select("*").eq("accepted", true).or(`sender.eq.${me},receiver.eq.${me}`);
    setFriends(data || []);
  }

  function isFriend(wallet: string) {
    const me = publicKey?.toBase58();
    return friends.some((f) => (f.sender === me && f.receiver === wallet) || (f.receiver === me && f.sender === wallet));
  }

  async function fetchFriendRequests() {
    if (!publicKey) return;
    const me = publicKey.toBase58();
    const { data } = await supabase.from("friends").select("*").eq("accepted", false).or(`sender.eq.${me},receiver.eq.${me}`);
    setFriendRequests(data || []);
  }

  async function acceptFriend(id: string) {
    await supabase.from("friends").update({ accepted: true }).eq("id", id);
    fetchFriends(); fetchFriendRequests();
  }

  async function rejectFriend(id: string) {
    await supabase.from("friends").delete().eq("id", id);
    fetchFriendRequests();
  }

  // ── Block ──────────────────────────────────────────────────────────────────
  async function fetchBlockedUsers() {
    if (!publicKey) return;
    const { data } = await supabase.from("blocked_users").select("*").eq("blocker", publicKey.toBase58());
    setBlockedUsers(data || []);
  }

  async function fetchBlockedByUsers() {
    if (!publicKey) return;
    const { data } = await supabase.from("blocked_users").select("*").eq("blocked", publicKey.toBase58());
    setBlockedByUsers(data || []);
  }

  function isBlocked(wallet: string) { return blockedUsers.some((b) => b.blocked === wallet); }
  function isBlockedByThem(wallet: string) { return blockedByUsers.some((b) => b.blocker === wallet); }

  async function blockUser(wallet: string) {
    if (!publicKey) return;
    const me = publicKey.toBase58();
    await supabase.from("friends").delete()
      .or(`and(sender.eq.${me},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${me})`);
    await supabase.from("blocked_users").insert({ blocker: me, blocked: wallet });
    fetchBlockedUsers(); fetchFriends();
  }

  async function unblockUser(wallet: string) {
    if (!publicKey) return;
    await supabase.from("blocked_users").delete().eq("blocker", publicKey.toBase58()).eq("blocked", wallet);
    fetchBlockedUsers();
  }

  // ── Profile ────────────────────────────────────────────────────────────────
  async function saveProfile() {
    if (!publicKey) return;
    const { error } = await supabase.from("profiles").upsert({ wallet: publicKey.toBase58(), username });
    if (error) { alert("Error saving profile"); return; }
    setSavedUsername(username);
    fetchProfiles();
    alert("Profile saved!");
  }

  async function loadProfile() {
    if (!publicKey) return;
    const { data } = await supabase.from("profiles").select("*").eq("wallet", publicKey.toBase58()).single();
    if (data) { setUsername(data.username || ""); setSavedUsername(data.username || ""); }
  }

  async function loadMessageExpiry() {
    if (!publicKey) return;
    const { data } = await supabase.from("profiles").select("message_expiry_days").eq("wallet", publicKey.toBase58()).single();
    setMessageExpiryDays(data?.message_expiry_days || 0);
  }

  async function saveMessageExpiry(days: number) {
    if (!publicKey) return;
    setMessageExpiryDays(days);
    await supabase.from("profiles").upsert({ wallet: publicKey.toBase58(), message_expiry_days: days });
  }

  // ── Mark seen ─────────────────────────────────────────────────────────────
  async function markMessagesAsSeen(wallet: string) {
    if (!publicKey) return;
    setTimeout(async () => {
      await supabase.from("messages").update({ seen: true })
        .eq("sender", wallet).eq("receiver", publicKey.toBase58()).eq("seen", false);
    }, 300);
  }

  // ── Delete messages ────────────────────────────────────────────────────────
  async function deleteMessageForMe(msgId: string) {
    if (!publicKey) return;
    setDeletingMsgId(msgId);
    const msg = chatMessages.find((m: any) => m.id === msgId);
    if (!msg) { setDeletingMsgId(null); return; }
    const field = msg.sender === publicKey.toBase58() ? "deleted_for_sender" : "deleted_for_receiver";
    await supabase.from("messages").update({ [field]: true, deleted_at: new Date().toISOString() }).eq("id", msgId);
    setChatMessages((prev: any[]) => prev.filter((m: any) => m.id !== msgId));
    setDeletingMsgId(null);
  }

  async function deleteMessageForAll(msgId: string) {
    if (!publicKey) return;
    setDeletingMsgId(msgId);
    await supabase.from("messages").update({ deleted_for_all: true, deleted_at: new Date().toISOString() }).eq("id", msgId);
    setChatMessages((prev: any[]) => prev.map((m: any) => m.id === msgId ? { ...m, deleted_for_all: true } : m));
    setDeletingMsgId(null);
  }

  // ── NFTs & Tokens ──────────────────────────────────────────────────────────
  async function fetchNFTs(wallet: string) {
    if (!wallet) return;
    setLoadingNFTs(true); setNfts([]); setNftWallet(wallet);
    try {
      const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAssetsByOwner",
          params: { ownerAddress: wallet, page: 1, limit: 50, displayOptions: { showFungible: false } } }),
      });
      const json = await res.json();
      const items = json?.result?.items || [];
      setNfts(items.filter((item: any) => {
        const validInterface = ["V1_NFT","ProgrammableNFT","V1_PRINT"].includes(item.interface);
        if (!validInterface) return false;
        if (item.royalty?.basis_points === 0 && !item.grouping?.length) return false;
        const name = (item.content?.metadata?.name || "").toLowerCase();
        if (["spam","airdrop","claim","free","visit","www.","http",".com",".io","token","reward"].some(w => name.includes(w))) return false;
        return !!(item.content?.links?.image || item.content?.files?.[0]?.uri);
      }).map((item: any) => ({
        id: item.id,
        name: item.content?.metadata?.name || "Unknown NFT",
        image: item.content?.links?.image || item.content?.files?.[0]?.uri || null,
      })));
    } catch (err) { setNfts([]); } finally { setLoadingNFTs(false); }
  }

  async function fetchOtherWalletTokens(wallet: string) {
    if (!wallet) return;
    setLoadingOtherTokens(true); setOtherTokens([]);
    try {
      const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, "confirmed");
      const lamports = await connection.getBalance(new PublicKey(wallet));
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "searchAssets",
          params: { ownerAddress: wallet, tokenType: "fungible", page: 1, limit: 50 } }),
      });
      const json = await res.json();
      const tokens = (json?.result?.items || [])
        .filter((item: any) => { const b = item.token_info?.balance / Math.pow(10, item.token_info?.decimals ?? 0); return b > 0.000001; })
        .map((item: any) => {
          const dec = item.token_info?.decimals ?? 0;
          return { mint: item.id, symbol: item.token_info?.symbol || "???", name: item.content?.metadata?.name || "Unknown",
            balance: item.token_info?.balance / Math.pow(10, dec), decimals: dec,
            logo: item.content?.links?.image || null };
        });
      setOtherTokens([{ mint: "SOL", symbol: "SOL", name: "Solana", balance: lamports / LAMPORTS_PER_SOL, decimals: 9,
        logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" }, ...tokens]);
    } catch (err) { setOtherTokens([]); } finally { setLoadingOtherTokens(false); }
  }

  async function fetchWalletTokens() {
    if (!publicKey) return;
    setLoadingTokens(true);
    try {
      const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, "confirmed");
      const lamports = await connection.getBalance(publicKey);
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "searchAssets",
          params: { ownerAddress: publicKey.toBase58(), tokenType: "fungible", page: 1, limit: 50 } }),
      });
      const json = await res.json();
      const tokens = (json?.result?.items || [])
        .filter((item: any) => { const b = item.token_info?.balance / Math.pow(10, item.token_info?.decimals ?? 0); return b > 0.000001; })
        .map((item: any) => {
          const dec = item.token_info?.decimals ?? 0;
          return { mint: item.id, symbol: item.token_info?.symbol || "???", name: item.content?.metadata?.name || "Unknown",
            balance: item.token_info?.balance / Math.pow(10, dec), decimals: dec,
            logo: item.content?.links?.image || null, isSol: false };
        });
      const solToken = { mint: "SOL", symbol: "SOL", name: "Solana", balance: lamports / LAMPORTS_PER_SOL, decimals: 9, isSol: true,
        logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" };
      setWalletTokens([solToken, ...tokens]);
      setSelectedToken(solToken);
    } catch (err) {
      const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
      const lamports = await connection.getBalance(publicKey);
      const sol = { mint: "SOL", symbol: "SOL", name: "Solana", balance: lamports / LAMPORTS_PER_SOL, decimals: 9, isSol: true,
        logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" };
      setWalletTokens([sol]); setSelectedToken(sol);
    } finally { setLoadingTokens(false); }
  }

  async function sendSol() {
    if (!publicKey || !activeChat || !solAmount || !selectedToken) return;
    const amount = parseFloat(solAmount);
    if (isNaN(amount) || amount <= 0) { alert("Invalid amount"); return; }
    if (amount > selectedToken.balance) { alert(`Insufficient balance. You have ${selectedToken.balance.toFixed(4)} ${selectedToken.symbol}`); return; }
    setSendingSol(true);
    try {
      const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, "confirmed");
      const toPublicKey = new PublicKey(activeChat);
      const transaction = new Transaction();
      if (selectedToken.isSol) {
        transaction.add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: toPublicKey, lamports: Math.round(amount * LAMPORTS_PER_SOL) }));
      } else {
        const { createTransferInstruction, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } = await import("@solana/spl-token");
        const mintPubkey = new PublicKey(selectedToken.mint);
        const fromAta = await getOrCreateAssociatedTokenAccount(connection, { publicKey, signTransaction: async (tx: any) => tx } as any, mintPubkey, publicKey);
        const toAta = await getOrCreateAssociatedTokenAccount(connection, { publicKey, signTransaction: async (tx: any) => tx } as any, mintPubkey, toPublicKey);
        transaction.add(createTransferInstruction(fromAta.address, toAta.address, publicKey, Math.round(amount * Math.pow(10, selectedToken.decimals)), [], TOKEN_PROGRAM_ID));
      }
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      await supabase.from("messages").insert([{ sender: publicKey.toBase58(), receiver: activeChat, content: `💸 Sent ${amount} ${selectedToken.symbol}`, seen: false }]);
      setSolAmount(""); setShowSendSol(false);
      alert(`✅ ${amount} ${selectedToken.symbol} sent successfully!`);
    } catch (err: any) { alert("Error: " + (err.message || "Transaction failed")); } finally { setSendingSol(false); }
  }

  // ── Gate ───────────────────────────────────────────────────────────────────
  async function checkGateAccess() {
    if (!publicKey) return;
    const { data: settings } = await supabase.from("app_settings").select("value").eq("key", "token_gate_enabled").single();
    if (settings?.value !== "true") { setGateEnabled(false); setGateAccess("allowed"); return; }
    setGateEnabled(true);
    const { data: gates } = await supabase.from("token_gates").select("*").eq("active", true).in("feature", ["all", "chat_access"]);
    if (!gates || gates.length === 0) { setGateAccess("allowed"); return; }
    const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";
    try {
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "searchAssets",
          params: { ownerAddress: publicKey.toBase58(), tokenType: "fungible", page: 1, limit: 100 } }),
      });
      const json = await res.json();
      const items = json?.result?.items || [];
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, "confirmed");
      const solBalance = (await connection.getBalance(publicKey)) / LAMPORTS_PER_SOL;
      const missing: any[] = [];
      for (const gate of gates) {
        if (gate.token_mint === "SOL") { if (solBalance < gate.min_amount) missing.push(gate); }
        else {
          const found = items.find((item: any) => item.id === gate.token_mint);
          if (!found) { missing.push(gate); continue; }
          const bal = (found.token_info?.balance || 0) / Math.pow(10, found.token_info?.decimals ?? 0);
          if (bal < gate.min_amount) missing.push(gate);
        }
      }
      if (missing.length === 0) { setGateAccess("allowed"); setMissingTokens([]); }
      else { setGateAccess("denied"); setMissingTokens(missing); }
    } catch { setGateAccess("allowed"); }
  }

  // ── Send message ───────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!publicKey) { alert("Connect wallet first"); return; }
    if (!activeChat || !message.trim()) return;
    if (isBlocked(activeChat)) { alert("You have blocked this user."); return; }
    if (isBlockedByThem(activeChat)) { alert("You cannot send messages to this user."); return; }
    const { error } = await supabase.from("messages").insert([{
  sender: publicKey.toBase58(),
  receiver: activeChat,
  content: message.trim(),
  seen: false,
  reply_to: replyTo?.id || null,
  reply_content: replyTo?.content || null,
  reply_sender: replyTo?.sender || null,
}]);
    if (error) { alert(JSON.stringify(error)); return; }
    sendTyping(false);
    if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
    setMessage("");
    setReplyTo(null);

    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
  }

  // ── Inbox / Conversation ───────────────────────────────────────────────────
  async function fetchInbox() {
    if (!publicKey) return;
    const { data, error } = await supabase.from("messages").select("*")
      .or(`sender.eq.${publicKey.toBase58()},receiver.eq.${publicKey.toBase58()}`)
      .order("created_at", { ascending: false });
    if (error) { console.error(error); return; }
    const latestMessages = new Map();
    data?.forEach((msg) => {
      const otherWallet = msg.sender === publicKey.toBase58() ? msg.receiver : msg.sender;
      if (!latestMessages.has(otherWallet)) latestMessages.set(otherWallet, { ...msg, otherWallet });
    });
    setInboxMessages(Array.from(latestMessages.values()));
  }

  async function loadConversation(wallet: string) {
    if (!wallet) return;
    if (!publicKey) { setActiveChat(wallet); return; }
   setActiveChat(wallet);
setUnreadCounts((prev: any) => ({ ...prev, [wallet]: 0 }));
setShowSidebar(false);
    const { data, error } = await supabase.from("messages").select("*")
      .or(`and(sender.eq.${publicKey.toBase58()},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${publicKey.toBase58()})`)
      .order("created_at", { ascending: false }).limit(50);
    if (error) { console.error(error); return; }
    const me = publicKey.toBase58();
    const msgs = (data || []).filter((m: any) => {
      if (m.deleted_for_all) return true;
      if (m.sender === me && m.deleted_for_sender) return false;
      if (m.receiver === me && m.deleted_for_receiver) return false;
      return true;
    }).reverse();
    setChatMessages(msgs);
    setHasMoreMessages(msgs.length === 50);
    await markMessagesAsSeen(wallet);
    if (msgs.length) fetchReactions(msgs.map((m: any) => m.id));
    setTimeout(() => scrollToBottom("auto"), 50);
  }

  async function loadMoreMessages() {
    if (!publicKey || !activeChat || loadingMore) return;
    setLoadingMore(true);
    const oldest = chatMessages[0];
    if (!oldest) { setLoadingMore(false); return; }
    const { data, error } = await supabase.from("messages").select("*")
      .or(`and(sender.eq.${publicKey.toBase58()},receiver.eq.${activeChat}),and(sender.eq.${activeChat},receiver.eq.${publicKey.toBase58()})`)
      .lt("created_at", oldest.created_at).order("created_at", { ascending: false }).limit(50);
    if (error) { setLoadingMore(false); return; }
    const older = (data || []).reverse();
    setChatMessages((prev) => [...older, ...prev]);
    setHasMoreMessages(older.length === 50);
    setLoadingMore(false);
    if (older.length) fetchReactions(older.map((m: any) => m.id));
    setTimeout(() => { const el = messagesContainerRef.current; if (el) el.scrollTop = 120; }, 50);
  }

  // ── Main useEffect ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchInbox(); fetchFriends(); fetchFriendRequests();
    fetchBlockedUsers(); fetchBlockedByUsers();
    fetchProfiles(); loadProfile(); fetchPresence();
    checkGateAccess(); loadMessageExpiry();
    fetchNotifications(); loadMyStatus();

    if (!publicKey) return;
    updatePresence();
    const presenceInterval = setInterval(updatePresence, 30000);
    const onlineInterval = setInterval(fetchPresence, 10000);

    const channel = supabase.channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const newMessage = payload.new as any;
        const me = publicKey.toBase58();
        const { data: blockCheck } = await supabase.from("blocked_users").select("*")
          .eq("blocker", me).eq("blocked", newMessage.sender).maybeSingle();
        if (blockCheck) return;
        if (newMessage.receiver === me) {
          const { data: profileData } = await supabase.from("profiles").select("*").eq("wallet", newMessage.sender).maybeSingle();
          if (profileData) setProfiles((prev: any) => ({ ...prev, [profileData.wallet]: profileData }));
          if (newMessage.sender === activeChatRef.current) {
            supabase.from("messages").update({ seen: true }).eq("id", newMessage.id);
          }
          setInboxMessages((prev) => {
            if (newMessage.sender !== activeChatRef.current) {
              setUnreadCounts((prevCounts: any) => ({ ...prevCounts, [newMessage.sender]: (prevCounts[newMessage.sender] || 0) + 1 }));
            }
            const filtered = prev.filter((m) => m.otherWallet !== newMessage.sender);
            return [{ ...newMessage, otherWallet: newMessage.sender }, ...filtered];
          });
        }
        if (activeChatRef.current &&
          ((newMessage.sender === activeChatRef.current && newMessage.receiver === me) ||
           (newMessage.sender === me && newMessage.receiver === activeChatRef.current))) {
          setChatMessages((prev) => {
            if (prev.find((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const updated = payload.new as any;
        const me = publicKey.toBase58();
        if (updated.seen === true) setChatMessages((prev) => prev.map((m: any) => m.id === updated.id ? { ...m, seen: true } : m));
        if (updated.deleted_for_all === true) setChatMessages((prev) => prev.map((m: any) => m.id === updated.id ? { ...m, deleted_for_all: true } : m));
        if ((updated.deleted_for_sender === true && updated.sender === me) ||
            (updated.deleted_for_receiver === true && updated.receiver === me)) {
          setChatMessages((prev) => prev.filter((m: any) => m.id !== updated.id));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, (payload) => {
        const r = (payload.new || payload.old) as any;
        if (r?.message_id) fetchReactions([r.message_id]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "typing" }, async () => {
        const me = publicKey.toBase58();
        const { data } = await supabase.from("typing").select("*").eq("receiver", me);
        const someoneTyping = data?.some((row: any) => {
          const age = Date.now() - new Date(row.updated_at).getTime();
          return row.wallet !== me && age < 3000 && row.wallet === activeChatRef.current;
        });
        setOtherIsTyping(!!someoneTyping);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (someoneTyping) typingTimeoutRef.current = setTimeout(() => setOtherIsTyping(false), 3000);
      })

      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
  const notif = payload.new as any;
  setActiveNotif(notif);
  setNotifications((prev) => [notif, ...prev.slice(0, 4)]);
})

      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_users" }, () => { fetchBlockedUsers(); fetchBlockedByUsers(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "friends" }, () => { fetchFriends(); fetchFriendRequests(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
  const updated = payload.new as any;
  if (updated?.wallet) {
    setProfiles((prev: any) => ({
      ...prev,
      [updated.wallet]: { ...prev[updated.wallet], ...updated },
    }));
  }
})
      .subscribe();

      

    return () => {
      supabase.removeChannel(channel);
      clearInterval(presenceInterval);
      clearInterval(onlineInterval);
      if (seenPollingRef.current) clearInterval(seenPollingRef.current);
      sendTyping(false);
    };
  }, [publicKey]);

  const amIBlocked = activeChat ? isBlockedByThem(activeChat) : false;
  const didIBlock = activeChat ? isBlocked(activeChat) : false;

  if (gateEnabled && gateAccess === "checking") {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <div className="text-2xl animate-pulse">🔐</div>
        <div className="text-zinc-400 text-sm">Checking access...</div>
      </main>
    );
  }

  if (gateAccess === "denied") {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold mb-2">Access restricted</h1>
          <p className="text-zinc-400 text-sm mb-6">To access Wallet Chat you must hold:</p>
          <div className="flex flex-col gap-3 mb-8">
            {missingTokens.map((gate) => (
              <div key={gate.id} className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 flex items-center gap-3">
                {gate.token_logo ? <img src={gate.token_logo} className="w-8 h-8 rounded-full" alt="" /> :
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold">{gate.token_symbol.slice(0, 2)}</div>}
                <div className="text-left">
                  <div className="font-bold text-white">{gate.token_symbol}</div>
                  <div className="text-zinc-500 text-xs">Minimum: {gate.min_amount} {gate.token_symbol}</div>
                </div>
              </div>
            ))}
          </div>
          <WalletMultiButtonDynamic />
          <button onClick={checkGateAccess} className="mt-3 w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg p-3 text-sm transition-colors">
            ↻ Check again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center p-2 md:p-6 overflow-x-hidden">
      
      {activeNotif && (
  <div className="w-full max-w-6xl mb-4 bg-zinc-900 border border-green-700 rounded-xl px-5 py-3 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <div className="text-xl">📢</div>
      <div>
        <div className="text-white font-semibold text-sm">{activeNotif.title}</div>
        <div className="text-zinc-400 text-xs mt-0.5">{activeNotif.message}</div>
      </div>
    </div>
    <button onClick={dismissNotif} className="text-zinc-500 hover:text-white text-xs flex-shrink-0">✕ Dismiss</button>
  </div>
)}
      
      <div className="w-full max-w-6xl flex gap-6 mt-2 md:mt-10 overflow-hidden relative">

        {/* SIDEBAR */}
<div className={`
  fixed inset-0 z-40 bg-black/60 md:hidden transition-opacity
  ${showSidebar ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
`} onClick={() => setShowSidebar(false)} />

<div className={`
  fixed md:relative inset-y-0 left-0 z-50 md:z-auto
  w-80 bg-zinc-950 border-r md:border border-zinc-800 md:rounded-xl p-4
  transform transition-transform duration-300 md:transform-none overflow-y-auto
  ${showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
`}>
          <h1 className="text-2xl font-bold mb-4">Wallet Chat</h1>
          <WalletMultiButtonDynamic />
          {publicKey && (
            <div className="flex items-center gap-2 mt-4">
              <Avatar wallet={publicKey.toBase58()} profile={profiles[publicKey.toBase58()]} size={26} />
              <div className="text-xs text-green-400 break-all">{publicKey.toBase58()}</div>
            </div>
          )}

          <div className="mt-6 border-t border-zinc-800 pt-6">
            <h2 className="text-lg font-bold mb-3">Profile</h2>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm" />
            <button onClick={saveProfile} className="w-full bg-green-600 rounded-lg p-3 font-bold mt-3">Save Profile</button>
            {savedUsername && <div className="text-sm text-zinc-400 mt-3">@{savedUsername}</div>}
            <div className="mt-4 border-t border-zinc-800 pt-4 relative">
  <div className="text-xs text-zinc-500 mb-2">Status</div>
  <button onClick={() => setShowStatusPicker(!showStatusPicker)}
    className="w-full flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm hover:border-zinc-600 transition-colors">
    <span>{getStatusEmoji(myStatus)}</span>
    <span className="text-white capitalize">{myStatus}</span>
    {myStatusText && <span className="text-zinc-500 truncate">— {myStatusText}</span>}
  </button>
  {showStatusPicker && (
    <div className="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl p-3 z-50 shadow-xl">
      {[
        { value: "online", label: "Online", emoji: "🟢" },
        { value: "away", label: "Away", emoji: "🟡" },
        { value: "busy", label: "Busy", emoji: "🔴" },
        { value: "offline", label: "Appear offline", emoji: "⚫" },
      ].map((s) => (
        <button key={s.value} onClick={() => saveStatus(s.value, myStatusText)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${myStatus === s.value ? "bg-zinc-700 text-white" : "hover:bg-zinc-800 text-zinc-300"}`}>
          <span>{s.emoji}</span><span>{s.label}</span>
        </button>
      ))}
      <input value={myStatusText} onChange={(e) => setMyStatusText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") saveStatus(myStatus, myStatusText); }}
        placeholder="Custom status text..."
        className="w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none" />
      <button onClick={() => saveStatus(myStatus, myStatusText)}
        className="w-full mt-2 bg-green-600 hover:bg-green-500 text-white rounded-lg py-1.5 text-xs font-bold">Save</button>
    </div>
  )}
</div>
            <div className="mt-4 border-t border-zinc-800 pt-4">
              <div className="text-xs text-zinc-500 mb-2">Message expiry</div>
              <select value={messageExpiryDays} onChange={(e) => saveMessageExpiry(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white">
                <option value={0}>Never</option>
                <option value={1}>After 1 day</option>
                <option value={7}>After 7 days</option>
                <option value={30}>After 30 days</option>
                <option value={90}>After 90 days</option>
              </select>
            </div>
          </div>

          <div className="mt-8">
            <input value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="Open chat with wallet"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm" />
            <button onClick={() => loadConversation(receiver)} className="w-full bg-white text-black rounded-lg p-3 font-bold mt-3">Open Chat</button>
          </div>

          <div className="mt-10 flex flex-col gap-3">
            <h2 className="text-lg font-bold">Inbox</h2>
            {inboxMessages.map((msg) => (
              <button key={msg.otherWallet} onClick={() => loadConversation(msg.otherWallet)}
                className={`bg-zinc-900 border rounded-lg p-3 text-left transition-colors ${activeChat === msg.otherWallet ? "border-green-700" : "border-zinc-800 hover:border-zinc-700"}`}>
                <div className="flex items-center gap-2">
                  <div className="relative flex-shrink-0">
                    <Avatar wallet={msg.otherWallet} profile={profiles[msg.otherWallet]} size={32} />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${isOnline(msg.otherWallet) ? "bg-green-400" : "bg-zinc-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-green-400 text-sm font-medium truncate">{getDisplayName(msg.otherWallet)}</div>
                      <div className="text-[10px] text-zinc-500 flex-shrink-0 ml-1">{msg.created_at ? formatInboxTime(msg.created_at) : ""}</div>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <div className="truncate text-xs text-zinc-400">{msg.content}</div>
                      {unreadCounts[msg.otherWallet] > 0 && (
                        <div className="min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs flex items-center justify-center flex-shrink-0">
                          {unreadCounts[msg.otherWallet]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            <div className="mt-6">
              <h2 className="text-lg font-bold">Friends</h2>
              {friends.length === 0 && <div className="text-xs text-zinc-500 mt-1">No friends yet</div>}
              {friends.map((f) => {
                const other = f.sender === publicKey?.toBase58() ? f.receiver : f.sender;
                return (
                  <button key={other} onClick={() => loadConversation(other)}
                    className="w-full bg-zinc-900 p-2 rounded mb-2 text-left mt-2 flex items-center gap-2">
                    <div className="relative flex-shrink-0">
                      <Avatar wallet={other} profile={profiles[other]} size={28} />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-zinc-900 ${isOnline(other) ? "bg-green-400" : "bg-zinc-600"}`} />
                    </div>
                    <div className="text-green-400 text-sm">{getDisplayName(other)}</div>
                  </button>
                );
              })}

              <div className="mt-6">
                <h2 className="text-lg font-bold mb-2">Friend Requests</h2>
                {friendRequests.filter((r) => r.receiver === publicKey?.toBase58()).length === 0 && (
                  <div className="text-xs text-zinc-500">No requests</div>
                )}
                {friendRequests.filter((r) => r.receiver === publicKey?.toBase58()).map((r) => (
                  <div key={r.id} className="bg-zinc-900 p-2 rounded mb-2">
                    <div className="text-sm">{getDisplayName(r.sender)}</div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => acceptFriend(r.id)} className="bg-green-600 px-2 py-1 text-xs rounded">Accept</button>
                      <button onClick={() => rejectFriend(r.id)} className="bg-red-600 px-2 py-1 text-xs rounded">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CHAT WINDOW */}
        
<div className="flex-1 min-w-0 h-[100dvh] md:h-[85vh] bg-zinc-950 md:border border-zinc-800 md:rounded-xl p-3 md:p-6 flex flex-col overflow-hidden w-full">
          {activeChat ? (
            <>
              {/* Header */}
              <div className="border-b border-zinc-800 pb-4 mb-4">
                <div className="flex items-center gap-3">
  <button onClick={() => setShowSidebar(true)}
    className="md:hidden flex-shrink-0 bg-zinc-800 rounded-lg p-2 text-white">
    ☰
  </button>
  <div className="relative flex-shrink-0">
    <Avatar wallet={activeChat} profile={profiles[activeChat]} size={42} />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950 ${isOnline(activeChat) ? "bg-green-400" : "bg-zinc-600"}`} />
                  </div>
                  <div>
                    <div className="text-white font-semibold">{getDisplayName(activeChat)}</div>
                    <div className="text-xs text-zinc-500">
                      {otherIsTyping ? (
  <span className="text-green-400 animate-pulse">typing...</span>
) : profiles[activeChat]?.status === "busy" ? (
  <span className="text-red-400">🔴 Busy{profiles[activeChat]?.status_text ? ` — ${profiles[activeChat].status_text}` : ""}</span>
) : profiles[activeChat]?.status === "away" ? (
  <span className="text-yellow-400">🟡 Away{profiles[activeChat]?.status_text ? ` — ${profiles[activeChat].status_text}` : ""}</span>
) : profiles[activeChat]?.status === "offline" ? (
  <span className="text-zinc-500">⚫ Offline</span>
) : isOnline(activeChat) ? (
  <span className="text-green-400">🟢 Online{profiles[activeChat]?.status_text ? ` — ${profiles[activeChat].status_text}` : ""}</span>
) : "Offline"}
                    </div>
                    <div className="text-[10px] text-zinc-700 break-all">{activeChat}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button onClick={() => { if (!showNFTs || nftWallet !== activeChat) { fetchNFTs(activeChat); fetchOtherWalletTokens(activeChat); } setShowNFTs(!showNFTs); setNftTab("nfts"); }}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${showNFTs ? "bg-purple-600 text-white" : "bg-zinc-700 hover:bg-zinc-600 text-white"}`}>
                    🖼 Wallet
                  </button>
                  {isFriend(activeChat) ? (
                    <button onClick={() => unfriend(activeChat)} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">Unfriend</button>
                  ) : friendRequests.some((r) => r.sender === publicKey?.toBase58() && r.receiver === activeChat && r.accepted === false) ? (
                    <button disabled className="bg-yellow-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium opacity-70 cursor-not-allowed">Request Sent</button>
                  ) : (
                    <button onClick={() => addFriend(activeChat)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">Add Friend</button>
                  )}
                  {!isBlocked(activeChat) ? (
                    <button onClick={() => blockUser(activeChat)} className="bg-red-700 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">Block</button>
                  ) : (
                    <button onClick={() => unblockUser(activeChat)} className="bg-zinc-600 hover:bg-zinc-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">Unblock</button>
                 )}

                 <button onClick={() => { setShowSearch(!showSearch); setSearchQuery(""); }}
  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${showSearch ? "bg-zinc-600 text-white" : "bg-zinc-700 hover:bg-zinc-600 text-white"}`}>
  🔍
</button>
                </div>
              </div>


{showSearch && (
  <div className="mb-3">
    <div className="relative">
      <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search messages..." autoFocus
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none pr-8" />
      {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">✕</button>}
    </div>
    {searchQuery && (
      <div className="mt-2 max-h-48 overflow-y-auto flex flex-col gap-1">
        {chatMessages.filter((m: any) => !m.deleted_for_all && m.content?.toLowerCase().includes(searchQuery.toLowerCase())).map((m: any) => (
          <button key={m.id}
            onClick={() => { document.getElementById(`msg-${m.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); setShowSearch(false); setSearchQuery(""); }}
            className="text-left bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2 text-xs transition-colors">
            <div className="text-zinc-500 mb-0.5">{m.sender === publicKey?.toBase58() ? "You" : getDisplayName(m.sender)} · {new Date(m.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="text-white">{m.content}</div>
          </button>
        ))}
        {chatMessages.filter((m: any) => !m.deleted_for_all && m.content?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
          <div className="text-zinc-500 text-xs text-center py-3">No messages found</div>
        )}
      </div>
    )}
  </div>
)}


              {/* Wallet Panel */}
              {showNFTs && (
                <div className="border border-zinc-800 rounded-xl p-3 mb-3 bg-zinc-900">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-white">Wallet — {getDisplayName(activeChat)}</div>
                    <button onClick={() => setShowNFTs(false)} className="text-zinc-500 hover:text-white text-xs">✕</button>
                  </div>
                  <div className="flex gap-1 mb-3">
                    <button onClick={() => setNftTab("nfts")} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${nftTab === "nfts" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>
                      🖼 NFTs {!loadingNFTs && `(${nfts.length})`}
                    </button>
                    <button onClick={() => setNftTab("tokens")} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${nftTab === "tokens" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>
                      💰 Tokens {!loadingOtherTokens && `(${otherTokens.length})`}
                    </button>
                  </div>
                  {nftTab === "nfts" && (loadingNFTs ? <div className="text-zinc-500 text-xs text-center py-4">Loading...</div> : nfts.length === 0 ? <div className="text-zinc-500 text-xs text-center py-4">No NFTs found</div> :
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                      {nfts.map((nft) => (
                        <div key={nft.id} className="group relative rounded-lg overflow-hidden bg-zinc-800 aspect-square">
                          {nft.image && <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" onError={(e: any) => { e.target.style.display = "none"; }} />}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="text-white text-[8px] truncate">{nft.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {nftTab === "tokens" && (loadingOtherTokens ? <div className="text-zinc-500 text-xs text-center py-4">Loading...</div> : otherTokens.length === 0 ? <div className="text-zinc-500 text-xs text-center py-4">No tokens found</div> :
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                      {otherTokens.map((token) => (
                        <div key={token.mint} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-2.5 py-2">
                          {token.logo ? <img src={token.logo} alt={token.symbol} className="w-6 h-6 rounded-full flex-shrink-0" onError={(e: any) => { e.target.style.display = "none"; }} /> :
                            <div className="w-6 h-6 rounded-full bg-zinc-700 flex-shrink-0 flex items-center justify-center text-[9px] text-zinc-400">{token.symbol.slice(0, 2)}</div>}
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-xs font-medium">{token.symbol}</div>
                            <div className="text-zinc-500 text-[10px] truncate">{token.name}</div>
                          </div>
                          <div className="text-green-400 text-xs font-mono">{token.balance < 0.001 ? token.balance.toFixed(6) : token.balance.toFixed(3)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 min-h-0">
                {hasMoreMessages && (
                  <div className="flex justify-center py-2">
                    <button onClick={loadMoreMessages} disabled={loadingMore}
                      className="text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full transition-colors disabled:opacity-50">
                      {loadingMore ? "Loading..." : "⬆ Load older messages"}
                    </button>
                  </div>
                )}
                {chatMessages.map((msg, i) => {
                  const isMine = msg.sender === publicKey?.toBase58();
                  const msgDate = new Date(msg.created_at).toDateString();
                  const prevDate = i > 0 ? new Date(chatMessages[i - 1].created_at).toDateString() : null;
                  const showDateSep = msgDate !== prevDate;
                  const msgReactions = reactions[msg.id] || {};
                  const isSelected = selectedMsgs.has(msg.id);

                  return (
                    <div key={msg.id}>
                      {showDateSep && msg.created_at && (
                        <div className="flex items-center gap-2 my-2">
                          <div className="flex-1 h-px bg-zinc-800" />
                          <div className="text-[10px] text-zinc-600">
                            {new Date(msg.created_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
                          </div>
                          <div className="flex-1 h-px bg-zinc-800" />
                        </div>
                      )}
                      <div
  id={`msg-${msg.id}`}
  className={`flex items-end gap-2 group rounded-lg px-1 py-0.5 transition-colors ${
    isSelected ? "bg-zinc-800/60" : "hover:bg-zinc-900/40"
  } ${isMine ? "flex-row-reverse" : "flex-row"}`}
  onClick={(e) => {
    if (msg.deleted_for_all) return;
    if (selectionMode) { toggleSelectMsg(msg.id); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu(contextMenu?.msgId === msg.id ? null : {
      msgId: msg.id,
      x: e.clientX,
      y: rect.top,
    });
  }}
>
                        {/* Checkbox */}
                        {selectionMode && !msg.deleted_for_all && (
                          <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-green-500 border-green-500" : "border-zinc-600"
                          }`}>
                            {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                          </div>
                        )}

                        <div className={`flex flex-col gap-0.5 min-w-0 w-full max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>
                          {msg.deleted_for_all ? (
  <div className="px-3 py-2 rounded-xl bg-zinc-800/50 border border-zinc-700 text-zinc-500 text-xs italic">🚫 Message deleted</div>
) : (
  <div className={`px-3 py-2 rounded-2xl break-words text-sm max-w-full overflow-hidden ${
    isSelected
      ? isMine ? "bg-green-700" : "bg-zinc-700"
      : isMine ? "bg-green-600 rounded-br-sm" : "bg-zinc-800 rounded-bl-sm"
  }`}>
    {msg.reply_content && (
      <div className={`mb-2 px-2 py-1 rounded-lg text-xs border-l-2 ${isMine ? "border-green-300 bg-green-700/50" : "border-zinc-500 bg-zinc-700/50"}`}>
        <div className="text-zinc-400 mb-0.5">{msg.reply_sender === publicKey?.toBase58() ? "You" : getDisplayName(msg.reply_sender)}</div>
        <div className="truncate opacity-80">{msg.reply_content}</div>
      </div>
    )}
    {msg.content}
  </div>
)}

                          {/* Reactions */}
                          {Object.keys(msgReactions).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                              {Object.entries(msgReactions).map(([emoji, wallets]: [string, any]) => (
                                <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                                    wallets.includes(publicKey?.toBase58()) ? "bg-green-900 border-green-700 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                                  }`}>
                                  {emoji} <span className="text-[10px]">{wallets.length}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {msg.created_at && !msg.deleted_for_all && (
                            <div className={`flex items-center gap-1 px-1 ${isMine ? "flex-row-reverse" : ""}`}>
                              <div className="text-[10px] text-zinc-600">
                                {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                              </div>
                              {isMine && i === chatMessages.length - 1 && (
                                <div className={`text-[10px] font-bold ${msg.seen ? "text-green-400" : "text-zinc-600"}`}>
                                  {msg.seen ? "✓✓" : "✓"}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        
                      </div>
                    </div>
                  );
                })}
              </div>

{/* Context menu */}
{contextMenu && (() => {
  const msg = chatMessages.find((m: any) => m.id === contextMenu.msgId);
  if (!msg) return null;
  const isMine = msg.sender === publicKey?.toBase58();
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
      <div className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1 min-w-[180px]"
        style={{ top: Math.min(contextMenu.y - 10, window.innerHeight - 280), left: Math.min(contextMenu.x, window.innerWidth - 200) }}>
        <button onClick={() => { setReplyTo(msg); setContextMenu(null); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-sm text-white transition-colors">
          ↩️ <span>Reply</span>
        </button>
        <button onClick={() => copyMessage(msg.content)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-sm text-white transition-colors">
          📋 <span>Copy</span>
        </button>
        <div className="px-3 py-1.5">
          <div className="flex flex-wrap gap-1">
            {["❤️","😂","😮","😢","👍","👎","🔥","🎉"].map((e) => (
              <button key={e} onClick={() => { toggleReaction(msg.id, e); setContextMenu(null); }}
                className="text-lg hover:bg-zinc-800 rounded p-0.5 transition-colors">
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="h-px bg-zinc-800 mx-2 my-1" />
        <button onClick={() => { setContextMenu(null); setSelectionMode(true); toggleSelectMsg(msg.id); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-sm text-red-400 transition-colors">
          🗑 <span>Delete</span>
        </button>
      </div>
    </>
  );
})()}

{/* Reply bar */}
{replyTo && (
  <div className="flex items-center gap-2 bg-zinc-800 border-l-2 border-green-500 rounded-lg px-3 py-2 mt-2">
    <div className="flex-1 min-w-0">
      <div className="text-green-400 text-xs mb-0.5">{replyTo.sender === publicKey?.toBase58() ? "You" : getDisplayName(replyTo.sender)}</div>
      <div className="text-zinc-400 text-xs truncate">{replyTo.content}</div>
    </div>
    <button onClick={() => setReplyTo(null)} className="text-zinc-500 hover:text-white flex-shrink-0">✕</button>
  </div>
)}


              {/* Selection toolbar */}
              {selectionMode && (
                <div className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 mt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white font-medium">{selectedMsgs.size} selected</span>
                    <button onClick={clearSelection} className="text-xs text-zinc-400 hover:text-white transition-colors">Cancel</button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm("me")}
                      disabled={selectedMsgs.size === 0}
                      className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 transition-colors"
                    >
                      🗑 Delete for me
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm("all")}
                      disabled={selectedMsgs.size === 0}
                      className="bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 transition-colors"
                    >
                      🗑 Delete for everyone
                    </button>
                  </div>
                </div>
              )}

              {/* Delete confirmation popup */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(null)}>
                  <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <div className="text-lg font-bold text-white mb-2">Delete messages?</div>
                    <div className="text-zinc-400 text-sm mb-6">
                      {showDeleteConfirm === "all"
                        ? `This will delete ${selectedMsgs.size} message${selectedMsgs.size > 1 ? "s" : ""} for everyone. This cannot be undone.`
                        : `This will delete ${selectedMsgs.size} message${selectedMsgs.size > 1 ? "s" : ""} for you only.`}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowDeleteConfirm(null)}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                        Cancel
                      </button>
                      <button onClick={() => deleteSelected(showDeleteConfirm)}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-sm font-bold transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Typing indicator */}
              {otherIsTyping && (
                <div className="flex items-end gap-2 px-1 py-2">
                  <Avatar wallet={activeChat} profile={profiles[activeChat]} size={24} />
                  <TypingIndicator />
                </div>
              )}

              {/* Input */}
              <div className="mt-4">
                {amIBlocked ? (
                  <div className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-zinc-500 text-sm text-center">
                    You have been blocked by this user.
                  </div>
                ) : didIBlock ? (
                  <div className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-zinc-500 text-sm text-center">
                    You have blocked this user. Unblock to send messages.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {showSendSol && (
                      <div className="bg-zinc-900 border border-yellow-600 rounded-xl p-3 flex flex-col gap-3">
                        {loadingTokens ? (
                          <div className="text-zinc-400 text-sm text-center py-2">Loading tokens...</div>
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-2">
                              {walletTokens.map((token) => (
                                <button key={token.mint} onClick={() => setSelectedToken(token)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedToken?.mint === token.mint ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>
                                  {token.logo && <img src={token.logo} alt={token.symbol} className="w-4 h-4 rounded-full" onError={(e: any) => e.target.style.display = "none"} />}
                                  <span>{token.symbol}</span>
                                  <span className="text-[10px] opacity-70">{token.balance.toFixed(3)}</span>
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2 items-center">
                              <input value={solAmount} onChange={(e) => setSolAmount(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") sendSol(); }}
                                placeholder={`Suma ${selectedToken?.symbol || "SOL"}`} type="number" min="0" step="0.01"
                                className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500" />
                              {selectedToken && <span className="text-zinc-500 text-xs whitespace-nowrap">max: {selectedToken.balance.toFixed(4)}</span>}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={sendSol} disabled={sendingSol || !selectedToken || !solAmount}
                                className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors">
                                {sendingSol ? "Sending..." : `Trimite ${selectedToken?.symbol || "SOL"}`}
                              </button>
                              <button onClick={() => { setShowSendSol(false); setSolAmount(""); }}
                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-3 py-2 rounded-lg text-sm transition-colors">✕</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 items-end relative">
                      <button onClick={() => { if (!showSendSol) fetchWalletTokens(); setShowSendSol(!showSendSol); }}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg px-3 py-2.5 font-bold text-sm transition-colors flex-shrink-0"
                        title="Send crypto">◎</button>

                      {/* Emoji picker button */}
                      <div className="relative flex-shrink-0">
                        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg px-3 py-2.5 text-sm transition-colors">
                          😊
                        </button>
                        {showEmojiPicker && (
                          <EmojiPicker
                            onSelect={(e) => { setMessage((prev) => prev + e); setShowEmojiPicker(false); setTimeout(autoResize, 0); }}
                            onClose={() => setShowEmojiPicker(false)}
                          />
                        )}
                      </div>

                      {/* Textarea instead of input */}
                      <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => handleMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Type message... (Shift+Enter for new line)"
                        rows={1}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm resize-none overflow-hidden focus:outline-none focus:border-zinc-500"
                        style={{ minHeight: "42px", maxHeight: "120px" }}
                      />
                      <button onClick={sendMessage} className="bg-white text-black rounded-lg px-6 py-2.5 font-bold flex-shrink-0 hover:bg-zinc-200 transition-colors">
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-500">
  <button onClick={() => setShowSidebar(true)}
    className="md:hidden bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors">
    ☰ Open Inbox
  </button>
  <div>Open a conversation</div>
</div>
          )}
        </div>
      </div>
    </main>
  );
}
