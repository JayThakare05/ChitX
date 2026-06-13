import React from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '../config/wagmi';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't refetch on window focus by default — avoids noisy refetches
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const rainbowTheme = darkTheme({
  accentColor: '#6366f1',
  accentColorForeground: 'white',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
});

/**
 * AppProviders wraps the entire tree with:
 *  - WagmiProvider (blockchain / wallet)
 *  - QueryClientProvider (server state cache)
 *  - RainbowKitProvider (wallet connect modal)
 */
export function AppProviders({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
