import { randomBytes } from 'crypto';
import { utils } from 'near-api-js';
import { sha256 } from 'js-sha256';
import { db } from "~/server/db";
import { AuthChallenge } from '@prisma/client';
import { PublicKey } from 'near-api-js/lib/utils';
import * as borsh from 'borsh';
import jwt from "jsonwebtoken";
const MESSAGE = "Sign this message to verify your identity";

export type Challenge = {
  challenge: string;
  message: string;
  recipient: string;
  callbackUrl: string;
};

type VerifyInput = {
  signature: string;
  accountId: string;
  publicKey: string;
};

export class NearAuthenticator {
  static async createChallenge(walletAddress: string): Promise<Challenge> {
    try {
      // Clean up expired challenges
      await db.authChallenge.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

      // Generate a 32-byte random challenge
      const challengeBuffer = randomBytes(32);
      const challenge = challengeBuffer.toString('base64');
      const recipient = "metasdk.testnet";
      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`;

      console.log('Creating challenge:', {
        message: MESSAGE,
        challengeHex: challenge,
        challengeLength: challengeBuffer.length,
      });

      await db.authChallenge.create({
        data: {
          challenge,
          message: MESSAGE,
          walletAddress,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      return { challenge, message: MESSAGE, recipient, callbackUrl };
    } catch (error) {
      console.error("Failed to create challenge:", error);
      throw new Error("Failed to create challenge");
    }
  }

  static async verifySignature(input: VerifyInput, challenge: AuthChallenge): Promise<boolean> {
    if (!input?.signature || !input?.accountId || !input?.publicKey || !challenge?.challenge) {
      console.error('Missing required verification parameters:', { input, challenge });
      return false;
    }

    // check if user belongs full key
    const fullKeyBelongsToUser = await this.verifyFullKeyBelongsToUser({
      accountId: input.accountId,
      publicKey: input.publicKey
    });

    try {
      // Convert base64 challenge to Uint8Array
      const nonce = Buffer.from(challenge.challenge, 'base64');

      // Reconstruct the payload that was signed
      const payload = new Payload({
        message: MESSAGE,
        nonce: nonce,  // Pass the Uint8Array directly
        recipient: "metasdk.testnet",
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`
      });

      const borshPayload = borsh.serialize(payloadSchema, payload)
      const toSign = new Uint8Array(sha256.array(borshPayload));
      const realSignature = Buffer.from(input.signature, 'base64');


      const myPK = utils.PublicKey.from(input.publicKey)
      const isSignatureValid = myPK.verify(toSign, realSignature)

      if (!isSignatureValid) {
        console.error('Signature verification failed');
        return false;
      }

      // Verify the public key belongs to the user
      const isKeyValid = await this.verifyFullKeyBelongsToUser({
        accountId: input.accountId,
        publicKey: input.publicKey
      });

      if (!isKeyValid) {
        console.error('Public key verification failed');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  private static async verifyFullKeyBelongsToUser({
    accountId,
    publicKey
  }: {
    accountId: string;
    publicKey: string;
  }): Promise<boolean> {
    const response = await fetch(
      "https://rpc.testnet.near.org",
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "query",
          params: [`access_key/${accountId}`, ""],
          id: 1
        })
      }
    );

    const data = await response.json();
    if (!data?.result?.keys) return false;

    return data.result.keys.some((key: any) =>
      key.public_key === publicKey &&
      key.access_key.permission === "FullAccess"
    );
  }
}


class Payload {
  constructor({ message, nonce, recipient, callbackUrl }) {
    this.tag = 2147484061;
    this.message = message;
    this.nonce = nonce;
    this.recipient = recipient;
    if (callbackUrl) { this.callbackUrl = callbackUrl }
  }
}

const payloadSchema = { struct: { tag: 'u32', message: 'string', nonce: { array: { type: 'u8', len: 32 } }, recipient: 'string', callbackUrl: { option: 'string' } } }


export function decodeAndVerifyJwtToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { accountId: string };
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}