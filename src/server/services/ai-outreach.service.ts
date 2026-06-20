import { prisma } from '../index.js';
import { AIService } from './ai.service.js';
import { WhatsAppService } from './whatsapp.service.js';

interface OutreachParams {
  businessId: string;
  campaignId: string;
  contactId: string;
  messageType?: string;
}

export class AiOutreachService {
  static async generatePersonalizedMessage(params: {
    contactId: string;
    businessId: string;
    template?: string;
    businessName?: string;
  }): Promise<string> {
    const { contactId, businessId, template, businessName } = params;

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { leadScores: true },
    });
    if (!contact) throw new Error('Contact not found');

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, phone: true },
    });

    const leadData = (contact.leadFinderData as any) || {};
    const gaps = ((contact.leadScores as any)?.reasons?.reasons) || [];

    const prompt = template || `Generate a personalized WhatsApp outreach message for this business lead:

Business: ${contact.name}
City: ${contact.city || 'Unknown'}
Phone: ${contact.phone || 'N/A'}
Digital Presence Gaps: ${gaps.length ? gaps.join(', ') : 'No website, limited online presence'}
Our Company: ${business?.name || 'We'}

Requirements:
- Start with a friendly greeting using their business name
- Mention ONE specific thing they're missing (website/social media)
- Offer a clear value proposition
- Include a soft call-to-action (not pushy)
- Keep it under 150 words
- Use simple, professional language
- Don't use emojis excessively (1-2 max)
- End with "Best regards, ${business?.name || 'Team'}"`;

    try {
      const message = await AIService.generateText(prompt, {
        maxTokens: 300,
        temperature: 0.7,
      });
      return message.trim();
    } catch {
      // Fallback template
      return `Hi ${contact.name},

I noticed your business doesn't have a professional website yet. We help businesses like yours get online with a modern website starting at just ₹4,999.

Would you be interested in a free consultation?

Best regards,
${business?.name || 'Team'}`;
    }
  }

  static async generateBulkMessages(params: {
    businessId: string;
    contactIds: string[];
    template?: string;
  }): Promise<{ contactId: string; message: string }[]> {
    const { businessId, contactIds, template } = params;
    const results: { contactId: string; message: string }[] = [];

    for (const contactId of contactIds) {
      try {
        const message = await this.generatePersonalizedMessage({
          contactId,
          businessId,
          template,
        });
        results.push({ contactId, message });
      } catch {
        // Skip failed generations
      }
    }

    return results;
  }

  static async createCampaign(params: {
    businessId: string;
    name: string;
    template: string;
    contactIds: string[];
  }): Promise<any> {
    const { businessId, name, template, contactIds } = params;

    const campaign = await prisma.outreachCampaign.create({
      data: {
        businessId,
        name,
        template,
        status: 'draft',
        totalLeads: contactIds.length,
      },
    });

    // Create outreach logs for each contact
    for (const contactId of contactIds) {
      await prisma.outreachLog.create({
        data: {
          campaignId: campaign.id,
          contactId,
          businessId,
          messageType: 'initial',
          message: '', // Will be generated before sending
          status: 'pending',
        },
      });
    }

    return campaign;
  }

  static async sendMessage(params: OutreachParams): Promise<any> {
    const { businessId, campaignId, contactId, messageType = 'initial' } = params;

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact?.phone) throw new Error('Contact phone not found');

    // Get or generate message
    let outreachLog = await prisma.outreachLog.findFirst({
      where: { campaignId, contactId, messageType },
    });

    if (!outreachLog) throw new Error('Outreach log not found');

    let message = outreachLog.message;
    if (!message) {
      message = await this.generatePersonalizedMessage({
        contactId,
        businessId,
      });
    }

    // Send via WhatsApp
    const result = await WhatsAppService.sendTextMessage(businessId, contact.phone, message, {
      messageId: contactId,
    });

    // Update outreach log
    await prisma.outreachLog.update({
      where: { id: outreachLog.id },
      data: {
        message,
        status: 'sent',
        sentAt: new Date(),
        whatsappMsgId: result?.messages?.[0]?.id || result?.messageId || null,
      },
    });

    // Update campaign stats
    await prisma.outreachCampaign.update({
      where: { id: campaignId },
      data: { sent: { increment: 1 } },
    });

    return { success: true, messageId: result?.messages?.[0]?.id };
  }

  static async sendBulkMessages(params: {
    businessId: string;
    campaignId: string;
    messageType?: string;
    delayMs?: number;
  }): Promise<{ queued: number; errors: number }> {
    const { businessId, campaignId, messageType = 'initial', delayMs = 2000 } = params;

    const pendingLogs = await prisma.outreachLog.findMany({
      where: {
        campaignId,
        messageType,
        status: 'pending',
      },
      include: { contact: true },
      take: 30, // Rate limit: max 30 per batch
    });

    let queued = 0;
    let errors = 0;

    for (const log of pendingLogs) {
      try {
        if (!log.contact?.phone) { errors++; continue; }

        await this.sendMessage({
          businessId,
          campaignId,
          contactId: log.contactId,
          messageType,
        });

        queued++;

        // Delay between messages
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      } catch {
        errors++;
      }
    }

    return { queued, errors };
  }

  static async getCampaignStats(campaignId: string): Promise<any> {
    const campaign = await prisma.outreachCampaign.findUnique({
      where: { id: campaignId },
      include: {
        outreachLogs: {
          select: { status: true, messageType: true, sentAt: true, repliedAt: true },
        },
      },
    });

    if (!campaign) throw new Error('Campaign not found');

    const stats = {
      total: campaign.totalLeads,
      sent: campaign.outreachLogs.filter((l) => l.status === 'sent' || l.status === 'delivered' || l.status === 'read').length,
      delivered: campaign.outreachLogs.filter((l) => l.status === 'delivered' || l.status === 'read').length,
      replied: campaign.outreachLogs.filter((l) => l.status === 'replied').length,
      failed: campaign.outreachLogs.filter((l) => l.status === 'failed').length,
      pending: campaign.outreachLogs.filter((l) => l.status === 'pending').length,
      deliveryRate: 0,
      replyRate: 0,
    };

    stats.deliveryRate = stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 100) : 0;
    stats.replyRate = stats.sent > 0 ? Math.round((stats.replied / stats.sent) * 100) : 0;

    return { campaign, stats };
  }

  static async listCampaigns(businessId: string, limit = 20): Promise<any[]> {
    return prisma.outreachCampaign.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
