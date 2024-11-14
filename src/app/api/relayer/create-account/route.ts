import { NextResponse } from "next/server";
import { Account, KeyPair, connect } from "near-api-js";
import { getAccount } from "~/server/api/routers/utils";

const RELAYER_ID = 'the-relayer.testnet';
const RELAYER_PRIVATE_KEY = 'ed25519:2fpNWkegHqdeJNYCzaT1rhjJSsXASjeTvfzpz5xWRQavvap8CkU2ri7mjFMrFmsL3EvTtgWfy8RNY6y66aPy7Pt6';
const NETWORK_ID = 'testnet';

// Constants for testnet account creation
const INITIAL_BALANCE = "100000000000000000000000"; // 0.1 NEAR
const TESTNET_CONFIG = {
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://wallet.testnet.near.org',
  helperUrl: 'https://helper.testnet.near.org'
};

export async function POST(req: Request) {
  try {
    const { accountId } = await req.json();

    if (!accountId.endsWith('.testnet')) {
      return NextResponse.json(
        { error: "Account ID must end with .testnet" },
        { status: 400 }
      );
    }

    const near = await connect(TESTNET_CONFIG);
    const relayerAccount = await getAccount(
      NETWORK_ID,
      RELAYER_ID,
      RELAYER_PRIVATE_KEY,
    );

    // Generate keypair for new account
    const newAccountKeyPair = KeyPair.fromRandom('ed25519');

    // Create account using testnet helper contract
    const helperAccount = new Account(near.connection, 'testnet');

    const outcome = await helperAccount.functionCall({
      contractId: 'testnet',
      methodName: 'create_account',
      args: {
        new_account_id: accountId,
        new_public_key: newAccountKeyPair.getPublicKey().toString()
      },
      gas: '300000000000000',
      attachedDeposit: INITIAL_BALANCE
    });

    return NextResponse.json({
      message: "Account created",
      data: {
        transaction: outcome,
        publicKey: newAccountKeyPair.getPublicKey().toString(),
        privateKey: newAccountKeyPair.toString(),
        accountId,
        network: NETWORK_ID
      }
    });
  } catch (error) {
    console.error("Account creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to create account",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 