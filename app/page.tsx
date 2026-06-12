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
  const [messages, setMessages] = useState<any[]>([]);

  async function sendMessage() {
    if (!publicKey) {
      alert("Connect wallet first");
      return;
    }

    if (!receiver || !message) {
      alert("Fill all fields");
      return;
    }

    const { error } = await supabase
      .from("messages")
      .insert([
        {
          sender: publicKey.toBase58(),
          receiver,
          content: message,
        },
      ]);

 if (error) {
  console.error(error);

  alert(JSON.stringify(error));

  return;
}

    alert("Message sent!");

    setMessage("");
  }

  async function fetchMessages() {
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

  setMessages(data || []);
}

useEffect(() => {
  fetchMessages();
}, [publicKey]);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 p-6">
      
      <h1 className="text-4xl font-bold">
        Wallet Chat
      </h1>

      <WalletMultiButtonDynamic />

      {publicKey && (
        <>
          <div className="text-green-400 text-xs break-all max-w-md text-center">
            {publicKey.toBase58()}
          </div>

          <div className="w-full max-w-md flex flex-col gap-3 mt-6">

            <input
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              placeholder="Receiver wallet"
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-3"
            />

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message"
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 h-32"
            />

            <button
              onClick={sendMessage}
              className="bg-white text-black rounded-lg p-3 font-bold"
            >
              Send Message
            </button>


<div className="w-full max-w-md mt-10">
  <h2 className="text-xl font-bold mb-4">
    Inbox
  </h2>

  <div className="flex flex-col gap-3">
    {messages.map((msg) => (
      <div
        key={msg.id}
        className="bg-zinc-900 border border-zinc-800 rounded-lg p-3"
      >
        <div className="text-xs text-zinc-500 break-all mb-2">
          From: {msg.sender}
        </div>

        <div>
          {msg.content}
        </div>
      </div>
    ))}
  </div>
</div>

          </div>
        </>
      )}

    </main>
  );
}