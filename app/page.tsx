"use client";

import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState, useRef } from "react";

import { supabase } from "../lib/supabase";
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";


const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui"))
      .WalletMultiButton,
  { ssr: false }
);

// ── Avatar generat din wallet ─────────────────────────────────────────────────
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
  const initials = profile?.username
    ? profile.username.slice(0, 2).toUpperCase()
    : wallet.slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "#fff",
      flexShrink: 0, userSelect: "none",
    }}>
      {initials}
    </div>
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

export default function Home() {
  const { publicKey, sendTransaction } = useWallet();
  const [showSendSol, setShowSendSol] = useState(false);
  const [showNFTs, setShowNFTs] = useState(false);
  const [nftTab, setNftTab] = useState<"nfts" | "tokens">("nfts");
  const [nfts, setNfts] = useState<any[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [nftWallet, setNftWallet] = useState("");
  const [otherTokens, setOtherTokens] = useState<any[]>([]);
  const [loadingOtherTokens, setLoadingOtherTokens] = useState(false);
  const [solAmount, setSolAmount] = useState("");
  const [sendingSol, setSendingSol] = useState(false);
  const [walletTokens, setWalletTokens] = useState<any[]>([]);
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);

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

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const [unreadCounts, setUnreadCounts] = useState<any>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeChatRef = useRef(activeChat);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const chatMessagesRef = useRef(chatMessages);
  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  // Cand publicKey devine disponibil dupa refresh, reincarca conversatia activa
  useEffect(() => {
    if (publicKey && activeChat) {
      loadConversation(activeChat);
    }
  }, [publicKey]);

  function formatMessageTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "acum";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return "ieri";
    return date.toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
  }

  function formatInboxTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "acum";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
    if (diffDays < 7) return date.toLocaleDateString("ro-RO", { weekday: "short" });
    return date.toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
  }

  function isOnline(wallet: string) {
    return onlineUsers.has(wallet);
  }

  async function updatePresence() {
    if (!publicKey) return;
    await supabase.from("presence").upsert({
      wallet: publicKey.toBase58(),
      last_seen: new Date().toISOString(),
    });
  }

  async function fetchPresence() {
    const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("presence")
      .select("wallet")
      .gte("last_seen", cutoff);
    setOnlineUsers(new Set(data?.map((r: any) => r.wallet) || []));
  }

  async function pollLastMessageSeen() {
    if (!publicKey || !activeChatRef.current) return;
    // gasim ultimul mesaj trimis de noi - folosim ref ca sa avem valoarea curenta
    const lastMine = [...chatMessagesRef.current].reverse().find(
      (m: any) => m.sender === publicKey.toBase58() && !m.seen
    );
    if (!lastMine) {
      // toate vazute, oprim polling
      if (seenPollingRef.current) {
        clearInterval(seenPollingRef.current);
        seenPollingRef.current = null;
      }
      return;
    }
    const { data } = await supabase
      .from("messages")
      .select("id, seen")
      .eq("id", lastMine.id)
      .single();
    if (data?.seen) {
      setChatMessages((prev) =>
        prev.map((m: any) =>
          m.sender === publicKey.toBase58() && m.receiver === activeChatRef.current
            ? { ...m, seen: true }
            : m
        )
      );
      if (seenPollingRef.current) {
        clearInterval(seenPollingRef.current);
        seenPollingRef.current = null;
      }
    }
  }

  async function sendTyping(isTyping: boolean) {
    if (!publicKey || !activeChatRef.current) return;
    if (isTyping) {
      await supabase.from("typing").upsert({
        wallet: publicKey.toBase58(),
        receiver: activeChatRef.current,
        updated_at: new Date().toISOString(),
      });
    } else {
      await supabase.from("typing").delete().eq("wallet", publicKey.toBase58());
    }
  }

  function handleMessageInput(val: string) {
    setMessage(val);
    sendTyping(true);
    if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
    myTypingTimeoutRef.current = setTimeout(() => sendTyping(false), 2000);
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  // Auto-scroll whenever chatMessages changes
  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom("smooth");
    }
    // daca avem mesaje neseen trimise de noi, pornim polling
    if (!publicKey) return;
    const hasUnseenSent = chatMessages.some(
      (m: any) => m.sender === publicKey.toBase58() && !m.seen
    );
    if (hasUnseenSent && !seenPollingRef.current) {
      seenPollingRef.current = setInterval(pollLastMessageSeen, 2000);
    }
  }, [chatMessages]);

  async function fetchProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*");

    if (error) {
      console.error(error);
      return;
    }

    const map: any = {};
    data?.forEach((profile) => {
      map[profile.wallet] = profile;
    });

    setProfiles(map);
  }

  function getDisplayName(wallet?: string) {
    if (!wallet) return "Unknown";

    const profile = profiles[wallet];

    if (profile?.username) {
      return `@${profile.username}`;
    }

    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  }

  async function addFriend(wallet: string) {
    if (!publicKey) return;

    const me = publicKey.toBase58();

    const { data } = await supabase
      .from("friends")
      .select("*")
      .or(
        `and(sender.eq.${me},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${me})`
      )
      .maybeSingle();

    if (data) return;

    await supabase.from("friends").insert({
      sender: me,
      receiver: wallet,
      accepted: false,
    });

    fetchFriends();
    fetchFriendRequests();
  }

  async function unfriend(wallet: string) {
    if (!publicKey) return;

    const me = publicKey.toBase58();

    await supabase
      .from("friends")
      .delete()
      .or(
        `and(sender.eq.${me},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${me})`
      );

    fetchFriends();
  }

  async function fetchFriends() {
    if (!publicKey) return;

    const me = publicKey.toBase58();

    const { data } = await supabase
      .from("friends")
      .select("*")
      .eq("accepted", true)
      .or(`sender.eq.${me},receiver.eq.${me}`);

    setFriends(data || []);
  }

  function isFriend(wallet: string) {
    const me = publicKey?.toBase58();

    return friends.some(
      (f) =>
        (f.sender === me && f.receiver === wallet) ||
        (f.receiver === me && f.sender === wallet)
    );
  }

  const [friendRequests, setFriendRequests] = useState<any[]>([]);

  async function fetchFriendRequests() {
    if (!publicKey) return;

    const me = publicKey.toBase58();

    const { data } = await supabase
      .from("friends")
      .select("*")
      .eq("accepted", false)
      .or(`sender.eq.${me},receiver.eq.${me}`);

    setFriendRequests(data || []);
  }

  async function acceptFriend(id: string) {
    await supabase
      .from("friends")
      .update({ accepted: true })
      .eq("id", id);

    fetchFriends();
    fetchFriendRequests();
  }

  async function rejectFriend(id: string) {
    await supabase
      .from("friends")
      .delete()
      .eq("id", id);

    fetchFriendRequests();
  }

  async function fetchBlockedUsers() {
    if (!publicKey) return;

    const me = publicKey.toBase58();

    const { data } = await supabase
      .from("blocked_users")
      .select("*")
      .eq("blocker", me);

    setBlockedUsers(data || []);
  }

  // Fetch users who have blocked ME
  async function fetchBlockedByUsers() {
    if (!publicKey) return;

    const me = publicKey.toBase58();

    const { data } = await supabase
      .from("blocked_users")
      .select("*")
      .eq("blocked", me);

    setBlockedByUsers(data || []);
  }

  function isBlocked(wallet: string) {
    return blockedUsers.some((b) => b.blocked === wallet);
  }

  // Check if the other person has blocked ME
  function isBlockedByThem(wallet: string) {
    return blockedByUsers.some((b) => b.blocker === wallet);
  }

  async function blockUser(wallet: string) {
    if (!publicKey) return;

    const me = publicKey.toBase58();

    await supabase
      .from("friends")
      .delete()
      .or(
        `and(sender.eq.${me},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${me})`
      );

    await supabase
      .from("blocked_users")
      .insert({ blocker: me, blocked: wallet });

    fetchBlockedUsers();
    fetchFriends();
  }

  async function unblockUser(wallet: string) {
    if (!publicKey) return;

    const me = publicKey.toBase58();

    await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker", me)
      .eq("blocked", wallet);

    fetchBlockedUsers();
  }

  async function saveProfile() {
    if (!publicKey) return;

    const { error } = await supabase
      .from("profiles")
      .upsert({ wallet: publicKey.toBase58(), username });

    if (error) {
      console.error(error);
      alert("Error saving profile");
      return;
    }

    setSavedUsername(username);
    fetchProfiles();
    alert("Profile saved!");
  }

  async function loadProfile() {
    if (!publicKey) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("wallet", publicKey.toBase58())
      .single();

    if (data) {
      setUsername(data.username || "");
      setSavedUsername(data.username || "");
    }
  }

  async function markMessagesAsSeen(wallet: string) {
    if (!publicKey) return;
    // delay mic ca sa nu interfere cu setChatMessages
    setTimeout(async () => {
      await supabase
        .from("messages")
        .update({ seen: true })
        .eq("sender", wallet)
        .eq("receiver", publicKey.toBase58())
        .eq("seen", false);
    }, 300);
  }

  async function fetchNFTs(wallet: string) {
    if (!wallet) return;
    setLoadingNFTs(true);
    setNfts([]);
    setNftWallet(wallet);
    try {
      const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getAssetsByOwner",
          params: {
            ownerAddress: wallet,
            page: 1,
            limit: 50,
            displayOptions: { showFungible: false, showNativeBalance: false },
          },
        }),
      });
      const json = await res.json();
      const items = json?.result?.items || [];
      const nftList = items
        .filter((item: any) => {
          // doar NFT-uri reale
          const validInterface = (
            item.interface === "V1_NFT" ||
            item.interface === "ProgrammableNFT" ||
            item.interface === "V1_PRINT"
          );
          if (!validInterface) return false;
          // filtram spam: fara royalty = spam de obicei
          if (item.royalty?.basis_points === 0 && !item.grouping?.length) return false;
          // filtram daca are "spam" sau "airdrop" in nume
          const name = (item.content?.metadata?.name || "").toLowerCase();
          const spamWords = ["spam", "airdrop", "claim", "free", "visit", "www.", "http", ".com", ".io", "token", "reward"];
          if (spamWords.some(w => name.includes(w))) return false;
          // filtram daca nu are imagine
          const hasImage = item.content?.links?.image || item.content?.files?.[0]?.uri;
          if (!hasImage) return false;
          return true;
        })
        .map((item: any) => ({
          id: item.id,
          name: item.content?.metadata?.name || "Unknown NFT",
          image: item.content?.links?.image || item.content?.files?.[0]?.uri || null,
          collection: item.grouping?.find((g: any) => g.group_key === "collection")?.group_value || null,
          collectionName: item.content?.metadata?.symbol || "",
        }));
      setNfts(nftList);
    } catch (err) {
      console.error(err);
      setNfts([]);
    } finally {
      setLoadingNFTs(false);
    }
  }

  async function fetchOtherWalletTokens(wallet: string) {
    if (!wallet) return;
    setLoadingOtherTokens(true);
    setOtherTokens([]);
    try {
      const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";

      // SOL balance
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, "confirmed");
      const lamports = await connection.getBalance(new PublicKey(wallet));
      const solBalance = lamports / LAMPORTS_PER_SOL;

      // SPL tokens
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "searchAssets",
          params: {
            ownerAddress: wallet,
            tokenType: "fungible",
            page: 1,
            limit: 50,
          },
        }),
      });

      const json = await res.json();
      const items = json?.result?.items || [];

      const tokens = items
        .filter((item: any) => {
          const bal = item.token_info?.balance;
          const dec = item.token_info?.decimals ?? 0;
          const realBalance = bal / Math.pow(10, dec);
          return bal > 0 && realBalance > 0.000001;
        })
        .map((item: any) => {
          const dec = item.token_info?.decimals ?? 0;
          const bal = item.token_info?.balance / Math.pow(10, dec);
          return {
            mint: item.id,
            symbol: item.token_info?.symbol || item.content?.metadata?.symbol || item.id.slice(0, 4) + "...",
            name: item.content?.metadata?.name || item.token_info?.symbol || "Unknown",
            balance: bal,
            decimals: dec,
            logo: item.content?.links?.image || item.content?.files?.[0]?.uri || null,
          };
        });

      const solToken = {
        mint: "SOL", symbol: "SOL", name: "Solana",
        balance: solBalance, decimals: 9,
        logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      };

      setOtherTokens([solToken, ...tokens]);
    } catch (err) {
      console.error(err);
      setOtherTokens([]);
    } finally {
      setLoadingOtherTokens(false);
    }
  }

  async function fetchWalletTokens() {
    if (!publicKey) return;
    setLoadingTokens(true);
    try {
      const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";

      // Fetch SOL balance
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, "confirmed");
      const lamports = await connection.getBalance(publicKey);
      const solBalance = lamports / LAMPORTS_PER_SOL;

      // Fetch SPL tokens via Helius searchAssets
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "searchAssets",
          params: {
            ownerAddress: publicKey.toBase58(),
            tokenType: "fungible",
            page: 1,
            limit: 50,
          },
        }),
      });

      const json = await res.json();
      const items = json?.result?.items || [];

      const tokens = items
        .filter((item: any) => {
          const bal = item.token_info?.balance;
          const dec = item.token_info?.decimals ?? 0;
          const realBalance = bal / Math.pow(10, dec);
          return bal > 0 && realBalance > 0.000001;
        })
        .map((item: any) => {
          const dec = item.token_info?.decimals ?? 0;
          const bal = item.token_info?.balance / Math.pow(10, dec);
          return {
            mint: item.id,
            symbol: item.token_info?.symbol || item.content?.metadata?.symbol || item.id.slice(0, 4) + "...",
            name: item.content?.metadata?.name || item.token_info?.symbol || "Unknown",
            balance: bal,
            decimals: dec,
            logo: item.content?.links?.image || item.content?.files?.[0]?.uri || null,
            isSol: false,
          };
        });

      // SOL first
      const solToken = {
        mint: "SOL",
        symbol: "SOL",
        name: "Solana",
        balance: solBalance,
        decimals: 9,
        logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
        isSol: true,
      };

      setWalletTokens([solToken, ...tokens]);
      setSelectedToken(solToken);
    } catch (err) {
      console.error(err);
      // fallback to SOL only
      const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
      const lamports = await connection.getBalance(publicKey);
      const solToken = {
        mint: "SOL", symbol: "SOL", name: "Solana",
        balance: lamports / LAMPORTS_PER_SOL,
        decimals: 9, isSol: true,
        logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      };
      setWalletTokens([solToken]);
      setSelectedToken(solToken);
    } finally {
      setLoadingTokens(false);
    }
  }

  async function sendSol() {
    if (!publicKey || !activeChat || !solAmount || !selectedToken) return;
    const amount = parseFloat(solAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Suma invalida");
      return;
    }
    if (amount > selectedToken.balance) {
      alert(`Balance insuficient. Ai ${selectedToken.balance.toFixed(4)} ${selectedToken.symbol}`);
      return;
    }

    setSendingSol(true);
    try {
      const HELIUS_KEY = "79a1d2c9-8ab4-4fe1-8ca4-7b49961960fb";
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, "confirmed");
      const toPublicKey = new PublicKey(activeChat);
      const transaction = new Transaction();

      if (selectedToken.isSol) {
        const lamports = Math.round(amount * LAMPORTS_PER_SOL);
        transaction.add(SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: toPublicKey,
          lamports,
        }));
      } else {
        // SPL Token transfer
        const { createTransferInstruction, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } =
          await import("@solana/spl-token");
        const mintPubkey = new PublicKey(selectedToken.mint);
        const fromAta = await getOrCreateAssociatedTokenAccount(connection, { publicKey, signTransaction: async (tx: any) => tx } as any, mintPubkey, publicKey);
        const toAta = await getOrCreateAssociatedTokenAccount(connection, { publicKey, signTransaction: async (tx: any) => tx } as any, mintPubkey, toPublicKey);
        const transferAmount = Math.round(amount * Math.pow(10, selectedToken.decimals));
        transaction.add(createTransferInstruction(fromAta.address, toAta.address, publicKey, transferAmount, [], TOKEN_PROGRAM_ID));
      }

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      await supabase.from("messages").insert([{
        sender: publicKey.toBase58(),
        receiver: activeChat,
        content: `💸 Am trimis ${amount} ${selectedToken.symbol}`,
        seen: false,
      }]);

      setSolAmount("");
      setShowSendSol(false);
      alert(`✅ ${amount} ${selectedToken.symbol} trimis cu succes!`);
    } catch (err: any) {
      console.error(err);
      alert("Eroare: " + (err.message || "Tranzactie esuata"));
    } finally {
      setSendingSol(false);
    }
  }

  async function sendMessage() {
    if (!publicKey) {
      alert("Connect wallet first");
      return;
    }

    if (!activeChat || !message) {
      alert("Fill all fields");
      return;
    }

    if (isBlocked(activeChat)) {
      alert("You have blocked this user.");
      return;
    }

    if (isBlockedByThem(activeChat)) {
      alert("You cannot send messages to this user.");
      return;
    }

    const newMessage = {
      sender: publicKey.toBase58(),
      receiver: activeChat,
      content: message,
      seen: false,
    };

    const { error } = await supabase
      .from("messages")
      .insert([newMessage]);

    if (error) {
      console.error(error);
      alert(JSON.stringify(error));
      return;
    }

    sendTyping(false);
    if (myTypingTimeoutRef.current) clearTimeout(myTypingTimeoutRef.current);
    setMessage("");
  }

  async function fetchInbox() {
    if (!publicKey) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `sender.eq.${publicKey.toBase58()},receiver.eq.${publicKey.toBase58()}`
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    const latestMessages = new Map();

    data?.forEach((msg) => {
      const otherWallet =
        msg.sender === publicKey.toBase58() ? msg.receiver : msg.sender;

      if (!latestMessages.has(otherWallet)) {
        latestMessages.set(otherWallet, { ...msg, otherWallet });
      }
    });

    setInboxMessages(Array.from(latestMessages.values()));
  }

  async function loadConversation(wallet: string) {
    if (!wallet) return;
    if (!publicKey) {
      // wallet not connected yet, just set activeChat visually
      setActiveChat(wallet);
      return;
    }

    setActiveChat(wallet);

    setUnreadCounts((prev: any) => ({ ...prev, [wallet]: 0 }));

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender.eq.${publicKey.toBase58()},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${publicKey.toBase58()})`
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
      return;
    }

    const msgs = (data || []).reverse();
    setChatMessages(msgs);
    setHasMoreMessages(msgs.length === 50);

    // marcam mesajele ca vazute
    await markMessagesAsSeen(wallet);

    // scroll after messages load
    setTimeout(() => {
      scrollToBottom("auto");
    }, 50);
  }

  async function loadMoreMessages() {
    if (!publicKey || !activeChat || loadingMore) return;
    setLoadingMore(true);

    const oldest = chatMessages[0];
    if (!oldest) { setLoadingMore(false); return; }

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender.eq.${publicKey.toBase58()},receiver.eq.${activeChat}),and(sender.eq.${activeChat},receiver.eq.${publicKey.toBase58()})`
      )
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) { console.error(error); setLoadingMore(false); return; }

    const older = (data || []).reverse();
    setChatMessages((prev) => [...older, ...prev]);
    setHasMoreMessages(older.length === 50);
    setLoadingMore(false);

    // pastreaza pozitia scroll-ului
    setTimeout(() => {
      const el = messagesContainerRef.current;
      if (el) el.scrollTop = 120;
    }, 50);
  }

  useEffect(() => {
    fetchInbox();
    fetchFriends();
    fetchFriendRequests();
    fetchBlockedUsers();
    fetchBlockedByUsers();
    fetchProfiles();
    loadProfile();
    fetchPresence();

    if (!publicKey) return;

    // Update own presence immediately and every 30s
    updatePresence();
    const presenceInterval = setInterval(updatePresence, 30000);

    // Refresh online status every 10s
    const onlineInterval = setInterval(fetchPresence, 10000);

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newMessage = payload.new as any;
          const me = publicKey.toBase58();

          // Check if the sender is blocked by me — if so, ignore the message
          const { data: blockCheck } = await supabase
            .from("blocked_users")
            .select("*")
            .eq("blocker", me)
            .eq("blocked", newMessage.sender)
            .maybeSingle();

          if (blockCheck) return; // silently drop messages from blocked users

          if (newMessage.receiver === me) {
            // Fetch profile so name shows correctly immediately
            const { data: profileData } = await supabase
              .from("profiles")
              .select("*")
              .eq("wallet", newMessage.sender)
              .maybeSingle();

            if (profileData) {
              setProfiles((prev: any) => ({
                ...prev,
                [profileData.wallet]: profileData,
              }));
            }

            // daca chat-ul e deschis cu acest sender, marcam ca vazut
            if (newMessage.sender === activeChatRef.current) {
              supabase.from("messages").update({ seen: true }).eq("id", newMessage.id);
            }

            setInboxMessages((prev) => {
              if (newMessage.sender !== activeChatRef.current) {
                setUnreadCounts((prevCounts: any) => ({
                  ...prevCounts,
                  [newMessage.sender]: (prevCounts[newMessage.sender] || 0) + 1,
                }));
              }

              const filtered = prev.filter(
                (m) => m.otherWallet !== newMessage.sender
              );

              return [
                { ...newMessage, otherWallet: newMessage.sender },
                ...filtered,
              ];
            });
          }

          if (
            activeChatRef.current &&
            ((newMessage.sender === activeChatRef.current &&
              newMessage.receiver === me) ||
              (newMessage.sender === me &&
                newMessage.receiver === activeChatRef.current))
          ) {
            setChatMessages((prev) => {
              if (prev.find((m) => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updated = payload.new as any;
          // actualizam DOAR seen, nu inlocuim mesajul complet
          if (updated.seen === true) {
            setChatMessages((prev) =>
              prev.map((m) => m.id === updated.id ? { ...m, seen: true } : m)
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "typing" },
        async () => {
          if (!publicKey) return;
          const me = publicKey.toBase58();
          const { data } = await supabase
            .from("typing").select("*").eq("receiver", me);
          const someoneTyping = data?.some((row: any) => {
            const age = Date.now() - new Date(row.updated_at).getTime();
            return row.wallet !== me && age < 3000 && row.wallet === activeChatRef.current;
          });
          setOtherIsTyping(!!someoneTyping);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          if (someoneTyping) {
            typingTimeoutRef.current = setTimeout(() => setOtherIsTyping(false), 3000);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocked_users" },
        () => {
          fetchBlockedUsers();
          fetchBlockedByUsers();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friends" },
        () => {
          fetchFriends();
          fetchFriendRequests();
        }
      )
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
  const chatDisabled = amIBlocked || didIBlock;

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center p-6">
      <div className="w-full max-w-6xl flex gap-6 mt-10">

        {/* SIDEBAR */}
        <div className="w-80 bg-zinc-950 border border-zinc-800 rounded-xl p-4">

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

            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm"
            />

            <button
              onClick={saveProfile}
              className="w-full bg-green-600 rounded-lg p-3 font-bold mt-3"
            >
              Save Profile
            </button>

            {savedUsername && (
              <div className="text-sm text-zinc-400 mt-3">
                @{savedUsername}
              </div>
            )}
          </div>

          <div className="mt-8">
            <input
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              placeholder="Open chat with wallet"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm"
            />

            <button
              onClick={() => loadConversation(receiver)}
              className="w-full bg-white text-black rounded-lg p-3 font-bold mt-3"
            >
              Open Chat
            </button>
          </div>

          <div className="mt-10 flex flex-col gap-3">
            <h2 className="text-lg font-bold">Inbox</h2>

            {inboxMessages.map((msg) => (
              <button
                key={msg.otherWallet}
                onClick={() => loadConversation(msg.otherWallet)}
                className={`bg-zinc-900 border rounded-lg p-3 text-left transition-colors ${
                  activeChat === msg.otherWallet
                    ? "border-green-700"
                    : "border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="relative flex-shrink-0">
                    <Avatar wallet={msg.otherWallet} profile={profiles[msg.otherWallet]} size={32} />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${
                      isOnline(msg.otherWallet) ? "bg-green-400" : "bg-zinc-600"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-green-400 text-sm font-medium truncate">
                        {getDisplayName(msg.otherWallet)}
                      </div>
                      <div className="text-[10px] text-zinc-500 flex-shrink-0 ml-1">
                        {msg.created_at ? formatInboxTime(msg.created_at) : ""}
                      </div>
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

              {friends.length === 0 && (
                <div className="text-xs text-zinc-500 mt-1">No friends yet</div>
              )}

              {friends.map((f) => {
                const other =
                  f.sender === publicKey?.toBase58() ? f.receiver : f.sender;

                return (
                  <button
                    key={other}
                    onClick={() => loadConversation(other)}
                    className="w-full bg-zinc-900 p-2 rounded mb-2 text-left mt-2 flex items-center gap-2"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar wallet={other} profile={profiles[other]} size={28} />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-zinc-900 ${
                        isOnline(other) ? "bg-green-400" : "bg-zinc-600"
                      }`} />
                    </div>
                    <div className="text-green-400 text-sm">{getDisplayName(other)}</div>
                  </button>
                );
              })}

              <div className="mt-6">
                <h2 className="text-lg font-bold mb-2">Friend Requests</h2>

                {friendRequests.filter(
                  (r) => r.receiver === publicKey?.toBase58()
                ).length === 0 && (
                  <div className="text-xs text-zinc-500">No requests</div>
                )}

                {friendRequests
                  .filter((r) => r.receiver === publicKey?.toBase58())
                  .map((r) => (
                    <div
                      key={r.id}
                      className="bg-zinc-900 p-2 rounded mb-2"
                    >
                      <div className="text-sm">{getDisplayName(r.sender)}</div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => acceptFriend(r.id)}
                          className="bg-green-600 px-2 py-1 text-xs rounded"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => rejectFriend(r.id)}
                          className="bg-red-600 px-2 py-1 text-xs rounded"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* CHAT WINDOW */}
        <div className="flex-1 h-[85vh] bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col">

          {activeChat ? (
            <>
              <div className="border-b border-zinc-800 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <Avatar wallet={activeChat} profile={profiles[activeChat]} size={42} />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950 ${
                      isOnline(activeChat) ? "bg-green-400" : "bg-zinc-600"
                    }`} />
                  </div>
                  <div>
                    <div className="text-white font-semibold">{getDisplayName(activeChat)}</div>
                    <div className="text-xs text-zinc-500">
                      {otherIsTyping
                        ? <span className="text-green-400 animate-pulse">scrie...</span>
                        : isOnline(activeChat) ? "Online" : "Offline"}
                    </div>
                    <div className="text-[10px] text-zinc-700 break-all">{activeChat}</div>
                  </div>
                </div>

                {/* Action buttons — side by side */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button
                    onClick={() => {
                      if (!showNFTs || nftWallet !== activeChat) {
                        fetchNFTs(activeChat);
                        fetchOtherWalletTokens(activeChat);
                      }
                      setShowNFTs(!showNFTs);
                      setNftTab("nfts");
                    }}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      showNFTs ? "bg-purple-600 text-white" : "bg-zinc-700 hover:bg-zinc-600 text-white"
                    }`}
                  >
                    🖼 Wallet
                  </button>
                  {isFriend(activeChat) ? (
                    <button
                      onClick={() => unfriend(activeChat)}
                      className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      Unfriend
                    </button>
                  ) : friendRequests.some(
                    (r) =>
                      r.sender === publicKey?.toBase58() &&
                      r.receiver === activeChat &&
                      r.accepted === false
                  ) ? (
                    <button
                      disabled
                      className="bg-yellow-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium opacity-70 cursor-not-allowed"
                    >
                      Request Sent
                    </button>
                  ) : (
                    <button
                      onClick={() => addFriend(activeChat)}
                      className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      Add Friend
                    </button>
                  )}

                  {!isBlocked(activeChat) ? (
                    <button
                      onClick={() => blockUser(activeChat)}
                      className="bg-red-700 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      Block
                    </button>
                  ) : (
                    <button
                      onClick={() => unblockUser(activeChat)}
                      className="bg-zinc-600 hover:bg-zinc-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      Unblock
                    </button>
                  )}
                </div>
              </div>

              {/* Wallet Panel */}
              {showNFTs && (
                <div className="border border-zinc-800 rounded-xl p-3 mb-3 bg-zinc-900">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-white">
                      Wallet — {getDisplayName(activeChat)}
                    </div>
                    <button onClick={() => setShowNFTs(false)} className="text-zinc-500 hover:text-white text-xs">✕</button>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1 mb-3">
                    <button
                      onClick={() => setNftTab("nfts")}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        nftTab === "nfts" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      🖼 NFT-uri {!loadingNFTs && `(${nfts.length})`}
                    </button>
                    <button
                      onClick={() => setNftTab("tokens")}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        nftTab === "tokens" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      💰 Tokene {!loadingOtherTokens && `(${otherTokens.length})`}
                    </button>
                  </div>

                  {/* NFTs Tab */}
                  {nftTab === "nfts" && (
                    loadingNFTs ? (
                      <div className="text-zinc-500 text-xs text-center py-4">Se încarcă NFT-urile...</div>
                    ) : nfts.length === 0 ? (
                      <div className="text-zinc-500 text-xs text-center py-4">Nu are NFT-uri</div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {nfts.map((nft) => (
                          <div key={nft.id} className="group relative rounded-lg overflow-hidden bg-zinc-800 aspect-square">
                            {nft.image && (
                              <img
                                src={nft.image}
                                alt={nft.name}
                                className="w-full h-full object-cover"
                                onError={(e: any) => { e.target.style.display = "none"; }}
                              />
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="text-white text-[8px] truncate">{nft.name}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {/* Tokens Tab */}
                  {nftTab === "tokens" && (
                    loadingOtherTokens ? (
                      <div className="text-zinc-500 text-xs text-center py-4">Se încarcă tokenele...</div>
                    ) : otherTokens.length === 0 ? (
                      <div className="text-zinc-500 text-xs text-center py-4">Nu are tokene</div>
                    ) : (
                      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                        {otherTokens.map((token) => (
                          <div key={token.mint} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-2.5 py-2">
                            {token.logo ? (
                              <img src={token.logo} alt={token.symbol} className="w-6 h-6 rounded-full flex-shrink-0"
                                onError={(e: any) => { e.target.style.display = "none"; }} />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-zinc-700 flex-shrink-0 flex items-center justify-center text-[9px] text-zinc-400">
                                {token.symbol.slice(0, 2)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-xs font-medium">{token.symbol}</div>
                              <div className="text-zinc-500 text-[10px] truncate">{token.name}</div>
                            </div>
                            <div className="text-green-400 text-xs font-mono">
                              {token.balance < 0.001 ? token.balance.toFixed(6) : token.balance.toFixed(3)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}

              <div
                ref={messagesContainerRef}
                className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 min-h-0"
              >
                {hasMoreMessages && (
                  <div className="flex justify-center py-2">
                    <button
                      onClick={loadMoreMessages}
                      disabled={loadingMore}
                      className="text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? "Se încarcă..." : "⬆ Încarcă mesaje mai vechi"}
                    </button>
                  </div>
                )}
                {chatMessages.map((msg, i) => {
                  const isMine = msg.sender === publicKey?.toBase58();
                  // Show date separator if different day from previous message
                  const msgDate = new Date(msg.created_at).toDateString();
                  const prevDate = i > 0 ? new Date(chatMessages[i - 1].created_at).toDateString() : null;
                  const showDateSep = msgDate !== prevDate;

                  return (
                    <div key={msg.id}>
                      {showDateSep && msg.created_at && (
                        <div className="flex items-center gap-2 my-2">
                          <div className="flex-1 h-px bg-zinc-800" />
                          <div className="text-[10px] text-zinc-600">
                            {new Date(msg.created_at).toLocaleDateString("ro-RO", {
                              day: "numeric", month: "long", year: "numeric"
                            })}
                          </div>
                          <div className="flex-1 h-px bg-zinc-800" />
                        </div>
                      )}
                      <div className={`flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>
                        <div
                          className={`p-3 rounded-xl max-w-[80%] break-words ${
                            isMine ? "bg-green-600" : "bg-zinc-800"
                          }`}
                        >
                          {msg.content}
                        </div>
                        {msg.created_at && (
                          <div className={`flex items-center gap-1 px-1 ${isMine ? "flex-row-reverse" : ""}`}>
                            <div className="text-[10px] text-zinc-600">
                              {new Date(msg.created_at).toLocaleTimeString("ro-RO", {
                                hour: "2-digit", minute: "2-digit"
                              })}
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
                  );
                })}
              </div>

              {/* Typing indicator — outside scroll */}
              {otherIsTyping && (
                <div className="flex items-end gap-2 px-1 py-2">
                  <Avatar wallet={activeChat} profile={profiles[activeChat]} size={24} />
                  <TypingIndicator />
                </div>
              )}

              {/* Input area — blocked state */}
              <div className="mt-6">
                {amIBlocked ? (
                  <div className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-zinc-500 text-sm text-center">
                    You have been blocked by this user. You cannot send messages.
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
                          <div className="text-zinc-400 text-sm text-center py-2">Se încarcă tokenele...</div>
                        ) : (
                          <>
                            {/* Token selector */}
                            <div className="flex flex-wrap gap-2">
                              {walletTokens.map((token) => (
                                <button
                                  key={token.mint}
                                  onClick={() => setSelectedToken(token)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    selectedToken?.mint === token.mint
                                      ? "bg-yellow-500 text-black"
                                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                  }`}
                                >
                                  {token.logo && (
                                    <img src={token.logo} alt={token.symbol} className="w-4 h-4 rounded-full" onError={(e: any) => e.target.style.display = "none"} />
                                  )}
                                  <span>{token.symbol}</span>
                                  <span className="text-[10px] opacity-70">{token.balance.toFixed(3)}</span>
                                </button>
                              ))}
                            </div>
                            {/* Amount input */}
                            <div className="flex gap-2 items-center">
                              <input
                                value={solAmount}
                                onChange={(e) => setSolAmount(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") sendSol(); }}
                                placeholder={`Suma ${selectedToken?.symbol || "SOL"}`}
                                type="number"
                                min="0"
                                step="0.01"
                                className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
                              />
                              {selectedToken && (
                                <span className="text-zinc-500 text-xs whitespace-nowrap">
                                  max: {selectedToken.balance.toFixed(4)}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={sendSol}
                                disabled={sendingSol || !selectedToken || !solAmount}
                                className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors"
                              >
                                {sendingSol ? "Se trimite..." : `Trimite ${selectedToken?.symbol || "SOL"}`}
                              </button>
                              <button
                                onClick={() => { setShowSendSol(false); setSolAmount(""); }}
                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-3 py-2 rounded-lg text-sm transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!showSendSol) fetchWalletTokens();
                          setShowSendSol(!showSendSol);
                        }}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg px-3 font-bold text-sm transition-colors"
                        title="Trimite crypto"
                      >
                        ◎
                      </button>
                      <input
                        value={message}
                        onChange={(e) => handleMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") sendMessage();
                        }}
                        placeholder="Type message..."
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg p-3"
                      />
                      <button
                        onClick={sendMessage}
                        className="bg-white text-black rounded-lg px-6 font-bold"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500">
              Open a conversation
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
