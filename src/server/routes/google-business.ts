import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { GBPAutoPostService } from '../services/gbp-auto-post.service.js';
import { encrypt } from '../utils/auth.js';
import axios from 'axios';

const router = Router();

// Google Business OAuth scopes
const GBP_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

// Store OAuth state temporarily (in production, use Redis)
const oauthStates = new Map<string, { businessId: string; expiresAt: number }>();

// Cleanup expired states every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of oauthStates) {
    if (val.expiresAt < now) oauthStates.delete(key);
  }
}, 5 * 60 * 1000);

// ── GET /api/google-business/auth/url — Generate OAuth URL ──
router.get('/auth/url', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_BUSINESS_REDIRECT_URL || `https://bizzautoai.com/api/google-business/auth/callback`;

    if (!clientId) {
      return res.status(500).json({ success: false, error: 'Google Client ID not configured' });
    }

    // Generate state token
    const state = Buffer.from(JSON.stringify({
      businessId: req.user.businessId,
      timestamp: Date.now(),
    })).toString('base64');

    oauthStates.set(state, { businessId: req.user.businessId, expiresAt: Date.now() + 10 * 60 * 1000 });

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', GBP_SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    res.json({ success: true, data: { url: authUrl.toString() } });
  } catch (error: any) {
    console.error('GBP auth URL error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate auth URL' });
  }
});

// ── GET /api/google-business/auth/callback — OAuth Callback ──
router.get('/auth/callback', async (req: AuthRequest, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://bizzautoai.com'}/google-business?error=${error}`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://bizzautoai.com'}/google-business?error=missing_params`);
    }

    // Validate state - try Map first, then decode directly
    let stateData = oauthStates.get(state as string);
    if (!stateData || stateData.expiresAt < Date.now()) {
      // Fallback: decode state directly (handles Docker restart / Map loss)
      try {
        const decoded = JSON.parse(Buffer.from(state as string, 'base64').toString());
        if (decoded.businessId && decoded.timestamp && Date.now() - decoded.timestamp < 30 * 60 * 1000) {
          stateData = { businessId: decoded.businessId, expiresAt: Date.now() + 10 * 60 * 1000 };
          console.log('[GBP] State recovered from decoded token:', stateData.businessId);
        }
      } catch {}
    }
    if (!stateData) {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://bizzautoai.com'}/google-business?error=invalid_state`);
    }
    oauthStates.delete(state as string);

    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_BUSINESS_REDIRECT_URL || `https://bizzautoai.com/api/google-business/auth/callback`,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Get user info
    const userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    // Get Business accounts
    let accountsResponse;
    try {
      accountsResponse = await axios.get('https://mybusinessbusinessinformation.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
    } catch (apiErr: any) {
      const status = apiErr.response?.status;
      if (status === 403) {
        console.error('GBP API 403 — Google Business Profile API not enabled in Google Cloud Console');
        return res.redirect(`${process.env.FRONTEND_URL || 'https://bizzautoai.com'}/google-business?error=api_not_enabled`);
      }
      if (status === 401) {
        return res.redirect(`${process.env.FRONTEND_URL || 'https://bizzautoai.com'}/google-business?error=token_expired`);
      }
      throw apiErr;
    }

    const accounts = accountsResponse.data?.accounts || [];
    if (accounts.length === 0) {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://bizzautoai.com'}/google-business?error=no_business_found`);
    }

    // Use first account (or let user select)
    const account = accounts[0];
    const accountId = account.name?.replace('accounts/', '') || account.accountId;

    // Get locations for this account
    let locationId = null;
    try {
      const locationsResponse = await axios.get(
        `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      const locations = locationsResponse.data?.locations || [];
      if (locations.length > 0) {
        locationId = locations[0].name?.replace(`accounts/${accountId}/locations/`, '') || locations[0].locationId;
      }
    } catch (locErr) {
      console.warn('Could not fetch locations:', locErr);
    }

    // Save to database
    await prisma.business.update({
      where: { id: stateData.businessId },
      data: {
        gbpAccessToken: encrypt(access_token),
        gbpRefreshToken: refresh_token ? encrypt(refresh_token) : undefined,
        gbpAccountId: accountId,
        gbpLocationId: locationId,
        gbpTokenExpiry: new Date(Date.now() + expires_in * 1000),
      },
    });

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL || 'https://bizzautoai.com'}/google-business?connected=true`);
  } catch (error: any) {
    console.error('GBP callback error:', error?.message || error);
    console.error('GBP callback error stack:', error?.stack);
    console.error('GBP callback query:', JSON.stringify(req.query));
    if (error?.response?.status === 403) {
      res.redirect(`${process.env.FRONTEND_URL || 'https://bizzautoai.com'}/google-business?error=api_not_enabled`);
    } else if (error?.response?.status === 401) {
      res.redirect(`${process.env.FRONTEND_URL || 'https://bizzautoai.com'}/google-business?error=token_expired`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL || 'https://bizzautoai.com'}/google-business?error=callback_failed&msg=${encodeURIComponent(error?.message || 'unknown')}`);
    }
  }
});

// Get Google Business connection status
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: {
        gbpAccessToken: true,
        gbpAccountId: true,
        gbpLocationId: true,
        name: true,
      },
    });

    const isConnected = !!(business?.gbpAccessToken && business?.gbpAccountId);

    res.json({
      success: true,
      data: {
        connected: isConnected,
        accountId: business?.gbpAccountId || null,
        locationId: business?.gbpLocationId || null,
        businessName: business?.name || null,
      },
    });
  } catch (error: any) {
    console.error('GBP status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get status', details: error.message });
  }
});

// Connect Google Business Profile
router.post('/connect', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { accessToken, accountId, locationId } = req.body;

    if (!accessToken || !accountId) {
      return res.status(400).json({
        success: false,
        error: 'accessToken and accountId are required',
      });
    }

    const { encrypt } = await import('../utils/auth.js');

    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        gbpAccessToken: encrypt(accessToken),
        gbpAccountId: accountId,
        gbpLocationId: locationId || null,
      },
    });

    res.json({
      success: true,
      message: 'Google Business Profile connected successfully',
    });
  } catch (error: any) {
    console.error('GBP connect error:', error);
    res.status(500).json({ success: false, error: 'Failed to connect', details: error.message });
  }
});

// Disconnect Google Business Profile
router.post('/disconnect', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        gbpAccessToken: null,
        gbpAccountId: null,
        gbpLocationId: null,
      },
    });

    res.json({
      success: true,
      message: 'Google Business Profile disconnected successfully',
    });
  } catch (error: any) {
    console.error('GBP disconnect error:', error);
    res.status(500).json({ success: false, error: 'Failed to disconnect', details: error.message });
  }
});

// Get Google Business Profile locations
router.get('/locations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { gbpAccessToken: true, gbpAccountId: true },
    });

    if (!business?.gbpAccessToken) {
      return res.status(400).json({ success: false, error: 'Google Business not connected' });
    }

    const axios = await import('axios');
    const { decrypt } = await import('../utils/auth.js');
    const accessToken = decrypt(business.gbpAccessToken);

    // Fetch locations from Google My Business API
    const response = await axios.default.get(
      `https://mybusiness.googleapis.com/v4/accounts/${business.gbpAccountId}/locations`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json({ success: true, data: response.data.locations || [] });
  } catch (error: any) {
    console.error('GBP locations fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch locations', details: error.message });
  }
});

// Get Google Business reviews
router.get('/reviews', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { gbpAccessToken: true, gbpAccountId: true, gbpLocationId: true },
    });

    if (!business?.gbpAccessToken || !business?.gbpAccountId || !business?.gbpLocationId) {
      return res.status(400).json({ success: false, error: 'Google Business not configured' });
    }

    const axios = await import('axios');
    const { decrypt } = await import('../utils/auth.js');
    const accessToken = decrypt(business.gbpAccessToken);

    const response = await axios.default.get(
      `https://mybusiness.googleapis.com/v4/accounts/${business.gbpAccountId}/locations/${business.gbpLocationId}/reviews`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json({ success: true, data: response.data.reviews || [] });
  } catch (error: any) {
    console.error('GBP reviews fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reviews', details: error.message });
  }
});

// Reply to Google Business review
router.post('/reviews/:reviewId/reply', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { reply } = req.body;
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { gbpAccessToken: true, gbpAccountId: true, gbpLocationId: true },
    });

    if (!business?.gbpAccessToken || !business?.gbpAccountId || !business?.gbpLocationId) {
      return res.status(400).json({ success: false, error: 'Google Business not configured' });
    }

    const axios = await import('axios');
    const { decrypt } = await import('../utils/auth.js');
    const accessToken = decrypt(business.gbpAccessToken);

    await axios.default.put(
      `https://mybusiness.googleapis.com/v4/accounts/${business.gbpAccountId}/locations/${business.gbpLocationId}/reviews/${req.params.reviewId}/reply`,
      { comment: reply },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({ success: true, message: 'Reply posted' });
  } catch (error: any) {
    console.error('GBP review reply error:', error);
    res.status(500).json({ success: false, error: 'Failed to post reply', details: error.message });
  }
});

// Create Google Business post
router.post('/posts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { content, mediaUrl, callToAction } = req.body;
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { gbpAccessToken: true, gbpAccountId: true, gbpLocationId: true },
    });

    if (!business?.gbpAccessToken || !business?.gbpAccountId || !business?.gbpLocationId) {
      return res.status(400).json({ success: false, error: 'Google Business not configured' });
    }

    const axios = await import('axios');
    const { decrypt } = await import('../utils/auth.js');
    const accessToken = decrypt(business.gbpAccessToken);

    const postData: any = {
      languageCode: 'en',
      summary: content.substring(0, 200),
      state: 'LIVE',
    };

    if (mediaUrl) {
      postData.media = [{ mediaFormat: 'PHOTO', sourceUrl: mediaUrl }];
    }

    if (callToAction) {
      postData.action = {
        actionType: callToAction.type, // CALL_NOW, LEARN_MORE, etc.
        url: callToAction.url,
      };
    }

    const response = await axios.default.post(
      `https://mybusiness.googleapis.com/v4/accounts/${business.gbpAccountId}/locations/${business.gbpLocationId}/localPosts`,
      postData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error('GBP post creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create post', details: error.message });
  }
});

// Get Google Business posts
router.get('/posts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { gbpAccessToken: true, gbpAccountId: true, gbpLocationId: true },
    });

    if (!business?.gbpAccessToken || !business?.gbpAccountId || !business?.gbpLocationId) {
      return res.status(400).json({ success: false, error: 'Google Business not configured' });
    }

    const axios = await import('axios');
    const { decrypt } = await import('../utils/auth.js');
    const accessToken = decrypt(business.gbpAccessToken);

    const response = await axios.default.get(
      `https://mybusiness.googleapis.com/v4/accounts/${business.gbpAccountId}/locations/${business.gbpLocationId}/localPosts`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json({ success: true, data: response.data.localPosts || [] });
  } catch (error: any) {
    console.error('GBP posts fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts', details: error.message });
  }
});

// Delete Google Business post
router.delete('/posts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { gbpAccessToken: true, gbpAccountId: true, gbpLocationId: true },
    });

    if (!business?.gbpAccessToken || !business?.gbpAccountId || !business?.gbpLocationId) {
      return res.status(400).json({ success: false, error: 'Google Business not configured' });
    }

    const axios = await import('axios');
    const { decrypt } = await import('../utils/auth.js');
    const accessToken = decrypt(business.gbpAccessToken);

    await axios.default.delete(
      `https://mybusiness.googleapis.com/v4/accounts/${business.gbpAccountId}/locations/${business.gbpLocationId}/localPosts/${req.params.id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error: any) {
    console.error('GBP post delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete post', details: error.message });
  }
});

// Get Google Business statistics
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { gbpAccessToken: true, gbpAccountId: true, gbpLocationId: true },
    });

    if (!business?.gbpAccessToken || !business?.gbpAccountId || !business?.gbpLocationId) {
      return res.status(400).json({ success: false, error: 'Google Business not configured' });
    }

    const axios = await import('axios');
    const { decrypt } = await import('../utils/auth.js');
    const accessToken = decrypt(business.gbpAccessToken);

    // Fetch insights from Google My Business API
    const response = await axios.default.get(
      `https://mybusiness.googleapis.com/v4/accounts/${business.gbpAccountId}/locations/${business.gbpLocationId}/insights`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json({
      success: true,
      data: response.data || {}
    });
  } catch (error: any) {
    console.error('GBP stats fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics', details: error.message });
  }
});

// ==================== AUTO-POST ENDPOINTS ====================

// Get auto-post configuration
router.get('/auto-post/config', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const config = await GBPAutoPostService.getConfig(req.user.businessId);
    res.json({ success: true, data: config });
  } catch (error: any) {
    console.error('GBP auto-post config error:', error);
    res.status(500).json({ success: false, error: 'Failed to get config', details: error.message });
  }
});

// Update auto-post configuration
router.put('/auto-post/config', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { enabled, time, timezone, days } = req.body;
    const config = await GBPAutoPostService.updateConfig(req.user.businessId, {
      enabled,
      time,
      timezone,
      days,
    });
    res.json({ success: true, data: config });
  } catch (error: any) {
    console.error('GBP auto-post config update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update config', details: error.message });
  }
});

// Get auto-post templates
router.get('/auto-post/templates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const config = await GBPAutoPostService.getConfig(req.user.businessId);
    res.json({ success: true, data: config.templates });
  } catch (error: any) {
    console.error('GBP auto-post templates error:', error);
    res.status(500).json({ success: false, error: 'Failed to get templates', details: error.message });
  }
});

// Add auto-post template
router.post('/auto-post/templates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, content, mediaUrl, callToAction, tags } = req.body;

    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: 'name and content are required',
      });
    }

    const template = await GBPAutoPostService.addTemplate(req.user.businessId, {
      name,
      content,
      mediaUrl,
      callToAction,
      tags,
    });

    res.json({ success: true, data: template });
  } catch (error: any) {
    console.error('GBP auto-post template add error:', error);
    res.status(500).json({ success: false, error: 'Failed to add template', details: error.message });
  }
});

// Update auto-post template
router.put('/auto-post/templates/:templateId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, content, mediaUrl, callToAction, tags } = req.body;
    const template = await GBPAutoPostService.updateTemplate(
      req.user.businessId,
      req.params.templateId,
      { name, content, mediaUrl, callToAction, tags }
    );
    res.json({ success: true, data: template });
  } catch (error: any) {
    console.error('GBP auto-post template update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update template', details: error.message });
  }
});

// Delete auto-post template
router.delete('/auto-post/templates/:templateId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await GBPAutoPostService.deleteTemplate(req.user.businessId, req.params.templateId);
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('GBP auto-post template delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete template', details: error.message });
  }
});

// Manually trigger auto-post (for testing)
router.post('/auto-post/trigger', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await GBPAutoPostService.executeAutoPost(req.user.businessId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('GBP auto-post trigger error:', error);
    res.status(500).json({ success: false, error: 'Failed to trigger auto-post', details: error.message });
  }
});

// Get auto-post status
router.get('/auto-post/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const config = await GBPAutoPostService.getConfig(req.user.businessId);
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { gbpAutoPostLastPosted: true },
    });

    res.json({
      success: true,
      data: {
        enabled: config.enabled,
        time: config.time,
        timezone: config.timezone,
        days: config.days,
        templatesCount: config.templates.length,
        lastPosted: business?.gbpAutoPostLastPosted || null,
      },
    });
  } catch (error: any) {
    console.error('GBP auto-post status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get status', details: error.message });
  }
});

export default router;
