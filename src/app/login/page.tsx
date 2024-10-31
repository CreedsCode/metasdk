"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function LoginPage() {
  const router = useRouter();

  const { mutate: verify } = api.auth.verify.useMutation({
    onSuccess: (response) => {
      if (response?.token) {
        localStorage.setItem("authToken", response.token);
        router.push("/app");
      }
    },
  });

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const accountId = params.get("accountId");
    const signature = params.get("signature");
    const publicKey = params.get("publicKey");

    if (accountId && signature && publicKey) {
      verify({
        accountId,
        publicKey,
        signature,
      });
    } else {
      router.push("/?error=missing_parameters");
    }
  }, [verify, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="mb-8 animate-pulse text-lg">Verifying your login...</div>
    </div>
  );
}
