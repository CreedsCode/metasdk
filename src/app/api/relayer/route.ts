import { NextResponse } from "next/server";
import { Account } from "near-api-js";
import { actionCreators } from "@near-js/transactions";
import { getAccount } from "~/server/api/routers/utils";

// Use the same constants as in meta.ts
const RELAYER_ID = 'the-relayer.testnet';
const RELAYER_PRIVATE_KEY = 'ed25519:2fpNWkegHqdeJNYCzaT1rhjJSsXASjeTvfzpz5xWRQavvap8CkU2ri7mjFMrFmsL3EvTtgWfy8RNY6y66aPy7Pt6';
const NETWORK_ID = 'testnet';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, receiverId, subsidyId } = body;

    const relayerAccount: Account = await getAccount(
      NETWORK_ID,
      RELAYER_ID,
      RELAYER_PRIVATE_KEY,
    );

    // Optional: Add subsidy tracking similar to meta.ts if needed
    // This would require prisma client access
    // const rule = await prisma.subsidy.findUnique({ where: { id: subsidyId } });
    // ... subsidy checks ...

    const outcome = await relayerAccount.signAndSendTransaction({
      actions: [action],
      receiverId,
    });

    return NextResponse.json({
      message: "Relayed",
      data: outcome,
      // Include any additional metadata that matches the tRPC response
    });
  } catch (error) {
    console.error("Relay error:", error);
    return NextResponse.json(
      { error: "Failed to relay transaction" },
      { status: 500 }
    );
  }
} 