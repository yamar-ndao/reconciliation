import express from 'express';
import cors from 'cors';
import reconciliationRoutes from './routes/reconciliation.routes';
import agencySummaryRoutes from './routes/agency-summary.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/agency-summary', agencySummaryRoutes);

export default app; 