import { prisma } from '../index.js';
import { LeadCaptureService } from './lead-capture.service.js';
import { EmailLeadService } from './email-lead.service.js';

/**
 * Gmail IMAP Service - Simple and Reliable
 * Directly connects to Gmail IMAP without complex parsing
 */
export class GmailIMAPService {
  /**
   * Connect to Gmail IMAP and fetch all emails
   */
  static async fetchAndCreateLeads(
    businessId: string,
    config: {
      email: string;
      password: string; // App Password (16 chars, no spaces)
    },
    options: {
      days?: number;
      platform?: string;
    } = {}
  ): Promise<{
    success: boolean;
    totalEmails: number;
    indiamartEmails: number;
    leadsCreated: number;
    errors: string[];
    details: string[];
  }> {
    const result = {
      success: false,
      totalEmails: 0,
      indiamartEmails: 0,
      leadsCreated: 0,
      errors: [] as string[],
      details: [] as string[],
    };

    try {
      // Dynamic import of imap
      const Imap = (await import('imap')).default;
      
      // Clean password - remove all spaces
      const cleanPassword = config.password.replace(/\s/g, '');
      
      result.details.push(`Connecting to imap.gmail.com:993 with ${config.email}`);
      result.details.push(`Password length: ${cleanPassword.length} chars`);

      const imap = new Imap({
        user: config.email,
        password: cleanPassword,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 30000,
        authTimeout: 20000,
      });

      return new Promise((resolve) => {
        let resolved = false;
        
        const safeResolve = (value: typeof result) => {
          if (!resolved) {
            resolved = true;
            try { imap.end(); } catch {}
            resolve(value);
          }
        };

        imap.once('ready', () => {
          result.details.push('IMAP connected successfully!');
          
          imap.openBox('INBOX', true, (err, box) => {
            if (err) {
              result.errors.push(`Cannot open INBOX: ${err.message}`);
              safeResolve(result);
              return;
            }

            result.details.push(`INBOX opened. Total messages: ${box.messages.total}`);
            result.totalEmails = box.messages.total;

            // Search for emails from last N days
            const days = options.days || 30;
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            result.details.push(`Searching emails since ${since.toDateString()}`);

            imap.search([['SINCE', since]], (err, results) => {
              if (err) {
                result.errors.push(`Search error: ${err.message}`);
                safeResolve(result);
                return;
              }

              if (!results || results.length === 0) {
                result.details.push('No emails found in date range');
                safeResolve(result);
                return;
              }

              result.details.push(`Found ${results.length} emails in date range`);
              
              // Fetch ALL emails (not just IndiaMART ones)
              const fetch = imap.fetch(results, { bodies: '' });
              const emails: any[] = [];

              fetch.on('message', (msg, seqno) => {
                msg.on('body', (stream) => {
                  const { simpleParser } = require('mailparser');
                  simpleParser(stream)
                    .then((parsed: any) => {
                      emails.push({
                        from: parsed.from?.text || '',
                        subject: parsed.subject || '',
                        text: parsed.text || '',
                        html: parsed.html || '',
                        date: parsed.date,
                      });
                    })
                    .catch(() => {});
                });
              });

              fetch.once('end', async () => {
                result.details.push(`Fetched ${emails.length} emails`);
                
                // Filter IndiaMART emails
                const indiamartEmails = emails.filter(e => {
                  const from = e.from.toLowerCase();
                  const subject = e.subject.toLowerCase();
                  const text = e.text.toLowerCase();
                  return from.includes('indiamart') || 
                         subject.includes('indiamart') ||
                         subject.includes('enquiry') ||
                         subject.includes('inquiry') ||
                         text.includes('indiamart') ||
                         text.includes('buyer name');
                });

                result.indiamartEmails = indiamartEmails.length;
                result.details.push(`Found ${indiamartEmails.length} IndiaMART emails`);

                // Create leads from each email
                for (const email of indiamartEmails) {
                  try {
                    // Use the improved parser from EmailLeadService
                    const leadData = EmailLeadService.parseEmail(
                      email.html || '',
                      email.text || '',
                      'indiamart'
                    );

                    const phone = leadData?.phone || '';
                    const buyerEmail = leadData?.email || '';
                    const name = leadData?.name || 'IndiaMART Customer';
                    const product = leadData?.product || '';
                    const city = leadData?.city || '';

                    if (phone || buyerEmail) {
                      // Check duplicate
                      const existing = phone ? await prisma.contact.findFirst({
                        where: { businessId, phone, source: 'indiamart' },
                      }) : null;

                      if (!existing) {
                        await LeadCaptureService.captureIndiaMARTLead(businessId, {
                          name,
                          phone,
                          email: buyerEmail || undefined,
                          product,
                          city,
                        });
                        result.leadsCreated++;
                        result.details.push(`Created lead: ${name} ${phone} ${buyerEmail}`);
                      } else {
                        result.details.push(`Skipped duplicate: ${phone}`);
                      }
                    }
                  } catch (e: any) {
                    result.errors.push(`Error creating lead: ${e.message}`);
                  }
                }

                result.success = true;
                result.details.push(`Done! Created ${result.leadsCreated} leads`);
                safeResolve(result);
              });

              fetch.once('error', (err) => {
                result.errors.push(`Fetch error: ${err.message}`);
                safeResolve(result);
              });
            });
          });
        });

        imap.once('error', (err) => {
          result.errors.push(`IMAP error: ${err.message}`);
          result.details.push('IMAP connection failed. Check email and App Password.');
          safeResolve(result);
        });

        imap.once('end', () => {
          result.details.push('IMAP connection ended');
        });

        // Timeout after 60 seconds
        setTimeout(() => {
          safeResolve(result);
        }, 60000);

        imap.connect();
      });
    } catch (e: any) {
      result.errors.push(`Fatal error: ${e.message}`);
      return result;
    }
  }
}
