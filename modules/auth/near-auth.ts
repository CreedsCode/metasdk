import { db } from "~/server/db";
import { randomBytes } from 'crypto'
const JWT_SECRET = process.env.JWT_SECRET;

export type Challenge = {
  challenge: string;
  message: string;
};

export class NearAuthenticator {
  static async createChallenge(walletAddress: string): Promise<Challenge> {
    try {
      await db.authChallenge.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      const challenge = randomBytes(32).toString("hex");
      const message = "Login with NEAR";

      await db.authChallenge.create({
        data: {
          challenge,
          message,
          walletAddress,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      return { challenge, message };
    } catch (error: unknown) {
      console.error("Failed to create challenge:", error);
      throw new Error("Failed to create challenge");
    }
  }

  static async verifySignature(
    walletAddress: string,
    nonce: string,
    signature: string,
  ): Promise<boolean> {
    try {
      const nonceRecord = await db.authNonce.findUnique({
        where: {
          nonce,
          walletAddress,
          used: false,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!nonceRecord) {
        return false;
      }


      const message = `Authenticate to Meta Transaction SDK\nNonce: ${nonce}`;
      const isValid = verify(message, signature, walletAddress);
      return isValid;
    } catch (error: unknown) {
      console.error("Failed to verify signature:", error);
      throw new Error("Failed to verify signature");
    }
  }
}
