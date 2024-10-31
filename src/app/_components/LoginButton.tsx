"use client";

import { api } from "~/trpc/react";
import { useCallback } from "react";
import { useWalletSelector } from "~/providers/NearWalletProvider";

export function LoginButton() {
  const { selector, modal, accountId } = useWalletSelector();
  const { mutate: challenge, data: challengeResponse } =
    api.auth.challenge.useMutation();

  const handleSignMessage = useCallback(async () => {
    if (!selector || !accountId) return;
    try {
      const wallet = await selector.wallet();
      if (!challengeResponse) {
        challenge({
          walletAddress: accountId,
        });
      } else {
        const { challenge: fetchedChallenge, message } = challengeResponse;
        // Pass message and nonce separately to the wallet
        await wallet.signMessage({
          message,
          nonce: Buffer.from(fetchedChallenge, "base64"),
          recipient: accountId,
          callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
        });
      }
    } catch (err) {
      console.error("Login failed:", err);
    }
  }, [selector, accountId, challenge, challengeResponse]);

  const handleSignOut = useCallback(async () => {
    if (!selector) return;
    const wallet = await selector.wallet();
    await wallet.signOut();
  }, [selector]);

  if (!accountId) {
    return (
      <button
        onClick={() => modal?.show()}
        className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Connect NEAR Wallet
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        Connected as: <span className="font-bold">{accountId}</span>
      </div>
      <div className="flex gap-4">
        <button
          onClick={handleSignMessage}
          className="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
        >
          Sign Message to Login
        </button>
        <button
          onClick={handleSignOut}
          className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
        >
          Disconnect Wallet
        </button>
      </div>
    </div>
  );
}
