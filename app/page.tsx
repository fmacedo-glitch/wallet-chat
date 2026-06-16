"use client";

import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState, useRef } from "react";

import { supabase } from "../lib/supabase";

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui"))
      .WalletMultiButton,
  { ssr: false }
);

export default function Home() {
  const { publicKey } = useWallet();

  const [receiver, setReceiver] = useState("");
  const [message, setMessage] = useState("");
const [friends, setFriends] = useState<any[]>([]);
  const [username, setUsername] = useState("");
const [savedUsername, setSavedUsername] = useState("");

const [profiles, setProfiles] = useState<any>({});

  const [inboxMessages, setInboxMessages] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  const [activeChat, setActiveChat] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [unreadCounts, setUnreadCounts] = useState<any>({});

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

  // 1. verificăm dacă există deja request
  const { data } = await supabase
    .from("friends")
    .select("*")
    .or(
      `and(sender.eq.${me},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${me})`
    )
    .maybeSingle();

  // 2. dacă există → NU mai trimitem
  if (data) return;

  // 3. trimitem request nou
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
    .or(
      `sender.eq.${me},receiver.eq.${me}`
    );

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

async function saveProfile() {
  if (!publicKey) return;

  const { error } = await supabase
    .from("profiles")
    .upsert({
      wallet: publicKey.toBase58(),
      username,
    });

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

  async function sendMessage() {
    if (!publicKey) {
      alert("Connect wallet first");
      return;
    }

    if (!activeChat || !message) {
      alert("Fill all fields");
      return;
    }

    const newMessage = {
      sender: publicKey.toBase58(),
      receiver: activeChat,
      content: message,
    };

    const { error } = await supabase
      .from("messages")
      .insert([newMessage]);

    if (error) {
      console.error(error);
      alert(JSON.stringify(error));
      return;
    }

    

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
    msg.sender === publicKey.toBase58()
      ? msg.receiver
      : msg.sender;

  if (!latestMessages.has(otherWallet)) {
    latestMessages.set(otherWallet, {
      ...msg,
      otherWallet,
    });
  }
});

setInboxMessages(
  Array.from(latestMessages.values())
);
  }

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({
    behavior: "auto",
  });
}, [chatMessages]);


  async function loadConversation(wallet: string) {
    if (!publicKey) return;

    setActiveChat(wallet);

    setUnreadCounts((prev: any) => ({
  ...prev,
  [wallet]: 0,
}));

    const { data, error } = await supabase
  .from("messages")
  .select("*")
  .or(
    `and(sender.eq.${publicKey.toBase58()},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${publicKey.toBase58()})`
  )
  .order("created_at", { ascending: true })
  .limit(50);

    if (error) {
      console.error(error);
      return;
    }

    setChatMessages(data || []);
  }

  useEffect(() => {
    fetchInbox();
    fetchFriends();
fetchFriendRequests();

    fetchProfiles();
loadProfile();

    if (!publicKey) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as any;

          if (
            newMessage.receiver === publicKey.toBase58()
          ) {
            setInboxMessages((prev) => {
              const exists = prev.find(
                (m) => m.sender === newMessage.sender
              );

              if (newMessage.sender !== activeChat) {
 setUnreadCounts((prev: any) => {

  if (activeChat === newMessage.sender) {
    return prev;
  }

  return {
    ...prev,
    [newMessage.sender]: 1,
  };
});
}

              if (exists) {
                return prev;
              }

              return [newMessage, ...prev];
            });
          }

          if (
            activeChat &&
            (
              newMessage.sender === activeChat ||
              newMessage.receiver === activeChat
            )
          ) {
            setChatMessages((prev) => {
              const exists = prev.find(
                (m) => m.id === newMessage.id
              );

              if (exists) {
                return prev;
              }

              return [...prev, newMessage];
            });
          }
        }
      )

      .on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "friends",
  },
  () => {
    fetchFriends();
    fetchFriendRequests();
  }
)

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [publicKey]);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center p-6">

      <div className="w-full max-w-6xl flex gap-6 mt-10">

        {/* SIDEBAR */}

        <div className="w-80 bg-zinc-950 border border-zinc-800 rounded-xl p-4">

          <h1 className="text-2xl font-bold mb-4">
            Wallet Chat
          </h1>

          <WalletMultiButtonDynamic />

          {publicKey && (
            <div className="text-xs text-green-400 break-all mt-4">
              {publicKey.toBase58()}
            </div>
          )}

<div className="mt-6 border-t border-zinc-800 pt-6">

  <h2 className="text-lg font-bold mb-3">
    Profile
  </h2>

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

            <h2 className="text-lg font-bold">
              Inbox
            </h2>

        

            {inboxMessages.map((msg) => (
              <button
                key={getDisplayName(msg.otherWallet)}
                onClick={() => loadConversation(msg.otherWallet)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-left"
              >
                <div className="mb-2">

  <div className="text-green-400 text-sm">
    {getDisplayName(msg.otherWallet)}
  </div>

  <div className="text-[10px] text-zinc-500 break-all">
    {msg.otherWallet}
  </div>

</div>

                <div className="flex items-center justify-between gap-2">

  <div className="truncate">
    {msg.content}
  </div>

  {unreadCounts[msg.sender] > 0 && (
    <div className="min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
      {unreadCounts[msg.sender]}
    </div>

  )}



</div>
              </button>
            ))}

<div className="mt-6">

  <h2 className="text-lg font-bold">
    Friends
  </h2>

  {friends.length === 0 && (
    <div className="text-xs text-zinc-500">
      No friends yet
    </div>
  )}

  {friends.map((f) => {

    const other =
      f.sender === publicKey?.toBase58()
        ? f.receiver
        : f.sender;

    return (
      <button
        key={other}
        onClick={() => loadConversation(other)}
        className="w-full bg-zinc-900 p-2 rounded mb-2 text-left"
      >

        <div className="text-green-400 text-sm">
          {getDisplayName(other)}
        </div>

      </button>
    );
  })}

  <div className="mt-6">

  <h2 className="text-lg font-bold mb-2">
    Friend Requests
  </h2>

  {friendRequests.length === 0 && (
    <div className="text-xs text-zinc-500">
      No requests
    </div>
  )}

  {friendRequests
  .filter(
    (r) =>
      r.receiver === publicKey?.toBase58()
  )
  .map((r) => (
    <div
      key={r.id}
      className="bg-zinc-900 p-2 rounded mb-2"
    >

      <div className="text-sm">
        {getDisplayName(r.sender)}
      </div>

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

        {/* CHATwindow */}

        <div className="flex-1 h-[85vh] bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col">

          {activeChat ? (
            <>
              <div className="border-b border-zinc-800 pb-4 mb-4">

                <div className="text-sm text-zinc-500">
                  Chat with
                </div>

                <div className="text-green-400 break-all">
                  {getDisplayName(activeChat)}
                </div>

                <div className="mt-3">

{isFriend(activeChat) ? (

  <button
    onClick={() => unfriend(activeChat)}
    className="bg-red-600 px-3 py-1 rounded"
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
    className="bg-yellow-600 px-3 py-1 rounded opacity-70"
  >
    Request Sent
  </button>

) : (

  <button
    onClick={() => addFriend(activeChat)}
    className="bg-green-600 px-3 py-1 rounded"
  >
    Add Friend
  </button>

)}

</div>

              </div>

              <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 min-h-0">

                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl max-w-[80%] break-words ${
                      msg.sender === publicKey?.toBase58()
                        ? "bg-green-600 self-end"
                        : "bg-zinc-800 self-start"
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}

                <div ref={messagesEndRef} />

              </div>

              <div className="mt-6 flex gap-3">

               <input
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
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