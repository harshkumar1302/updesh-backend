import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import type {
  City,
  FurnishingStatus,
  LeadStatus,
  LeadType,
  PropertyStatus,
  PropertyType,
  ListingType,
  UserRole,
} from '@updesh/shared-types';
import { isRemotePlaceholderImage, propertyImages } from './property-images.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(__dirname, '../data');
export const UPLOADS_DIR = path.resolve(__dirname, '../uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DbUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  preferredLocalities: string[];
  savedPropertyIds: string[];
  createdAt: string;
}

export interface DbProperty {
  id: string;
  title: string;
  description: string;
  type: PropertyType;
  listingType: ListingType;
  bhk: number;
  price: number;
  areaSqft: number;
  furnishing: FurnishingStatus;
  ageOfProperty?: number;
  locality: string;
  city: string;
  address?: string;
  geo: { lat: number; lng: number };
  images: string[];
  amenities: string[];
  sellerId: string;
  status: PropertyStatus;
  featured: boolean;
  rejectionReason?: string;
  sellerType: 'owner' | 'broker';
  createdAt: string;
  updatedAt: string;
}

export interface DbLead {
  id: string;
  propertyId?: string;
  userId?: string;
  type: LeadType;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  preferredTime?: string;
  filters?: Record<string, unknown>;
  status: LeadStatus;
  createdAt: string;
}

export interface DbLocality {
  id: string;
  name: string;
  city: City;
  geo: { lat: number; lng: number };
}

export interface ViewEvent {
  propertyId: string;
  at: string;
}

interface Db {
  users: DbUser[];
  properties: DbProperty[];
  leads: DbLead[];
  localities: DbLocality[];
  viewEvents: ViewEvent[];
}

export let db: Db;

let saveTimer: NodeJS.Timeout | null = null;

export function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }, 100);
}

export function uid(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}

export function load() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    let dirty = false;
    for (const p of db.properties) {
      if (!p.listingType) {
        p.listingType = 'buy';
        dirty = true;
      }
      if (p.images.some(isRemotePlaceholderImage)) {
        p.images = propertyImages(p.type, p.listingType, p.id, Math.max(p.images.length, 4));
        dirty = true;
      }
    }
    if (dirty) fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } else {
    db = seed();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function seed(): Db {
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  const admin: DbUser = {
    id: uid(),
    name: 'Updesh Admin',
    email: 'admin@updesh.com',
    phone: '+919999900001',
    passwordHash: hash('admin123456'),
    role: 'admin',
    preferredLocalities: [],
    savedPropertyIds: [],
    createdAt: daysAgo(120),
  };
  const seller: DbUser = {
    id: uid(),
    name: 'Rohan Malhotra',
    email: 'seller@updesh.com',
    phone: '+919999900002',
    passwordHash: hash('seller123456'),
    role: 'seller',
    preferredLocalities: ['Vasant Vihar', 'Golf Course Road'],
    savedPropertyIds: [],
    createdAt: daysAgo(90),
  };
  const buyer: DbUser = {
    id: uid(),
    name: 'Anita Sharma',
    email: 'buyer@updesh.com',
    phone: '+919999900003',
    passwordHash: hash('buyer123456'),
    role: 'buyer',
    preferredLocalities: ['South Delhi'],
    savedPropertyIds: [],
    createdAt: daysAgo(60),
  };
  const seller2: DbUser = {
    id: uid(),
    name: 'Kavita Reddy',
    email: 'kavita@updesh.com',
    phone: '+919999900004',
    passwordHash: hash('seller123456'),
    role: 'seller',
    preferredLocalities: ['DLF Phase 5', 'Sector 56'],
    savedPropertyIds: [],
    createdAt: daysAgo(45),
  };
  const buyer2: DbUser = {
    id: uid(),
    name: 'Amit Verma',
    email: 'amit@updesh.com',
    phone: '+919999900005',
    passwordHash: hash('buyer123456'),
    role: 'buyer',
    preferredLocalities: ['Noida Expressway', 'Indirapuram'],
    savedPropertyIds: [],
    createdAt: daysAgo(15),
  };

  const localities: DbLocality[] = [
    // Delhi (7)
    { id: uid(), name: 'Vasant Vihar', city: 'Delhi', geo: { lat: 28.5578, lng: 77.1597 } },
    { id: uid(), name: 'South Delhi', city: 'Delhi', geo: { lat: 28.5245, lng: 77.1855 } },
    { id: uid(), name: 'Greater Kailash', city: 'Delhi', geo: { lat: 28.5487, lng: 77.2411 } },
    { id: uid(), name: 'Defence Colony', city: 'Delhi', geo: { lat: 28.5717, lng: 77.2295 } },
    { id: uid(), name: 'Dwarka', city: 'Delhi', geo: { lat: 28.5921, lng: 77.0460 } },
    { id: uid(), name: 'Rohini', city: 'Delhi', geo: { lat: 28.7325, lng: 77.1101 } },
    { id: uid(), name: 'Saket', city: 'Delhi', geo: { lat: 28.5244, lng: 77.2066 } },
    // Gurugram (6)
    { id: uid(), name: 'Golf Course Road', city: 'Gurugram', geo: { lat: 28.4595, lng: 77.0946 } },
    { id: uid(), name: 'DLF Phase 5', city: 'Gurugram', geo: { lat: 28.4419, lng: 77.104 } },
    { id: uid(), name: 'Sushant Lok', city: 'Gurugram', geo: { lat: 28.4646, lng: 77.0728 } },
    { id: uid(), name: 'Sector 42', city: 'Gurugram', geo: { lat: 28.4523, lng: 77.0952 } },
    { id: uid(), name: 'Sector 56', city: 'Gurugram', geo: { lat: 28.4268, lng: 77.1017 } },
    { id: uid(), name: 'MG Road', city: 'Gurugram', geo: { lat: 28.4799, lng: 77.0830 } },
    // Noida (5)
    { id: uid(), name: 'Sector 44', city: 'Noida', geo: { lat: 28.5622, lng: 77.3455 } },
    { id: uid(), name: 'Sector 150', city: 'Noida', geo: { lat: 28.4126, lng: 77.4941 } },
    { id: uid(), name: 'Noida Expressway', city: 'Noida', geo: { lat: 28.4924, lng: 77.4166 } },
    { id: uid(), name: 'Sector 62', city: 'Noida', geo: { lat: 28.6273, lng: 77.3650 } },
    { id: uid(), name: 'Greater Noida West', city: 'Noida', geo: { lat: 28.5706, lng: 77.4120 } },
    // Ghaziabad (3)
    { id: uid(), name: 'Indirapuram', city: 'Ghaziabad', geo: { lat: 28.6415, lng: 77.3722 } },
    { id: uid(), name: 'Raj Nagar Extension', city: 'Ghaziabad', geo: { lat: 28.6959, lng: 77.4262 } },
    { id: uid(), name: 'Vaishali', city: 'Ghaziabad', geo: { lat: 28.6435, lng: 77.3395 } },
    // Faridabad (4)
    { id: uid(), name: 'Sector 15', city: 'Faridabad', geo: { lat: 28.3936, lng: 77.3095 } },
    { id: uid(), name: 'Greenfields', city: 'Faridabad', geo: { lat: 28.3821, lng: 77.3311 } },
    { id: uid(), name: 'NIT Faridabad', city: 'Faridabad', geo: { lat: 28.3759, lng: 77.3175 } },
    { id: uid(), name: 'Sector 88', city: 'Faridabad', geo: { lat: 28.3640, lng: 77.3230 } },
  ];

  const loc = (name: string) => localities.find((l) => l.name === name)!;

  const specs: Array<
    Partial<DbProperty> & {
      title: string;
      locality: string;
      price: number;
      bhk: number;
      areaSqft: number;
      seedName: string;
      createdDaysAgo: number;
    }
  > = [
    {
      title: 'Luxury Penthouse in Vasant Vihar',
      locality: 'Vasant Vihar',
      price: 185000000,
      bhk: 4,
      areaSqft: 5200,
      type: 'flat',
      furnishing: 'fully_furnished',
      featured: true,
      amenities: ['Private Terrace', 'Modular Kitchen', 'Servant Quarter', 'Reserved Parking', 'Power Backup', 'Lift'],
      description:
        'A rare duplex penthouse on the top two floors of a boutique building in Vasant Vihar. Sun-drenched living spaces, imported marble flooring, and a 1,200 sq.ft. private terrace with unobstructed green views. Walking distance to Priya Complex and the diplomatic enclave.',
      seedName: 'vasantvihar',
      createdDaysAgo: 5,
      ageOfProperty: 4,
    },
    {
      title: 'Golf-Facing Apartment on Golf Course Road',
      locality: 'Golf Course Road',
      price: 92500000,
      bhk: 4,
      areaSqft: 4100,
      type: 'flat',
      furnishing: 'semi_furnished',
      featured: true,
      amenities: ['Clubhouse', 'Swimming Pool', 'Gym', 'Concierge', 'Kids Play Area', '24x7 Security'],
      description:
        'High-floor residence in a marquee condominium overlooking the golf course. Double-height lobby, private lift landing, and a full suite of club amenities. Ideal for families seeking a lock-and-leave lifestyle on Gurugram\u2019s most prestigious corridor.',
      seedName: 'golfcourse',
      createdDaysAgo: 9,
      ageOfProperty: 6,
    },
    {
      title: 'Colonial Bungalow in Defence Colony',
      locality: 'Defence Colony',
      price: 310000000,
      bhk: 5,
      areaSqft: 6800,
      type: 'villa',
      furnishing: 'unfurnished',
      featured: true,
      amenities: ['Private Garden', 'Servant Quarter', 'Reserved Parking', 'Terrace Rights'],
      description:
        'A classic South Delhi bungalow on a 500 sq.yd. corner plot with mature trees and a private lawn. Original art-deco detailing with scope for a designer rebuild. Clear title, single-family ownership since 1974.',
      seedName: 'defcolony',
      createdDaysAgo: 14,
      ageOfProperty: 30,
    },
    {
      title: 'Designer Floor in Greater Kailash I',
      locality: 'Greater Kailash',
      price: 67500000,
      bhk: 3,
      areaSqft: 2700,
      type: 'floor',
      furnishing: 'fully_furnished',
      amenities: ['Stilt Parking', 'Power Backup', 'Lift', 'Modular Kitchen'],
      description:
        'Brand-new builder floor with Italian marble, VRV air-conditioning, and a walnut-panelled study. Second floor with lift access and two covered parking spots in the stilt. M-Block market is a three-minute walk.',
      seedName: 'gkone',
      createdDaysAgo: 3,
      ageOfProperty: 0,
    },
    {
      title: 'Sky Villa in DLF Phase 5',
      locality: 'DLF Phase 5',
      price: 145000000,
      bhk: 5,
      areaSqft: 5800,
      type: 'flat',
      furnishing: 'semi_furnished',
      featured: true,
      amenities: ['Private Pool', 'Clubhouse', 'Gym', 'Concierge', 'Home Automation', '24x7 Security'],
      description:
        'Penthouse-grade sky villa with a private plunge pool and 270-degree views of the Aravalli ridge. Fully automated home with staff quarters and four reserved basement parks.',
      seedName: 'dlf5',
      createdDaysAgo: 21,
      ageOfProperty: 3,
    },
    {
      title: 'Family Apartment in Sushant Lok',
      locality: 'Sushant Lok',
      price: 32500000,
      bhk: 3,
      areaSqft: 2100,
      type: 'flat',
      furnishing: 'semi_furnished',
      amenities: ['Swimming Pool', 'Gym', 'Kids Play Area', 'Power Backup'],
      description:
        'Well-maintained three-bedroom apartment in a gated society near Galleria Market. East-facing with morning light in every room, recently upgraded kitchen and bathrooms.',
      seedName: 'sushantlok',
      createdDaysAgo: 11,
      ageOfProperty: 12,
    },
    {
      title: 'Riverside Apartment on Noida Expressway',
      locality: 'Noida Expressway',
      price: 21500000,
      bhk: 3,
      areaSqft: 1850,
      type: 'flat',
      furnishing: 'unfurnished',
      amenities: ['Clubhouse', 'Swimming Pool', 'Gym', 'Jogging Track', '24x7 Security'],
      description:
        'High-floor three-bedroom unit in a premium expressway society with unobstructed river-belt views. Five minutes from the Okhla Bird Sanctuary metro station.',
      seedName: 'noidaexp',
      createdDaysAgo: 7,
      ageOfProperty: 5,
    },
    {
      title: 'Golf-View Residence in Sector 150',
      locality: 'Sector 150',
      price: 28500000,
      bhk: 4,
      areaSqft: 2600,
      type: 'flat',
      furnishing: 'semi_furnished',
      amenities: ['Golf Course Access', 'Clubhouse', 'Swimming Pool', 'Gym', 'Kids Play Area'],
      description:
        'Corner unit in Noida\u2019s greenest sector with dual balconies facing the 9-hole golf greens. Sports-city infrastructure with tennis, squash, and an Olympic-length pool.',
      seedName: 'sec150',
      createdDaysAgo: 18,
      ageOfProperty: 2,
    },
    {
      title: 'Corner Plot in Sector 44',
      locality: 'Sector 44',
      price: 54000000,
      bhk: 1,
      areaSqft: 3240,
      type: 'plot',
      furnishing: 'unfurnished',
      amenities: ['Corner Plot', 'Park Facing', 'Wide Road'],
      description:
        'South-east facing 360 sq.yd. corner plot on a 24-metre road, opposite a community park. Clear title with immediate registry possible. Ideal for a bespoke family home.',
      seedName: 'sec44plot',
      createdDaysAgo: 30,
    },
    {
      title: 'Premium Floor in South Delhi',
      locality: 'South Delhi',
      price: 89000000,
      bhk: 4,
      areaSqft: 3600,
      type: 'floor',
      furnishing: 'semi_furnished',
      amenities: ['Stilt Parking', 'Lift', 'Power Backup', 'Terrace Rights'],
      description:
        'Third-floor residence with terrace rights in a quiet, tree-lined block. Four en-suite bedrooms, a formal living room, and a family lounge. Gated street with resident-only entry.',
      seedName: 'southdelhi',
      createdDaysAgo: 2,
      ageOfProperty: 1,
    },
    {
      title: 'Garden Apartment in Indirapuram',
      locality: 'Indirapuram',
      price: 13500000,
      bhk: 3,
      areaSqft: 1550,
      type: 'flat',
      furnishing: 'unfurnished',
      amenities: ['Gated Society', 'Gym', 'Kids Play Area', 'Power Backup'],
      description:
        'Ground-floor apartment with an exclusive-use garden in an established Indirapuram society. Freshly painted, vastu-compliant layout, and covered parking.',
      seedName: 'indirapuram',
      createdDaysAgo: 25,
      ageOfProperty: 10,
    },
    {
      title: 'Independent Villa in Greenfields',
      locality: 'Greenfields',
      price: 24500000,
      bhk: 4,
      areaSqft: 3000,
      type: 'villa',
      furnishing: 'unfurnished',
      amenities: ['Private Garden', 'Reserved Parking', 'Terrace'],
      description:
        'Self-built villa on a 250 sq.yd. plot in Greenfields Colony, Faridabad. Solid construction with four bedrooms, a covered veranda, and space for two cars.',
      seedName: 'greenfields',
      createdDaysAgo: 40,
      ageOfProperty: 15,
    },
    // --- New properties for expanded localities ---
    {
      title: 'Modern 3 BHK in Dwarka Sector 12',
      locality: 'Dwarka',
      price: 18500000,
      bhk: 3,
      areaSqft: 1600,
      type: 'flat',
      furnishing: 'semi_furnished',
      amenities: ['Gated Society', 'Gym', 'Power Backup', 'Kids Play Area'],
      description:
        'Well-maintained apartment near Dwarka Mor metro station. Modern fittings with spacious balconies and a community park just outside.',
      seedName: 'dwarka',
      createdDaysAgo: 8,
      ageOfProperty: 7,
    },
    {
      title: 'Spacious Floor in Rohini Sector 9',
      locality: 'Rohini',
      price: 14500000,
      bhk: 3,
      areaSqft: 1800,
      type: 'floor',
      furnishing: 'unfurnished',
      amenities: ['Stilt Parking', 'Power Backup', 'Terrace Rights'],
      description:
        'Independent builder floor on the second level with ample natural light. Close to Japanese Park and Rithala Metro.',
      seedName: 'rohini',
      createdDaysAgo: 12,
      ageOfProperty: 5,
    },
    {
      title: 'Luxury Apartment near Saket Mall',
      locality: 'Saket',
      price: 42000000,
      bhk: 3,
      areaSqft: 2400,
      type: 'flat',
      furnishing: 'fully_furnished',
      featured: true,
      amenities: ['Clubhouse', 'Swimming Pool', 'Concierge', 'Gym', '24x7 Security'],
      description:
        'Premium residence in a boutique condo steps from Select Citywalk. Imported fixtures, European kitchen, and a resort-style pool deck.',
      seedName: 'saket',
      createdDaysAgo: 6,
      ageOfProperty: 2,
    },
    {
      title: 'Smart Home in Sector 56',
      locality: 'Sector 56',
      price: 38000000,
      bhk: 3,
      areaSqft: 2050,
      type: 'flat',
      furnishing: 'fully_furnished',
      amenities: ['Home Automation', 'Gym', 'Swimming Pool', 'Concierge'],
      description:
        'IoT-enabled smart apartment with voice-controlled lighting, climate, and security. Walking distance to Rapid Metro and top restaurants.',
      seedName: 'sec56',
      createdDaysAgo: 15,
      ageOfProperty: 1,
    },
    {
      title: 'Commercial-Belt Apartment on MG Road',
      locality: 'MG Road',
      price: 55000000,
      bhk: 4,
      areaSqft: 2800,
      type: 'flat',
      furnishing: 'semi_furnished',
      featured: true,
      amenities: ['Clubhouse', 'Gym', 'Concierge', '24x7 Security', 'Power Backup'],
      description:
        'High-floor four-bedroom in the heart of the MG Road corridor. Ideal for professionals with seamless metro connectivity and premium retail at your doorstep.',
      seedName: 'mgroad',
      createdDaysAgo: 4,
      ageOfProperty: 3,
    },
    {
      title: 'Affordable 2 BHK in Sector 62',
      locality: 'Sector 62',
      price: 9500000,
      bhk: 2,
      areaSqft: 1050,
      type: 'flat',
      furnishing: 'unfurnished',
      amenities: ['Gated Society', 'Power Backup', 'Lift'],
      description:
        'Value-for-money two-bedroom unit in an IT-hub locality. Walking distance to major office parks and the upcoming metro corridor.',
      seedName: 'sec62',
      createdDaysAgo: 20,
      ageOfProperty: 8,
    },
    {
      title: 'New-Launch 3 BHK in Greater Noida West',
      locality: 'Greater Noida West',
      price: 7800000,
      bhk: 3,
      areaSqft: 1400,
      type: 'flat',
      furnishing: 'unfurnished',
      amenities: ['Clubhouse', 'Swimming Pool', 'Gym', 'Kids Play Area', 'Jogging Track'],
      description:
        'Brand-new apartment in a mega township with world-class amenities. OC received, ready for immediate possession.',
      seedName: 'gnwest',
      createdDaysAgo: 1,
      ageOfProperty: 0,
    },
    {
      title: 'Premium Floor in Vaishali',
      locality: 'Vaishali',
      price: 12000000,
      bhk: 3,
      areaSqft: 1650,
      type: 'floor',
      furnishing: 'semi_furnished',
      amenities: ['Stilt Parking', 'Power Backup', 'Lift', 'Modular Kitchen'],
      description:
        'First-floor builder floor in Vaishali Sector 4, near Kaushambi Metro. Marble flooring and a private terrace garden.',
      seedName: 'vaishali',
      createdDaysAgo: 16,
      ageOfProperty: 3,
    },
    {
      title: 'Family Home in NIT Faridabad',
      locality: 'NIT Faridabad',
      price: 16500000,
      bhk: 4,
      areaSqft: 2200,
      type: 'villa',
      furnishing: 'unfurnished',
      amenities: ['Private Garden', 'Reserved Parking', 'Terrace', 'Power Backup'],
      description:
        'Standalone house on a 200 sq.yd. plot in NIT-1. Four spacious bedrooms, a shaded parking lane, and a mature mango tree in the backyard.',
      seedName: 'nitfbd',
      createdDaysAgo: 35,
      ageOfProperty: 20,
    },
    {
      title: 'Ready Plot in Sector 88 Faridabad',
      locality: 'Sector 88',
      price: 12000000,
      bhk: 1,
      areaSqft: 1800,
      type: 'plot',
      furnishing: 'unfurnished',
      amenities: ['Park Facing', 'Wide Road', 'Corner Plot'],
      description:
        'HUDA-approved 200 sq.yd. residential plot facing a community park. Clear title, all approvals in place, and ready for construction.',
      seedName: 'sec88plot',
      createdDaysAgo: 22,
    },
  ];

  const rentSpecs: Array<
    Partial<DbProperty> & {
      title: string;
      locality: string;
      price: number;
      bhk: number;
      areaSqft: number;
      seedName: string;
      createdDaysAgo: number;
    }
  > = [
    {
      title: 'Furnished 2 BHK in Sushant Lok',
      locality: 'Sushant Lok',
      price: 85000,
      bhk: 2,
      areaSqft: 1450,
      type: 'flat',
      furnishing: 'fully_furnished',
      featured: true,
      amenities: ['Swimming Pool', 'Gym', 'Power Backup', '24x7 Security'],
      description:
        'Fully furnished two-bedroom apartment available for immediate move-in. Includes modular kitchen, wardrobes, and one covered parking slot.',
      seedName: 'rentsushant',
      createdDaysAgo: 4,
    },
    {
      title: '3 BHK for Rent on Golf Course Road',
      locality: 'Golf Course Road',
      price: 125000,
      bhk: 3,
      areaSqft: 2200,
      type: 'flat',
      furnishing: 'semi_furnished',
      featured: true,
      amenities: ['Clubhouse', 'Swimming Pool', 'Gym', 'Concierge'],
      description:
        'Premium three-bedroom lease in a golf-facing tower with club access and concierge services. Ideal for expat families.',
      seedName: 'rentgolf',
      createdDaysAgo: 6,
    },
    {
      title: 'Affordable 2 BHK in Indirapuram',
      locality: 'Indirapuram',
      price: 55000,
      bhk: 2,
      areaSqft: 1100,
      type: 'flat',
      furnishing: 'unfurnished',
      amenities: ['Gated Society', 'Power Backup', 'Lift'],
      description:
        'Budget-friendly two-bedroom rental in a well-maintained society near Shipra Mall. Unfurnished with fresh paint.',
      seedName: 'rentindira',
      createdDaysAgo: 8,
    },
    {
      title: '4 BHK Villa for Rent in Vasant Vihar',
      locality: 'Vasant Vihar',
      price: 180000,
      bhk: 4,
      areaSqft: 3200,
      type: 'villa',
      furnishing: 'fully_furnished',
      featured: true,
      amenities: ['Private Garden', 'Servant Quarter', 'Reserved Parking', 'Power Backup'],
      description:
        'Elegant four-bedroom villa on a quiet lane in Vasant Vihar. Fully furnished with a private lawn and staff quarters.',
      seedName: 'rentvasant',
      createdDaysAgo: 3,
    },
    {
      title: '3 BHK Apartment on Noida Expressway',
      locality: 'Noida Expressway',
      price: 95000,
      bhk: 3,
      areaSqft: 1750,
      type: 'flat',
      furnishing: 'semi_furnished',
      amenities: ['Clubhouse', 'Swimming Pool', 'Gym', '24x7 Security'],
      description:
        'Spacious three-bedroom rental with expressway views and society clubhouse access. Semi-furnished with ACs in all bedrooms.',
      seedName: 'rentnoida',
      createdDaysAgo: 10,
    },
  ];

  const rentProperties: DbProperty[] = rentSpecs.map((s) => {
    const l = loc(s.locality);
    const id = uid();
    const type = (s.type ?? 'flat') as PropertyType;
    return {
      id,
      title: s.title,
      description: s.description ?? '',
      type,
      listingType: 'rent' as ListingType,
      bhk: s.bhk,
      price: s.price,
      areaSqft: s.areaSqft,
      furnishing: (s.furnishing ?? 'unfurnished') as FurnishingStatus,
      ageOfProperty: s.ageOfProperty,
      locality: s.locality,
      city: l.city,
      address: `${s.locality}, ${l.city}, Delhi NCR`,
      geo: l.geo,
      images: propertyImages(type, 'rent', id, 4),
      amenities: s.amenities ?? [],
      sellerId: seller.id,
      status: 'live',
      featured: s.featured ?? false,
      sellerType: 'owner',
      createdAt: daysAgo(s.createdDaysAgo),
      updatedAt: daysAgo(s.createdDaysAgo),
    };
  });

  const properties: DbProperty[] = specs.map((s) => {
    const l = loc(s.locality);
    const id = uid();
    const type = (s.type ?? 'flat') as PropertyType;
    return {
      id,
      title: s.title,
      description: s.description ?? '',
      type,
      bhk: s.bhk,
      price: s.price,
      areaSqft: s.areaSqft,
      furnishing: (s.furnishing ?? 'unfurnished') as FurnishingStatus,
      ageOfProperty: s.ageOfProperty,
      locality: s.locality,
      city: l.city,
      address: `${s.locality}, ${l.city}, Delhi NCR`,
      geo: l.geo,
      images: propertyImages(type, 'buy', id, 4),
      amenities: s.amenities ?? [],
      sellerId: seller.id,
      status: 'live',
      featured: s.featured ?? false,
      listingType: (s.listingType ?? 'buy') as ListingType,
      sellerType: 'owner',
      createdAt: daysAgo(s.createdDaysAgo),
      updatedAt: daysAgo(s.createdDaysAgo),
    };
  });

  // Two submissions awaiting admin review
  const pendingBuyId = uid();
  const pendingRentId = uid();
  const pending: DbProperty[] = [
    {
      id: pendingBuyId,
      title: '3 BHK flat in Sector 42',
      description: 'Spacious apartment near the rapid metro with park-facing balconies. Recently renovated kitchen.',
      type: 'flat',
      bhk: 3,
      price: 41000000,
      areaSqft: 2350,
      furnishing: 'semi_furnished',
      locality: 'Sector 42',
      city: 'Gurugram',
      address: 'Sector 42, Gurugram, Delhi NCR',
      geo: loc('Sector 42').geo,
      images: propertyImages('flat', 'buy', pendingBuyId, 3),
      amenities: ['Clubhouse', 'Gym'],
      sellerId: seller.id,
      status: 'pending_review',
      featured: false,
      listingType: 'buy',
      sellerType: 'owner',
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: pendingRentId,
      title: 'Builder Floor in Raj Nagar Extension',
      description: 'New builder floor with two covered parkings, lift, and roof rights on the top floor.',
      type: 'floor',
      bhk: 3,
      price: 9800000,
      areaSqft: 1400,
      furnishing: 'unfurnished',
      locality: 'Raj Nagar Extension',
      city: 'Ghaziabad',
      address: 'Raj Nagar Extension, Ghaziabad, Delhi NCR',
      geo: loc('Raj Nagar Extension').geo,
      images: propertyImages('floor', 'rent', pendingRentId, 3),
      amenities: ['Lift', 'Power Backup'],
      sellerId: seller.id,
      status: 'pending_review',
      featured: false,
      sellerType: 'broker',
      listingType: 'rent',
      createdAt: daysAgo(0),
      updatedAt: daysAgo(0),
    },
  ];

  const allProperties = [...properties, ...rentProperties, ...pending];

  const leads: DbLead[] = [
    {
      id: uid(),
      propertyId: properties[0].id,
      userId: buyer.id,
      type: 'viewing_request',
      name: buyer.name,
      phone: buyer.phone,
      email: buyer.email,
      message: 'Interested in a weekend viewing with my family.',
      preferredTime: 'Saturday morning',
      status: 'new',
      createdAt: daysAgo(2),
    },
    {
      id: uid(),
      propertyId: properties[1].id,
      type: 'call_request',
      name: 'Vikram Singh',
      phone: '+919888877766',
      message: 'Please call to discuss price flexibility.',
      preferredTime: 'Weekday evening',
      status: 'contacted',
      createdAt: daysAgo(6),
    },
    {
      id: uid(),
      type: 'notify_me',
      name: 'Priya Kapoor',
      phone: '+919777766655',
      filters: { locality: 'Vasant Vihar', bhk: 3, maxPrice: 100000000 },
      status: 'new',
      createdAt: daysAgo(4),
    },
    // Additional leads from new users
    {
      id: uid(),
      propertyId: properties[3].id,
      userId: buyer2.id,
      type: 'viewing_request',
      name: buyer2.name,
      phone: buyer2.phone,
      email: 'amit@updesh.com',
      message: 'Would like to visit this property next week.',
      preferredTime: 'Weekday afternoon',
      status: 'new',
      createdAt: daysAgo(1),
    },
    {
      id: uid(),
      propertyId: properties[6].id,
      userId: buyer2.id,
      type: 'call_request',
      name: buyer2.name,
      phone: buyer2.phone,
      message: 'Interested in knowing the maintenance charges.',
      status: 'new',
      createdAt: daysAgo(3),
    },
    {
      id: uid(),
      propertyId: properties[4].id,
      userId: buyer.id,
      type: 'viewing_request',
      name: buyer.name,
      phone: buyer.phone,
      email: buyer.email,
      message: 'Can we schedule a viewing on Sunday?',
      preferredTime: 'Sunday 11 AM',
      status: 'contacted',
      createdAt: daysAgo(5),
    },
    {
      id: uid(),
      propertyId: rentProperties[0].id,
      type: 'call_request',
      name: 'Sneha Gupta',
      phone: '+919666655544',
      email: 'sneha@gmail.com',
      message: 'Looking for immediate possession. Is this still available?',
      status: 'new',
      createdAt: daysAgo(1),
    },
  ];

  const viewEvents: ViewEvent[] = allProperties.flatMap((p, i) =>
    Array.from({ length: (i % 5) + 3 }, (_, j) => ({
      propertyId: p.id,
      at: daysAgo((j * 3) % 28),
    }))
  );

  return { users: [admin, seller, buyer, seller2, buyer2], properties: allProperties, leads, localities, viewEvents };
}
