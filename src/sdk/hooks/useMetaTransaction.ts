import { useState } from 'react';
import { type Action, actionCreators, encodeSignedDelegate, buildDelegateAction } from '@near-js/transactions';
import { api } from '~/trpc/react';
import { useWalletSelector } from '~/providers/NearWalletProvider';
import { providers } from 'near-api-js';

export function useMetaTransaction() {
  const { selector, modal, accountId } = useWalletSelector();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkEligibility = api.meta.checkEligibility.useMutation();
  const relay = api.meta.relay.useMutation();
  const getQuota = api.meta.getQuota.useQuery({
    accountId: accountId ?? "",
  });

  const sendTransaction = async (
    receiverId: string,
    actions: Action[],
    options?: {
      maxGas?: string;
      subsidyRuleId?: string;
    }
  ) => {
    try {
      if (!receiverId) {
        console.log("no receiver bitch")
      }

      setIsLoading(true);
      setError(null);

      // Check eligibility with correct parameters
      const eligibility = await checkEligibility.mutateAsync({
        subsidyRuleId: options?.subsidyRuleId ?? "1",
        subsidyId: 1,
        walletAddress: accountId ?? "",
      });

      if (!eligibility.eligible) {
        throw new Error('Not eligible for subsidy');
      }

      // Create signed delegate
      const wallet = await selector?.wallet();
      if (!wallet) {
        throw new Error('No wallet selected');
      }

      const accounts = await wallet.getAccounts();
      if (!accounts?.length) {
        throw new Error('No accounts found');
      }

      // Build the delegate action
      const currentNonce = BigInt(Date.now());

      // Create RPC provider
      // console.log("selector", selector?.options.network);
      // const provider = new providers.JsonRpcProvider(selector.options.network.nodeUrl);
      // const block = await provider.block({ finality: 'final' });
      // const maxBlockHeight = BigInt(block.header.height + 120); // TTL of 120 blocks

      // const delegateAction = buildDelegateAction({
      //   actions,
      //   maxBlockHeight,
      //   nonce: currentNonce,
      //   publicKey: accounts[0].publicKey,
      //   receiverId,
      //   senderId: accounts[0].accountId,
      // });


      const wallie = await selector?.wallet();
      const accountsa = await wallie?.getAccounts();
      console.log(receiverId, "receiverId", "senderId", accounts[0].accountId)
      // Sign the delegate action
      const signedDelegate = await accountsa[0].({
        actions: actions,
        blockHeightTtl: 120,
        receiverId: receiverId,
      });


      // const signedDelegate = await wallet.signMessage({
      //   message: delegateAction.encode(),
      //   receiver: receiverId,
      //   sender: accounts[0].accountId ?? "",
      //   callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/relay`,

      // });

      // Relay transaction
      const result = await relay.mutateAsync({
        signedDelegates: [encodeSignedDelegate(signedDelegate)],
        subsidyId: Number(options?.subsidyRuleId ?? "1"),
      });

      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendTransaction,
    isLoading,
    error,
    quota: getQuota.data,
    isQuotaLoading: getQuota.isLoading,
  };
}