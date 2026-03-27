import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './trpc';
import dotenv from 'dotenv';
import './firebaseAdmin';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: ['https://polic-ia-7bf7e.web.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.get('/health', (req, res) => {
  res.send('Server is running and healthy!');
});

app.listen(port, () => {
  console.log(`tRPC server listening at http://localhost:${port}`);
});
