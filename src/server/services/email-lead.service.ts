import { simpleParser } from 'mailparser';
import { prisma } from '../index.js';
import { LeadCaptureService } from './lead-capture.service.js';

export type Platform = 'indiamart' | 'justdial' | 'tradeindia';

interface ParsedLead {
  name: string;
  phone: string;
  email: string;
  product: string;
  requirement: string;
  city: string;
  source: Platform;
}

/**
 * Unified Email Lead Capture Service
 * Supports IndiaMART, JustDial, and TradeIndia
 */
export class EmailLeadService {
  /**
   * Parse email based on platform
   */
  static parseEmail(html: string, text: string, platform: Platform): ParsedLead | null {
    const content = text || this.htmlToText(html);

    const parsers: Record<Platform, (content: string) => ParsedLead | null> = {
      indiamart: this.parseIndiaMART,
      justdial: this.parseJustDial,
      tradeindia: this.parseTradeIndia,
    };

    return parsers[platform](content);
  }

  /**
   * Parse IndiaMART email
   */
  static parseIndiaMART(content: string): ParsedLead | null {
    const result: ParsedLead = { name: '', phone: '', email: '', product: '', requirement: '', city: '', source: 'indiamart' };

    // Name
    const nameMatch = content.match(/(?:Dear\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?|Query\s+from\s+(.+?)(?:\n|$)|Buyer\s+Name[:\s]*(.+?)(?:\n|$))/i);
    if (nameMatch) result.name = (nameMatch[1] || nameMatch[2] || nameMatch[3] || '').trim();

    // Phone
    const phones = content.match(/(?:\+?91[\s.-]?)?([6-9]\d{9})/g);
    if (phones) {
      for (const p of phones) {
        const clean = p.replace(/[\s.-]/g, '');
        if (clean.length >= 10) { result.phone = clean.slice(-10); break; }
      }
    }

    // Email
    const emails = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emails) {
      const valid = emails.filter(e => !e.includes('indiamart.com') && !e.includes('noreply'));
      if (valid.length > 0) result.email = valid[0];
    }

    // Product
    const productMatch = content.match(/(?:Requirement\s+for|Inquiry\s+for|Interested\s+in|Product\s+Name)[:\s]*(.+?)(?:\n|$)/i);
    if (productMatch) result.product = productMatch[1].trim().substring(0, 200);

    // Requirement
    const reqMatch = content.match(/(?:Requirement|Query|Details|Message|Description|Customer\s+Requirement)[:\s]*(.+?)(?:\n\n|$)/is);
    if (reqMatch) result.requirement = reqMatch[1].trim().substring(0, 500);

    // City
    const cityMatch = content.match(/(?:City|Location|From|Buyer\s+City)[:\s]*([A-Za-z\s]+?)(?:\n|$)/i);
    if (cityMatch) result.city = cityMatch[1].trim().substring(0, 100);

    return (result.phone || result.email) ? result : null;
  }

  /**
   * Parse JustDial email
   */
  static parseJustDial(content: string): ParsedLead | null {
    const result: ParsedLead = { name: '', phone: '', email: '', product: '', requirement: '', city: '', source: 'justdial' };

    // JustDial format: "Customer Name: XXX" or "Enquiry from XXX"
    const nameMatch = content.match(/(?:Customer\s+Name|Enquiry\s+from|Contact\s+Person|Name)[:\s]*([A-Za-z\s]+?)(?:\n|$)/i);
    if (nameMatch) result.name = nameMatch[1].trim();

    // Phone
    const phones = content.match(/(?:\+?91[\s.-]?)?([6-9]\d{9})/g);
    if (phones) {
      for (const p of phones) {
        const clean = p.replace(/[\s.-]/g, '');
        if (clean.length >= 10) { result.phone = clean.slice(-10); break; }
      }
    }

    // Email
    const emails = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emails) {
      const valid = emails.filter(e => !e.includes('justdial.com') && !e.includes('noreply'));
      if (valid.length > 0) result.email = valid[0];
    }

    // Product/Service
    const productMatch = content.match(/(?:Service\s+Required|Product|Category|Looking\s+for)[:\s]*(.+?)(?:\n|$)/i);
    if (productMatch) result.product = productMatch[1].trim().substring(0, 200);

    // Message
    const reqMatch = content.match(/(?:Message|Requirements|Details|Comments)[:\s]*(.+?)(?:\n\n|$)/is);
    if (reqMatch) result.requirement = reqMatch[1].trim().substring(0, 500);

    // City
    const cityMatch = content.match(/(?:City|Location|Area)[:\s]*([A-Za-z\s]+?)(?:\n|$)/i);
    if (cityMatch) result.city = cityMatch[1].trim().substring(0, 100);

    return (result.phone || result.email) ? result : null;
  }

  /**
   * Parse TradeIndia email
   */
  static parseTradeIndia(content: string): ParsedLead | null {
    const result: ParsedLead = { name: '', phone: '', email: '', product: '', requirement: '', city: '', source: 'tradeindia' };

    // TradeIndia format: "Buyer: XXX" or "Enquiry from XXX"
    const nameMatch = content.match(/(?:Buyer|Buyer\s+Name|Enquiry\s+from|Contact)[:\s]*([A-Za-z\s]+?)(?:\n|$)/i);
    if (nameMatch) result.name = nameMatch[1].trim();

    // Phone
    const phones = content.match(/(?:\+?91[\s.-]?)?([6-9]\d{9})/g);
    if (phones) {
      for (const p of phones) {
        const clean = p.replace(/[\s.-]/g, '');
        if (clean.length >= 10) { result.phone = clean.slice(-10); break; }
      }
    }

    // Email
    const emails = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emails) {
      const valid = emails.filter(e => !e.includes('tradeindia.com') && !e.includes('noreply'));
      if (valid.length > 0) result.email = valid[0];
    }

    // Product
    const productMatch = content.match(/(?:Product\s+Required|Product|Item|Looking\s+for)[:\s]*(.+?)(?:\n|$)/i);
    if (productMatch) result.product = productMatch[1].trim().substring(0, 200);

    // Requirement
    const reqMatch = content.match(/(?:Requirement|Description|Details|Message)[:\s]*(.+?)(?:\n\n|$)/is);
    if (reqMatch) result.requirement = reqMatch[1].trim().substring(0, 500);

    // City
    const cityMatch = content.match(/(?:City|Location|From)[:\s]*([A-Za-z\s]+?)(?:\n|$)/i);
    if (cityMatch) result.city = cityMatch[1].trim().substring(0, 100);

    return (result.phone || result.email) ? result : null;
  }

  /**
   * Get email search domains for platform
   */
  static getSearchDomains(platform: Platform): string[] {
    const domains: Record<Platform, string[]> = {
      indiamart: ['indiamart.com', 'leadz@indiamart.com', 'noreply@indiamart.com', 'enquiry@indiamart.com'],
      justdial: ['justdial.com', 'noreply@justdial.com', 'leads@justdial.com', 'enquiry@justdial.com'],
      tradeindia: ['tradeindia.com', 'noreply@tradeindia.com', 'leads@tradeindia.com', 'enquiry@tradeindia.com'],
    };
    return domains[platform];
  }

  /**
   * Get platform display name
   */
  static getPlatformName(platform: Platform): string {
    const names: Record<Platform, string> = {
      indiamart: 'IndiaMART',
      justdial: 'JustDial',
      tradeindia: 'TradeIndia',
    };
    return names[platform];
  }

  /**
   * Convert HTML to plain text
   */
  static htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Process emails and capture leads
   */
  static async processEmails(
    businessId: string,
    emailConfig: {
      imapHost: string;
      imapPort: number;
      email: string;
      password: string;
      useSSL: boolean;
    },
    platform: Platform,
    options: {
      since?: Date;
      saveToSheet?: boolean;
      spreadsheetId?: string;
    } = {}
  ): Promise<{
    processed: number;
    newLeads: number;
    skipped: number;
    errors: string[];
    leads: any[];
  }> {
    const result = {
      processed: 0,
      newLeads: 0,
      skipped: 0,
      errors: [] as string[],
      leads: [] as any[],
    };

    try {
      const Imap = (await import('imap')).default as any;
      const imap = new Imap({
        user: emailConfig.email,
        password: emailConfig.password,
        host: emailConfig.imapHost,
        port: emailConfig.imapPort,
        tls: emailConfig.useSSL,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 30000,
        authTimeout: 15000,
      });

      const since = options.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const limit = 100;
      const platformName = this.getPlatformName(platform);
      const searchDomains = this.getSearchDomains(platform);

      console.log(`[${platformName}] Connecting to IMAP: ${emailConfig.imapHost}:${emailConfig.imapPort}`);

      await new Promise<void>((resolve, reject) => {
        imap.once('ready', () => {
          console.log(`[${platformName}] IMAP connected successfully`);
          imap.openBox('INBOX', true, async (err) => {
            if (err) {
              imap.end();
              reject(new Error(`Failed to open INBOX: ${err.message}`));
              return;
            }

            console.log(`[${platformName}] Searching emails since ${since.toISOString()}`);

            // Simple search - just get recent emails, filter manually
            const searchQuery: any[] = [['SINCE', since]];

            imap.search(searchQuery, async (err, results) => {
              if (err) {
                console.error(`[${platformName}] Search error:`, err);
                imap.end();
                resolve();
                return;
              }

              if (!results || results.length === 0) {
                console.log(`[${platformName}] No emails found in INBOX`);
                imap.end();
                resolve();
                return;
              }

              console.log(`[${platformName}] Found ${results.length} total emails, filtering for ${platformName}...`);

              const toFetch = results.slice(-limit);
              const fetch = imap.fetch(toFetch, { bodies: '', struct: true });

              let emailCount = 0;
              let matchCount = 0;

              fetch.on('message', async (msg) => {
                msg.on('body', async (stream) => {
                  try {
                    const parsed = await simpleParser(stream);
                    const fromAddress = ((parsed as any).from?.[0]?.address || '').toLowerCase();
                    const subject = ((parsed as any).subject || '').toLowerCase();
                    emailCount++;

                    // Check if this email is from the platform
                    const isMatch = searchDomains.some(domain => fromAddress.includes(domain)) ||
                                   subject.includes(platform.toLowerCase()) ||
                                   subject.includes('enquiry') ||
                                   subject.includes('inquiry') ||
                                   subject.includes('lead');

                    if (!isMatch) {
                      return; // Skip non-platform emails
                    }

                    matchCount++;
                    console.log(`[${platformName}] Match #${matchCount}: From: ${fromAddress}, Subject: ${(parsed as any).subject}`);

                    const leadData = this.parseEmail(
                      (parsed as any).html || '',
                      (parsed as any).text || '',
                      platform
                    );

                    if (leadData && (leadData.phone || leadData.email)) {
                      result.processed++;

                      // Check duplicate
                      const existing = leadData.phone
                        ? await prisma.contact.findFirst({
                            where: { businessId, phone: leadData.phone, createdAt: { gte: since } },
                          })
                        : null;

                      if (existing) {
                        result.skipped++;
                        console.log(`[${platformName}] Skipping duplicate: ${leadData.phone}`);
                        return;
                      }

                      // Capture lead
                      const contact = await LeadCaptureService.captureIndiaMARTLead(businessId, {
                        name: leadData.name || `${platformName} Customer`,
                        phone: leadData.phone || '',
                        email: leadData.email || undefined,
                        product: leadData.product,
                        requirement: leadData.requirement,
                        city: leadData.city,
                      });

                      result.newLeads++;
                      result.leads.push(contact);
                      console.log(`[${platformName}] New lead: ${leadData.name} ${leadData.phone}`);
                    } else {
                      console.log(`[${platformName}] Could not parse lead from email: ${fromAddress}`);
                    }
                  } catch (e: any) {
                    result.errors.push(`Parse error: ${e.message}`);
                    console.error(`[${platformName}] Parse error:`, e.message);
                  }
                });
              });

              fetch.once('end', () => {
                console.log(`[${platformName}] Done. Processed: ${result.processed}, New: ${result.newLeads}`);
                imap.end();
                resolve();
              });

              fetch.once('error', (err) => {
                result.errors.push(`Fetch error: ${err.message}`);
                imap.end();
                resolve();
              });
            });
          });
        });

        imap.once('error', (err) => {
          reject(new Error(`IMAP error: ${err.message}`));
        });

        imap.connect();
      });
    } catch (e: any) {
      result.errors.push(`Process error: ${e.message}`);
      console.error(`[${platform}] Error:`, e);
    }

    return result;
  }

  /**
   * Test IMAP connection
   */
  static async testConnection(
    emailConfig: {
      imapHost: string;
      imapPort: number;
      email: string;
      password: string;
      useSSL: boolean;
    },
    platform: Platform
  ): Promise<{
    connected: boolean;
    mailbox?: string;
    totalEmails?: number;
    platformEmails?: number;
  }> {
    const Imap = (await import('imap')).default as any;
    const imap = new Imap({
      user: emailConfig.email,
      password: emailConfig.password,
      host: emailConfig.imapHost,
      port: emailConfig.imapPort,
      tls: emailConfig.useSSL,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 15000,
      authTimeout: 10000,
    });

    return new Promise((resolve, reject) => {
      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            imap.end();
            reject(new Error(`Failed to open INBOX: ${err.message}`));
            return;
          }

          const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const searchDomains = this.getSearchDomains(platform);
          const searchQuery: any[] = [['SINCE', since]];
          if (searchDomains.length === 1) {
            searchQuery.push(['FROM', searchDomains[0]]);
          } else {
            searchQuery.push(['OR', ['FROM', searchDomains[0]], ['OR', ['FROM', searchDomains[1]], ['OR', ['FROM', searchDomains[2]], ['FROM', searchDomains[3]]]]]);
          }

          imap.search(searchQuery, (err, results) => {
            imap.end();
            resolve({
              connected: true,
              mailbox: box.name,
              totalEmails: box.messages.total,
              platformEmails: results ? results.length : 0,
            });
          });
        });
      });

      imap.once('error', (err) => {
        reject(new Error(`IMAP connection failed: ${err.message}`));
      });

      imap.connect();
    });
  }
}
