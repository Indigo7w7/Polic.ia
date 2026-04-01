import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '../shared/utils/trpc';
import App from './App.tsx';
import './index.css';

import { auth } from '@/src/firebase';

function Root() {
  // Priority:
  // 1. VITE_API_URL env var (set in .env.local for dev)
  // 2. Production: always use the Railway backend URL directly (Firebase Hosting + Railway are separate domains)
  const apiUrl = import.meta.env.VITE_API_URL || 'https://backend-production-f0aa.up.railway.app/trpc';
  console.log(`[CONFIG] tRPC API URL: ${apiUrl}`);
  
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: apiUrl,
          methodOverride: 'POST',
          async headers() {
            // Try fresh token first, fall back to stored token
            let token: string | null = localStorage.getItem('authToken');
            try {
              const freshToken = await auth.currentUser?.getIdToken(false).catch(() => null);
              if (freshToken) {
                token = freshToken;
                localStorage.setItem('authToken', freshToken);
              }
            } catch { /* ignore */ }
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
