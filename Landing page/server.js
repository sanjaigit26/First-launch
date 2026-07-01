import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStorage } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;
const storage = createStorage();

await storage.init?.();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const allowedPetTypes = new Set(['dog', 'cat', 'bird', 'rabbit', 'fish', 'exotic', 'none']);

function normalizeText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function isValidName(name) {
  return name.length >= 2 && name.length <= 120;
}

function isValidCity(city) {
  return city.length >= 2 && city.length <= 80;
}

function buildError(message, details = []) {
  return { error: message, details };
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

app.get('/api/early-access/stats', asyncHandler(async (_req, res) => {
  const stats = await storage.getStats();
  res.json(stats);
}));

app.get('/api/early-access', asyncHandler(async (_req, res) => {
  const entries = await storage.listEntries(500);
  res.json({
    count: entries.length,
    entries
  });
}));

app.post('/api/early-access', asyncHandler(async (req, res) => {
  const fullName = normalizeText(req.body.fullName ?? req.body.fullname);
  const email = normalizeEmail(req.body.email);
  const phone = normalizeText(req.body.phone);
  const petType = normalizeText(req.body.petType ?? req.body.pettype).toLowerCase();
  const city = normalizeText(req.body.city);

  const validationErrors = [];

  if (!isValidName(fullName)) {
    validationErrors.push({ field: 'fullName', message: 'Full name must be between 2 and 120 characters.' });
  }

  if (!isValidEmail(email)) {
    validationErrors.push({ field: 'email', message: 'Enter a valid email address.' });
  }

  if (!isValidPhone(phone)) {
    validationErrors.push({ field: 'phone', message: 'Enter a valid phone number with 10 to 15 digits.' });
  }

  if (!allowedPetTypes.has(petType)) {
    validationErrors.push({ field: 'petType', message: 'Select a valid pet type.' });
  }

  if (!isValidCity(city)) {
    validationErrors.push({ field: 'city', message: 'City must be between 2 and 80 characters.' });
  }

  if (validationErrors.length > 0) {
    res.status(400).json(buildError('Validation failed.', validationErrors));
    return;
  }

  const normalizedPhone = phone.replace(/\s+/g, '');
  const existing = await storage.findEntryByEmail(email);

  if (existing) {
    const updated = await storage.updateEntryByEmail(email, {
      full_name: fullName,
      email,
      phone: normalizedPhone,
      pet_type: petType,
      city
    });

    res.json({
      message: 'Your early access registration was updated.',
      saved: updated.saved,
      action: 'updated',
      changes: updated.changes
    });
    return;
  }

  const savedRecord = await storage.createEntry({
    full_name: fullName,
    email,
    phone: normalizedPhone,
    pet_type: petType,
    city
  });

  res.status(201).json({
    message: 'Your early access registration was saved.',
    saved: savedRecord,
    action: 'created'
  });
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

process.on('SIGINT', async () => {
  await storage.close?.();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await storage.close?.();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Petverz backend listening on http://localhost:${port}`);
});
