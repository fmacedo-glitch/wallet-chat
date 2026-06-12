"use client";

import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

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

  const [inboxMessages, setInboxMessages] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  const [activeChat, setActiveChat] = useState("");

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
      .eq("receiver", publicKey.toBase58())
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    const uniqueWallets = new Map();

    data?.forEach((msg) => {
      if (!uniqueWallets.has(msg.sender)) {
        uniqueWallets.set(msg.sender, msg);
      }
    });

    setInboxMessages(
      Array.from(uniqueWallets.values())
    );
  }

  async function loadConversation(wallet: string) {
    if (!publicKey) return;

    setActiveChat(wallet);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender.eq.${publicKey.toBase58()},receiver.eq.${wallet}),and(sender.eq.${wallet},receiver.eq.${publicKey.toBase58()})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setChatMessages(data || []);
  }

  useEffect(() => {
    fetchInbox();

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [publicKey, activeChat]);

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
                key={msg.sender}
                onClick={() => loadConversation(msg.sender)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-left"
              >
                <div className="text-xs text-zinc-500 break-all mb-2">
                  {msg.sender}
                </div>

                <div className="truncate">
                  {msg.content}
                </div>
              </button>
            ))}

          </div>

        </div>

        {/* CHAT */}

        <div className="flex-1 h-[85vh] bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col">

          {activeChat ? (
            <>
              <div className="border-b border-zinc-800 pb-4 mb-4">

                <div className="text-sm text-zinc-500">
                  Chat with
                </div>

                <div className="text-green-400 break-all">
                  {activeChat}
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