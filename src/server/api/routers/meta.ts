import { TRPCError } from "@trpc/server";
import { } from "near-api-js/lib/transaction";
import { SignedDelegate, SCHEMA, SignedTransaction, actionCreators } from "@near-js/transactions";
import { deserialize } from 'borsh';

import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getAccount } from "./utils";

const RELAYER_ID = 'the-relayer.testnet';
const RELAYER_PRIVATE_KEY =
  'ed25519:2fpNWkegHqdeJNYCzaT1rhjJSsXASjeTvfzpz5xWRQavvap8CkU2ri7mjFMrFmsL3EvTtgWfy8RNY6y66aPy7Pt6';
const NETWORK_ID = 'testnet';
export const metaRouter = createTRPCRouter({
  checkEligibility: publicProcedure
    .input(
      z.object({
        subsidyRuleId: z.string(),
        walletAddress: z.string(),
        subsidyId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { subsidyRuleId, walletAddress, subsidyId } = input;

      const user = await ctx.db.user.findUnique({
        where: { walletAddress },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // check if user has quota
      const quota = await ctx.db.quota.findUnique({
        where: { userId: user.id },
      });

      // new user 
      if (!quota) {
        return {
          eligible: true,
        };
      }

      let subsidy = await ctx.db.subsidy.findUnique({
        where: { id: subsidyId },
      });

      // for demo create a default subsidy
      if (!subsidy) {
        subsidy = await ctx.db.subsidy.create({
          data: {
            id: subsidyId,
            maxTransactions: 100,
            totalBudget: 1000000n,
            name: "Default Subsidy",
            maxAmount: 1000000n,
            usedBudget: 0n
          },
        });
      }

      if (!subsidy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subsidy not found" });
      }

      if (quota.usedCount >= subsidy.maxTransactions) {
        return {
          eligible: false,
        };
      }

      return {
        eligible: true,
      };
    }),
  relay: publicProcedure
    .input(z.object({ subsidyId: z.number(), signedDelegates: z.array(z.instanceof(Buffer)) }))
    .mutation(async ({ ctx, input }) => {
      const { subsidyId, signedDelegates } = input;
      const relayerAccount: Account = await getAccount(
        NETWORK_ID,
        RELAYER_ID,
        RELAYER_PRIVATE_KEY,
      );
      const deserializedTx: SignedDelegate = deserialize(
        SCHEMA.SignedDelegate,
        signedDelegates[0],
      ) as SignedDelegate;

      const rule = await ctx.db.subsidy.findUnique({
        where: { id: subsidyId },
      });

      if (!rule) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subsidy not found" });
      }

      if (
        rule.usedBudget +
        deserializedTx.delegateAction.actions[0]?.transfer?.deposit ??
        0 >
        rule.totalBudget
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Subsidy budget exceeded" });
      }

      const user = await ctx.db.user.findUnique({
        where: { walletAddress: deserializedTx.delegateAction.senderId },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const transactionEntry = await ctx.db.transaction.create({
        data: {
          userId: user.id,
          subsidyId,
          amount: deserializedTx.transaction.actions[0]?.transfer?.deposit ?? 0,
          status: "PENDING",
        },
      });


      const result = await relayerAccount.signAndSendTransaction({
        actions: [actionCreators.signedDelegate(deserializedTx)],
        receiverId: deserializedTx.delegateAction.senderId,
      });
      return { message: "Relayed", data: result };
    }),
  getQuota: publicProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { accountId } = input;
      const user = await ctx.db.user.findUnique({
        where: { walletAddress: accountId },
      });
      console.log("getting user for getQuota", user);
      let quota = await ctx.db.quota.findUnique({
        where: { userId: user?.id },
      });
      console.log("getting quota for getQuota", quota);
      if (!quota) {
        quota = await ctx.db.quota.create({
          data: { userId: user?.id ?? 0, usedCount: 0 },
        });
      }
      return quota;
    }),
  getSubsidy: publicProcedure
    .input(z.object({ subsidyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { subsidyId } = input;
    }),
});
