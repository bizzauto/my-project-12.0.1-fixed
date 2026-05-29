// Manual mock for the API module
// Each HTTP method gets its own jest.fn() to prevent cross-method interference
const mockApiClient = {
  get: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  post: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  put: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  patch: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  delete: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
};

const createMockAPI = (methods: Record<string, any>) => {
  const result: Record<string, any> = {};
  for (const [key, defaultValue] of Object.entries(methods)) {
    result[key] = jest.fn().mockResolvedValue(defaultValue);
  }
  return result;
};

module.exports = {
  __esModule: true,
  default: mockApiClient,
  apiClient: mockApiClient,
  authAPI: {
    register: jest.fn(), login: jest.fn(), googleLogin: jest.fn(), appleLogin: jest.fn(),
    getProfile: jest.fn(), updateProfile: jest.fn(), changePassword: jest.fn(),
    sendOtp: jest.fn(), verifyOtp: jest.fn(), resetPassword: jest.fn(),
    setupTwoFactor: jest.fn(), verifyTwoFactor: jest.fn(),
  },
  contactsAPI: createMockAPI({
    list: { success: true, data: { contacts: [] } },
    get: {}, create: {}, update: {}, delete: {}, bulkDelete: {}, import: {}, export: {},
  }),
  businessAPI: createMockAPI({ get: {}, update: {}, getStats: {} }),
  whatsappAPI: {
    send: jest.fn(), getTemplates: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    createTemplate: jest.fn(), updateTemplate: jest.fn(), deleteTemplate: jest.fn(), getTemplate: jest.fn(),
    listConversations: jest.fn().mockResolvedValue({ data: { success: true, data: { conversations: [] } } }),
    getConversation: jest.fn(), sendMessage: jest.fn(), sendBulk: jest.fn(), getContacts: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    getAnalytics: jest.fn(), getStats: jest.fn(), getWebhook: jest.fn(), setWebhook: jest.fn(),
    syncContacts: jest.fn(), listBroadcasts: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    createBroadcast: jest.fn(), updateBroadcast: jest.fn(), deleteBroadcast: jest.fn(), sendBroadcast: jest.fn(),
    listAutoReplies: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    getAutoReplies: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    createAutoReply: jest.fn(), updateAutoReply: jest.fn(), deleteAutoReply: jest.fn(),
    getAutomationStats: jest.fn(), startBot: jest.fn(), stopBot: jest.fn(), getBotStatus: jest.fn(),
  },
  emailAPI: createMockAPI({
    listTemplates: { success: true, data: [] }, getTemplate: {}, createTemplate: {},
    updateTemplate: {}, deleteTemplate: {}, listDrips: { success: true, data: [] },
    createDrip: {}, updateDrip: {}, toggleDrip: {}, deleteDrip: {},
    listLists: { success: true, data: [] }, createList: {}, deleteList: {},
    testConnection: {}, saveConfig: {},
  }),
  campaignsAPI: createMockAPI({
    list: { success: true, data: [] }, get: {}, create: {}, update: {}, delete: {},
    schedule: {}, start: {}, pause: {}, stats: {}, send: {},
  }),
  postsAPI: createMockAPI({
    list: { success: true, data: { posts: [] } }, get: {}, create: {}, update: {},
    delete: {}, schedule: {},
  }),
  analyticsAPI: createMockAPI({
    dashboard: { success: true, data: {} }, messages: { success: true, data: {} },
    leads: { success: true, data: {} }, reports: {}, exportPDF: {}, overview: {}, getOverview: {},
  }),
  reviewsAPI: createMockAPI({
    list: { success: true, data: { reviews: [] } }, get: {}, reply: {}, create: {}, delete: {}, request: {},
  }),
  documentsAPI: createMockAPI({
    list: { success: true, data: { documents: [] } }, get: {}, create: {}, update: {},
    delete: {}, send: {}, share: {}, sign: {},
  }),
  billingAPI: createMockAPI({
    getCurrent: { success: true, data: {} },
    getInvoices: { success: true, data: { invoices: [] } },
    cancelSubscription: {}, upgradeSubscription: {}, changePlan: {}, updatePaymentMethod: {},
  }),
  subscriptionsAPI: createMockAPI({ get: {}, list: {}, create: {} }),
  automationAPI: createMockAPI({
    list: { success: true, data: [] }, get: {}, create: {}, update: {}, delete: {},
    toggle: {}, getLogs: {}, createRule: {}, updateRule: {}, deleteRule: {},
    getTemplates: { success: true, data: [] },
    listRules: { success: true, data: [] },
    getSettings: { success: true, data: {} },
    getN8nStatus: { success: true, data: {} },
    toggleRule: {}, deleteRule: {}, createRule: {}, updateSettings: {},
  }),
  aiAPI: createMockAPI({
    generate: { success: true, data: { text: 'AI response' } }, chat: {}, analyze: {}, enhance: {},
  }),
  teamAPI: createMockAPI({ list: {}, invite: {}, update: {}, remove: {} }),
  leadsAPI: createMockAPI({
    list: { success: true, data: { contacts: [] } }, get: {}, create: {}, update: {},
    delete: {}, bulkCreate: {}, bulkReply: {}, export: {},
  }),
  notificationsAPI: createMockAPI({ list: {}, markRead: {}, markAllRead: {} }),
  apiKeysAPI: createMockAPI({ list: {}, create: {}, delete: {} }),
  googleBusinessAPI: createMockAPI({ list: {}, update: {} }),
  auditLogAPI: createMockAPI({ list: {} }),
  postersAPI: createMockAPI({ list: {}, create: {}, delete: {} }),
  instagramAPI: createMockAPI({
    connect: {}, disconnect: {}, getStatus: {},
    getAccount: {}, uploadMedia: {}, createContainer: {},
    createCarouselContainer: {}, checkContainerStatus: {},
    publishContainer: {}, publish: {}, publishCarousel: {},
    publishPost: {}, getMedia: {}, getMediaInsights: {},
  }),
};
