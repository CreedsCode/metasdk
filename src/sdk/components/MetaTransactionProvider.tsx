"use client";

import { createContext, type ReactNode } from "react";

interface MetaTransactionContextType {
  defaultSubsidyRuleId?: string;
}

const MetaTransactionContext = createContext<MetaTransactionContextType | null>(
  null,
);

export function MetaTransactionProvider({
  children,
  defaultSubsidyRuleId,
}: {
  children: ReactNode;
  defaultSubsidyRuleId?: string;
}) {
  return (
    <MetaTransactionContext.Provider value={{ defaultSubsidyRuleId }}>
      {children}
    </MetaTransactionContext.Provider>
  );
}
