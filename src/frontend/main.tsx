import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '../shared/utils/trpc';
import App from './App.tsx';
import './index.css';

import { auth } from '@/src/firebase';

function Root() {
  const apiUrl = 'https://backend-production-f0aa.up.railway.app/trpc';
  console.log(`[CONFIG] tRPC API URL: ${apiUrl}`);
  
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: apiUrl,
          async headers() {
            const token = await auth.currentUser?.getIdToken(false).catch(() => null);
            return {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            };
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
