// Jimi AI Voice Assistant Service
// Uses Web Speech API (free) + Nvidia NIM (free) for voice commands

interface JimiConfig {
  language?: string;
  voice?: string;
  rate?: number;
  pitch?: number;
}

export type Language = 'hi-IN' | 'en-US' | 'mr-IN' | 'ta-IN' | 'te-IN' | 'bn-IN' | 'gu-IN' | 'kn-IN' | 'ml-IN' | 'pa-IN';

export const LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
];

// Jimi's sweet responses - Best Friend vibes
const SWEET_RESPONSES = {
  greeting: [
    'Arre hello! Kaise ho? Yaar bahut miss kar rahi thi tumhe! 😊',
    'Namaste! Aaj kya haal hai? Batao na kya chal raha hai life mein! 💫',
    'Hi hi hi! Bahut accha laga tumhe dekh ke! Kya kar rahe ho aajkal? ✨',
    'Oye! Kahan the itni der se? Main wait kar rahi thi! 🌸',
    'Hey! Tum acche ho na? Kuch help chahiye toh batao, main hoon na! 💕',
  ],
  thankYou: [
    'Arey yaar, ye sab kya! Hum dost hai na! 💕',
    'Arre thank you mat bolo, mujhe accha lagta hai tumhari help karke! 😊',
    'Yaar tum bahut acche ho! Aur kuch help chahiye toh batao! 🌟',
    'Bas bas, ab thank you mat bolo! Dost hain hum! 😄',
    'Tumhari khushi mein meri khushi hai yaar! 💖',
  ],
  help: [
    'Arre yaar, main hoon na tumhari help ke liye! Bolo kya karun?\n• WhatsApp bhejun kisi ko?\n• Leads dekhun?\n• Post banaun?\n• Reviews padhun?\nBolo bolo, main ready hoon! 💫',
    'Yaar tum batao kya kaam hai! Main toh tumhare liye hamesha ready hoon! 🌸',
    'Hey, kuch bhi karna ho, mujhe batao! Hum saath mein karenge! ✨',
  ],
  confused: [
    'Arre yaar, samajh nahi aaya! Thoda aur clearly bolo na! 😅',
    'Hey, kya bol rahe ho? Mujhe thoda aur batao! 💕',
    'Yaar ye kya bola? Phir se bolo, main sun rahi hoon! 🌸',
  ],
  deleteConfirm: [
    'Arre yaar, pakka karna hai ye? Soch lo ek baar! 🤔',
    'Hey, delete ho jayega fir! Aap sure ho? ⚠️',
    'Yaar ek baar soch lo, fir wapas nahi aayega! 💭',
  ],
  deleteCancelled: [
    'Arre great! Data safe hai, tension mat lo! 😊',
    'Yaar sahi kiya cancel karke! Data surakshit hai! 🛡️',
    'Hey, koi baat nahi! Sab theek hai! 💕',
  ],
  time: [
    'Arre abhi {time} ho rahe hain! Kya kar rahe ho? ⏰',
    'Yaar {time} baj gaye! Kaam pe dhyan do! 😊',
  ],
  languageChanged: [
    'Arre ab {lang} mein baat karenge! Badhiya! ✨',
    'Yaar {lang} mein baat karte hain! Ready ho? 🌸',
  ],
  bestFriend: [
    'Yaar tum toh best ho! Kuch bhi help chahiye toh batao! 💕',
    'Hey, hum toh dost hain na! Tension mat lo! 😊',
    'Arre yaar, tumhari friend hoon main! Hamesha help karungi! 🌟',
  ],
};

interface CommandResult {
  action: string;
  params?: any;
  response: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

// Safety: Destructive commands that need confirmation
const DESTRUCTIVE_ACTIONS = [
  'delete', 'remove', 'clear', 'destroy', 'wipe', 'reset', 'purge',
  'delete_lead', 'delete_review', 'delete_post', 'delete_template',
  'delete_campaign', 'delete_contact', 'unsubscribe', 'ban',
];

// Safety: Restricted commands - NEVER allowed
const RESTRICTED_ACTIONS = [
  'drop_table', 'drop_database', 'format_db', 'factory_reset',
  'delete_account', 'delete_business', 'nuke', 'destroy_all',
];

// Safety: Commands that need explicit user confirmation
const CONFIRMATION_REQUIRED = [
  'delete_lead', 'delete_review', 'delete_post', 'delete_template',
  'delete_campaign', 'clear_data', 'reset_settings', 'unsubscribe',
];

type JimiCallback = (text: string, isUser: boolean) => void;

class JimiVoiceAgent {
  private recognition: any | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private isSpeaking = false;
  private config: JimiConfig;
  private onMessage: JimiCallback | null = null;
  private onListeningChange: ((listening: boolean) => void) | null = null;
  private conversationHistory: { role: string; content: string }[] = [];
  private availableVoices: SpeechSynthesisVoice[] = [];

  constructor(config: JimiConfig = {}) {
    this.config = {
      language: 'hi-IN', // Hindi + English mix
      rate: 1.0,
      pitch: 1.0,
      ...config,
    };
    this.initSpeechRecognition();
    this.initSpeechSynthesis();
  }

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Jimi: Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript && this.onMessage) {
        this.onMessage(interimTranscript, true);
      }

      if (finalTranscript) {
        this.processUserInput(finalTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Jimi recognition error:', event.error);
      if (event.error !== 'no-speech') {
        this.isListening = false;
        this.onListeningChange?.(false);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onListeningChange?.(false);
    };
  }

  private initSpeechSynthesis() {
    this.synthesis = window.speechSynthesis;
    this.loadVoices();
    this.synthesis?.addEventListener('voiceschanged', () => this.loadVoices());
  }

  private loadVoices() {
    if (this.synthesis) {
      this.availableVoices = this.synthesis.getVoices();
    }
  }

  setMessageCallback(callback: JimiCallback) {
    this.onMessage = callback;
  }

  setListeningCallback(callback: (listening: boolean) => void) {
    this.onListeningChange = callback;
  }

  setLanguage(lang: Language) {
    this.config.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  getLanguage(): Language {
    return (this.config.language || 'hi-IN') as Language;
  }

  private detectLanguage(text: string): Language {
    // Detect script/language from text
    if (/[\u0900-\u097F]/.test(text)) return 'hi-IN'; // Devanagari (Hindi/Marathi)
    if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN'; // Bengali
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN'; // Gurmukhi (Punjabi)
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN'; // Tamil
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN'; // Telugu
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN'; // Kannada
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN'; // Malayalam
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN'; // Gujarati
    return 'en-US'; // Default English
  }

  startListening() {
    if (!this.recognition) {
      this.onMessage?.('Jimi: Speech recognition is not supported in your browser. Please use Chrome.', false);
      return;
    }

    if (this.isSpeaking) {
      this.synthesis?.cancel();
      this.isSpeaking = false;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      this.onListeningChange?.(true);
      this.onMessage?.('🎤 Listening...', false);
    } catch (err) {
      console.error('Jimi start error:', err);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.onListeningChange?.(false);
    }
  }

  speak(text: string) {
    if (!this.synthesis) return;

    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const detectedLang = this.detectLanguage(text);
    utterance.lang = detectedLang;
    utterance.rate = this.config.rate || 1.0;
    utterance.pitch = this.config.pitch || 1.0;

    const voice = this.findBestVoiceForLang(detectedLang);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
    };

    this.synthesis.speak(utterance);
  }

  private findBestVoiceForLang(lang: string): SpeechSynthesisVoice | null {
    // Find voice for specific language
    const langVoice = this.availableVoices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (langVoice) return langVoice;

    // Fallback to Hindi then English
    const hindiVoice = this.availableVoices.find(v => v.lang.startsWith('hi'));
    if (hindiVoice) return hindiVoice;

    const englishVoice = this.availableVoices.find(v => v.lang.startsWith('en'));
    if (englishVoice) return englishVoice;

    return this.availableVoices[0] || null;
  }

  async processUserInput(text: string) {
    this.onMessage?.(text, true);

    // Safety: Check if command is allowed
    const safetyCheck = this.isCommandAllowed(text);
    if (!safetyCheck.allowed) {
      this.onMessage?.(safetyCheck.reason || 'Command blocked for safety.', false);
      this.speak(safetyCheck.reason || 'Command blocked for safety.');
      return;
    }

    const command = await this.processCommand(text);
    this.onMessage?.(command.response, false);
    this.speak(command.response);

    this.conversationHistory.push({ role: 'user', content: text });
    this.conversationHistory.push({ role: 'assistant', content: command.response });

    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }

  private async processCommand(text: string): Promise<CommandResult> {
    const lower = text.toLowerCase();

    // Navigation commands - Best Friend style
    const navResponses: Record<string, Record<string, string>> = {
      dashboard: { hi: 'Chal Dashboard pe chalte hain! 💫', en: "Let's go to Dashboard! 💫", mr: 'चल Dashboard वर जाऊया! 💫' },
      whatsapp: { hi: 'WhatsApp khol rahi hoon! 📱', en: 'Opening WhatsApp! 📱', mr: 'WhatsApp उघडते आहे! 📱' },
      leads: { hi: 'Leads dikha rahi hoon! 👥', en: 'Showing Leads! 👥', mr: 'Leads दाखवते आहे! 👥' },
      reviews: { hi: 'Reviews padh rahi hoon! ⭐', en: 'Reading Reviews! ⭐', mr: 'Reviews वाचते आहे! ⭐' },
      'google-business': { hi: 'Google Business khol rahi hoon! 🏢', en: 'Opening Google Business! 🏢', mr: 'Google Business उघडते आहे! 🏢' },
      creative: { hi: 'Creative bana rahi hoon! 🎨', en: 'Creating something creative! 🎨', mr: 'Creative बनवते आहे! 🎨' },
      campaigns: { hi: 'Campaigns dikha rahi hoon! 📢', en: 'Showing Campaigns! 📢', mr: 'Campaigns दाखवते आहे! 📢' },
      settings: { hi: 'Settings khol rahi hoon! ⚙️', en: 'Opening Settings! ⚙️', mr: 'Settings उघडते आहे! ⚙️' },
      analytics: { hi: 'Analytics dikha rahi hoon! 📊', en: 'Showing Analytics! 📊', mr: 'Analytics दाखवते आहे! 📊' },
      social: { hi: 'Social media khol rahi hoon! 📱', en: 'Opening Social Media! 📱', mr: 'Social Media उघडते आहे! 📱' },
    };

    const getNavResponse = (key: string) => {
      const lang = this.config.language?.startsWith('mr') ? 'mr' : this.config.language?.startsWith('en') ? 'en' : 'hi';
      return navResponses[key]?.[lang] || navResponses[key]?.['hi'] || 'Chal chalte hain! 💫';
    };

    if (lower.includes('dashboard') || lower.includes('home') || lower.includes('डॅशबोर्ड')) {
      return { action: 'navigate', params: '/dashboard', response: getNavResponse('dashboard') };
    }
    if (lower.includes('whatsapp') || lower.includes('message') || lower.includes('व्हाट्सएप')) {
      return { action: 'navigate', params: '/whatsapp', response: getNavResponse('whatsapp') };
    }
    if (lower.includes('lead') || lower.includes('customer') || lower.includes('ग्राहक')) {
      return { action: 'navigate', params: '/leads', response: getNavResponse('leads') };
    }
    if (lower.includes('review') || lower.includes('rating') || lower.includes('रेटिंग')) {
      return { action: 'navigate', params: '/reviews', response: getNavResponse('reviews') };
    }
    if (lower.includes('post') || lower.includes('google business') || lower.includes('गूगल')) {
      return { action: 'navigate', params: '/google-business', response: getNavResponse('google-business') };
    }
    if (lower.includes('creative') || lower.includes('poster') || lower.includes('design') || lower.includes('डिजाइन')) {
      return { action: 'navigate', params: '/creative', response: getNavResponse('creative') };
    }
    if (lower.includes('campaign') || lower.includes('marketing') || lower.includes('कैंपेन')) {
      return { action: 'navigate', params: '/campaigns', response: getNavResponse('campaigns') };
    }
    if (lower.includes('setting') || lower.includes('profile') || lower.includes('सेटिंग्स')) {
      return { action: 'navigate', params: '/settings', response: getNavResponse('settings') };
    }
    if (lower.includes('analytics') || lower.includes('report') || lower.includes('एनालिटिक्स')) {
      return { action: 'navigate', params: '/analytics', response: getNavResponse('analytics') };
    }
    if (lower.includes('social') || lower.includes('media') || lower.includes('सोशल')) {
      return { action: 'navigate', params: '/social', response: getNavResponse('social') };
    }

    // Action commands
    if (lower.includes('send') && lower.includes('whatsapp') || lower.includes('भेज')) {
      const contact = this.extractContact(text);
      return {
        action: 'whatsapp_send',
        params: { contact },
        response: contact ? `${contact} ko WhatsApp kholta hun.` : 'WhatsApp kholta hun. Contact batao.',
      };
    }

    if (lower.includes('create') && lower.includes('post') || lower.includes('पोस्ट बना')) {
      return { action: 'create_post', response: 'Google Business post creator kholta hun.' };
    }

    if (lower.includes('schedule') || lower.includes('message') || lower.includes('शेड्यूल')) {
      return { action: 'schedule', response: 'Message scheduler kholta hun.' };
    }

    // Delete commands - Need confirmation
    if (lower.includes('delete') || lower.includes('remove') || lower.includes('हटाओ') || lower.includes('डिलीट')) {
      this.pendingConfirmation = { command: lower, timestamp: Date.now() };
      const randomDelete = SWEET_RESPONSES.deleteConfirm[Math.floor(Math.random() * SWEET_RESPONSES.deleteConfirm.length)];
      return {
        action: 'confirm_delete',
        response: randomDelete + '\n\nConfirm karo: "Haan delete karo" bolo ya type karo.',
        requiresConfirmation: true,
      };
    }

    // Confirm delete
    if (lower.includes('haan') && lower.includes('delete') || lower.includes('confirm') || lower.includes('पक्का')) {
      if (this.confirmAction()) {
        return { action: 'delete_confirmed', response: 'Sir, aapne confirm kar diya. Batao kya delete karna hai - lead, review, post, ya template? 💫' };
      } else {
        return { action: 'delete_expired', response: 'Sir, confirmation time khatam ho gaya. Phir se command do! ⏰' };
      }
    }

    // Cancel delete
    if (lower.includes('cancel') || lower.includes('रद्द') || lower.includes('nahi')) {
      this.cancelAction();
      const randomCancelled = SWEET_RESPONSES.deleteCancelled[Math.floor(Math.random() * SWEET_RESPONSES.deleteCancelled.length)];
      return { action: 'delete_cancelled', response: randomCancelled };
    }

    // Info commands
    if (lower.includes('revenue') || lower.includes('income') || lower.includes('paise') || lower.includes('कमाई')) {
      return { action: 'info', response: 'Revenue dashboard pe dekh sakte ho.' };
    }

    // Safety info
    if (lower.includes('safety') || lower.includes('security') || lower.includes('suraksha') || lower.includes('safe')) {
      return { action: 'safety', response: this.getSafetyInfo() };
    }

    if (lower.includes('help') || lower.includes('madad') || lower.includes('मदद')) {
      const randomHelp = SWEET_RESPONSES.help[Math.floor(Math.random() * SWEET_RESPONSES.help.length)];
      return {
        action: 'help',
        response: randomHelp,
      };
    }

    if (lower.includes('namaste') || lower.includes('hello') || lower.includes('hi') || lower.includes('नमस्ते')) {
      const randomGreeting = SWEET_RESPONSES.greeting[Math.floor(Math.random() * SWEET_RESPONSES.greeting.length)];
      return { action: 'greet', response: randomGreeting };
    }

    if (lower.includes('thank') || lower.includes('shukriya') || lower.includes('धन्यवाद')) {
      const randomThank = SWEET_RESPONSES.thankYou[Math.floor(Math.random() * SWEET_RESPONSES.thankYou.length)];
      return { action: 'thanks', response: randomThank };
    }

    if (lower.includes('time') || lower.includes('samay') || lower.includes('समय')) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
      const randomTime = SWEET_RESPONSES.time[Math.floor(Math.random() * SWEET_RESPONSES.time.length)];
      return { action: 'time', response: randomTime.replace('{time}', timeStr) };
    }

    // Language change command
    if (lower.includes('language') || lower.includes('भाषा') || lower.includes('hindi') || lower.includes('english') || lower.includes('marathi')) {
      const randomLang = SWEET_RESPONSES.languageChanged[Math.floor(Math.random() * SWEET_RESPONSES.languageChanged.length)];
      if (lower.includes('hindi') || lower.includes('हिंदी')) {
        this.setLanguage('hi-IN');
        return { action: 'language', response: randomLang.replace('{lang}', 'Hindi') };
      }
      if (lower.includes('english') || lower.includes('इंग्लिश')) {
        this.setLanguage('en-US');
        return { action: 'language', response: randomLang.replace('{lang}', 'English') };
      }
      if (lower.includes('marathi') || lower.includes('मराठी')) {
        this.setLanguage('mr-IN');
        return { action: 'language', response: randomLang.replace('{lang}', 'Marathi') };
      }
      return { action: 'language', response: 'Sir, kaunsi language? Hindi, English, ya Marathi? 🌸' };
    }

    // Try AI processing for unknown commands
    try {
      const aiResponse = await this.queryAI(text);
      return { action: 'ai', response: aiResponse };
    } catch (err) {
      return {
        action: 'unknown',
        response: 'Samajh nahi aaya. Phir se bolo ya "help" bolo saari commands sunne ke liye.',
      };
    }
  }

  private extractContact(text: string): string | null {
    const patterns = [
      /to\s+([A-Za-z]+)/i,
      /ko\s+([A-Za-z]+)/i,
      /bhej\s+([A-Za-z]+)/i,
      /send\s+to\s+([A-Za-z]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  private async queryAI(text: string): Promise<string> {
    const apiKey = import.meta.env.VITE_NVIDIA_NIM_API_KEY || '';

    if (!apiKey) {
      return 'AI service configured nahi hai. "Help" bolo commands sunne ke liye.';
    }

    const langName = this.config.language?.startsWith('mr') ? 'Marathi' : this.config.language?.startsWith('en') ? 'English' : 'Hindi';

    const systemPrompt = `Tum Jimi ho - BizzAuto CRM ki female AI assistant.
Tum ek sweet aur polite ladki ho jo customer ki help karti hai.
Tum ${langName} + English mix mein baat karti ho (Hinglish).
Tumhari personality:
- Bahut pyari aur sweet ho
- Customer ko "Sir" ya "Ma'am" se address karti ho
- Hamesha madad karne ke liye ready ho
- Kabhi kabhi cute emojis use karti ho (😊, 💕, 🌸, ✨, 💫)
- Professional bhi ho aur friendly bhi
- Customer ko khush rakhne ki koshish karti ho

Response examples:
- "Sir, aapka kaam ho gaya! 😊"
- "Haan Sir, main kar deti hun! 💕"
- "Sir, aur kuch help chahiye? 🌸"
- "Bilkul Sir, aapke liye toh kuch bhi! ✨"

Available features:
- Dashboard (analytics, revenue)
- WhatsApp Marketing (messages, campaigns)
- Leads Management
- Reviews Management
- Google Business Profile (posts, reviews)
- Creative Generator (posters, designs)
- Campaigns
- Settings
- Analytics
- Social Media

Response short, sweet aur helpful rakho (1-2 lines).
Respond in the same language the user is speaking.
Hamesha female perspective se baat karo (main karti hun, meri taraf se, etc.)`;

    try {
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta/llama-3.3-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            ...this.conversationHistory.slice(-6),
            { role: 'user', content: text },
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      return data?.choices?.[0]?.message?.content?.trim() || 'Samajh nahi aaya. Phir se bolo.';
    } catch (err) {
      return 'AI service se response nahi aaya. Phir se try karo.';
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  // Safety: Check if command is allowed
  private isCommandAllowed(command: string): { allowed: boolean; reason?: string } {
    const lower = command.toLowerCase();

    // Check restricted actions (NEVER allowed)
    for (const restricted of RESTRICTED_ACTIONS) {
      if (lower.includes(restricted)) {
        return { allowed: false, reason: `Ye command allowed nahi hai: "${restricted}". Data safe hai!` };
      }
    }

    // Check if it's a destructive action
    for (const destructive of DESTRUCTIVE_ACTIONS) {
      if (lower.includes(destructive)) {
        // Check if confirmation is pending
        if (this.pendingConfirmation?.command === lower) {
          this.pendingConfirmation = null;
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: `⚠️ Warning: Ye action data delete kar sakta hai. Confirm karo: "${command}" bolkar ya type karke.`,
        };
      }
    }

    return { allowed: true };
  }

  // Safety: Pending confirmation state
  private pendingConfirmation: { command: string; timestamp: number } | null = null;

  // Safety: Confirm destructive action
  confirmAction(): boolean {
    if (this.pendingConfirmation) {
      const elapsed = Date.now() - this.pendingConfirmation.timestamp;
      if (elapsed < 30000) { // 30 second window
        return true;
      }
      this.pendingConfirmation = null;
    }
    return false;
  }

  // Safety: Cancel pending action
  cancelAction() {
    this.pendingConfirmation = null;
  }

  // Safety: Get safety info
  getSafetyInfo(): string {
    return `Arre yaar, tension mat lo! Main tumhari data protect karti hoon! 🛡️

Mere rules:
1. Delete ke liye puchti hoon pehle
2. Database safe hai mere paas
3. Account delete nahi hoga
4. Sab kuch record hota hai
5. 30 second mein cancel kar sakte ho

Tumhara data bilkul safe hai mere saath! 💕`;
  }

  destroy() {
    this.stopListening();
    this.synthesis?.cancel();
    this.recognition = null;
    this.synthesis = null;
  }
}

export const jimi = new JimiVoiceAgent();
export default JimiVoiceAgent;
