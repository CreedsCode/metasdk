"use client";

import React, { useState } from "react";
import UserProfile from "./_components/UserProfile";
import { useMetaTransaction } from "~/sdk/hooks/useMetaTransaction";
import { actionCreators, type Action } from "@near-js/transactions";
import { relayTransaction, createAccount } from "@near-relay/client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export default function AppPage() {
  const { sendTransaction, isLoading, error } = useMetaTransaction();

  // Add new state for near-relay demo
  const [accountId, setAccountId] = useState("");
  const [createReceipt, setCreateReceipt] = useState<any>();
  const [relayReceipt, setRelayReceipt] = useState<any>();

  // Original handleSetGreeting
  const handleSetGreeting = async () => {
    const action = actionCreators.functionCall(
      "set_greeting",
      {
        greeting: "hello",
      },
      BigInt(3000000000000),
    );

    try {
      const result = await sendTransaction(
        "hello.near-examples.testnet",
        [action],
        {
          subsidyRuleId: "1",
        },
      );

      console.log("Transaction successful:", result);
    } catch (err) {
      console.error("Transaction failed:", err);
    }
  };

  // Add near-relay demo handlers
  const handleCreateAccount = async () => {
    try {
      const receipt = await createAccount(
        "/api/relayer/create-account",
        accountId,
        { password: "lfg" },
      );
      setCreateReceipt(JSON.stringify(receipt.transaction));
    } catch (err) {
      console.error("Account creation failed:", err);
    }
  };

  const handleRelay = async () => {
    try {
      const action: Action = actionCreators.functionCall(
        "set_greeting",
        {
          greeting: "hello",
        },
        BigInt(30000000000000),
        BigInt(0),
      );

      const receipt = await relayTransaction(
        action,
        "surgedev.near",
        "/api/relayer",
        "mainnet",
        { password: "lfg" },
      );

      setRelayReceipt(JSON.stringify(receipt));
    } catch (err) {
      console.error("Relay failed:", err);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      {/* Original content */}
      <div className="mb-20">
        <UserProfile />
        <button
          onClick={handleSetGreeting}
          disabled={isLoading}
          className="rounded-lg bg-purple-600 px-4 py-2 hover:bg-purple-700"
        >
          {isLoading ? "Sending..." : "Set Greeting"}
        </button>
      </div>

      {/* Near-relay demo section */}
      <div className="w-full max-w-md px-4">
        <h2 className="mb-10 text-center text-4xl font-extrabold tracking-tight">
          NEAR Relay Demo
        </h2>
        <h3 className="mb-6 text-center text-xl font-bold">
          Create account and relay transactions
        </h3>

        <div className="space-y-4">
          <Input
            className="bg-white/10 text-white"
            placeholder="Enter Account ID"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          />

          <div className="flex flex-col gap-4">
            <Button
              onClick={handleCreateAccount}
              disabled={!accountId}
              className="w-full"
            >
              Create Account
            </Button>

            <Button onClick={handleRelay} className="w-full">
              Relay Transaction
            </Button>
          </div>

          {createReceipt && (
            <div className="rounded-lg bg-green-500/20 p-4">
              <h4 className="font-bold">Account created successfully!</h4>
            </div>
          )}

          {relayReceipt && (
            <div className="rounded-lg bg-green-500/20 p-4">
              <h4 className="font-bold">Transaction relayed successfully!</h4>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
