import { useState } from 'react';
import { type Action, actionCreators, encodeSignedDelegate } from '@near-js/transactions';
import { api } from '~/trpc/react';
import { useWalletSelector } from '~/providers/NearWalletProvider';

export function useMetaTransaction() {
  const { selector, modal, accountId } = useWalletSelector();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkEligibility = api.meta.checkEligibility.useQuery({
    subsidyRuleId: "1",
    subsidyId: 1,
    walletAddress: accountId,
  });
  const relay = api.meta.relay.useMutation();
  const getQuota = api.meta.getQuota.useQuery({
    userId: "52",
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
      setIsLoading(true);
      setError(null);

      // Check eligibility first
      const eligibility = await checkEligibility.mutateAsync({
        subsidyRuleId: options?.subsidyRuleId,
      });

      if (!eligibility.isEligible) {
        throw new Error(eligibility.reason || 'Not eligible for subsidy');
      }

      // Create signed delegate
      const wallet = await selector?.wallet("my-near-wallet");
      const accounts = await wallet?.getAccounts();
      const signedDelegate = await accounts?.[0].signedDelegate({
        actions,
        blockHeightTtl: 120,
        receiverId,
      });

      // Relay transaction
      const result = await relay.mutateAsync({
        signedDelegate: Array.from(encodeSignedDelegate(signedDelegate)),
        subsidyRuleId: options?.subsidyRuleId,
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