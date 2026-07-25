import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";

const RPC_ENDPOINTS = [
  "https://rpc.ankr.com/solana",
  "https://solana.drpc.org",
  "https://solana-mainnet.rpc.extrnode.com",
  "https://solana-rpc.publicnode.com",
  "https://api.mainnet-beta.solana.com",
];

function getKeypairFromPrivateKey(privateKeyStr: string): Keypair {
  const trimmed = privateKeyStr.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const arr = JSON.parse(trimmed);
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  } else {
    // Base58 string
    const decoded = bs58.decode(trimmed);
    return Keypair.fromSecretKey(decoded);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recipientPublicKey, amountSol, tableId, reason } = body;

    if (!recipientPublicKey || typeof amountSol !== "number" || amountSol <= 0) {
      return NextResponse.json(
        { error: "Parametri invalizi: recipientPublicKey și amountSol sunt obligatorii." },
        { status: 400 }
      );
    }

    const privateKeyEnv = process.env.CENTRAL_SOLANA_PRIVATE_KEY || process.env.SOLANA_TREASURY_SECRET_KEY;

    if (!privateKeyEnv) {
      return NextResponse.json(
        {
          error: "Cheia privată a portofelului central nu este configurată pe server în variabila CENTRAL_SOLANA_PRIVATE_KEY.",
          configured: false,
        },
        { status: 500 }
      );
    }

    let treasuryKeypair: Keypair;
    try {
      treasuryKeypair = getKeypairFromPrivateKey(privateKeyEnv);
    } catch (keyErr: any) {
      console.error("Failed to parse central wallet private key:", keyErr);
      return NextResponse.json(
        { error: "Formatul cheii private din CENTRAL_SOLANA_PRIVATE_KEY este invalid. Trebuie să fie un Array JSON sau un string Base58." },
        { status: 500 }
      );
    }

    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(recipientPublicKey);
    } catch (e) {
      return NextResponse.json({ error: "Adresa portofelului destinatar este invalidă." }, { status: 400 });
    }

    // Connect to Solana via active RPC
    let activeConnection: Connection | null = null;
    let latestBlockhash: string = "";

    for (const endpoint of RPC_ENDPOINTS) {
      try {
        const conn = new Connection(endpoint, { commitment: "confirmed" });
        const bh = await Promise.race([
          conn.getLatestBlockhash("finalized"),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000)),
        ]);
        if (bh && bh.blockhash) {
          activeConnection = conn;
          latestBlockhash = bh.blockhash;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!activeConnection || !latestBlockhash) {
      return NextResponse.json(
        { error: "Nu s-a putut stabili conexiunea cu rețeaua Solana RPC. Încearcă din nou în câteva secunde." },
        { status: 503 }
      );
    }

    const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

    // Verify treasury balance
    const treasuryBalance = await activeConnection.getBalance(treasuryKeypair.publicKey);
    if (treasuryBalance < lamports + 5000) {
      return NextResponse.json(
        {
          error: `Fonduri SOL insuficiente în Portofelul Central Treasury (${(treasuryBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL). Necesar: ${amountSol} SOL.`,
          balanceSol: treasuryBalance / LAMPORTS_PER_SOL,
        },
        { status: 400 }
      );
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: recipientPubkey,
        lamports,
      })
    );

    transaction.recentBlockhash = latestBlockhash;
    transaction.feePayer = treasuryKeypair.publicKey;

    // Sign transaction server-side
    transaction.sign(treasuryKeypair);

    // Broadcast raw transaction to Solana network
    const rawTx = transaction.serialize();
    const txSignature = await activeConnection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    console.log(`[Central Wallet Payout Success] Tx: ${txSignature} | ${amountSol} SOL -> ${recipientPublicKey} (${reason || "payout"})`);

    return NextResponse.json({
      success: true,
      txSignature,
      amountSentSol: amountSol,
      recipient: recipientPublicKey,
      treasuryAddress: treasuryKeypair.publicKey.toBase58(),
      reason: reason || "payout",
    });
  } catch (err: any) {
    console.error("Central Solana Payout Error:", err);
    return NextResponse.json(
      { error: err?.message || "A apărut o eroare la procesarea plății On-Chain." },
      { status: 500 }
    );
  }
}
