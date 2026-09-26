// Shared TypeScript types for Updesh Residency API
// Synced from backend via Schema Sync Agent

export type UserRole = 'buyer' | 'seller' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  preferredLocalities: string[];
  createdAt: string;
}

export type PropertyType = 'flat' | 'floor' | 'villa' | 'plot';
export type ListingType = 'buy' | 'rent';
export type PropertyStatus = 'pending_review' | 'live' | 'rejected' | 'sold';
export type FurnishingStatus = 'unfurnished' | 'semi_furnished' | 'fully_furnished';

export interface Property {
  _id?: string;
  id?: string;
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
  sellerId: string | User;
  status: PropertyStatus;
  featured: boolean;
  rejectionReason?: string;
  sellerType: 'owner' | 'broker';
  createdAt: string;
  updatedAt: string;
}

export type LeadType = 'viewing_request' | 'call_request' | 'notify_me';
export type LeadStatus = 'new' | 'contacted' | 'closed';

export interface Lead {
  _id?: string;
  id?: string;
  propertyId?: string | Property;
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

export type City = 'Delhi' | 'Gurugram' | 'Noida' | 'Ghaziabad' | 'Faridabad';

export interface Locality {
  _id?: string;
  id?: string;
  name: string;
  city: City;
  geo: { lat: number; lng: number };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface PropertySearchResponse {
  properties: Property[];
  nextCursor: string | null;
  total: number;
}

export interface PropertyDetailResponse {
  property: Property;
  similar: Property[];
}

export interface SellerStats {
  activeListings: number;
  totalViews30d: number;
  enquiries30d: number;
  pendingApproval: number;
}

export interface SellerListingsResponse {
  listings: Property[];
  stats: SellerStats;
}

export interface SearchFilters {
  locality?: string;
  city?: string;
  listingType?: ListingType;
  minPrice?: number;
  maxPrice?: number;
  bhk?: number;
  type?: PropertyType;
  furnishing?: FurnishingStatus;
  sort?: 'featured' | 'newest' | 'oldest' | 'price_asc' | 'price_desc';
  cursor?: string;
  limit?: number;
  q?: string;
  status?: PropertyStatus;
}

// ---------- Admin Panel Types ----------

export interface AdminDashboardStats {
  totalUsers: number;
  totalBuyers: number;
  totalSellers: number;
  totalAdmins: number;
  totalProperties: number;
  liveProperties: number;
  pendingProperties: number;
  rejectedProperties: number;
  soldProperties: number;
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  closedLeads: number;
  inventoryValue: number;
  recentSignups30d: number;
  recentProperties30d: number;
  recentLeads30d: number;
  cityCounts: Record<string, number>;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
  listingsCount: number;
  leadsCount: number;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
}

export interface AdminPropertiesResponse {
  properties: Property[];
  total: number;
}

// ---------- Seller Property Leads ----------

export interface PropertyLead extends Lead {
  /** The property this lead was submitted for (always populated) */
  property?: Property;
}

export function propertyId(p: Property): string {
  return p._id ?? p.id ?? '';
}

export function formatPrice(price: number): string {
  if (price >= 10000000) {
    return `₹${(price / 10000000).toFixed(1)} Cr`;
  }
  if (price >= 100000) {
    return `₹${(price / 100000).toFixed(1)} L`;
  }
  return `₹${price.toLocaleString('en-IN')}`;
}

export function formatListingPrice(price: number, listingType: ListingType = 'buy'): string {
  if (listingType === 'rent') {
    if (price >= 100000) {
      return `₹${(price / 100000).toFixed(1)} L/mo`;
    }
    return `₹${price.toLocaleString('en-IN')}/mo`;
  }
  return formatPrice(price);
}

export function formatArea(sqft: number): string {
  return `${sqft.toLocaleString('en-IN')} sq.ft.`;
}
