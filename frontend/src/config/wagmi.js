import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

// Set VITE_WALLET_CONNECT_PROJECT_ID in frontend/.env
// Get a free projectId at: https://cloud.reown.com/
const PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

export const wagmiConfig = getDefaultConfig({
  appName: 'ChitX',
  projectId: PROJECT_ID,
  chains: [sepolia],
  ssr: false,
});
