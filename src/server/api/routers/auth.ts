import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { decodeAndVerifyJwtToken, NearAuthenticator } from "modules/auth/near-auth";
import { TRPCError } from "@trpc/server";
import { signJwt } from "~/utils/jwt";

export const authRouter = createTRPCRouter({
  challenge: publicProcedure
    .input(z.object({ walletAddress: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Create user if they don't exist
      await ctx.db.user.upsert({
        where: { walletAddress: input.walletAddress },
        update: {},
        create: { walletAddress: input.walletAddress },
      });

      const challenge = await NearAuthenticator.createChallenge(input.walletAddress);
      return challenge;
    }),
  verify: publicProcedure
    .input(z.object({
      accountId: z.string(),
      publicKey: z.string(),
      signature: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log('Starting verification process for:', {
        accountId: input.accountId,
        publicKey: input.publicKey,
        signatureLength: input.signature?.length ?? 0
      });

      // Get all valid challenges for this wallet
      const challengeRecords = await ctx.db.authChallenge.findMany({
        where: {
          walletAddress: input.accountId,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      console.log('Found challenges:', {
        count: challengeRecords.length,
        challenges: challengeRecords.map(c => ({
          id: c.id,
          challenge: c.challenge?.substring(0, 10) + '...',
          createdAt: c.createdAt
        }))
      });

      // Try each challenge until we find a valid one
      for (const challengeRecord of challengeRecords) {
        try {
          console.log('Attempting verification with challenge:', {
            challengeId: challengeRecord.id,
            challengePrefix: challengeRecord.challenge?.substring(0, 10) + '...',
            createdAt: challengeRecord.createdAt
          });

          const isValid = await NearAuthenticator.verifySignature(input, challengeRecord);

          if (isValid) {
            const token = signJwt({ accountId: input.accountId });
            return { token };
          }
        } catch (error) {
          console.error('Challenge verification failed:', {
            challengeId: challengeRecord.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            challenge: challengeRecord.challenge?.substring(0, 20) + '...',
            signature: input.signature?.substring(0, 20) + '...'
          });
        }
      }

      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Failed to verify signature'
      });
    }),
  user: publicProcedure
    .input(z.object({
      jwt: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        if (!input.jwt) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'No JWT provided',
          });
        }

        const decoded = decodeAndVerifyJwtToken(input.jwt);

        if (!decoded || !decoded.accountId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid JWT token',
          });
        }

        const user = await ctx.db.user.findUnique({
          where: { walletAddress: decoded.accountId },
        });

        const authChallenges = await ctx.db.authChallenge.findMany({
          where: { walletAddress: decoded.accountId },
          orderBy: { createdAt: 'desc' },
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        return { user, authChallenges };
      } catch (error) {
        console.error('Error in user query:', error);
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: error instanceof Error ? error.message : 'Authentication failed',
        });
      }
    }),
});
