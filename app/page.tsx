"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

export default function Home() {
  const { publicKey } = useWallet();

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6">
      
      <h1 className="text-4xl font-bold">
        Wallet Chat
      </h1>

      <p className="text-zinc-400">
        Telegram for Solana wallets
      </p>

      <WalletMultiButton />

      {publicKey && (
        <div className="mt-6 text-green-400 text-sm text-center">
          Connected:<br />
          {publicKey.toBase58()}
        </div>
      )}

    </main>
  );
}