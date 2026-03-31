import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '../shared/utils/trpc';
import App from './App.tsx';
import './index.css';

import { auth } from '@/src/firebase';

function Root() {
  // In production, use relative path (same domain as backend on Railway).
  // In development, point to local backend server.
  const apiUrl = import.meta.env.PROD
    ? '/trpc'
    : (import.meta.env.VITE_API_URL || 'http://localhost:3001/trpc');
  console.log(`[CONFIG] tRPC API URL: ${apiUrl}`);
  
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: apiUrl,
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
