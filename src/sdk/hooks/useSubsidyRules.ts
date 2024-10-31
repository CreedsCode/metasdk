
import { api } from '~/trpc/react';

export function useSubsidyRules() {
  const rules = api.meta.getSubsidyRules.useQuery();

  return {
    rules: rules.data,
    isLoading: rules.isLoading,
    error: rules.error,
  };
}
