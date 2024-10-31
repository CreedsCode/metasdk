"use client";

import {
  type WalletSelector,
  setupWalletSelector,
} from "@near-wallet-selector/core";
import {
  setupModal,
  type WalletSelectorModal,
} from "@near-wallet-selector/modal-ui";
import { setupDefaultWallets } from "@near-wallet-selector/default-wallets";
import "@near-wallet-selector/modal-ui/styles.css";
import { createContext, useContext, useEffect, useState } from "react";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";

interface WalletSelectorContextValue {
  selector: WalletSelector | null;
  modal: WalletSelectorModal | null;
  accounts: Array<{ accountId: string }>;
  accountId: string | null;
}

const WalletSelectorContext = createContext<WalletSelectorContextValue>({
  selector: null,
  modal: null,
  accounts: [],
  accountId: null,
});

export function NearWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [accounts, setAccounts] = useState<Array<{ accountId: string }>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const setupWallet = async () => {
      const selector = await setupWalletSelector({
        network: "testnet",
        modules: [
          setupMyNearWallet({
            successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/`,
            failureUrl: `${process.env.NEXT_PUBLIC_APP_URL}/`,
          }),
        ],
      });

      const modal = setupModal(selector, {
        contractId: "metasdk.testnet",
      });

      const state = selector.store.getState();
      setAccounts(state.accounts);

      // Listen for changes
      selector.store.observable.subscribe((state) => {
        setAccounts(state.accounts);
      });

      setSelector(selector);
      setModal(modal);
      setMounted(true);
    };

    setupWallet().catch(console.error);
  }, []);

  if (!mounted) return null;

  return (
    <WalletSelectorContext.Provider
      value={{
        selector,
        modal,
        accounts,
        accountId: accounts[0]?.accountId ?? null,
      }}
    >
      {children}
    </WalletSelectorContext.Provider>
  );
}

// Custom hook to use the wallet selector
export function useWalletSelector() {
  const context = useContext(WalletSelectorContext);
  if (!context) {
    throw new Error(
      "useWalletSelector must be used within a WalletSelectorProvider",
    );
  }
  return context;
}
