import { useState } from 'react';
import { type Action } from '@near-js/transactions';
import { relayTransaction } from '@near-relay/client';
import { api } from '~/trpc/react';
import { useWalletSelector } from '~/providers/NearWalletProvider';
import { providers } from 'near-api-js';

export function useMetaTransaction() {
  const { accountId } = useWalletSelector();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkEligibility = api.meta.checkEligibility.useMutation();
  const getQuota = api.meta.getQuota.useQuery({
    accountId: accountId ?? "",
  });

  const sendTransaction = async (
    receiverId: string,
    actions: Action[],
    options?: {
      subsidyRuleId?: string;
      useNearRelay?: boolean;
    }
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      if (options?.useNearRelay) {
        // Use near-relay implementation
        const result = await relayTransaction(
          actions[0],
          receiverId,
          '/api/relayer',
          'testnet',
          { password: "lfg" }
        );
        return result;
      } else {
        // Use original implementation with subsidy checking
        const eligibility = await checkEligibility.mutateAsync({
          subsidyRuleId: options?.subsidyRuleId ?? "1",
          subsidyId: 1,
          walletAddress: accountId ?? "",
        });

        if (!eligibility.eligible) {
          throw new Error('Not eligible for subsidy');
        }

        const result = await relayTransaction(
          actions[0],
          receiverId,
          '/api/relayer?subsidyRuleId=' + options?.subsidyRuleId,
          'testnet'
        );

        return result;
      }
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