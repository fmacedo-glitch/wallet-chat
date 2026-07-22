import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PREMIUM_WALLET = "3WDy3rzCYY5TpLJAJ6MwhWUoAHrVi7rrxtNhQ5BhizqJ";
const PREMIUM_PRICE_SOL = 0.04; // slightly less to account for rounding

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Helius sends array of transactions
    const transactions = Array.isArray(body) ? body : [body];

    for (const tx of transactions) {
      // Check if it's a transfer to our premium wallet
      const nativeTransfers = tx.nativeTransfers || [];

      for (const transfer of nativeTransfers) {
        if (
          transfer.toUserAccount === PREMIUM_WALLET &&
          transfer.amount >= PREMIUM_PRICE_SOL * 1e9 // convert to lamports
        ) {
          const senderWallet = transfer.fromUserAccount;
          if (!senderWallet) continue;

          // Activate premium for 30 days
          const expires = new Date();
          expires.setDate(expires.getDate() + 30);

          const { error } = await supabase.from("profiles").upsert({
            wallet: senderWallet,
            is_premium: true,
            premium_expires_at: expires.toISOString(),
          });

          if (!error) {
            // Send notification to user
            await supabase.from("notifications").insert({
              title: "⭐ Premium Activated!",
              message: `Your premium subscription is now active until ${expires.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}. Enjoy all premium features!`,
              created_by: "SYSTEM",
            });

            console.log(`Premium activated for ${senderWallet} until ${expires.toISOString()}`);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
