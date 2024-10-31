"use client";

import React from "react";
import UserProfile from "./_components/UserProfile";
import { useMetaTransaction } from "~/sdk/hooks/useMetaTransaction";
import { actionCreators } from "@near-js/transactions";

export default function AppPage() {
  const { sendTransaction, isLoading, error } = useMetaTransaction();
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
        "your-contract.testnet", // Replace with your contract ID
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <UserProfile />
      <button onClick={handleSetGreeting} disabled={isLoading}>
        {isLoading ? "Sending..." : "Set Greeting"}
      </button>
    </main>
  );
}
