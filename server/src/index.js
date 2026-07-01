import express from 'express';
import cors from 'cors';
import session from 'express-session';
import mysqlSession from 'express-mysql-session';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pool from './config/db.js';
import authRoutes from './routes/auth.js';
import cakeSpecRoutes, { optionRouter as cakeSpecOptionRoutes } from './routes/peniaga/cakeSpec.js';
import peniagaClosedDateRoutes from './routes/peniaga/closedDate.js';
import peniagaOrderRoutes from './routes/peniaga/order.js';
import peniagaReportRoutes from './routes/peniaga/report.js';
import pelangganClosedDateRoutes from './routes/pelanggan/closedDate.js';
import pelangganCakeSpecRoutes from './routes/pelanggan/cakeSpec.js';
import pelangganOrderRoutes from './routes/pelanggan/order.js';
import pelangganProfileRoutes from './routes/pelanggan/profile.js';
import peniagaBusinessInfoRoutes from './routes/peniaga/businessInfo.js';
import publicRoutes from './routes/public.js';
import pelangganImageRoutes from './routes/pelanggan/image.js';
import pelangganChatbotRoutes from './routes/pelanggan/chatbot.js';
import peniagaWhatsappRoutes from './routes/peniaga/whatsapp.js';
import { initialize as initializeWhatsApp } from './services/whatsappService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---

// CORS - allow requests from the Vite dev server
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Session configuration with MySQL store
const MySQLStore = mysqlSession(session);
const sessionStore = new MySQLStore({
  clearExpired: true,
  checkExpirationInterval: 900000, // 15 minutes
  expiration: 86400000, // 24 hours (max for customer sessions)
}, pool);

app.use(session({
  key: 'mykek_session',
  secret: process.env.SESSION_SECRET || 'mykek-secret-key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400000, // 24 hours default
    sameSite: 'lax',
  },
}));

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/peniaga/kategori-spesifikasi', cakeSpecRoutes);
app.use('/api/peniaga/pilihan-spesifikasi', cakeSpecOptionRoutes);
app.use('/api/peniaga/tarikh-tutup', peniagaClosedDateRoutes);
app.use('/api/peniaga/tempahan', peniagaOrderRoutes);
app.use('/api/peniaga/laporan-jualan', peniagaReportRoutes);
app.use('/api/pelanggan/tarikh-tutup', pelangganClosedDateRoutes);
app.use('/api/pelanggan/spesifikasi-kek', pelangganCakeSpecRoutes);
app.use('/api/pelanggan/tempahan', pelangganImageRoutes);
app.use('/api/pelanggan/tempahan', pelangganOrderRoutes);
app.use('/api/pelanggan/profil', pelangganProfileRoutes);
app.use('/api/peniaga/profil-perniagaan', peniagaBusinessInfoRoutes);
app.use('/api/awam', publicRoutes);
app.use('/api/pelanggan/chatbot', pelangganChatbotRoutes);
app.use('/api/peniaga/whatsapp', peniagaWhatsappRoutes);

// --- Health check route ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mesej: 'Pelayan MyKek berjalan' });
});

// --- Error handling middleware ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    ralat: true,
    mesej: 'Ralat sistem. Sila cuba lagi.',
  });
});

// --- Start server ---
if (process.env.NODE_ENV !== 'test') {
  // Initialize WhatsApp client (if enabled)
  if (process.env.WHATSAPP_ENABLED === 'true') {
    console.log('[WhatsApp] Memulakan klien WhatsApp...');
    initializeWhatsApp().catch((err) => {
      console.error('Gagal memulakan WhatsApp:', err);
    });
  }

  app.listen(PORT, () => {
    console.log(`Pelayan MyKek berjalan di port ${PORT}`);
  });
}

export default app;
