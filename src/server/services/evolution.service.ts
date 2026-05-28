import axios from 'axios';
import { prisma } from '../index.js';
import { encrypt, decrypt } from '../utils/auth.js';

/**
 * Evolution API Service
 * 
 * Integrates with Evolution API (https://github.com/EvolutionAPI/evolution-api)
 * for WhatsApp Web-based messaging via QR code scanning.
 * 
 * Supports: Instance management, QR code, send text/media/template,
 * webhook events, group management, profile settings.
 */
export class EvolutionApiService {
  /**
   * Get Evolution API config for a business
   */
  private static async getConfig(businessId: string): Promise<{
    baseUrl: string;
    apiKey: string;
    instanceName: string;
  }> {
    // First, try to get config from database (user-configured via UI)
    const integration = await prisma.integration.findFirst({
      where: { businessId, type: 'evolution_api', isActive: true },
    });

    if (integration) {
      const config = integration.config as any;
      return {
        baseUrl: config.baseUrl || '',
        apiKey: config.apiKey || '',
        instanceName: config.instanceName || `biz_${businessId.slice(-8)}`,
      };
    }

    // FALLBACK: Read from environment variables as system default
    // This allows the backend to work immediately without UI configuration
    const envBaseUrl = process.env.EVOLUTION_API_URL;
    const envApiKey = process.env.EVOLUTION_API_KEY;
    const envInstanceName = process.env.EVOLUTION_INSTANCE_NAME;

    if (envBaseUrl && envApiKey) {
      return {
        baseUrl: envBaseUrl,
        apiKey: envApiKey,
        instanceName: envInstanceName || `biz_${businessId.slice(-8)}`,
      };
    }

    // No config found anywhere
    throw new Error('Evolution API not configured. Set EVOLUTION_API_URL and EVOLUTION_API_KEY in .env or configure via UI.');
  }

  /**
   * Create a new Evolution API instance
   * If instance already exists, still saves config to DB gracefully.
   * When baseUrl/apiKey are not provided, reads from internal config (DB/env).
   */
  static async createInstance(businessId: string, options: {
    baseUrl?: string;
    apiKey?: string;
    instanceName?: string;
    webhookUrl?: string;
  }): Promise<any> {
    // If baseUrl/apiKey not provided, read from internal config
    if (!options.baseUrl || !options.apiKey) {
      const internalConfig = await this.getConfig(businessId);
      options.baseUrl = options.baseUrl || internalConfig.baseUrl;
      options.apiKey = options.apiKey || internalConfig.apiKey;
      options.instanceName = options.instanceName || internalConfig.instanceName;
    }
    const instanceName = options.instanceName || `biz_${businessId.slice(-8)}`;

    try {
      const response = await axios.post(
        `${options.baseUrl}/instance/create`,
        {
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          number: '', // Auto-detect instance owner number
          rejectCall: false,
          groupsIgnore: true,
          alwaysOnline: true,
          readMessages: true,
          readStatus: true,
          syncFullHistory: false,
          webhook: options.webhookUrl ? {
            url: options.webhookUrl,
            webhookByEvents: true,
            events: [
              'QRCODE_UPDATED',
              'CONNECTION_UPDATE',
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'SEND_MESSAGE',
              'CONTACTS_UPSERT',
              'CHATS_UPSERT',
              'CHATS_UPDATE',
              'PRESENCE_UPDATE',
              'GROUPS_UPSERT',
              'GROUP_UPDATE',
              'GROUP_PARTICIPANTS_UPDATE',
            ],
          } : undefined,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            apikey: options.apiKey,
          },
        }
      );

      // Save integration config on success
      await prisma.integration.upsert({
        where: { id: `evo_${businessId}` },
        create: {
          id: `evo_${businessId}`,
          businessId,
          type: 'evolution_api',
          name: 'Evolution API',
          config: {
            baseUrl: options.baseUrl,
            apiKey: options.apiKey,
            instanceName,
            instanceId: response.data.instance?.id || '',
            status: 'created',
          },
          isActive: true,
        },
        update: {
          config: {
            baseUrl: options.baseUrl,
            apiKey: options.apiKey,
            instanceName,
            instanceId: response.data.instance?.id || '',
            status: 'created',
          },
          isActive: true,
        },
      });

      return response.data;
    } catch (error: any) {
      const isAlreadyExists = error.response?.status === 403 && 
        (error.response?.data?.response?.message?.[0]?.includes('already in use') 
         || error.response?.data?.error === 'Forbidden');

      if (isAlreadyExists) {
        // Instance already exists — save config and treat as success
        console.log('Evolution API instance already exists, saving config...');
        await prisma.integration.upsert({
          where: { id: `evo_${businessId}` },
          create: {
            id: `evo_${businessId}`,
            businessId,
            type: 'evolution_api',
            name: 'Evolution API',
            config: {
              baseUrl: options.baseUrl,
              apiKey: options.apiKey,
              instanceName,
              instanceId: '',
              status: 'exists',
            },
            isActive: true,
          },
          update: {
            config: {
              baseUrl: options.baseUrl,
              apiKey: options.apiKey,
              instanceName,
              instanceId: '',
              status: 'exists',
            },
            isActive: true,
          },
        });
        return { success: true, message: 'Instance already exists', instanceName };
      }

      console.error('Evolution API create instance error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create Evolution API instance');
    }
  }

  /**
   * Connect to an existing instance and get QR code
   * Evolution API v2.x: GET /instance/connect/:name returns QR pairing data
   * Response: { pairingCode, code, base64?, count }
   * - `code` = raw QR string (encode with QRCodeSVG on frontend)
   * - `base64` = base64-encoded QR image (display directly as <img>)
   * 
   * Known issue: Evolution API v2.x sometimes returns { count: 0 } instead of QR data.
   * Workaround: Retry with delay, then fallback to /instance/qrcode/:name.
   */
  static async connectInstance(businessId: string): Promise<{
    qrCode: string;
    qrCodeBase64?: string;
    status: string;
  }> {
    const config = await this.getConfig(businessId);

    // Helper: extract QR code from various response formats
    const extractQR = (data: any): string => {
      if (typeof data === 'string') return data;
      if (data?.base64) return data.base64;
      if (data?.qrcode?.base64Image) return data.qrcode.base64Image;
      if (data?.qrcode?.code) return data.qrcode.code;
      if (data?.code) return data.code;
      if (data?.pairingCode) return data.pairingCode;
      return '';
    };

    // Helper: check if response has meaningful QR data
    const hasQRData = (data: any): boolean => {
      if (typeof data === 'string' && data.length > 0) return true;
      if (data?.base64 || data?.code || data?.pairingCode) return true;
      if (data?.qrcode?.base64Image || data?.qrcode?.code) return true;
      return false;
    };

    // Retry logic for known bug where Evolution API returns { count: 0 }
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios.get(
          `${config.baseUrl}/instance/connect/${config.instanceName}`,
          { headers: { apikey: config.apiKey }, timeout: 15000 }
        );

        const data = response.data;

        if (hasQRData(data)) {
          const qrCodeRaw = extractQR(data);
          await this.updateStatus(businessId, 'scanning');
          const isBase64Image = qrCodeRaw.startsWith('data:') || qrCodeRaw.startsWith('iVBOR');
          return {
            qrCode: qrCodeRaw,
            qrCodeBase64: isBase64Image ? qrCodeRaw : undefined,
            status: 'scanning',
          };
        }

        // { count: 0 } or empty data — retry if attempts remain
        if (attempt < MAX_RETRIES) {
          console.log(`Evolution API connect returned no QR data (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        } else {
          // All retries exhausted — throw helpful error
          throw new Error(
            'Evolution API returned no QR code. This is a known issue. ' +
            'Try restarting the Evolution API container or check if it has enough memory. ' +
            'Known workaround: Set CACHE_REDIS_ENABLED=false, CACHE_LOCAL_ENABLED=true, ' +
            'DATABASE_SAVE_DATA_CHATS=false, DATABASE_SAVE_DATA_CONTACTS=false, ' +
            'DATABASE_SAVE_DATA_HISTORIC=false in your Evolution API environment.'
          );
        }
      } catch (error: any) {
        // If it's our custom error, re-throw it directly
        if (error.message?.includes('Evolution API returned no QR code')) {
          throw error;
        }

        if (attempt < MAX_RETRIES) {
          console.log(`Evolution API connect attempt ${attempt} failed: ${error.message}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        } else {
          console.error('Evolution API connect error (all retries exhausted):', error.response?.data || error.message);
          throw new Error('Failed to connect Evolution API instance: ' + (error.response?.data?.message || error.message));
        }
      }
    }

    throw new Error('Failed to connect Evolution API instance (unexpected)');
  }

  /**
   * Get connection status
   * Evolution API v2.x: GET /instance/connectionState/:instanceName
   * Returns: { instance: { instanceName, state: 'open' | 'close' | 'connecting' } }
   */
  static async getConnectionStatus(businessId: string): Promise<{
    status: 'disconnected' | 'scanning' | 'connected';
    phone?: string;
    profileName?: string;
    profilePicUrl?: string;
  }> {
    try {
      const config = await this.getConfig(businessId);

      const response = await axios.get(
        `${config.baseUrl}/instance/connectionState/${config.instanceName}`,
        { headers: { apikey: config.apiKey } }
      );

      const state = response.data?.instance?.state || 'close';

      if (state === 'open') {
        // Fetch profile info — phone, name, and picture
        let phone = '';
        let profileName = '';
        let profilePicUrl = '';

        // Fetch instance details for phone number (fallback to fetchInstances)
        try {
          const fetchRes = await axios.get(
            `${config.baseUrl}/instance/fetchInstances?instanceName=${config.instanceName}`,
            { headers: { apikey: config.apiKey } }
          );
          const instanceData = Array.isArray(fetchRes.data) ? fetchRes.data[0] : fetchRes.data;
          phone = instanceData?.instance?.phone || instanceData?.phone || '';
          profileName = instanceData?.instance?.profileName || instanceData?.profileName || profileName;
        } catch {}

        // Fetch profile picture
        try {
          const profileRes = await axios.post(
            `${config.baseUrl}/chat/fetchProfilePictureUrl/${config.instanceName}`,
            { number: '' },
            { headers: { apikey: config.apiKey } }
          );
          profilePicUrl = profileRes.data?.profilePictureUrl || '';
        } catch {}

        await this.updateStatus(businessId, 'connected');

        return {
          status: 'connected',
          phone,
          profileName,
          profilePicUrl,
        };
      } else if (state === 'connecting' || state === 'pairing' || state === 'syncing') {
        return { status: 'scanning' };
      } else {
        return { status: 'disconnected' };
      }
    } catch (error: any) {
      // If instance not found, return disconnected
      return { status: 'disconnected' };
    }
  }

  /**
   * Disconnect / logout instance
   */
  static async disconnectInstance(businessId: string): Promise<void> {
    const config = await this.getConfig(businessId);

    try {
      await axios.delete(
        `${config.baseUrl}/instance/logout/${config.instanceName}`,
        { headers: { apikey: config.apiKey } }
      );

      await this.updateStatus(businessId, 'disconnected');
    } catch (error: any) {
      console.error('Evolution API disconnect error:', error.response?.data || error.message);
      throw new Error('Failed to disconnect instance');
    }
  }

  /**
   * Delete instance
   */
  static async deleteInstance(businessId: string): Promise<void> {
    const config = await this.getConfig(businessId);

    try {
      await axios.delete(
        `${config.baseUrl}/instance/delete/${config.instanceName}`,
        { headers: { apikey: config.apiKey } }
      );

      // Deactivate integration
      await prisma.integration.updateMany({
        where: { businessId, type: 'evolution_api' },
        data: { isActive: false },
      });
    } catch (error: any) {
      console.error('Evolution API delete error:', error.response?.data || error.message);
      throw new Error('Failed to delete instance');
    }
  }

  // ==================== MESSAGING ====================

  /**
   * Send text message
   */
  static async sendText(
    businessId: string,
    to: string,
    message: string,
    options: { delay?: number; linkPreview?: boolean } = {}
  ): Promise<any> {
    const config = await this.getConfig(businessId);

    // Format phone number (add @s.whatsapp.net)
    const formattedNumber = this.formatPhone(to);

    try {
      const response = await axios.post(
        `${config.baseUrl}/message/sendText/${config.instanceName}`,
        {
          number: formattedNumber,
          text: message,
          delay: options.delay || 0,
          linkPreview: options.linkPreview ?? true,
        },
        { headers: { apikey: config.apiKey } }
      );

      // Save to database
      await
      prisma.message.create({
        data: {
          businessId,
          direction: 'outbound',
          type: 'text',
          content: message,
          waMessageId: response.data?.key?.id,
          status: 'sent',
        },
      });

      await prisma.business.update({
        where: { id: businessId },
        data: { totalMessages: { increment: 1 } },
      });

      return response.data;
    } catch (error: any) {
      // Save failed message
      await
      prisma.message.create({
        data: {
          businessId,
          direction: 'outbound',
          type: 'text',
          content: message,
          status: 'failed',
          error: error.response?.data?.message || error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Send media message (image, video, document, audio)
   */
  static async sendMedia(
    businessId: string,
    to: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'document' | 'audio',
    caption?: string,
    options: { delay?: number } = {}
  ): Promise<any> {
    const config = await this.getConfig(businessId);
    const formattedNumber = this.formatPhone(to);

    const endpointMap = {
      image: 'sendMedia',
      video: 'sendMedia',
      document: 'sendMedia',
      audio: 'sendMedia',
    };

    try {
      const payload: any = {
        number: formattedNumber,
        mediatype: mediaType,
        media: { url: mediaUrl },
        delay: options.delay || 0,
      };

      if (caption) {
        payload.caption = caption;
      }

      const response = await axios.post(
        `${config.baseUrl}/message/${endpointMap[mediaType]}/${config.instanceName}`,
        payload,
        { headers: { apikey: config.apiKey } }
      );

      await
      prisma.message.create({
        data: {
          businessId,
          direction: 'outbound',
          type: mediaType,
          content: caption || '',
          mediaUrl,
          mediaType,
          waMessageId: response.data?.key?.id,
          status: 'sent',
        },
      });

      await prisma.business.update({
        where: { id: businessId },
        data: { totalMessages: { increment: 1 } },
      });

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Send template / button message
   */
  static async sendTemplate(
    businessId: string,
    to: string,
    template: {
      text: string;
      footer?: string;
      buttons: Array<{ type: 'reply' | 'url' | 'call'; title: string; url?: string; phone?: string }>;
    },
    options: { delay?: number } = {}
  ): Promise<any> {
    const config = await this.getConfig(businessId);
    const formattedNumber = this.formatPhone(to);

    try {
      const response = await axios.post(
        `${config.baseUrl}/message/sendButtons/${config.instanceName}`,
        {
          number: formattedNumber,
          text: template.text,
          footer: template.footer || '',
          buttons: template.buttons.map((btn, i) => ({
            index: i + 1,
            type: btn.type === 'reply' ? 'replyButton' : btn.type === 'url' ? 'urlButton' : 'callButton',
            title: btn.title,
            ...(btn.url ? { url: btn.url } : {}),
            ...(btn.phone ? { phone: btn.phone } : {}),
          })),
          delay: options.delay || 0,
        },
        { headers: { apikey: config.apiKey } }
      );

      await
      prisma.message.create({
        data: {
          businessId,
          direction: 'outbound',
          type: 'template',
          content: template.text,
          interactiveType: 'button',
          waMessageId: response.data?.key?.id,
          status: 'sent',
        },
      });

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Bulk send messages with rate limiting
   */
  static async bulkSend(
    businessId: string,
    messages: Array<{
      to: string;
      type: 'text' | 'template';
      content: string;
      templateData?: any;
      contactId?: string;
    }>,
    options: {
      delayBetween?: number; // ms between messages
      campaignId?: string;
    } = {}
  ): Promise<{ queued: number; estimatedTime: string }> {
    const { delayBetween = 2000, campaignId } = options;

    // Queue messages for background processing
    const queued = await prisma.$transaction(
      messages.map((msg) =>

      prisma.message.create({
          data: {
            businessId,
            contactId: msg.contactId,
            campaignId,
            direction: 'outbound',
            type: msg.type,
            content: msg.content,
            status: 'queued',
            metadata: {
              provider: 'evolution_api',
              to: msg.to,
              templateData: msg.templateData,
              delayBetween,
              retryCount: 0,
              queuedAt: new Date().toISOString(),
            },
          },
        })
      )
    );

    // Update campaign if applicable
    if (campaignId) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalSent: { increment: messages.length },
          targetContacts: { increment: messages.length },
        },
      });
    }

    const totalSeconds = Math.ceil((messages.length * delayBetween) / 1000);
    const estimatedTime =
      totalSeconds < 60
        ? `${totalSeconds}s`
        : `${Math.ceil(totalSeconds / 60)}m ${totalSeconds % 60}s`;

    return { queued: messages.length, estimatedTime };
  }

  // ==================== CONTACTS & CHATS ====================

  /**
   * Fetch all chats
   */
  static async fetchChats(businessId: string): Promise<any[]> {
    const config = await this.getConfig(businessId);

    try {
      const response = await axios.post(
        `${config.baseUrl}/chat/fetchChats/${config.instanceName}`,
        {},
        { headers: { apikey: config.apiKey } }
      );

      return response.data || [];
    } catch (error: any) {
      console.error('Fetch chats error:', error.message);
      return [];
    }
  }

  /**
   * Fetch messages for a contact
   */
  static async fetchMessages(
    businessId: string,
    remoteJid: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<any[]> {
    const config = await this.getConfig(businessId);

    try {
      const response = await axios.post(
        `${config.baseUrl}/chat/fetchMessages/${config.instanceName}`,
        {
          where: { key: { remoteJid } },
          limit: options.limit || 50,
        },
        { headers: { apikey: config.apiKey } }
      );

      return response.data || [];
    } catch (error: any) {
      console.error('Fetch messages error:', error.message);
      return [];
    }
  }

  /**
   * Check if number is on WhatsApp
   */
  static async checkNumber(businessId: string, number: string): Promise<{
    exists: boolean;
    jid: string;
  }> {
    const config = await this.getConfig(businessId);

    try {
      const response = await axios.post(
        `${config.baseUrl}/chat/whatsappNumbers/${config.instanceName}`,
        { numbers: [number.replace(/\D/g, '')] },
        { headers: { apikey: config.apiKey } }
      );

      const result = response.data?.[0];
      return {
        exists: result?.exists || false,
        jid: result?.jid || '',
      };
    } catch (error: any) {
      return { exists: false, jid: '' };
    }
  }

  // ==================== WEBHOOK ====================

  /**
   * Process incoming webhook from Evolution API
   */
  static async processWebhook(businessId: string, payload: any): Promise<void> {
    const event = payload.event;

    switch (event) {
      case 'CONNECTION_UPDATE': {
        const state = payload.data?.status;
        if (state === 'open') {
          await this.updateStatus(businessId, 'connected');
        } else if (state === 'close') {
          await this.updateStatus(businessId, 'disconnected');
        }
        break;
      }

      case 'QRCODE_UPDATED': {
        // QR code updated — frontend can poll for it
        await this.updateStatus(businessId, 'scanning');
        break;
      }

      case 'MESSAGES_UPSERT': {
        const msg = payload.data;
        if (msg.key?.fromMe) return; // Skip own messages

        const from = msg.key?.remoteJid?.replace('@s.whatsapp.net', '') || '';
        const content = msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption || '';

        if (!content && !msg.message?.imageMessage && !msg.message?.audioMessage) return;

        // Find or create contact
        let contact = await prisma.contact.findFirst({
          where: { businessId, phone: from },
        });

        if (!contact) {
          contact = await prisma.contact.create({
            data: {
              businessId,
              name: from || 'WhatsApp Contact',
              phone: from,
              source: 'whatsapp',
              whatsappOptIn: true,
            },
          });
        }

        // Save message
        const msgType = msg.message?.conversation || msg.message?.extendedTextMessage
          ? 'text'
          : msg.message?.imageMessage ? 'image'
          : msg.message?.videoMessage ? 'video'
          : msg.message?.audioMessage ? 'audio'
          : msg.message?.documentMessage ? 'document'
          : 'text';

        await
      prisma.message.create({
          data: {
            businessId,
            contactId: contact.id,
            direction: 'inbound',
            type: msgType,
            content,
            waMessageId: msg.key?.id,
            status: 'received',
          },
        });

        // Update contact last activity
        await
      prisma.contact.update({
          where: { id: contact.id },
          data: { lastMessageAt: new Date(), lastActivity: new Date() },
        });

        break;
      }

      case 'MESSAGES_UPDATE': {
        // Handle read/delivered status updates
        const statusData = payload.data;
        const waMessageId = statusData?.key?.id;
        const status = statusData?.status;

        if (waMessageId && status) {
          const statusMap: Record<string, string> = {
            '0': 'sent',
            '1': 'delivered',
            '2': 'read',
            '3': 'read',
          };

          await prisma.message.updateMany({
            where: { waMessageId },
            data: {
              status: statusMap[status] || status,
              statusTimestamp: new Date(),
            },
          });
        }
        break;
      }
    }
  }

  // ==================== HELPERS ====================

  /**
   * Format phone number for Evolution API
   */
  private static formatPhone(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    // Add country code if missing (default India +91)
    if (cleaned.length === 10) {
      cleaned = `91${cleaned}`;
    }
    return cleaned;
  }

  /**
   * Update Evolution API status in integration config
   */
  private static async updateStatus(businessId: string, status: string): Promise<void> {
    const integration = await prisma.integration.findFirst({
      where: { businessId, type: 'evolution_api' },
    });

    if (integration) {
      const config = integration.config as any;
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          config: { ...config, status },
        },
      });
    }
  }

  /**
   * Save Evolution API configuration
   */
  static async saveConfig(businessId: string, config: {
    baseUrl: string;
    apiKey: string;
    instanceName?: string;
  }): Promise<void> {
    await prisma.integration.upsert({
      where: { id: `evo_${businessId}` },
      create: {
        id: `evo_${businessId}`,
        businessId,
        type: 'evolution_api',
        name: 'Evolution API',
        config: {
          ...config,
          instanceName: config.instanceName || `biz_${businessId.slice(-8)}`,
          status: 'disconnected',
        },
        isActive: true,
      },
      update: {
        config: {
          ...config,
          instanceName: config.instanceName || `biz_${businessId.slice(-8)}`,
          status: 'disconnected',
        },
        isActive: true,
      },
    });
  }

  /**
   * Get Evolution API configuration (safe - no secrets exposed)
   */
  static async getPublicConfig(businessId: string): Promise<{
    configured: boolean;
    status: string;
    instanceName: string;
    baseUrl: string;
    apiKey: string;
  }> {
    // First check database for a saved config
    const integration = await prisma.integration.findFirst({
      where: { businessId, type: 'evolution_api' },
    });

    if (integration) {
      const config = integration.config as any;
      return {
        configured: true,
        status: config.status || 'disconnected',
        instanceName: config.instanceName || '',
        baseUrl: config.baseUrl || '',
        apiKey: config.apiKey || '',
      };
    }

    // Fallback: check if environment variables are set
    // This ensures the frontend shows 'Connect' button when env vars exist
    const envBaseUrl = process.env.EVOLUTION_API_URL;
    const envApiKey = process.env.EVOLUTION_API_KEY;
    if (envBaseUrl && envApiKey) {
      return {
        configured: true,
        status: 'disconnected',
        instanceName: process.env.EVOLUTION_INSTANCE_NAME || `biz_${businessId.slice(-8)}`,
        baseUrl: envBaseUrl,
        apiKey: envApiKey,
      };
    }

    return { configured: false, status: 'disconnected', instanceName: '', baseUrl: '', apiKey: '' };
  }
}

export default EvolutionApiService;
