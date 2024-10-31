"use client";

import { redirect } from "next/navigation";
import React from "react";
import { api } from "~/trpc/react";

export default function UserProfile() {
  const authToken = localStorage.getItem("authToken");
  const { data, isLoading, error } = api.auth.user.useQuery(
    { jwt: authToken ?? "" },
    { enabled: !!authToken },
  );

  if (!authToken) {
    redirect("/login");
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !data) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">User Profile</h1>

      <div className="rounded-lg bg-white/10 p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">User Details</h2>
        <p>
          <strong>Wallet Address:</strong> {data.user.walletAddress}
        </p>

        <h3 className="mb-2 mt-6 text-lg font-semibold">
          Recent Auth Challenges
        </h3>
        <div className="space-y-2">
          {data.authChallenges.map((challenge) => (
            <div
              key={challenge.id}
              className="rounded border border-white/20 p-2"
            >
              <p>
                <strong>Created:</strong>{" "}
                {new Date(challenge.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Expires:</strong>{" "}
                {new Date(challenge.expiresAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
