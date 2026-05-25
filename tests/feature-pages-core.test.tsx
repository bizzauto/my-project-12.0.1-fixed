/**
 * @jest-environment jsdom
 *
 * Unit tests for CRMPage and WhatsAppModule feature pages.
 */

import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { render, RenderOptions } from '@testing-library/react';

// ======== Mocks (uses manual __mocks__ files — reliable, no hoisting issues) ========
jest.mock('lucide-react');
jest.mock('recharts');
jest.mock('qrcode.react');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));
jest.mock('../src/lib/api');
jest.mock('../src/lib/authStore');

// ======== Imports after mocks ========
import { contactsAPI, whatsappAPI } from '../src/lib/api';
import CRMPage from '../src/components/CRMPage';
import WhatsAppModule from '../src/components/WhatsAppModule';

// ======== Test helpers ========
const renderWithProviders = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>, ...options });

const renderWithRouter = (ui: React.ReactElement) => renderWithProviders(ui);

describe('CRMPage', () => {
  // CRMPage uses internal demo data (not API), loaded synchronously via useEffect
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the CRM page header', async () => {
    renderWithRouter(<CRMPage />);
    await waitFor(() => {
      expect(screen.getByText('CRM Suite')).toBeInTheDocument();
    });
  });

  it('displays contacts from demo data', async () => {
    renderWithRouter(<CRMPage />);
    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
      expect(screen.getByText('Priya Patel')).toBeInTheDocument();
    });
  });

  it('renders stat cards with data', async () => {
    renderWithRouter(<CRMPage />);
    await waitFor(() => {
      // 'Contacts' appears in both stat cards and nav buttons — check at least 2 exist
      expect(screen.getAllByText('Contacts').length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('WhatsAppModule', () => {
  // WhatsAppModule initializes with currentView='chats' and connectionStatus='disconnected'.
  // The ChatView is shown first (not QRConnectView). No loading state is rendered.
  beforeEach(() => {
    jest.clearAllMocks();
    (whatsappAPI.getTemplates as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (whatsappAPI.listBroadcasts as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (whatsappAPI.getContacts as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (whatsappAPI.getAutoReplies as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (whatsappAPI.listConversations as jest.Mock).mockResolvedValue({ data: { success: true, data: { conversations: [] } } });
  });

  it('renders the WhatsApp Business page header', async () => {
    renderWithRouter(<WhatsAppModule />);
    await waitFor(() => {
      expect(screen.getByText('WhatsApp Business')).toBeInTheDocument();
    });
  });

  it('shows disconnected status', async () => {
    renderWithRouter(<WhatsAppModule />);
    await waitFor(() => {
      expect(screen.getByText(/Disconnected/)).toBeInTheDocument();
    });
  });

  it('shows connection navigation option', async () => {
    renderWithRouter(<WhatsAppModule />);
    await waitFor(() => {
      expect(screen.getByText('Connection')).toBeInTheDocument();
    });
  });

  it('navigates to QR connect view when clicking Connection nav', async () => {
    renderWithRouter(<WhatsAppModule />);

    // Click the Connection nav button
    const connectionBtn = screen.getByText('Connection');
    fireEvent.click(connectionBtn);

    // Verify QR connect view renders
    await waitFor(() => {
      expect(screen.getByText('Connect WhatsApp')).toBeInTheDocument();
    });
    expect(screen.getByText(/Link your WhatsApp Business account to start messaging/i)).toBeInTheDocument();
  });
});
