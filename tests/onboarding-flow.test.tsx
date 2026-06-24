/**
 * @jest-environment jsdom
 *
 * Unit tests for OnboardingWizard — step progression, navigation routing,
 * and connection status display.
 *
 * These tests verify that:
 *   1. The step progression (Continue/Back) moves the user through all 4 steps
 *   2. Completing the wizard navigates to the correct routes
 *   3. Connection status (Checking… / Connected / Connect) displays correctly
 *   4. The onComplete callback fires when the wizard finishes
 */

// ────── State capture variables (assigned in jest.mock factories) ──────
let mockNavigate: jest.Mock;
let mockSetOnboardingCompleted: jest.Mock;

// ════════════════════════════════════════════════════════════════════════
//  Mock modules — jest.mock is hoisted, so these run before imports
// ════════════════════════════════════════════════════════════════════════

jest.mock('../src/lib/authStore', () => {
  mockSetOnboardingCompleted = jest.fn();
  const mockState = {
    user: { id: '1', name: 'Test User', role: 'OWNER', email: 'test@example.com' },
    business: { id: 'b1', name: 'Test Business', type: 'general', plan: 'STARTER' },
    token: 'mock-token',
    isAuthenticated: true,
    isLoading: false,
    isInitialized: true,
    onboardingCompleted: false,
    isDemoMode: false,
    setOnboardingCompleted: mockSetOnboardingCompleted,
  };

  const useAuthStore = Object.assign(
    (selector?: any) => (typeof selector === 'function' ? selector(mockState) : mockState),
    {
      getState: () => mockState,
      setState: jest.fn(),
      subscribe: jest.fn(),
      destroy: jest.fn(),
    },
  );

  return { useAuthStore };
});

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  mockNavigate = jest.fn();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('lucide-react', () => {
  const React = require('react');
  const iconNames = [
    'Check', 'ArrowRight', 'ArrowLeft', 'Building2',
    'MessageSquare', 'Zap', 'Star', 'CheckCircle', 'RefreshCw',
    'Upload', 'Sparkles',
  ];
  const mock: Record<string, any> = {};
  for (const name of iconNames) {
    mock[name] = () => React.createElement('span', { 'data-icon': name }, name);
  }
  return mock;
});

jest.mock('recharts');
jest.mock('qrcode.react');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

// Custom API mock — includes getStatus / getCurrent methods not in the manual mock
jest.mock('../src/lib/api', () => ({
  whatsappAPI: { getStatus: jest.fn() },
  googleBusinessAPI: { getStatus: jest.fn() },
  subscriptionsAPI: { getCurrent: jest.fn() },
}));

// ════════════════════════════════════════════════════════════════════════
//  Imports (resolve after jest.mock hoisting)
// ════════════════════════════════════════════════════════════════════════

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { whatsappAPI, googleBusinessAPI, subscriptionsAPI } from '../src/lib/api';
import OnboardingWizard from '../src/components/OnboardingWizard';

// ════════════════════════════════════════════════════════════════════════
//  Test helpers
// ════════════════════════════════════════════════════════════════════════

// Helper: advance from step 0 to step 1 (welcome/choice) then to step 2 (business) via Manual Setup
const clickManualSetup = () => fireEvent.click(screen.getByText(/✍️ Manual Setup/));

const renderOnboarding = () =>
  render(
    <MemoryRouter>
      <OnboardingWizard />
    </MemoryRouter>,
  );

// Use regex for button text because lucide-react mock renders icon text inside buttons
const clickContinue = () => fireEvent.click(screen.getByText(/^Continue$/));
const clickBack = () => fireEvent.click(screen.getByText(/^Back$/));

/**
 * Advance from step 0 (empty) through to step 3 (Connect tools).
 * Flow: step 0 (empty) → click Continue → step 1 (Welcome) → click Manual Setup → step 2 (Business) → click Continue → step 3 (Connect)
 */
const advanceToStep3 = () => {
  renderOnboarding();
  clickContinue();          // step 0 → step 1 (Welcome with Quick/Manual buttons)
  clickManualSetup();       // step 1 → step 2 (Business info)
  clickContinue();          // step 2 → step 3 (Connect tools)
};

/**
 * Advance all the way to step 4 (Done/Get Started).
 */
const advanceToStep4 = () => {
  advanceToStep3();
  clickContinue();          // step 3 → step 4 (Done)
};

// ════════════════════════════════════════════════════════════════════════
//  Setup / teardown
// ════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigate?.mockClear();
  mockSetOnboardingCompleted?.mockClear();

  // Default: all services are disconnected
  (whatsappAPI.getStatus as jest.Mock).mockResolvedValue({
    data: { success: true, data: { connected: false } },
  });
  (googleBusinessAPI.getStatus as jest.Mock).mockResolvedValue({
    data: { success: true, data: { connected: false } },
  });
  (subscriptionsAPI.getCurrent as jest.Mock).mockResolvedValue({
    data: { success: true, data: { plan: 'FREE' } },
  });
});

// ════════════════════════════════════════════════════════════════════════
//  Step progression
// ════════════════════════════════════════════════════════════════════════

describe('Step progression', () => {
  it('renders initial step 0 with Continue button, no Welcome text yet', () => {
    renderOnboarding();

    // Step 0 shows only the Continue button, no step content
    expect(screen.getByText(/^Continue$/)).toBeInTheDocument();
    // Welcome text and choice buttons NOT yet visible
    expect(screen.queryByText(/Welcome to BizzAuto!/)).not.toBeInTheDocument();
  });

  it('Continue moves from step 0 → step 1 (Welcome with choice buttons)', () => {
    renderOnboarding();
    clickContinue();

    // Step 1 shows the Welcome text with Quick/Manual choice buttons
    expect(screen.getByText(/Welcome to BizzAuto!/)).toBeInTheDocument();
    expect(screen.getByText(/Hey Test User/)).toBeInTheDocument();
    expect(screen.getByText(/⚡ Quick Setup/)).toBeInTheDocument();
    expect(screen.getByText(/✍️ Manual Setup/)).toBeInTheDocument();
    // No Continue button on the choice screen (only Quick/Manual buttons)
  });

  it('Manual Setup moves from step 1 → step 2 (Business)', () => {
    renderOnboarding();
    clickContinue();
    clickManualSetup();

    expect(screen.getByText('Tell us about your business')).toBeInTheDocument();
    expect(screen.getByText(/Back/)).toBeInTheDocument();
    expect(screen.getByText(/^Continue$/)).toBeInTheDocument();
  });

  it('Back from step 2 returns to step 1 (setupMode=manual, no choice buttons)', () => {
    renderOnboarding();
    clickContinue();
    clickManualSetup();
    clickBack();

    // Step 1 with setupMode='manual' shows no step content (only the progress bar and Continue button)
    // The Continue button IS visible since step < totalSteps
    expect(screen.getByText(/^Continue$/)).toBeInTheDocument();
    // Welcome/choice text should NOT be here (setupMode is still 'manual')
    expect(screen.queryByText(/Welcome to BizzAuto!/)).not.toBeInTheDocument();
  });

  it('Continue from step 2 → step 3 (Connect)', () => {
    renderOnboarding();
    clickContinue();
    clickManualSetup();
    clickContinue();

    expect(screen.getByText('Connect your tools')).toBeInTheDocument();
  });

  it('Back from step 3 returns to step 2', () => {
    renderOnboarding();
    clickContinue();
    clickManualSetup();
    clickContinue();
    clickBack();

    expect(screen.getByText('Tell us about your business')).toBeInTheDocument();
  });

  it('Continue from step 3 → step 4 (Done)', () => {
    renderOnboarding();
    clickContinue();
    clickManualSetup();
    clickContinue();
    clickContinue();

    expect(screen.getByText("You're all set!")).toBeInTheDocument();
    expect(screen.getByText(/Get Started/)).toBeInTheDocument();
  });

  it('Back from step 4 returns to step 3', () => {
    renderOnboarding();
    clickContinue();
    clickManualSetup();
    clickContinue();
    clickContinue();
    clickBack();

    expect(screen.getByText('Connect your tools')).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════
//  Navigation routing on completion
// ════════════════════════════════════════════════════════════════════════

describe('Navigation routing', () => {
  it('Get Started navigates to /dashboard', () => {
    advanceToStep4();

    fireEvent.click(screen.getByText(/Get Started/));

    expect(mockSetOnboardingCompleted).toHaveBeenCalledWith(true);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('Connect (WhatsApp) navigates to /whatsapp', async () => {
    advanceToStep3();

    // Wait for all API calls to settle so buttons appear (not "Checking...")
    await waitFor(() => {
      expect(screen.getAllByText('Connect').length).toBeGreaterThanOrEqual(3);
    });

    const connectBtns = screen.getAllByText('Connect');
    fireEvent.click(connectBtns[0]); // WhatsApp is first in the tools array

    expect(mockSetOnboardingCompleted).toHaveBeenCalledWith(true);
    expect(mockNavigate).toHaveBeenCalledWith('/whatsapp');
  });

  it('Connect (Google Business) navigates to /google-business', async () => {
    advanceToStep3();

    await waitFor(() => {
      expect(screen.getAllByText('Connect').length).toBeGreaterThanOrEqual(3);
    });

    const connectBtns = screen.getAllByText('Connect');
    fireEvent.click(connectBtns[1]); // Google Business is second

    expect(mockNavigate).toHaveBeenCalledWith('/google-business');
  });

  it('Connect (Google Sheets) navigates to /settings', async () => {
    advanceToStep3();

    await waitFor(() => {
      expect(screen.getAllByText('Connect').length).toBeGreaterThanOrEqual(3);
    });

    const connectBtns = screen.getAllByText('Connect');
    fireEvent.click(connectBtns[2]); // Google Sheets is third

    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('Connect (Razorpay) navigates to /settings', async () => {
    advanceToStep3();

    await waitFor(() => {
      expect(screen.getAllByText('Connect').length).toBeGreaterThanOrEqual(3);
    });

    const connectBtns = screen.getAllByText('Connect');
    fireEvent.click(connectBtns[3]); // Razorpay is fourth

    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });
});

// ════════════════════════════════════════════════════════════════════════
//  Connection status display
// ════════════════════════════════════════════════════════════════════════

describe('Connection status display', () => {
  it('shows "Checking…" while API calls are in flight', async () => {
    // Use never-resolving promises to keep the loading state
    (whatsappAPI.getStatus as jest.Mock).mockReturnValue(new Promise(() => {}));
    (googleBusinessAPI.getStatus as jest.Mock).mockReturnValue(new Promise(() => {}));
    (subscriptionsAPI.getCurrent as jest.Mock).mockReturnValue(new Promise(() => {}));

    advanceToStep3();

    // Three tools have API-dependent status (WhatsApp, GBP, Razorpay) — should show "Checking…"
    await waitFor(() => {
      expect(screen.getAllByText(/Checking/).length).toBe(3);
    });
  });

  it('shows "Connected" badges when APIs report connected', async () => {
    (whatsappAPI.getStatus as jest.Mock).mockResolvedValue({
      data: { success: true, data: { connected: true } },
    });
    (googleBusinessAPI.getStatus as jest.Mock).mockResolvedValue({
      data: { success: true, data: { connected: true } },
    });
    // PRO plan → Razorpay considered connected
    (subscriptionsAPI.getCurrent as jest.Mock).mockResolvedValue({
      data: { success: true, data: { plan: 'PRO' } },
    });

    advanceToStep3();

    // WhatsApp, GBP, Razorpay → Connected; Google Sheets → always Connect button
    await waitFor(() => {
      expect(screen.getAllByText(/Connected/).length).toBe(3);
    });
    // Google Sheets should still show as Connect
    expect(screen.getAllByText('Connect').length).toBe(1);
  });

  it('shows "Connect" buttons when APIs return disconnected', async () => {
    // Default beforeEach already sets everything to disconnected
    advanceToStep3();

    await waitFor(() => {
      // 4 Connect buttons for all tools
      expect(screen.getAllByText('Connect').length).toBe(4);
    });
  });

  it('shows "Connect" buttons when API calls fail', async () => {
    (whatsappAPI.getStatus as jest.Mock).mockRejectedValue(new Error('Network error'));
    (googleBusinessAPI.getStatus as jest.Mock).mockRejectedValue(new Error('Network error'));
    (subscriptionsAPI.getCurrent as jest.Mock).mockRejectedValue(new Error('Network error'));

    advanceToStep3();

    await waitFor(() => {
      // All four should default to disconnected → "Connect"
      expect(screen.getAllByText('Connect').length).toBe(4);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
//  onComplete callback
// ════════════════════════════════════════════════════════════════════════

describe('onComplete callback', () => {
  it('calls onComplete when the user finishes the wizard', () => {
    const onComplete = jest.fn();

    render(
      <MemoryRouter>
        <OnboardingWizard onComplete={onComplete} />
      </MemoryRouter>,
    );

    clickContinue();  // step 0 → step 1 (Welcome + choice buttons)
    // On step 1, there's no Continue button, only choice buttons
    // Need to click Manual Setup to advance
    clickManualSetup();  // step 1 → step 2 (Business info)
    clickContinue();  // step 2 → step 3 (Connect tools)
    clickContinue();  // step 3 → step 4 (Done)
    fireEvent.click(screen.getByText(/Get Started/));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete when connecting a tool from step 3', async () => {
    const onComplete = jest.fn();

    render(
      <MemoryRouter>
        <OnboardingWizard onComplete={onComplete} />
      </MemoryRouter>,
    );

    clickContinue();   // step 0 → step 1 (Welcome)
    clickManualSetup();  // step 1 → step 2 (Business info)
    clickContinue();   // step 2 → step 3 (Connect tools)

    await waitFor(() => {
      expect(screen.getAllByText('Connect').length).toBeGreaterThanOrEqual(3);
    });

    const connectBtns = screen.getAllByText('Connect');
    fireEvent.click(connectBtns[0]); // Connect WhatsApp

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
