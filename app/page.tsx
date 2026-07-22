"use client";

import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState, useRef } from "react";
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

import { supabase } from "../lib/supabase";
import { Avatar } from "../components/Avatar";
import { TypingIndicator } from "../components/TypingIndicator";
import { EmojiPicker } from "../components/EmojiPicker";
import { ChatMessages } from "../components/ChatMessages";
import { ChatInput } from "../components/ChatInput";
import { TabChats } from "../components/TabChats";
import { TabFriends } from "../components/TabFriends";
import { TabGroups } from "../components/TabGroups";
import { TabSettings } from "../components/TabSettings";
import { ChatWindow } from "../components/ChatWindow";
import { GroupWindow } from "../components/GroupWindow";
import { BottomNav } from "../components/BottomNav";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function Home() {
  const { publicKey, sendTransaction } = useWallet();

  const [showSendSol, setShowSendSol] = useState(false);
  const [solAmount, setSolAmount] = useState("");
  const [sendingSol, setSendingSol] = useState(false);
  const [walletTokens, setWalletTokens] = useState<any[]>([]);
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [showNFTs, setShowNFTs] = useState(false);
  const [nftTab, setNftTab] = useState<"nfts" | "tokens">("nfts");
  const [nfts, setNfts] = useState<any[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [nftWallet, setNftWallet] = useState("");
  const [otherTokens, setOtherTokens] = useState<any[]>([]);
  const [loadingOtherTokens, setLoadingOtherTokens] = useState(false);
  const [gateEnabled, setGateEnabled] = useState(false);
  const [gateAccess, setGateAccess] = useState<"checking" | "allowed" | "denied">("checking");
  const [missingTokens, setMissingTokens] = useState<any[]>([]);
  const [messageExpiryDays, setMessageExpiryDays] = useState(0);
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactions, setReactions] = useState<any>({});
  const [selectedMsgs, setSelectedMsgs] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<"me" | "all" | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeNotif, setActiveNotif] = useState<any>(null);
  const [myStatus, setMyStatus] = useState("online");
  const [myStatusText, setMyStatusText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"chats" | "friends" | "groups" | "settings">("chats");
  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [addMemberWallet, setAddMemberWallet] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  // Group advanced
  const [groupIsPublic, setGroupIsPublic] = useState(true);
  const [groupRequiresApproval, setGroupRequiresApproval] = useState(false);
  const [groupRequests, setGroupRequests] = useState<any[]>([]);
const [unreadGroups, setUnreadGroups] = useState<Set<string>>(new Set());


  const [searchGroupQuery, setSearchGroupQuery] = useState("");
  const [searchGroupResults, setSearchGroupResults] = useState<any[]>([]);
  const [searchingGroups, setSearchingGroups] = useState(false);
  const [receiver, setReceiver] = useState("");
  const [message, setMessage] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpires, setPremiumExpires] = useState<string | null>(null);
  const [walletPrivate, setWalletPrivate] = useState(false);
  const [dailyViewCount, setDailyViewCount] = useState(0);
  const [viewedProfile, setViewedProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState<any>(null);
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
const activeGroupRef = useRef(activeGroup);


useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);
useEffect(() => { activeGroupRef.current = activeGroup; }, [activeGroup]);
  useEffect(() => { if (publicKey && activeChat) loadConversation(activeChat); }, [publicKey]);

  function autoResize() {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }
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
    if (diffHours < 24) return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
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
    const lastMine = [...chatMessagesRef.current].reverse().find((m: any) => m.sender === publicKey.toBase58() && !m.seen);
    if (!lastMine) { if (seenPollingRef.current) { clearInterval(seenPollingRef.current); seenPollingRef.current = null; } return; }
    const { data } = await supabase.from("messages").select("id, seen").eq("id", lastMine.id).single();
    if (data?.seen) {
      setChatMessages((prev) => prev.map((m: any) => m.sender === publicKey.toBase58() && m.receiver === activeChatRef.current ? { ...m, seen: true } : m));
      if (seenPollingRef.current) { clearInterval(seenPollingRef.current); seenPollingRef.current = null; }
    }
  }

  async function sendTyping(isTyping: boolean) {
    if (!publicKey || !activeChatRef.current) return;
    if (isTyping) await supabase.from("typing").upsert({ wallet: publicKey.toBase58(), receiver: activeChatRef.current, updated_at: new Date().toISOString() });
    else await supabase.from("typing").delete().eq("wallet", publicKey.toBase58());
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
    if (hasUnseenSent && !seenPollingRef.current) seenPollingRef.current = setInterval(pollLastMessageSeen, 2000);
  }, [chatMessages]);

  useEffect(() => {
    if (groupMessages.length > 0) scrollToBottom("smooth");
  }, [groupMessages]);

  function toggleSelectMsg(msgId: string) {
    setSelectedMsgs((prev) => { const next = new Set(prev); if (next.has(msgId)) next.delete(msgId); else next.add(msgId); return next; });
  }

  function clearSelection() { setSelectedMsgs(new Set()); setSelectionMode(false); }

  function copyMessage(content: string) { navigator.clipboard.writeText(content); setContextMenu(null); }

  async function deleteSelected(mode: "me" | "all") {
    if (!publicKey) return;
    for (const msgId of Array.from(selectedMsgs)) {
      if (mode === "all") {
        await supabase.from("messages").update({ deleted_for_all: true, deleted_at: new Date().toISOString() }).eq("id", msgId);
      } else {
        const msg = chatMessages.find((m: any) => m.id === msgId);
        if (!msg) continue;
        const field = msg.sender === publicKey.toBase58() ? "deleted_for_sender" : "deleted_for_receiver";
        await supabase.from("messages").update({ [field]: true, deleted_at: new Date().toISOString() }).eq("id", msgId);
      }
      // Always show as "Message deleted" placeholder
      setChatMessages((prev: any[]) => prev.map((m: any) => m.id === msgId ? { ...m, deleted_for_all: true } : m));
    }
    clearSelection(); setShowDeleteConfirm(null);
  }

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
    await supabase.from("reactions").delete().eq("message_id", msgId).eq("wallet", me);
    if (!existing) await supabase.from("reactions").insert({ message_id: msgId, wallet: me, emoji });
    fetchReactions([msgId]);
    setContextMenu(null);
  }

  async function fetchNotifications() {
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(5);
    setNotifications(data || []);
    if (data && data.length > 0) {
      const lastSeen = localStorage.getItem("last_notif_seen");
      const newest = data[0];
      if (!lastSeen || new Date(newest.created_at) > new Date(lastSeen)) setActiveNotif(newest);
    }
  }

  function dismissNotif() {
    if (activeNotif) { localStorage.setItem("last_notif_seen", activeNotif.created_at); setActiveNotif(null); }
  }

  async function loadMyStatus() {
    if (!publicKey) return;
    const { data } = await supabase.from("profiles").select("status, status_text").eq("wallet", publicKey.toBase58()).single();
    if (data) { setMyStatus(data.status || "online"); setMyStatusText(data.status_text || ""); }
  }

  async function saveStatus(status: string, statusText: string) {
    if (!publicKey) return;
    setMyStatus(status); setMyStatusText(statusText);
    await supabase.from("profiles").upsert({ wallet: publicKey.toBase58(), status, status_text: statusText });
    fetchProfiles();
  }

  function getStatusEmoji(status: string) {
    if (status === "online") return "🟢";
    if (status === "away") return "🟡";
    if (status === "busy") return "🔴";
    return "⚫";
  }

  async function fetchGroups() {
    if (!publicKey) return;
    const { data } = await supabase.from("group_members").select("group_id").eq("wallet", publicKey.toBase58());
    if (!data?.length) { setGroups([]); return; }
    const groupIds = data.map((m: any) => m.group_id);
    const { data: groupData } = await supabase.from("groups").select("*").in("id", groupIds).order("created_at", { ascending: false });
    setGroups(groupData || []);
  }

  async function createGroup() {
    if (!publicKey || !newGroupName.trim()) return;
    setCreatingGroup(true);
    const colors = ["#9945FF", "#14F195", "#00C2FF", "#FF6B6B", "#FFD93D"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const { data: group, error } = await supabase.from("groups")
      .insert({ name: newGroupName.trim(), description: newGroupDesc.trim(), owner: publicKey.toBase58(), avatar_color: color, is_public: groupIsPublic, requires_approval: groupRequiresApproval })
      .select().single();
    if (error) { alert("Error: " + error.message); setCreatingGroup(false); return; }
    await supabase.from("group_members").insert({ group_id: group.id, wallet: publicKey.toBase58(), role: "owner" });
    setNewGroupName(""); setNewGroupDesc(""); setShowCreateGroup(false); setCreatingGroup(false);
    fetchGroups(); openGroup(group);
  }

  async function openGroup(group: any) {
    setActiveGroup(group); setActiveChat("");
    setUnreadGroups((prev) => { const next = new Set(prev); next.delete(group.id); return next; });
    loadGroupMessages(group.id); fetchGroupMembers(group.id);
    if (group.owner === publicKey?.toBase58()) fetchGroupRequests(group.id);
  }

  async function loadGroupMessages(groupId: string) {
    const { data } = await supabase.from("group_messages").select("*").eq("group_id", groupId)
      .order("created_at", { ascending: false }).limit(50);
    setGroupMessages((data || []).reverse());
  }

  async function fetchGroupMembers(groupId: string) {
    const { data } = await supabase.from("group_members").select("*").eq("group_id", groupId);
    setGroupMembers(data || []);
  }

  async function sendGroupMessage() {
    if (!publicKey || !activeGroup || !message.trim()) return;
    const { error } = await supabase.from("group_messages").insert({
      group_id: activeGroup.id, sender: publicKey.toBase58(), content: message.trim(),
      reply_to: replyTo?.id || null, reply_content: replyTo?.content || null, reply_sender: replyTo?.sender || null,
    });
    if (error) { alert(JSON.stringify(error)); return; }
    setMessage(""); setReplyTo(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  async function addMemberToGroup(wallet: string) {
    if (!activeGroup || !wallet.trim()) return;
    const { error } = await supabase.from("group_members").insert({ group_id: activeGroup.id, wallet: wallet.trim(), role: "member" });
    if (error) { alert("Error: " + error.message); return; }
    setAddMemberWallet(""); fetchGroupMembers(activeGroup.id); fetchGroups();
  }

  async function addFriendToGroup(wallet: string) {
    await addMemberToGroup(wallet);
  }

  async function removeMemberFromGroup(wallet: string) {
    if (!activeGroup || !confirm("Remove this member?")) return;
    await supabase.from("group_members").delete().eq("group_id", activeGroup.id).eq("wallet", wallet);
    fetchGroupMembers(activeGroup.id);
  }

  async function leaveGroup() {
    if (!publicKey || !activeGroup || !confirm("Leave this group?")) return;
    await supabase.from("group_members").delete().eq("group_id", activeGroup.id).eq("wallet", publicKey.toBase58());
    setActiveGroup(null); setGroupMessages([]); fetchGroups();
  }

  async function deleteGroup() {
    if (!activeGroup || !confirm("Delete this group permanently?")) return;
    await supabase.from("groups").delete().eq("id", activeGroup.id);
    setActiveGroup(null); setGroupMessages([]); fetchGroups();
  }

  async function searchPublicGroups(query: string) {
    if (!query.trim()) { setSearchGroupResults([]); return; }
    setSearchingGroups(true);
    const { data } = await supabase.from("groups")
      .select("*")
      .eq("is_public", true)
      .ilike("name", `%${query}%`)
      .limit(10);
    setSearchGroupResults(data || []);
    setSearchingGroups(false);
  }

  async function requestJoinGroup(groupId: string) {
    if (!publicKey) return;
    const { data: group } = await supabase.from("groups").select("requires_approval").eq("id", groupId).single();
    if (!group) return;

    if (!group.requires_approval) {
      const { error } = await supabase.from("group_members").insert({ group_id: groupId, wallet: publicKey.toBase58(), role: "member" });
      if (error) { alert("Error joining group"); return; }
      fetchGroups();
      const { data: g } = await supabase.from("groups").select("*").eq("id", groupId).single();
      if (g) openGroup(g);
    } else {
      const { error } = await supabase.from("group_requests").insert({ group_id: groupId, wallet: publicKey.toBase58() });
      if (error && error.code !== "23505") { alert("Error sending request"); return; }
      alert("Request sent! Waiting for admin approval.");
    }
    setSearchGroupResults([]);
    setSearchGroupQuery("");
  }

  async function fetchGroupRequests(groupId: string) {
    const { data } = await supabase.from("group_requests").select("*").eq("group_id", groupId).eq("status", "pending");
    setGroupRequests(data || []);
  }

  async function approveGroupRequest(requestId: string, wallet: string) {
    if (!activeGroup) return;
    await supabase.from("group_members").insert({ group_id: activeGroup.id, wallet, role: "member" });
    await supabase.from("group_requests").update({ status: "approved" }).eq("id", requestId);
    fetchGroupRequests(activeGroup.id);
    fetchGroupMembers(activeGroup.id);
  }

  async function rejectGroupRequest(requestId: string) {
    await supabase.from("group_requests").update({ status: "rejected" }).eq("id", requestId);
    fetchGroupRequests(activeGroup?.id || "");
  }

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
    if (profile?.display_name) return profile.display_name;
    if (profile?.username) return `@${profile.username}`;
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  }

  function getUserBadge(wallet: string) {
    return profiles[wallet]?.is_premium ? "✅" : null;
  }

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
    await supabase.from("friends").delete().or(`and(sender.eq.${me},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${me})`);
    await supabase.from("blocked_users").insert({ blocker: me, blocked: wallet });
    fetchBlockedUsers(); fetchFriends();
  }

  async function unblockUser(wallet: string) {
    if (!publicKey) return;
    await supabase.from("blocked_users").delete().eq("blocker", publicKey.toBase58()).eq("blocked", wallet);
    fetchBlockedUsers();
  }

  async function checkBanStatus() {
    if (!publicKey) return;
    const { data } = await supabase.from("blocked_users")
      .select("*")
      .eq("blocker", "ADMIN")
      .eq("blocked", publicKey.toBase58())
      .maybeSingle();

    if (!data) { setIsBanned(false); setBanInfo(null); return; }

    // Check if ban has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      // Ban expired - remove it
      await supabase.from("blocked_users").delete()
        .eq("blocker", "ADMIN").eq("blocked", publicKey.toBase58());
      setIsBanned(false); setBanInfo(null);
      return;
    }

    setIsBanned(true);
    setBanInfo(data);
  }

  function validateUsername(val: string) {
    return /^[a-zA-Z0-9_]{1,30}$/.test(val);
  }

  async function saveProfile() {
    if (!publicKey) return;
    if (username && !validateUsername(username)) {
      alert("Username can only contain letters, numbers and underscores. No spaces.");
      return;
    }
    const updates: any = {
      wallet: publicKey.toBase58(),
      username: username || null,
      display_name: displayName || null,
      wallet_private: walletPrivate,
    };
    if (avatarUrl) updates.avatar_url = avatarUrl;
    const { error } = await supabase.from("profiles").upsert(updates);
    if (error) { alert("Error saving profile"); return; }
    setSavedUsername(username); fetchProfiles(); alert("Profile saved!");
  }

  async function loadProfile() {
    if (!publicKey) return;
    const { data } = await supabase.from("profiles").select("*").eq("wallet", publicKey.toBase58()).single();
    if (data) {
      setUsername(data.username || ""); setSavedUsername(data.username || "");
      setDisplayName(data.display_name || ""); setAvatarUrl(data.avatar_url || "");
      setWalletPrivate(data.wallet_private || false); setIsPremium(data.is_premium || false);
      setPremiumExpires(data.premium_expires_at || null);
    }
  }

  async function checkDailyViewLimit() {
    if (!publicKey) return 0;
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("daily_wallet_views").select("count").eq("wallet", publicKey.toBase58()).eq("view_date", today).single();
    const count = data?.count || 0; setDailyViewCount(count); return count;
  }

  async function incrementViewCount(targetWallet: string) {
    if (!publicKey) return;
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("daily_wallet_views").upsert({ wallet: publicKey.toBase58(), view_date: today, count: dailyViewCount + 1 });
    setDailyViewCount((prev) => prev + 1);
    await supabase.from("wallet_views").upsert({ viewer: publicKey.toBase58(), viewed: targetWallet, viewed_at: new Date().toISOString() });
  }

  async function handleViewProfile(wallet: string) {
    if (!wallet || wallet === publicKey?.toBase58()) return;
    supabase.from("profiles").select("*").eq("wallet", wallet).single().then(({ data }) => {
      setViewedProfile({ wallet, ...data });
      setShowProfileModal(true);
      setShowNFTs(false); setNfts([]); setOtherTokens([]);
    });
  }

  async function handleAvatarUpload(file: File) {
    if (!file) return;
    if (file.size > 500000) { alert("Image too large. Max 500KB."); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 100; let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } } else { if (h > MAX) { w = w * MAX / h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d"); ctx?.drawImage(img, 0, 0, w, h);
        setAvatarUrl(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  }

  async function checkPremiumStatus() {
    if (!publicKey) return;
    const { data } = await supabase.from("profiles").select("is_premium, premium_expires_at").eq("wallet", publicKey.toBase58()).single();
    if (data?.is_premium && data?.premium_expires_at) {
      if (new Date(data.premium_expires_at) > new Date()) { setIsPremium(true); setPremiumExpires(data.premium_expires_at); }
      else { setIsPremium(false); await supabase.from("profiles").update({ is_premium: false }).eq("wallet", publicKey.toBase58()); }
    }
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

  async function markMessagesAsSeen(wallet: string) {
    if (!publicKey) return;
    setTimeout(async () => {
      await supabase.from("messages").update({ seen: true }).eq("sender", wallet).eq("receiver", publicKey.toBase58()).eq("seen", false);
    }, 300);
  }

  async function fetchNFTs(wallet: string) {
    if (!wallet) return;
    setLoadingNFTs(true); setNfts([]); setNftWallet(wallet);
    try {
      const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAssetsByOwner", params: { ownerAddress: wallet, page: 1, limit: 50, displayOptions: { showFungible: false } } }),
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
      }).map((item: any) => ({ id: item.id, name: item.content?.metadata?.name || "Unknown NFT", image: item.content?.links?.image || item.content?.files?.[0]?.uri || null })));
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
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "searchAssets", params: { ownerAddress: wallet, tokenType: "fungible", page: 1, limit: 50 } }),
      });
      const json = await res.json();
      const tokens = (json?.result?.items || [])
        .filter((item: any) => { const b = item.token_info?.balance / Math.pow(10, item.token_info?.decimals ?? 0); return b > 0.000001; })
        .map((item: any) => { const dec = item.token_info?.decimals ?? 0; return { mint: item.id, symbol: item.token_info?.symbol || "???", name: item.content?.metadata?.name || "Unknown", balance: item.token_info?.balance / Math.pow(10, dec), decimals: dec, logo: item.content?.links?.image || null }; });
      setOtherTokens([{ mint: "SOL", symbol: "SOL", name: "Solana", balance: lamports / LAMPORTS_PER_SOL, decimals: 9, logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" }, ...tokens]);
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
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "searchAssets", params: { ownerAddress: publicKey.toBase58(), tokenType: "fungible", page: 1, limit: 50 } }),
      });
      const json = await res.json();
      const tokens = (json?.result?.items || [])
        .filter((item: any) => { const b = item.token_info?.balance / Math.pow(10, item.token_info?.decimals ?? 0); return b > 0.000001; })
        .map((item: any) => { const dec = item.token_info?.decimals ?? 0; return { mint: item.id, symbol: item.token_info?.symbol || "???", name: item.content?.metadata?.name || "Unknown", balance: item.token_info?.balance / Math.pow(10, dec), decimals: dec, logo: item.content?.links?.image || null, isSol: false }; });
      const solToken = { mint: "SOL", symbol: "SOL", name: "Solana", balance: lamports / LAMPORTS_PER_SOL, decimals: 9, isSol: true, logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" };
      setWalletTokens([solToken, ...tokens]); setSelectedToken(solToken);
    } catch (err) {
      const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
      const lamports = await connection.getBalance(publicKey);
      const sol = { mint: "SOL", symbol: "SOL", name: "Solana", balance: lamports / LAMPORTS_PER_SOL, decimals: 9, isSol: true, logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" };
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
      transaction.recentBlockhash = blockhash; transaction.feePayer = publicKey;
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      await supabase.from("messages").insert([{ sender: publicKey.toBase58(), receiver: activeChat, content: `💸 Sent ${amount} ${selectedToken.symbol}`, seen: false }]);
      setSolAmount(""); setShowSendSol(false); alert(`✅ ${amount} ${selectedToken.symbol} sent successfully!`);
    } catch (err: any) { alert("Error: " + (err.message || "Transaction failed")); } finally { setSendingSol(false); }
  }

  async function checkGateAccess() {
    if (!publicKey) return;
    const { data: settings } = await supabase.from("app_settings").select("value").eq("key", "token_gate_enabled").single();
    if (settings?.value !== "true") { setGateEnabled(false); setGateAccess("allowed"); return; }
    setGateEnabled(true);
    const { data: gates } = await supabase.from("token_gates").select("*").eq("active", true).in("feature", ["all", "chat_access"]);
    if (!gates || gates.length === 0) { setGateAccess("allowed"); return; }
    const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";
    try {
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "searchAssets", params: { ownerAddress: publicKey.toBase58(), tokenType: "fungible", page: 1, limit: 100 } }) });
      const json = await res.json();
      const items = json?.result?.items || [];
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, "confirmed");
      const solBalance = (await connection.getBalance(publicKey)) / LAMPORTS_PER_SOL;
      const missing: any[] = [];
      for (const gate of gates) {
        if (gate.token_mint === "SOL") { if (solBalance < gate.min_amount) missing.push(gate); }
        else { const found = items.find((item: any) => item.id === gate.token_mint); if (!found) { missing.push(gate); continue; } const bal = (found.token_info?.balance || 0) / Math.pow(10, found.token_info?.decimals ?? 0); if (bal < gate.min_amount) missing.push(gate); }
      }
      if (missing.length === 0) { setGateAccess("allowed"); setMissingTokens([]); } else { setGateAccess("denied"); setMissingTokens(missing); }
    } catch { setGateAccess("allowed"); }
  }

  async function clearConversation(wallet: string) {
    if (!publicKey || !wallet) return;
    if (!confirm("Delete this conversation? It will be removed from your chat list.")) return;
    const me = publicKey.toBase58();
    const { data } = await supabase.from("messages").select("id, sender, receiver")
      .or(`and(sender.eq.${me},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${me})`);
    if (data?.length) {
      for (const msg of data) {
        const field = msg.sender === me ? "deleted_for_sender" : "deleted_for_receiver";
        await supabase.from("messages").update({ [field]: true, deleted_at: new Date().toISOString() }).eq("id", msg.id);
      }
    }
    setInboxMessages((prev: any[]) => prev.filter((m: any) => m.otherWallet !== wallet));
    setChatMessages([]);
  }

  async function deleteMessageForMe(msgId: string) {
    if (!publicKey) return;
    const msg = chatMessages.find((m: any) => m.id === msgId);
    if (!msg) return;
    const field = msg.sender === publicKey.toBase58() ? "deleted_for_sender" : "deleted_for_receiver";
    await supabase.from("messages").update({ [field]: true, deleted_at: new Date().toISOString() }).eq("id", msgId);
    setChatMessages((prev: any[]) => prev.filter((m: any) => m.id !== msgId));
  }

  async function deleteMessageForAll(msgId: string) {
    if (!publicKey) return;
    await supabase.from("messages").update({ deleted_for_all: true, deleted_at: new Date().toISOString() }).eq("id", msgId);
    setChatMessages((prev: any[]) => prev.map((m: any) => m.id === msgId ? { ...m, deleted_for_all: true } : m));
  }

  async function sendMessage() {
    if (!publicKey) { alert("Connect wallet first"); return; }
    if (!activeChat || !message.trim()) return;
    if (isBlocked(activeChat)) { alert("You have blocked this user."); return; }
    if (isBlockedByThem(activeChat)) { alert("You cannot send messages to this user."); return; }
    const { error } = await supabase.from("messages").insert([{ sender: publicKey.toBase58(), receiver: activeChat, content: message.trim(), seen: false, reply_to: replyTo?.id || null, reply_content: replyTo?.content || null, reply_sender: replyTo?.sender || null }]);
    if (error) { alert(JSON.stringify(error)); return; }
    sendTyping(false);
    if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
    setMessage(""); setReplyTo(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  async function fetchInbox() {
    if (!publicKey) return;
    const { data, error } = await supabase.from("messages").select("*").or(`sender.eq.${publicKey.toBase58()},receiver.eq.${publicKey.toBase58()}`).order("created_at", { ascending: false });
    if (error) { console.error(error); return; }
    const latestMessages = new Map();
    data?.forEach((msg) => { const otherWallet = msg.sender === publicKey.toBase58() ? msg.receiver : msg.sender; if (!latestMessages.has(otherWallet)) latestMessages.set(otherWallet, { ...msg, otherWallet }); });
    setInboxMessages(Array.from(latestMessages.values()));
  }

  async function loadConversation(wallet: string) {
    if (!wallet) return;
    if (!publicKey) { setActiveChat(wallet); return; }
    setActiveChat(wallet); setActiveGroup(null);
    setShowNFTs(false);
    setUnreadCounts((prev: any) => ({ ...prev, [wallet]: 0 }));
    // Add to inbox immediately if not already there
    setInboxMessages((prev) => {
      const exists = prev.find((m: any) => m.otherWallet === wallet);
      if (exists) return prev;
      return [{ otherWallet: wallet, content: "", created_at: new Date().toISOString(), sender: publicKey.toBase58(), receiver: wallet }, ...prev];
    });
    const { data, error } = await supabase.from("messages").select("*")
      .or(`and(sender.eq.${publicKey.toBase58()},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${publicKey.toBase58()})`)
      .order("created_at", { ascending: false }).limit(50);
    if (error) { console.error(error); return; }
    const me = publicKey.toBase58();
    const msgs = (data || []).map((m: any) => {
      // If deleted for me, show as deleted placeholder
      if (m.sender === me && m.deleted_for_sender) return { ...m, deleted_for_all: true };
      if (m.receiver === me && m.deleted_for_receiver) return { ...m, deleted_for_all: true };
      return m;
    }).reverse();
    setChatMessages(msgs); setHasMoreMessages(msgs.length === 50);
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
    setChatMessages((prev) => [...older, ...prev]); setHasMoreMessages(older.length === 50); setLoadingMore(false);
    if (older.length) fetchReactions(older.map((m: any) => m.id));
    setTimeout(() => { const el = messagesContainerRef.current; if (el) el.scrollTop = 120; }, 50);
  }

  useEffect(() => {
    fetchInbox(); fetchFriends(); fetchFriendRequests();
    fetchBlockedUsers(); fetchBlockedByUsers();
    fetchProfiles(); loadProfile(); fetchPresence();
    checkGateAccess(); loadMessageExpiry();
    fetchNotifications(); loadMyStatus(); fetchGroups();
    checkPremiumStatus(); checkDailyViewLimit(); checkBanStatus();

    if (!publicKey) return;
    updatePresence();
    const presenceInterval = setInterval(updatePresence, 30000);
    const onlineInterval = setInterval(fetchPresence, 10000);

    const channel = supabase.channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const newMessage = payload.new as any;
        const me = publicKey.toBase58();
        const { data: blockCheck } = await supabase.from("blocked_users").select("*").eq("blocker", me).eq("blocked", newMessage.sender).maybeSingle();
        if (blockCheck) return;
        if (newMessage.receiver === me) {
          const { data: profileData } = await supabase.from("profiles").select("*").eq("wallet", newMessage.sender).maybeSingle();
          if (profileData) setProfiles((prev: any) => ({ ...prev, [profileData.wallet]: profileData }));
          if (newMessage.sender === activeChatRef.current) supabase.from("messages").update({ seen: true }).eq("id", newMessage.id);
          setInboxMessages((prev) => {
            if (newMessage.sender !== activeChatRef.current) setUnreadCounts((prevCounts: any) => ({ ...prevCounts, [newMessage.sender]: (prevCounts[newMessage.sender] || 0) + 1 }));
            const filtered = prev.filter((m) => m.otherWallet !== newMessage.sender);
            return [{ ...newMessage, otherWallet: newMessage.sender }, ...filtered];
          });
        }
        if (activeChatRef.current && ((newMessage.sender === activeChatRef.current && newMessage.receiver === me) || (newMessage.sender === me && newMessage.receiver === activeChatRef.current))) {
          setChatMessages((prev) => { if (prev.find((m) => m.id === newMessage.id)) return prev; return [...prev, newMessage]; });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const updated = payload.new as any;
        const me = publicKey.toBase58();
        if (updated.seen === true) setChatMessages((prev) => prev.map((m: any) => m.id === updated.id ? { ...m, seen: true } : m));
        if (updated.deleted_for_all === true) setChatMessages((prev) => prev.map((m: any) => m.id === updated.id ? { ...m, deleted_for_all: true } : m));
        if ((updated.deleted_for_sender === true && updated.sender === me) || (updated.deleted_for_receiver === true && updated.receiver === me)) setChatMessages((prev) => prev.filter((m: any) => m.id !== updated.id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, (payload) => { const r = (payload.new || payload.old) as any; if (r?.message_id) fetchReactions([r.message_id]); })
      .on("postgres_changes", { event: "*", schema: "public", table: "typing" }, async () => {
        const me = publicKey.toBase58();
        const { data } = await supabase.from("typing").select("*").eq("receiver", me);
        const someoneTyping = data?.some((row: any) => { const age = Date.now() - new Date(row.updated_at).getTime(); return row.wallet !== me && age < 3000 && row.wallet === activeChatRef.current; });
        setOtherIsTyping(!!someoneTyping);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (someoneTyping) typingTimeoutRef.current = setTimeout(() => setOtherIsTyping(false), 3000);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_users" }, (payload) => {
        const me = publicKey.toBase58();
        const record = (payload.new || payload.old) as any;
        if (record?.blocker === "ADMIN" && record?.blocked === me) {
          checkBanStatus();
        }
        fetchBlockedUsers(); fetchBlockedByUsers();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => { const notif = payload.new as any; setActiveNotif(notif); setNotifications((prev) => [notif, ...prev.slice(0, 4)]); })
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_users" }, () => { fetchBlockedUsers(); fetchBlockedByUsers(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "friends" }, () => { fetchFriends(); fetchFriendRequests(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => { const updated = payload.new as any; if (updated?.wallet) setProfiles((prev: any) => ({ ...prev, [updated.wallet]: { ...prev[updated.wallet], ...updated } })); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages" }, (payload) => {
  const msg = payload.new as any;
  if (activeGroupRef.current && msg.group_id === activeGroupRef.current.id) setGroupMessages((prev) => { if (prev.find((m: any) => m.id === msg.id)) return prev; return [...prev, msg]; });
  if (!activeGroupRef.current || msg.group_id !== activeGroupRef.current.id) {
    setUnreadGroups((prev) => new Set([...prev, msg.group_id]));
  }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(presenceInterval); clearInterval(onlineInterval);
      if (seenPollingRef.current) clearInterval(seenPollingRef.current);
      sendTyping(false);
    };
  }, [publicKey]);

  const amIBlocked = activeChat ? isBlockedByThem(activeChat) : false;
  const didIBlock = activeChat ? isBlocked(activeChat) : false;

  const ProfileModal = showProfileModal && viewedProfile ? (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowProfileModal(false)}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4 mb-5">
          {viewedProfile.avatar_url ? (
            <img src={viewedProfile.avatar_url} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-zinc-700" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-green-400 flex items-center justify-center text-white text-2xl font-bold">
              {(viewedProfile.display_name || viewedProfile.username || viewedProfile.wallet || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="text-white font-bold text-lg truncate">
                {viewedProfile.display_name || (viewedProfile.username ? `@${viewedProfile.username}` : `${viewedProfile.wallet?.slice(0, 6)}...`)}
              </div>
              {viewedProfile.is_premium && <span className="text-green-400 text-sm">✅</span>}
            </div>
            {viewedProfile.display_name && viewedProfile.username && (
              <div className="text-zinc-400 text-sm">@{viewedProfile.username}</div>
            )}
            <div className="text-zinc-600 text-xs font-mono truncate mt-0.5">{viewedProfile.wallet}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={() => { loadConversation(viewedProfile.wallet); setShowProfileModal(false); }}
            className="bg-green-600 hover:bg-green-500 text-white rounded-xl py-2.5 text-sm font-bold transition-colors col-span-2">
            💬 Send Message
          </button>
          {isFriend(viewedProfile.wallet) ? (
            <button onClick={() => { unfriend(viewedProfile.wallet); setShowProfileModal(false); }}
              className="bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl py-2.5 text-sm transition-colors">
              👥 Friends
            </button>
          ) : friendRequests.some((r: any) => r.sender === publicKey?.toBase58() && r.receiver === viewedProfile.wallet && r.accepted === false) ? (
            <button disabled
              className="bg-yellow-700/60 text-yellow-300 rounded-xl py-2.5 text-sm cursor-not-allowed opacity-80">
              ⏳ Request Sent
            </button>
          ) : friendRequests.some((r: any) => r.receiver === publicKey?.toBase58() && r.sender === viewedProfile.wallet && r.accepted === false) ? (
            <button onClick={() => { acceptFriend(friendRequests.find((r: any) => r.sender === viewedProfile.wallet && r.receiver === publicKey?.toBase58())?.id); setShowProfileModal(false); }}
              className="bg-green-600 hover:bg-green-500 text-white rounded-xl py-2.5 text-sm font-bold transition-colors">
              ✅ Accept Request
            </button>
          ) : (
            <button onClick={() => { addFriend(viewedProfile.wallet); }}
              className="bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl py-2.5 text-sm font-bold transition-colors">
              ➕ Add Friend
            </button>
          )}
          {!isBlocked(viewedProfile.wallet) ? (
            <button onClick={() => { blockUser(viewedProfile.wallet); setShowProfileModal(false); }}
              className="bg-red-900 hover:bg-red-800 text-white rounded-xl py-2.5 text-sm transition-colors">
              🚫 Block
            </button>
          ) : (
            <button onClick={() => { unblockUser(viewedProfile.wallet); setShowProfileModal(false); }}
              className="bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl py-2.5 text-sm transition-colors">
              Unblock
            </button>
          )}
          {!viewedProfile.wallet_private ? (
            <button onClick={async () => {
                // Check daily limit for free users
                if (!isPremium) {
                  const count = await checkDailyViewLimit();
                  if (count >= 5) {
                    alert("You've reached your daily limit of 5 wallet views. Upgrade to Premium for unlimited access!");
                    return;
                  }
                  await incrementViewCount(viewedProfile.wallet);
                }
                const w = viewedProfile.wallet;
                setShowProfileModal(false);
                loadConversation(w);
                fetchNFTs(w);
                fetchOtherWalletTokens(w);
                setTimeout(() => setShowNFTs(true), 100);
              }}
              className="bg-purple-700 hover:bg-purple-600 text-white rounded-xl py-2.5 text-sm transition-colors col-span-2">
              🖼 View Wallet — {isPremium ? "Unlimited" : `${dailyViewCount}/5 today`}
            </button>
          ) : (
            <div className="col-span-2 bg-zinc-800 text-zinc-500 rounded-xl py-2.5 text-sm text-center">
              🔒 Wallet is private
            </div>
          )}
        </div>
        {!isPremium && (
          <div className="text-center text-zinc-600 text-xs">{dailyViewCount}/5 free wallet views today</div>
        )}
        <button onClick={() => setShowProfileModal(false)} className="w-full mt-2 text-zinc-500 hover:text-white text-sm transition-colors">Close</button>
      </div>
    </div>
  ) : null;

  if (isBanned) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-950 border border-red-900 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold mb-2 text-red-400">Account Banned</h1>
          <p className="text-zinc-400 text-sm mb-4">
            Your account has been banned from Wallet Chat.
          </p>
          {banInfo?.reason && (
            <div className="bg-zinc-900 rounded-xl px-4 py-3 mb-4 text-sm text-zinc-300">
              <span className="text-zinc-500">Reason: </span>{banInfo.reason}
            </div>
          )}
          {banInfo?.expires_at ? (
            <div className="text-zinc-500 text-xs">
              Ban expires: {new Date(banInfo.expires_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          ) : (
            <div className="text-zinc-500 text-xs">This is a permanent ban.</div>
          )}
          <div className="mt-6">
            <WalletMultiButtonDynamic />
          </div>
        </div>
      </main>
    );
  }

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
                {gate.token_logo ? <img src={gate.token_logo} className="w-8 h-8 rounded-full" alt="" /> : <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold">{gate.token_symbol.slice(0, 2)}</div>}
                <div className="text-left">
                  <div className="font-bold text-white">{gate.token_symbol}</div>
                  <div className="text-zinc-500 text-xs">Minimum: {gate.min_amount} {gate.token_symbol}</div>
                </div>
              </div>
            ))}
          </div>
          <WalletMultiButtonDynamic />
          <button onClick={checkGateAccess} className="mt-3 w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg p-3 text-sm transition-colors">↻ Check again</button>
        </div>
      </main>
    );
  }

  // ── Shared UI pieces ──────────────────────────────────────────────────────
  const NotifBanner = activeNotif ? (
    <div className="w-full bg-zinc-900 border-b border-green-700 px-4 py-2 flex items-center justify-between gap-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="text-lg">📢</div>
        <div>
          <div className="text-white font-semibold text-xs">{activeNotif.title}</div>
          <div className="text-zinc-400 text-xs">{activeNotif.message}</div>
        </div>
      </div>
      <button onClick={dismissNotif} className="text-zinc-500 hover:text-white text-xs flex-shrink-0">✕</button>
    </div>
  ) : null;

  const ContextMenuUI = contextMenu && (() => {
    const msg = chatMessages.find((m: any) => m.id === contextMenu.msgId);
    if (!msg) return null;
    return (
      <>
        <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
        <div className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1 min-w-[180px]"
          style={{ top: Math.min(contextMenu.y - 10, window.innerHeight - 300), left: Math.min(contextMenu.x, window.innerWidth - 200) }}>
          <button onClick={() => { setReplyTo(msg); setContextMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-sm text-white">↩️ Reply</button>
          <button onClick={() => copyMessage(msg.content)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-sm text-white">📋 Copy</button>
          <div className="px-3 py-1.5 flex flex-wrap gap-1">
            {["❤️","😂","😮","😢","👍","👎","🔥","🎉"].map((e) => (
              <button key={e} onClick={() => { toggleReaction(msg.id, e); setContextMenu(null); }} className="text-lg hover:bg-zinc-800 rounded p-0.5">{e}</button>
            ))}
          </div>
          <div className="h-px bg-zinc-800 mx-2 my-1" />
          <button onClick={() => { setContextMenu(null); setSelectionMode(true); toggleSelectMsg(msg.id); setShowDeleteConfirm("me"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-sm text-red-400">🗑 Delete for me</button>
          {msg.sender === publicKey?.toBase58() && (
            <button onClick={() => { setContextMenu(null); setSelectionMode(true); toggleSelectMsg(msg.id); setShowDeleteConfirm("all"); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-sm text-red-400">🗑 Delete for everyone</button>
          )}
        </div>
      </>
    );
  })();

  // ── Prop bundles passed to module-scope components ────────────────────────
  const chatWindowProps = {
    activeChat, setActiveChat, setActiveTab, profiles, isOnline, getDisplayName, otherIsTyping,
    showSearch, setShowSearch, searchQuery, setSearchQuery, chatMessages, publicKey,
    fetchNFTs, fetchOtherWalletTokens, showNFTs, setShowNFTs, nftWallet, setNftTab, nftTab,
    isFriend, unfriend, addFriend, isBlocked, blockUser, unblockUser, friendRequests,
    loadingNFTs, nfts, loadingOtherTokens, otherTokens,
    messagesContainerRef, hasMoreMessages, loadMoreMessages, loadingMore,
    reactions, selectedMsgs, selectionMode, toggleSelectMsg, toggleReaction, setContextMenu, contextMenu,
    ContextMenuUI, clearSelection, showDeleteConfirm, setShowDeleteConfirm, deleteSelected,
    amIBlocked, didIBlock, showSendSol, setShowSendSol, loadingTokens, walletTokens,
    selectedToken, setSelectedToken, solAmount, setSolAmount, sendSol, sendingSol, fetchWalletTokens,
    message, handleMessageInput, textareaRef, showEmojiPicker, setShowEmojiPicker,
    replyTo, setReplyTo, autoResize, setMessage, sendMessage,
    handleViewProfile, getUserBadge, isPremium,
    deleteMessageForMe, deleteMessageForAll, clearConversation,
  };

  const groupWindowProps = {
    activeGroup, setActiveGroup, setActiveTab, groupMembers, showGroupInfo, setShowGroupInfo,
    profiles, getDisplayName, publicKey, removeMemberFromGroup, groupRequests,
    approveGroupRequest, rejectGroupRequest, addMemberWallet, setAddMemberWallet, addMemberToGroup,
    friends, addFriendToGroup, deleteGroup, leaveGroup, groupMessages, messagesContainerRef,
    message, handleMessageInput, textareaRef, showEmojiPicker, setShowEmojiPicker,
    replyTo, setReplyTo, autoResize, setMessage, sendGroupMessage, fetchGroups,
    contextMenu, setContextMenu, toggleReaction, reactions, copyMessage,
    selectedMsgs, selectionMode, toggleSelectMsg, clearSelection,
    showDeleteConfirm, setShowDeleteConfirm, deleteSelected,
    handleViewProfile, loadConversation,
  };

  // NOTE: this is a plain JSX value, not a component function. If it were
  // declared as `const MainContent = () => (...)` and rendered as
  // `<MainContent />`, React would treat it as a brand-new component type on
  // every render of Home (i.e. every keystroke), unmounting and remounting
  // everything inside it — including the message textarea — and killing
  // focus after one character. Embedding the JSX directly as `{mainContent}`
  // avoids that.
  const mainContent = (
    <>
      {activeTab === "chats" && !activeChat && !activeGroup && (
        <TabChats receiver={receiver} setReceiver={setReceiver} loadConversation={loadConversation}
          inboxMessages={inboxMessages} profiles={profiles} isOnline={isOnline} unreadCounts={unreadCounts}
          getDisplayName={getDisplayName} formatInboxTime={formatInboxTime} handleViewProfile={handleViewProfile} clearConversation={clearConversation} />
      )}
      {activeTab === "friends" && !activeChat && !activeGroup && (
        <TabFriends friendRequests={friendRequests} publicKey={publicKey} profiles={profiles}
          getDisplayName={getDisplayName} acceptFriend={acceptFriend} rejectFriend={rejectFriend}
          receiver={receiver} setReceiver={setReceiver} addFriend={addFriend} friends={friends}
          isOnline={isOnline} loadConversation={loadConversation} setActiveTab={setActiveTab} unfriend={unfriend}
          handleViewProfile={handleViewProfile} />
      )}
      {activeTab === "groups" && !activeGroup && !activeChat && (
        <TabGroups setShowCreateGroup={setShowCreateGroup} searchGroupQuery={searchGroupQuery}
          setSearchGroupQuery={setSearchGroupQuery} searchPublicGroups={searchPublicGroups}
          searchingGroups={searchingGroups} searchGroupResults={searchGroupResults} groups={groups}
          openGroup={openGroup} requestJoinGroup={requestJoinGroup} publicKey={publicKey}
          showCreateGroup={showCreateGroup} newGroupName={newGroupName} setNewGroupName={setNewGroupName}
          newGroupDesc={newGroupDesc} setNewGroupDesc={setNewGroupDesc} groupIsPublic={groupIsPublic}
          setGroupIsPublic={setGroupIsPublic} groupRequiresApproval={groupRequiresApproval}
          setGroupRequiresApproval={setGroupRequiresApproval} friends={friends} profiles={profiles}
          getDisplayName={getDisplayName} createGroup={createGroup} creatingGroup={creatingGroup} />
      )}
      {activeTab === "settings" && !activeChat && !activeGroup && (
        <TabSettings publicKey={publicKey} profiles={profiles} savedUsername={savedUsername}
          username={username} setUsername={setUsername} saveProfile={saveProfile}
          displayName={displayName} setDisplayName={setDisplayName}
          avatarUrl={avatarUrl} handleAvatarUpload={handleAvatarUpload}
          isPremium={isPremium} premiumExpires={premiumExpires}
          setIsPremium={setIsPremium} setPremiumExpires={setPremiumExpires}
          walletPrivate={walletPrivate} setWalletPrivate={setWalletPrivate}
          messageExpiryDays={messageExpiryDays} saveMessageExpiry={saveMessageExpiry} />
      )}
      {activeChat && <ChatWindow {...chatWindowProps} />}
      {activeGroup && !activeChat && <GroupWindow {...groupWindowProps} />}
    </>
  );
  // ^ mainContent ends here (was previously wrapped in an inline component)

  return (
    <main className="bg-black text-white flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      {NotifBanner}
      {ProfileModal}

      {/* Desktop */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-zinc-800 flex flex-col overflow-hidden flex-shrink-0">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <div className="text-lg font-bold flex-1">Wallet Chat</div>
            <WalletMultiButtonDynamic />
          </div>
          <div className="flex border-b border-zinc-800">
            {([
              { key: "chats", label: "Chats", badge: (Object.values(unreadCounts) as number[]).reduce((a, b) => a + b, 0) },
              { key: "friends", label: "Friends", badge: friendRequests.filter((r: any) => r.receiver === publicKey?.toBase58()).length },
              { key: "groups", label: "Groups", badge: 0 },
            ] as const).map((t) => (
              <button key={t.key} onClick={() => { if (t.key === "friends" || t.key === "groups") { setActiveChat(""); setActiveGroup(null); } setActiveTab(t.key); }}
                className={`flex-1 py-2 text-xs font-medium capitalize transition-colors relative ${activeTab === t.key ? "text-green-400 border-b-2 border-green-400" : "text-zinc-500 hover:text-white"}`}>
                {t.label}
                {t.badge > 0 && (
                  <span className="absolute top-1 right-1 min-w-3.5 h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold">
                    {t.badge > 99 ? "99+" : t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {activeTab === "chats" && (
              <div className="p-3 flex flex-col gap-2">
                <div className="flex gap-2">
                  <input value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="Wallet..."
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  <button onClick={() => { loadConversation(receiver); setReceiver(""); }} className="bg-green-600 text-white rounded-lg px-3 text-sm font-bold">Open</button>
                </div>
                {inboxMessages.map((msg) => (
                  <div key={msg.otherWallet} className="group relative flex items-center border rounded-lg transition-colors cursor-pointer
                      ${activeChat === msg.otherWallet || unreadCounts[msg.otherWallet] > 0 ? 'bg-zinc-800 border-green-800' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}">
                    <div className={`flex-1 p-3 text-left ${activeChat === msg.otherWallet || unreadCounts[msg.otherWallet] > 0 ? "bg-zinc-800 border-green-800" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"} border rounded-lg transition-colors`}
                      onClick={() => loadConversation(msg.otherWallet)}>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-shrink-0">
                          <Avatar wallet={msg.otherWallet} profile={profiles[msg.otherWallet]} size={36} />
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${isOnline(msg.otherWallet) ? "bg-green-400" : "bg-zinc-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="text-white text-sm font-medium truncate">{getDisplayName(msg.otherWallet)}</div>
                            <div className="flex items-center gap-1.5">
                              <div className="text-[10px] text-zinc-500">{formatInboxTime(msg.created_at)}</div>
                              <div onClick={(e) => { e.stopPropagation(); clearConversation(msg.otherWallet); }}
                                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-400 transition-all text-xs px-1 cursor-pointer"
                                title="Delete">✕</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="truncate text-xs text-zinc-400">{msg.content}</div>
                            {unreadCounts[msg.otherWallet] > 0 && <div className="min-w-4 h-4 px-1 rounded-full bg-green-600 text-white text-[9px] flex items-center justify-center">{unreadCounts[msg.otherWallet]}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "friends" && (
              <div className="p-3 flex flex-col gap-2">
                {friends.map((f) => {
                  const other = f.sender === publicKey?.toBase58() ? f.receiver : f.sender;
                  return (
                    <div key={other} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex items-center gap-2 cursor-pointer hover:border-zinc-700" onClick={() => loadConversation(other)}>
                      <Avatar wallet={other} profile={profiles[other]} size={32} />
                      <div className="flex-1 min-w-0"><div className="text-white text-sm">{getDisplayName(other)}</div></div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeTab === "groups" && (
              <div className="p-3 flex flex-col gap-2">
                <button onClick={() => setShowCreateGroup(true)} className="w-full bg-green-600 text-white rounded-lg py-2 text-sm font-bold">+ New Group</button>
                {groups.map((group) => (
                  <button key={group.id} onClick={() => openGroup(group)}
                    className={`bg-zinc-900 border rounded-lg p-3 text-left transition-colors ${activeGroup?.id === group.id ? "border-green-700" : "border-zinc-800 hover:border-zinc-700"}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${group.avatar_color}, #14F195)` }}>
                        {group.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium">{group.name}</div>
                        <div className="text-zinc-500 text-xs truncate">{group.description || "No description"}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => { setActiveChat(""); setActiveGroup(null); setActiveTab("settings"); }}
            className={`flex items-center gap-2 px-4 py-3 border-t border-zinc-800 text-sm transition-colors ${activeTab === "settings" ? "text-green-400" : "text-zinc-500 hover:text-white"}`}>
            ⚙️ Settings
          </button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          {mainContent}
        </div>
      </div>

      {/* Mobile */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden">
        {mainContent}
        {!activeChat && !activeGroup && (
          <BottomNav unreadCounts={unreadCounts} friendRequests={friendRequests} publicKey={publicKey}
            activeTab={activeTab} setActiveTab={setActiveTab} setActiveChat={setActiveChat} setActiveGroup={setActiveGroup} />
        )}
      </div>
    </main>
  );
}
