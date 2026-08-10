import type { ListingType, PropertyType } from '@updesh/shared-types';

/** Bundled property photos — served from the web app public folder. */
const FLAT_PHOTOS = [
  '/images/properties/flat-01.jpg',
  '/images/properties/flat-02.jpg',
  '/images/properties/flat-03.jpg',
  '/images/properties/flat-04.jpg',
  '/images/properties/flat-05.jpg',
  '/images/properties/flat-06.jpg',
  '/images/properties/flat-07.jpg',
  '/images/properties/flat-08.jpg',
  '/images/properties/flat-09.jpg',
];

const FLOOR_PHOTOS = [
  '/images/properties/floor-01.jpg',
  '/images/properties/floor-02.jpg',
  '/images/properties/floor-03.jpg',
  '/images/properties/floor-04.jpg',
  ...FLAT_PHOTOS.slice(0, 2),
];

const VILLA_PHOTOS = [
  '/images/properties/villa-01.jpg',
  '/images/properties/villa-02.jpg',
  '/images/properties/floor-03.jpg',
  '/images/properties/flat-06.jpg',
];

const PLOT_PHOTOS = [
  '/images/properties/plot-01.jpg',
  '/images/properties/plot-02.jpg',
  '/images/properties/villa-02.jpg',
];

export const DEFAULT_PROPERTY_IMAGE = FLAT_PHOTOS[0];

function poolFor(type: PropertyType, listingType: ListingType): string[] {
  if (listingType === 'rent') return FLAT_PHOTOS;
  switch (type) {
    case 'floor':
      return FLOOR_PHOTOS;
    case 'villa':
      return VILLA_PHOTOS;
    case 'plot':
      return PLOT_PHOTOS;
    default:
      return FLAT_PHOTOS;
  }
}

function offsetFromId(id: string, poolSize: number): number {
  const n = parseInt(id.replace(/\D/g, '').slice(0, 8) || '0', 16);
  return n % poolSize;
}

export function propertyImages(
  type: PropertyType,
  listingType: ListingType,
  id: string,
  count = 4
): string[] {
  const pool = poolFor(type, listingType);
  const start = offsetFromId(id, pool.length);
  return Array.from({ length: count }, (_, i) => pool[(start + i) % pool.length]);
}

export function isRemotePlaceholderImage(url: string): boolean {
  return (
    url.includes('picsum.photos') ||
    url.includes('unsplash.com') ||
    url.startsWith('http://') ||
    url.startsWith('https://')
  );
}
