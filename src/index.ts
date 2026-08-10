import path from 'node:path';
import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import type { Lead, Property } from '@updesh/shared-types';
import { db, load, save, uid, UPLOADS_DIR, type DbLead, type DbProperty } from './store.js';
import { issueTokens, optionalAuth, requireAuth, requireRole, toPublicUser, verifyToken } from './auth.js';

const PORT = Number(process.env.PORT ?? 4000);
const DAY_MS = 24 * 60 * 60 * 1000;

load();

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// ---------- helpers ----------

function serializeProperty(p: DbProperty, opts: { populateSeller?: boolean } = {}): Property {
  const { id, ...rest } = p;
  const seller = opts.populateSeller ? db.users.find((u) => u.id === p.sellerId) : null;
  return {
    ...rest,
    _id: id,
    id,
    sellerId: seller ? toPublicUser(seller) : p.sellerId,
  };
}

function serializeLead(l: DbLead, opts: { populateProperty?: boolean } = {}): Lead {
  const { id, ...rest } = l;
  const property = opts.populateProperty && l.propertyId
    ? db.properties.find((p) => p.id === l.propertyId)
    : null;
  return {
    ...rest,
    _id: id,
    id,
    propertyId: property ? serializeProperty(property) : l.propertyId,
  };
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s()-]/g, '');
}

// ---------- auth ----------

app.post('/api/auth/signup', (req, res) => {
  const { name, email, phone, password, role, preferredLocalities, website } = req.body ?? {};
  if (website) {
    // Honeypot field filled in — almost certainly a bot.
    res.status(400).json({ error: 'Signup failed' });
    return;
  }
  if (!name || !email || !phone || !password || String(password).length < 8) {
    res.status(400).json({ error: 'Name, email, phone, and a password of 8+ characters are required' });
    return;
  }
  const emailNorm = String(email).toLowerCase().trim();
  const phoneNorm = normalizePhone(String(phone));
  if (db.users.some((u) => u.email === emailNorm || normalizePhone(u.phone) === phoneNorm)) {
    res.status(409).json({ error: 'An account with this email or phone already exists' });
    return;
  }
  const user = {
    id: uid(),
    name: String(name).trim(),
    email: emailNorm,
    phone: String(phone).trim(),
    passwordHash: bcrypt.hashSync(String(password), 10),
    role: (role === 'seller' ? 'seller' : 'buyer') as 'seller' | 'buyer',
    preferredLocalities: Array.isArray(preferredLocalities) ? preferredLocalities : [],
    savedPropertyIds: [],
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  save();
  res.status(201).json({ user: toPublicUser(user), ...issueTokens(user.id) });
});

app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body ?? {};
  if (!identifier || !password) {
    res.status(400).json({ error: 'Identifier and password are required' });
    return;
  }
  const idNorm = String(identifier).toLowerCase().trim();
  const phoneNorm = normalizePhone(String(identifier));
  const user = db.users.find(
    (u) => u.email === idNorm || normalizePhone(u.phone) === phoneNorm
  );
  if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  res.json({ user: toPublicUser(user), ...issueTokens(user.id) });
});

app.post('/api/auth/refresh', (req, res) => {
  const user = req.body?.refreshToken ? verifyToken(String(req.body.refreshToken), 'refresh') : null;
  if (!user) {
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }
  res.json(issueTokens(user.id));
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user!) });
});

// ---------- localities ----------

app.get('/api/localities', (_req, res) => {
  res.json({
    localities: db.localities.map(({ id, ...rest }) => ({ ...rest, _id: id, id })),
  });
});

// ---------- properties ----------

const CITY_ALIASES: Record<string, string> = { gurgaon: 'gurugram' };

app.get('/api/properties', (req, res) => {
  const q = req.query;
  const norm = (s: string) => {
    const lower = s.toLowerCase().trim();
    return CITY_ALIASES[lower] ?? lower;
  };

  let results = db.properties.filter((p) => p.status === 'live');

  const listingType = q.listingType ? String(q.listingType) : 'buy';
  if (listingType === 'buy' || listingType === 'rent') {
    results = results.filter((p) => (p.listingType ?? 'buy') === listingType);
  }

  if (q.locality) {
    const want = norm(String(q.locality));
    results = results.filter((p) => norm(p.locality) === want || norm(p.city) === want);
  }
  if (q.city) {
    const want = norm(String(q.city));
    results = results.filter((p) => norm(p.city) === want);
  }
  if (q.minPrice) results = results.filter((p) => p.price >= Number(q.minPrice));
  if (q.maxPrice) results = results.filter((p) => p.price <= Number(q.maxPrice));
  if (q.bhk) results = results.filter((p) => p.bhk >= Number(q.bhk));
  if (q.type) results = results.filter((p) => p.type === q.type);
  if (q.furnishing) results = results.filter((p) => p.furnishing === q.furnishing);
  if (q.q) {
    const needle = String(q.q).toLowerCase();
    results = results.filter((p) =>
      [p.title, p.description, p.locality, p.city].some((f) => f.toLowerCase().includes(needle))
    );
  }

  const byNewest = (a: DbProperty, b: DbProperty) => b.createdAt.localeCompare(a.createdAt);
  switch (q.sort) {
    case 'newest':
      results.sort(byNewest);
      break;
    case 'oldest':
      results.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      break;
    case 'price_asc':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      results.sort((a, b) => b.price - a.price);
      break;
    case 'featured':
    default:
      results.sort((a, b) => Number(b.featured) - Number(a.featured) || byNewest(a, b));
  }

  const limit = Math.min(Number(q.limit) || 20, 50);
  const offset = Math.max(Number(q.cursor) || 0, 0);
  const page = results.slice(offset, offset + limit);

  res.json({
    properties: page.map((p) => serializeProperty(p)),
    nextCursor: offset + limit < results.length ? String(offset + limit) : null,
    total: results.length,
  });
});

app.get('/api/properties/:id', optionalAuth, (req, res) => {
  const property = db.properties.find((p) => p.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }
  const isOwnerOrAdmin = req.user && (req.user.id === property.sellerId || req.user.role === 'admin');
  if (property.status !== 'live' && !isOwnerOrAdmin) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }

  db.viewEvents.push({ propertyId: property.id, at: new Date().toISOString() });
  save();

  const similar = db.properties
    .filter(
      (p) =>
        p.id !== property.id &&
        p.status === 'live' &&
        (p.listingType ?? 'buy') === (property.listingType ?? 'buy') &&
        (p.locality === property.locality || p.city === property.city)
    )
    .sort(
      (a, b) => Math.abs(a.price - property.price) - Math.abs(b.price - property.price)
    )
    .slice(0, 3);

  res.json({
    property: serializeProperty(property, { populateSeller: true }),
    similar: similar.map((p) => serializeProperty(p)),
  });
});

app.post('/api/properties', requireRole('seller', 'admin'), (req, res) => {
  const b = req.body ?? {};
  if (!b.title || !b.description || !b.locality || !b.city || !Number(b.price) || !Number(b.areaSqft)) {
    res.status(400).json({ error: 'Title, description, locality, city, price, and area are required' });
    return;
  }
  const now = new Date().toISOString();
  const property: DbProperty = {
    id: uid(),
    title: String(b.title),
    description: String(b.description),
    type: b.type ?? 'flat',
    listingType: b.listingType === 'rent' ? 'rent' : 'buy',
    bhk: Number(b.bhk) || 1,
    price: Number(b.price),
    areaSqft: Number(b.areaSqft),
    furnishing: b.furnishing ?? 'unfurnished',
    ageOfProperty: b.ageOfProperty !== undefined ? Number(b.ageOfProperty) : undefined,
    locality: String(b.locality),
    city: String(b.city),
    address: b.address ? String(b.address) : undefined,
    geo: b.geo?.lat != null ? { lat: Number(b.geo.lat), lng: Number(b.geo.lng) } : { lat: 28.6139, lng: 77.209 },
    images: [],
    amenities: Array.isArray(b.amenities) ? b.amenities : [],
    sellerId: req.user!.id,
    status: 'pending_review',
    featured: false,
    sellerType: b.sellerType === 'broker' ? 'broker' : 'owner',
    createdAt: now,
    updatedAt: now,
  };
  db.properties.push(property);
  save();
  res.status(201).json({ property: serializeProperty(property) });
});

function findOwnedProperty(req: express.Request, res: express.Response): DbProperty | null {
  const property = db.properties.find((p) => p.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: 'Property not found' });
    return null;
  }
  if (property.sellerId !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'You do not own this listing' });
    return null;
  }
  return property;
}

app.patch('/api/properties/:id', requireAuth, (req, res) => {
  const property = findOwnedProperty(req, res);
  if (!property) return;
  const b = req.body ?? {};
  const editable = [
    'title', 'description', 'type', 'listingType', 'bhk', 'price', 'areaSqft', 'furnishing',
    'ageOfProperty', 'locality', 'city', 'address', 'geo', 'amenities', 'sellerType',
  ] as const;
  for (const key of editable) {
    if (b[key] !== undefined) (property as unknown as Record<string, unknown>)[key] = b[key];
  }
  // Content edits by the seller go back through review; admins can also set status directly.
  if (req.user!.role === 'admin' && b.status) {
    property.status = b.status;
  } else if (req.user!.role !== 'admin') {
    property.status = 'pending_review';
    property.rejectionReason = undefined;
  }
  property.updatedAt = new Date().toISOString();
  save();
  res.json({ property: serializeProperty(property) });
});

app.delete('/api/properties/:id', requireAuth, (req, res) => {
  const property = findOwnedProperty(req, res);
  if (!property) return;
  db.properties = db.properties.filter((p) => p.id !== property.id);
  db.leads = db.leads.filter((l) => l.propertyId !== property.id);
  save();
  res.json({ success: true });
});

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => {
      const ext = file.mimetype === 'image/png' ? '.png' : '.jpg';
      cb(null, `${uid()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 15 },
  fileFilter: (_req, file, cb) => {
    cb(null, ['image/jpeg', 'image/png'].includes(file.mimetype));
  },
});

app.post('/api/properties/:id/images', requireAuth, upload.array('images', 15), (req, res) => {
  const property = findOwnedProperty(req, res);
  if (!property) return;
  const files = (req.files ?? []) as Express.Multer.File[];
  property.images.push(...files.map((f) => `/uploads/${f.filename}`));
  property.updatedAt = new Date().toISOString();
  save();
  res.json({ images: property.images });
});

// ---------- leads ----------

app.post('/api/leads', optionalAuth, (req, res) => {
  const b = req.body ?? {};
  if (b.website) {
    // Honeypot: pretend success so bots don't adapt, store nothing.
    res.status(201).json({ lead: { id: uid(), type: b.type ?? 'notify_me', status: 'new' } });
    return;
  }
  if (!b.name || !b.phone || !['viewing_request', 'call_request', 'notify_me'].includes(b.type)) {
    res.status(400).json({ error: 'Name, phone, and a valid enquiry type are required' });
    return;
  }
  if (b.propertyId && !db.properties.some((p) => p.id === b.propertyId)) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }
  const lead: DbLead = {
    id: uid(),
    propertyId: b.propertyId || undefined,
    userId: req.user?.id,
    type: b.type,
    name: String(b.name),
    phone: String(b.phone),
    email: b.email ? String(b.email) : undefined,
    message: b.message ? String(b.message) : undefined,
    preferredTime: b.preferredTime ? String(b.preferredTime) : undefined,
    filters: b.filters && typeof b.filters === 'object' ? b.filters : undefined,
    status: 'new',
    createdAt: new Date().toISOString(),
  };
  db.leads.push(lead);
  save();
  res.status(201).json({ lead: { id: lead.id, type: lead.type, status: lead.status } });
});

// ---------- users ----------

app.get('/api/users/me/leads', requireAuth, (req, res) => {
  const leads = db.leads
    .filter((l) => l.userId === req.user!.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((l) => serializeLead(l, { populateProperty: true }));
  res.json({ leads });
});

app.get('/api/users/me/listings', requireAuth, (req, res) => {
  const mine = db.properties
    .filter((p) => p.sellerId === req.user!.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const myIds = new Set(mine.map((p) => p.id));
  const cutoff = Date.now() - 30 * DAY_MS;
  const stats = {
    activeListings: mine.filter((p) => p.status === 'live').length,
    totalViews30d: db.viewEvents.filter(
      (v) => myIds.has(v.propertyId) && new Date(v.at).getTime() >= cutoff
    ).length,
    enquiries30d: db.leads.filter(
      (l) => l.propertyId && myIds.has(l.propertyId) && new Date(l.createdAt).getTime() >= cutoff
    ).length,
    pendingApproval: mine.filter((p) => p.status === 'pending_review').length,
  };
  res.json({ listings: mine.map((p) => serializeProperty(p)), stats });
});

app.get('/api/users/me/saved', requireAuth, (req, res) => {
  const properties = req.user!.savedPropertyIds
    .map((id) => db.properties.find((p) => p.id === id))
    .filter((p): p is DbProperty => !!p && p.status === 'live')
    .map((p) => serializeProperty(p));
  res.json({ properties });
});

app.post('/api/users/me/saved/:propertyId', requireAuth, (req, res) => {
  const propertyId = String(req.params.propertyId);
  if (!db.properties.some((p) => p.id === propertyId)) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }
  const saved = req.user!.savedPropertyIds;
  const idx = saved.indexOf(propertyId);
  if (idx >= 0) saved.splice(idx, 1);
  else saved.push(propertyId);
  save();
  res.json({ saved: idx < 0 });
});

// ---------- admin ----------

app.get('/api/admin/listings/pending', requireRole('admin'), (_req, res) => {
  const pending = db.properties
    .filter((p) => p.status === 'pending_review')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  res.json({
    listings: pending.map((p) => serializeProperty(p, { populateSeller: true })),
    total: pending.length,
  });
});

app.patch('/api/admin/listings/:id', requireRole('admin'), (req, res) => {
  const property = db.properties.find((p) => p.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }
  const { action, rejectionReason } = req.body ?? {};
  if (action === 'approve') {
    property.status = 'live';
    property.rejectionReason = undefined;
  } else if (action === 'reject') {
    property.status = 'rejected';
    property.rejectionReason = rejectionReason || 'Does not meet listing guidelines';
  } else {
    res.status(400).json({ error: 'Action must be approve or reject' });
    return;
  }
  property.updatedAt = new Date().toISOString();
  save();
  res.json({ property: serializeProperty(property, { populateSeller: true }) });
});

app.get('/api/admin/leads', requireRole('admin'), (req, res) => {
  let leads = [...db.leads];
  if (req.query.status) leads = leads.filter((l) => l.status === req.query.status);
  if (req.query.type) leads = leads.filter((l) => l.type === req.query.type);
  leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({
    leads: leads.map((l) => serializeLead(l, { populateProperty: true })),
    total: leads.length,
  });
});

app.get('/api/admin/reports', requireRole('admin'), (_req, res) => {
  res.json({ reports: [], message: 'Reports are coming soon.' });
});

// ---------- misc ----------

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Updesh API listening on http://localhost:${PORT}`);
  console.log(`LAN access: http://<your-ip>:${PORT}`);
});
