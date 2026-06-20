import axios from 'axios';
import { prisma } from '../index.js';

interface GooglePlaceResult {
  placeId: string;
  name: string;
  phone: string;
  address: string;
  rating: number;
  totalReviews: number;
  website: string | null;
  socialMedia: { facebook?: string; instagram?: string; twitter?: string; linkedin?: string };
  businessStatus: string;
  types: string[];
  location: { lat: number; lng: number };
}

interface DigitalPresence {
  hasWebsite: boolean;
  hasFacebook: boolean;
  hasInstagram: boolean;
  hasTwitter: boolean;
  hasLinkedIn: boolean;
  hasGoogleBusiness: boolean;
  score: number; // 0-100 (higher = worse digital presence = better lead)
  gaps: string[];
}

export class LeadFinderService {
  private static getApiKey(): string {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) throw new Error('GOOGLE_MAPS_API_KEY not configured');
    return key;
  }

  static async searchBusinesses(params: {
    category: string;
    city: string;
    radius?: number;
    businessId: string;
  }): Promise<{ results: GooglePlaceResult[]; searchId: string }> {
    const { category, city, radius = 10, businessId } = params;
    const apiKey = this.getApiKey();

    // Step 1: Geocode the city to get lat/lng
    const geoRes = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { address: city, key: apiKey },
    });

    if (geoRes.data.status !== 'OK' || !geoRes.data.results?.length) {
      throw new Error(`Could not geocode city: ${city}`);
    }

    const { lat, lng } = geoRes.data.results[0].geometry.location;

    // Step 2: Nearby search
    const searchRes = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: {
        location: `${lat},${lng}`,
        radius: radius * 1000, // km to meters
        type: category,
        key: apiKey,
      },
    });

    if (searchRes.data.status !== 'OK') {
      throw new Error(`Google Places API error: ${searchRes.data.status}`);
    }

    const places: GooglePlaceResult[] = [];

    for (const place of searchRes.data.results || []) {
      // Step 3: Get details for each place (phone, website)
      let details: any = {};
      try {
        const detailRes = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
          params: {
            place_id: place.place_id,
            fields: 'formatted_phone_number,website,url',
            key: apiKey,
          },
        });
        details = detailRes.data.result || {};
      } catch {
        // Skip detail errors
      }

      places.push({
        placeId: place.place_id,
        name: place.name,
        phone: details.formatted_phone_number || '',
        address: place.vicinity || '',
        rating: place.rating || 0,
        totalReviews: place.user_ratings_total || 0,
        website: details.website || null,
        socialMedia: this.extractSocialMedia(details.website || ''),
        businessStatus: place.business_status || 'OPERATIONAL',
        types: place.types || [],
        location: {
          lat: place.geometry?.location?.lat || lat,
          lng: place.geometry?.location?.lng || lng,
        },
      });
    }

    // Step 4: Save search to DB
    const search = await prisma.leadFinderSearch.create({
      data: {
        businessId,
        query: `${category} in ${city}`,
        category,
        city,
        radius,
        resultsCount: places.length,
      },
    });

    return { results: places, searchId: search.id };
  }

  static async analyzeDigitalPresence(places: GooglePlaceResult[]): Promise<(GooglePlaceResult & { digitalPresence: DigitalPresence })[]> {
    return places.map((place) => {
      const presence: DigitalPresence = {
        hasWebsite: !!place.website,
        hasFacebook: !!place.socialMedia.facebook,
        hasInstagram: !!place.socialMedia.instagram,
        hasTwitter: !!place.socialMedia.twitter,
        hasLinkedIn: !!place.socialMedia.linkedin,
        hasGoogleBusiness: true, // They appeared on Google Maps
        score: 0,
        gaps: [],
      };

      // Calculate gap score (higher = more gaps = better lead)
      if (!presence.hasWebsite) { presence.score += 30; presence.gaps.push('No website'); }
      if (!presence.hasFacebook) { presence.score += 15; presence.gaps.push('No Facebook'); }
      if (!presence.hasInstagram) { presence.score += 15; presence.gaps.push('No Instagram'); }
      if (!presence.hasTwitter) { presence.score += 10; presence.gaps.push('No Twitter'); }
      if (!presence.hasLinkedIn) { presence.score += 10; presence.gaps.push('No LinkedIn'); }
      if (place.totalReviews < 10) { presence.score += 10; presence.gaps.push('Few reviews'); }
      if (place.rating < 4.0) { presence.score += 10; presence.gaps.push('Low rating'); }

      return { ...place, digitalPresence: presence };
    });
  }

  static async importLeads(params: {
    businessId: string;
    places: (GooglePlaceResult & { digitalPresence: DigitalPresence })[];
    searchId: string;
  }): Promise<{ imported: number; skipped: number; contacts: any[] }> {
    const { businessId, places, searchId } = params;
    let imported = 0;
    let skipped = 0;
    const contacts: any[] = [];

    for (const place of places) {
      if (!place.phone) { skipped++; continue; }

      // Check for duplicate by phone
      const existing = await prisma.contact.findFirst({
        where: { businessId, phone: place.phone },
      });

      if (existing) { skipped++; continue; }

      const contact = await prisma.contact.create({
        data: {
          businessId,
          name: place.name,
          phone: place.phone,
          company: place.name,
          city: place.address.split(',')[0] || '',
          source: 'lead_finder',
          leadFinderScore: place.digitalPresence.score,
          leadFinderSource: 'google_maps',
          leadFinderData: place as any,
          tags: ['Lead Finder', 'Google Maps', ...place.digitalPresence.gaps.slice(0, 3)],
          metadata: {
            placeId: place.placeId,
            rating: place.rating,
            reviews: place.totalReviews,
            website: place.website,
            address: place.address,
            searchId,
            importedAt: new Date().toISOString(),
          },
        },
      });

      // Create lead score
      await prisma.leadScore.create({
        data: {
          businessId,
          contactId: contact.id,
          score: place.digitalPresence.score,
          category: place.digitalPresence.score >= 80 ? 'hot' : place.digitalPresence.score >= 50 ? 'warm' : 'cold',
          factors: place.digitalPresence.gaps.map((g) => ({ factor: g, points: 10 })),
          engagementScore: 0,
          recencyScore: 100,
          intentScore: place.digitalPresence.score,
          fitScore: 50,
          aiModel: 'lead_finder_v1',
          aiConfidence: 0.8,
        },
      });

      imported++;
      contacts.push(contact);
    }

    // Update search import count
    await prisma.leadFinderSearch.update({
      where: { id: searchId },
      data: { importedCount: imported },
    });

    return { imported, skipped, contacts };
  }

  static async getSearchHistory(businessId: string, limit = 20): Promise<any[]> {
    return prisma.leadFinderSearch.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private static extractSocialMedia(websiteUrl: string): { facebook?: string; instagram?: string; twitter?: string; linkedin?: string } {
    // Basic social media detection from website URL
    // In production, you'd crawl the website for social links
    const social: { facebook?: string; instagram?: string; twitter?: string; linkedin?: string } = {};
    if (websiteUrl.includes('facebook.com')) social.facebook = websiteUrl;
    if (websiteUrl.includes('instagram.com')) social.instagram = websiteUrl;
    if (websiteUrl.includes('twitter.com')) social.twitter = websiteUrl;
    if (websiteUrl.includes('linkedin.com')) social.linkedin = websiteUrl;
    return social;
  }
}
