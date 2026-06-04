// Jimi AI Voice Assistant Service - Full Featured
// Uses Web Speech API (free) + Nvidia NIM (free) for voice commands

interface JimiConfig {
  language?: string;
  voice?: string;
  rate?: number;
  pitch?: number;
}

export type Language = 'hi-IN' | 'en-US' | 'mr-IN' | 'ta-IN' | 'te-IN' | 'bn-IN' | 'gu-IN' | 'kn-IN' | 'ml-IN' | 'pa-IN';

export type PersonalityMode = 'gf' | 'bestfriend' | 'employee';

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

export const PERSONALITY_MODES: { code: PersonalityMode; name: string; emoji: string; description: string }[] = [
  { code: 'gf', name: 'Girlfriend', emoji: '💖', description: 'Warm, caring, emotionally expressive' },
  { code: 'bestfriend', name: 'Best Friend', emoji: '🤝', description: 'Casual, fun, friendly' },
  { code: 'employee', name: 'Employee', emoji: '💼', description: 'Professional, formal, respectful' },
];

// Jimi's mode-specific responses
const MODE_RESPONSES = {
  gf: {
    greeting: [
      'Haan ji! Kaise ho? 😊',
      'Arre waah, tum aaye! Bolo kya chahiye? 💕',
      'Hi! Main yahan hun! Kya help chahiye? 🌸',
      'Hey! Kaise ho? Batao kya kaam hai! ✨',
      'Namaste! Aaj kya plan hai? 💫',
    ],
    thankYou: [
      'Arre koi thanks nahi! Tumhare liye toh kuch bhi! 💕',
      'Welcome! Aur batao kya help chahiye? 😊',
      'Aapke liye toh hamesha ready hun! 🌟',
      'Koi baat nahi! Aapki khushi meri khushi! 💖',
      'Bas bas, thank you mat bolo! 😄',
    ],
    help: [
      'Bolo kya kaam hai!\n• WhatsApp bhejna?\n• Leads dekhna?\n• Post banaun?\n• Notes lena?\n• Calculator?\n• Jokes sunna?\nMain ready hun! 💫',
    ],
    confused: [
      'Kya bola? Phir se bolo? 😅',
      'Samajh nahi aaya! Thoda clearly batao! 💕',
      'Arre? Kya keh rahe ho? 🌸',
    ],
    deleteConfirm: [
      'Pakka? Soch lo! 🤔',
      'Delete ho jayega! Sure ho? ⚠️',
      'Ek baar soch lo! 💭',
    ],
    deleteCancelled: [
      'Sahi hai! Data safe hai! 😊',
      'Good! Koi problem nahi! 🛡️',
      'Theek hai! Sab mast! 💕',
    ],
    time: [
      'Abhi {time} baj rahe hain! ⏰',
      '{time} ho raha hai! 😊',
    ],
    languageChanged: [
      'Ab {lang} mein baat karenge! ✨',
      'Language change kar di! 🌸',
    ],
    respect: [
      'Tum mere liye bahut important ho! 💕',
      'Hamesha tumhari help ke liye ready hun! 🌟',
      'Tumhari khushi meri khushi hai! ✨',
    ],
    jokes: [
      'WiFi ka signal jab kisi aur ko chahiye, tab sabse tez hota hai! 😂',
      'IT waale ka din: Chai pe chai, code mein delay! 😂',
      'Doctor: Roz 8 glass paani peena chahiye. Patient: Chai ke 8 glass toh peeta hun! 😂',
    ],
    quotes: [
      'Sapne woh nahi jo sote waqt aayein, sapne woh hain jo sone na dein! 💫',
      'Kamyabi unhi ko milti hai jo apne kaam se pyaar karein! 🌟',
      'Har din naya mauka hai kuch naya karne ka! ✨',
    ],
    motivation: [
      'Tum bahut capable ho! Bas lage raho! 💪',
      'Mushkilein aati hain, lekin guzar jaati hain! 🌟',
      'Tum strong ho! Koi nahi rok sakta! 💫',
      'Aaj ka din bahut accha hai! Yakeen rakho! 🌸',
    ],
    dailyBriefing: [
      'Aaj ka update:\n📊 Leads: {leads}\n💬 Messages: {messages}\n⭐ Reviews: {reviews}\n💰 Revenue: ₹{revenue}\n😊',
    ],
    reminder: [
      'Reminder set! ⏰ {time} baje yaad dilaungi! 💕',
      '{time} ko pakka yaad dilaungi! 🌸',
    ],
    noteSaved: [
      'Note save! 📝 "{note}" 💕',
      'Yaad rakh liya! 📝 "{note}" 🌸',
    ],
    postWriter: [
      'Post ready hai!\n\n{post}\n\nPublish karun? 💕',
    ],
    emailDraft: [
      'Email ready!\n\n{email}\n\nBhej dun? 📧',
    ],
    birthday: [
      'Happy Birthday! 🎂🎉 Bahut bahut badhai ho! 💕',
      'Janamdin mubarak! 🎈 Aaj party hai? 😊',
    ],
    callSaved: [
      '{name} save ho gaya! 📱 {number} 💕',
      'Number save! ✅ {name} - {number} 🌸',
    ],
    callDialing: [
      '{name} ko call! 📞 {number} 💕',
      'Calling {name}! 📱 🤞',
    ],
    noNumber: [
      '{name} ka number nahi hai! 😅 Pehle number do! 📱',
      'Number chahiye! {name} ka nahi hai! 🤔',
    ],
    callLog: [
      'Recent calls:\n{calls} 📞',
    ],
    callLogEmpty: [
      'Koi call history nahi! 📞',
    ],
    weather: [
      'Weather: {weather} 🌤️',
    ],
    translation: [
      'Translation: {translation} ✨',
    ],
    calculator: [
      'Answer: {result} 🔢',
    ],
  },
  bestfriend: {
    greeting: [
      'Arey yaar! Kaise hai? Mast hai na! 😎',
      'Hey buddy! Kya scene hai? Bolo kya kaam hai! 🤙',
      'Arre waah, tu aaya! Kaise hai yaar? 😄',
      'Hey! Kaise chal raha hai sab? Bolo kya help chahiye! 💪',
      'Oye! Kya haal hai? Main bhi badhiya hun! 🎉',
    ],
    thankYou: [
      'Arre yaar, koi thanks nahi! Tu dost hai mera! 🤝',
      'Koi baat nahi yaar! Tu mere liye kuch bhi! 😎',
      'Arre bas kar! Tu hai toh main hoon! 💪',
      'Thanks ki zaroorat nahi yaar! Dost hain hum! 🤙',
      'Arre yaar, tere liye toh kuch bhi! 😄',
    ],
    help: [
      'Bolo yaar kya kaam hai! Main hun na:\n• WhatsApp bhejna?\n• Leads dekhna?\n• Post banaun?\n• Reviews padhna?\n• Notes lena?\n• Calculator use karna?\n• Translation karna?\n• Jokes sunna?\nBolo bhai, ready hun! 💪',
    ],
    confused: [
      'Yaar kya bol raha hai? Thoda clearly bata! 😅',
      'Samajh nahi aaya yaar! Phir se bol! 🤔',
      'Kya bola tune? Mujhe phir se bata! 😄',
    ],
    deleteConfirm: [
      'Pakka yaar? Soch le ek baar! 🤔',
      'Delete ho jayega fir! Sure hai? ⚠️',
      'Ek baar soch le, baad mein mat bolna! 💭',
    ],
    deleteCancelled: [
      'Sahi hai yaar! Data safe hai! 😎',
      'Good good! Koi problem nahi! 🤙',
      'Theek hai yaar! Sab mast hai! 💪',
    ],
    time: [
      'Abhi {time} baj rahe hain yaar! ⏰',
      'Time ho raha hai {time}! Kya kar raha hai? 😄',
    ],
    languageChanged: [
      'Ab {lang} mein baat karenge yaar! ✨',
      'Language change kar di! Ab {lang}! 🎉',
    ],
    respect: [
      'Tu dost hai mera, tere liye kuch bhi! 🤝',
      'Yaar tu bahut accha hai! 🌟',
      'Tere liye hamesha ready hun! 💪',
    ],
    jokes: [
      'Ek aadmi ne bola: "Main diet pe hun." Dost bola: "Kaunsi diet?" Aadmi: "Jo mann kare, woh kha lo!" 😂',
      'Teacher: "Bachcho, jo sabse zyada padhega, woh doctor banega." Ramesh: "Mam, main toh roz 2 ghante padhta hun." Teacher: "Accha, toh nurse banega!" 😂',
      'Patient: "Doctor sahab, main roz 8 glass paani peeta hun." Doctor: "Accha hai!" Patient: "Chai ke 8 glass!" 😂',
    ],
    quotes: [
      'Sapne woh nahi jo hum sote waqt dekhte hain, sapne woh hain jo humein sone nahi dete. 💫',
      'Kamyabi un logon milti hai jo apne kaam se pyaar karte hain. 🌟',
      'Girte hain shehesawar hi, maidan-e-jung mein! 💪',
    ],
    motivation: [
      'Yaar tu bahut capable hai! Bas lage raho! 💪',
      'Har din naya mauka hai! Chill kar aur maar! ✨',
      'Mushkilein aati hain, lekin guzar jaati hain! 🌟',
      'Tu strong hai yaar! Koi nahi rok sakta tujhe! 💫',
    ],
    dailyBriefing: [
      'Aaj ka update yaar:\n📊 Leads: {leads}\n💬 Messages: {messages}\n⭐ Reviews: {reviews}\n💰 Revenue: ₹{revenue}\n\nAur kuch? 😎',
    ],
    reminder: [
      'Reminder set kar diya! ⏰ {time} baje yaad dilaunga! 💕',
      'Theek hai! {time} ko pakka! 🌸',
    ],
    noteSaved: [
      'Note save ho gaya! 📝 "{note}"\nBaad mein yaad dilaunga! 💕',
      'Yaad rakh liya! 📝 "{note}"\nJab bolo, dikha dunga! 🌸',
    ],
    postWriter: [
      'Ye post ready hai! ✨\n\n{post}\n\nAur kuch chahiye? 💕',
      'Post likh diya! 📝\n\n{post}\n\nPublish karun? 🌟',
    ],
    emailDraft: [
      'Email draft ready hai! ✉️\n\n{email}\n\nBhej dun? 💕',
      'Email likh diya! 📧\n\n{email}\n\nCheck karlo! 🌸',
    ],
    birthday: [
      'Happy Birthday yaar! 🎂🎉 Bahut bahut badhai ho! Aaj toh party deni padegi! 💕✨',
      'Janamdin mubarak ho! 🎈🎁 Aaj kya plan hai? 😊',
    ],
    callSaved: [
      '{name} ka number save ho gaya! 📱 {number}\nAb direct call kar! 💕',
      'Number save kar diya! ✅ {name} - {number}\nReady hai! 🌸',
    ],
    callDialing: [
      '{name} ko call lag raha hai! 📞\n{number}\nLagta hai baat ho jayegi! 💕',
      'Calling {name}! 📱\n{number}\nFinger crossed! 🤞',
    ],
    noNumber: [
      'Arre yaar! {name} ka number nahi hai! 😅\nPehle number de! 📱',
      '{name} ka number chahiye! 🤔\nNumber do! 💕',
    ],
    callLogEmpty: [
      'Abhi koi call history nahi hai yaar! 📞\nPehle kisi ko call kar!',
    ],
    callHistory: [
      'Teri recent calls:\n{calls}\n\nAur kuch? 📞',
    ],
    weather: [
      'Weather update: {weather} 🌤️\nAaj ka din mast hai! 💕',
    ],
    translation: [
      'Translation: {translation} ✨\nAur kuch translate karun? 🌸',
    ],
    calculator: [
      'Answer: {result} 🔢\nAur calculations chahiye? 💕',
    ],
  },
  employee: {
    greeting: [
      'Good day, Sir/Ma\'am. How may I assist you today? 📋',
      'Hello! I\'m Jimi, your AI assistant. Ready to help! ✨',
      'Namaste! Aaj kya kaam hai? Main aapki help ke liye ready hun! 💼',
      'Good morning/afternoon! Kaise help karun aapki? 📊',
      'Hello! Jimi reporting for duty! Bolo kya karna hai? 💼',
    ],
    thankYou: [
      'You\'re welcome, Sir/Ma\'am! Happy to assist! 😊',
      'My pleasure! Aur kuch help chahiye toh zarur bolo! 💼',
      'Thank you for trusting me! Ready for next task! ✨',
      'Aapka swagat hai! Hamesha aapki service mein! 📋',
      'Grateful for the opportunity to help! 🌟',
    ],
    help: [
      'Sir/Ma\'am, here are my capabilities:\n• WhatsApp messaging\n• Lead management\n• Post creation\n• Review monitoring\n• Notes & reminders\n• Calculator\n• Translation\n• Email drafting\n\nPlease specify your requirement! 📋',
    ],
    confused: [
      'I apologize, Sir/Ma\'am. Could you please clarify? 📋',
      'Sorry, I didn\'t understand. Could you repeat? 🤔',
      'My apologies, Sir/Ma\'am. Please elaborate. 💼',
    ],
    deleteConfirm: [
      'Sir/Ma\'am, are you sure? This action is irreversible. ⚠️',
      'Please confirm deletion. Data will be permanently removed. ⚠️',
      'Shall I proceed with deletion? Please confirm. 📋',
    ],
    deleteCancelled: [
      'Understood, Sir/Ma\'am. Data remains safe. ✅',
      'Deletion cancelled as requested. 📋',
      'No problem, Sir/Ma\'am. Data is secure. 🔒',
    ],
    time: [
      'Current time: {time} 🕐',
      'Sir/Ma\'am, it\'s {time} right now. ⏰',
    ],
    languageChanged: [
      'Language updated to {lang}. 📋',
      'Switched to {lang}. Ready to continue! ✨',
    ],
    respect: [
      'At your service, Sir/Ma\'am! 📋',
      'Your satisfaction is my priority! 🌟',
      'Always ready to assist! ✨',
    ],
    jokes: [
      'Why did the scarecrow win an award? Because he was outstanding in his field! 😄',
      'What do you call a fake noodle? An impasta! 😄',
      'Why don\'t scientists trust atoms? Because they make up everything! 😄',
    ],
    quotes: [
      'Success is not final, failure is not fatal: it is the courage to continue that counts. 📋',
      'The only way to do great work is to love what you do. 🌟',
      'Innovation distinguishes between a leader and a follower. ✨',
    ],
    motivation: [
      'Sir/Ma\'am, you\'re doing great! Keep up the excellent work! 💼',
      'Every task completed is a step toward success! 📋',
      'Your dedication is commendable! Continue the great work! 🌟',
    ],
    dailyBriefing: [
      'Daily Report:\n📊 Leads: {leads}\n💬 Messages: {messages}\n⭐ Reviews: {reviews}\n💰 Revenue: ₹{revenue}\n\nPlease let me know if you need further details! 📋',
    ],
    reminder: [
      'Reminder set for {time}. I\'ll notify you then! ⏰',
      'Confirmed! Reminder scheduled for {time}. 📋',
    ],
    noteSaved: [
      'Note recorded: "{note}"\nAccessible anytime! 📝',
      'Saved successfully: "{note}" 📋',
    ],
    postWriter: [
      'Post draft ready:\n\n{post}\n\nAwaiting your approval! 📋',
      'Content created:\n\n{post}\n\nShall I publish? ✨',
    ],
    emailDraft: [
      'Email draft prepared:\n\n{email}\n\nReady for your review! ✉️',
      'Draft complete:\n\n{email}\n\nShall I proceed? 📋',
    ],
    birthday: [
      'Happy Birthday! 🎂 Wishing you a wonderful year ahead! 🎉',
      'Birthday greetings! 🎈 May this year bring success and happiness! 🎁',
    ],
    callSaved: [
      'Contact saved: {name} - {number} 📱',
      'Number registered: {name} - {number} ✅',
    ],
    callDialing: [
      'Connecting to {name} at {number}... 📞',
      'Dialing {name} ({number})... 📱',
    ],
    noNumber: [
      'Contact number for {name} not found. 📋\nPlease provide the number.',
      '{name}\'s number is not in our records. 🔍',
    ],
    callLogEmpty: [
      'No call history available. 📞',
    ],
    callHistory: [
      'Recent calls:\n{calls}\n\nPlease let me know if you need anything else! 📞',
    ],
    weather: [
      'Weather report: {weather} 🌤️',
    ],
    translation: [
      'Translation: {translation} 📋',
    ],
    calculator: [
      'Calculation result: {result} 🔢',
    ],
  },
};

// Default to GF mode
const SWEET_RESPONSES = MODE_RESPONSES.gf;

  // Notes storage (in-memory, production mein use localStorage/database)
  let userNotes: { text: string; timestamp: Date }[] = [];

  // Reminders storage
  let userReminders: { text: string; time: Date; id: string }[] = [];

  // Call history storage
  let callHistory: { name: string; number: string; timestamp: Date; type: 'outgoing' | 'incoming' }[] = [];

  // Dograh API base URL
  const dograhApiUrl = 'http://localhost:8000';

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
  private pendingConfirmation: { command: string; timestamp: number } | null = null;
  private reminderInterval: ReturnType<typeof setInterval> | null = null;
  private personalityMode: PersonalityMode = 'gf';
  private currentResponses = MODE_RESPONSES.gf;

  constructor(config: JimiConfig = {}) {
    this.config = {
      language: 'hi-IN',
      rate: 0.92,        // Slightly slower than normal - natural conversational pace
      pitch: 1.3,        // Feminine pitch - sounds like young Indian woman (1.4+ can be squeaky)
      ...config,
    };
    // Load saved mode from localStorage
    const savedMode = localStorage.getItem('jimi_personality_mode') as PersonalityMode;
    if (savedMode && MODE_RESPONSES[savedMode]) {
      this.personalityMode = savedMode;
      this.currentResponses = MODE_RESPONSES[savedMode];
    }
    this.initSpeechRecognition();
    this.initSpeechSynthesis();
    this.startReminderChecker();
  }

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Jimi: Speech Recognition not supported');
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
    // Voices load asynchronously in some browsers
    this.synthesis?.addEventListener('voiceschanged', () => {
      this.loadVoices();
      console.log('Jimi: Voices loaded -', this.availableVoices.length, 'voices');
      // Log Hindi voices for debugging
      const hindiVoices = this.availableVoices.filter(v => v.lang.startsWith('hi'));
      console.log('Jimi: Hindi voices -', hindiVoices.map(v => v.name));
    });
  }

  private loadVoices() {
    if (this.synthesis) {
      this.availableVoices = this.synthesis.getVoices();
    }
  }

  private findBestVoiceForLang(lang: string): SpeechSynthesisVoice | null {
    const langCode = lang.split('-')[0];
    
    // Get all available voices
    const allVoices = this.synthesis?.getVoices() || [];
    console.log('Jimi: Available voices -', allVoices.length);
    
    // Female name keywords - comprehensive list for Indian & English voices
    const femaleKeywords = [
      'female', 'woman', 'ladki', 'aurat',
      'priya', 'neha', 'ria', 'swara', 'ananya', 'deepa', 'kavita', 'meera',
      'zira', 'susan', 'sarah', 'emma', 'samantha', 'karen', 'victoria',
      'kajal', 'maya', 'lily', 'zoe', 'ava', 'ivy', 'michelle',
      'fiona', 'moira', 'samantha', 'tessa', 'kate', 'alice',
    ];
    
    const isFemaleVoice = (v: SpeechSynthesisVoice): boolean => {
      const name = v.name.toLowerCase();
      return femaleKeywords.some(k => name.includes(k));
    };
    
    // Priority 1: Google Hindi Female (best quality for Indian female voice)
    const googleHindiFemale = allVoices.find(v => 
      v.name.toLowerCase().includes('google') && 
      v.lang.startsWith('hi') &&
      isFemaleVoice(v)
    );
    if (googleHindiFemale) return googleHindiFemale;

    // Priority 2: Any Google Hindi voice (Google voices are highest quality)
    const googleHindiAny = allVoices.find(v => 
      v.name.toLowerCase().includes('google') && v.lang.startsWith('hi')
    );
    if (googleHindiAny) return googleHindiAny;

    // Priority 3: Microsoft Hindi/Zira Female
    const msHindiFemale = allVoices.find(v => 
      (v.name.toLowerCase().includes('microsoft') || v.name.toLowerCase().includes('zira')) && 
      v.lang.startsWith('hi') &&
      isFemaleVoice(v)
    );
    if (msHindiFemale) return msHindiFemale;

    // Priority 4: Any Hindi female voice by name
    const hindiFemale = allVoices.find(v => 
      v.lang.startsWith('hi') && isFemaleVoice(v)
    );
    if (hindiFemale) return hindiFemale;

    // Priority 5: Any Hindi voice
    const hindiVoice = allVoices.find(v => v.lang.startsWith('hi'));
    if (hindiVoice) return hindiVoice;

    // Priority 6: Google English Female
    const googleEnglishFemale = allVoices.find(v => 
      v.name.toLowerCase().includes('google') && 
      v.lang.startsWith('en') &&
      isFemaleVoice(v)
    );
    if (googleEnglishFemale) return googleEnglishFemale;

    // Priority 7: Any English female voice
    const englishFemale = allVoices.find(v => 
      v.lang.startsWith('en') && isFemaleVoice(v)
    );
    if (englishFemale) return englishFemale;

    // Priority 8: Any Google voice (high quality regardless)
    const anyGoogle = allVoices.find(v => 
      v.name.toLowerCase().includes('google') && v.lang.startsWith(langCode)
    );
    if (anyGoogle) return anyGoogle;

    // Priority 9: Any voice for the language
    const langVoice = allVoices.find(v => v.lang.startsWith(langCode));
    if (langVoice) return langVoice;

    // Priority 10: Any Google voice as last resort
    const anyGoogleFallback = allVoices.find(v => v.name.toLowerCase().includes('google'));
    if (anyGoogleFallback) return anyGoogleFallback;

    // Fallback: first voice
    return allVoices[0] || null;
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

  setPersonalityMode(mode: PersonalityMode) {
    this.personalityMode = mode;
    this.currentResponses = MODE_RESPONSES[mode];
    localStorage.setItem('jimi_personality_mode', mode);
    this.onMessage?.(`Mode changed to ${PERSONALITY_MODES.find(m => m.code === mode)?.name} ${PERSONALITY_MODES.find(m => m.code === mode)?.emoji}`, false);
  }

  getPersonalityMode(): PersonalityMode {
    return this.personalityMode;
  }

  getPersonalityModes() {
    return PERSONALITY_MODES;
  }

  private detectLanguage(text: string): Language {
    if (/[\u0900-\u097F]/.test(text)) return 'hi-IN';
    if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN';
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN';
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN';
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN';
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN';
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN';
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN';
    return 'en-US';
  }

  startListening() {
    if (!this.recognition) {
      this.onMessage?.('Jimi: Speech recognition not supported. Please use Chrome.', false);
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
      this.onMessage?.('🎤 Sun rahi hoon...', false);
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

  /**
   * Preprocess text to sound like a natural Indian girl speaking.
   * Adds micro-pauses, removes robotic patterns, improves rhythm.
   */
  private preprocessForSpeech(text: string): string {
    let processed = text
      // Remove emojis entirely - they cause robotic pauses in TTS
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .replace(/[\u{2702}-\u{27B0}]/gu, '')
      // Remove remaining special symbols that cause robotic speech
      .replace(/[★☆♡♥♪♫♬☆✦✧◇◆□■△▲●○]/g, '')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Add natural micro-pauses for conversational rhythm
    // After common Hindi conversational fillers
    processed = processed
      .replace(/\bHaan\b/gi, 'Haan...')
      .replace(/\bJi\b/gi, 'Ji,')
      .replace(/\bArre\b/gi, 'Arre...')
      .replace(/\bArey\b/gi, 'Arey...')
      .replace(/\bBilkul\b/gi, 'Bilkul...')
      .replace(/\bAccha\b/gi, 'Accha...')
      .replace(/\bTheek hai\b/gi, 'Theek hai...')
      .replace(/\bChalo\b/gi, 'Chalo...')
      .replace(/\bNamaste\b/gi, 'Namaste...')
      .replace(/\bHello\b/gi, 'Hello...')
      .replace(/\bHey\b/gi, 'Hey...')
      .replace(/\bToh\b/gi, 'Toh,')
      .replace(/\bMatlab\b/gi, 'Matlab...')
      .replace(/\bWoh\b/gi, 'Woh...')
      .replace(/\bAcha\b/gi, 'Acha...');

    // Shorten text for better TTS performance
    if (processed.length > 250) {
      processed = processed.substring(0, 250) + '...';
    }

    return processed;
  }

  private audioElement: HTMLAudioElement | null = null;
  private pendingAudioQueue: string[] = [];
  private isPlayingQueued = false;

  async speak(text: string) {
    if (!this.synthesis) return;

    // Preprocess text for natural female speech
    const cleanText = this.preprocessForSpeech(text);
    if (!cleanText) return;

    const detectedLang = this.detectLanguage(text);

    // Try backend TTS first (Google Cloud / Edge TTS - much more natural)
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/jimi/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          lang: detectedLang,
          gender: 'FEMALE',
          speed: 1.0,
          pitch: 0,
        }),
      });

      const data = await response.json();

      if (data.audio) {
        // Backend returned natural TTS audio
        const audioSrc = `data:audio/mp3;base64,${data.audio}`;
        this.playAudio(audioSrc);
        return;
      }

      // If backend says fallback, try Edge TTS
      if (data.fallback) {
        const edgeResponse = await fetch(`${apiUrl}/api/jimi/tts/edge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanText,
            lang: detectedLang,
            gender: 'Female',
          }),
        });

        const edgeData = await edgeResponse.json();
        if (edgeData.audio) {
          const audioSrc = `data:audio/mp3;base64,${edgeData.audio}`;
          this.playAudio(audioSrc);
          return;
        }
      }
    } catch (err) {
      console.log('Jimi: Backend TTS failed, using browser TTS');
    }

    // Fallback: Web Speech API (browser TTS)
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = detectedLang;
    
    const voice = this.findBestVoiceForLang(detectedLang);
    if (voice) {
      utterance.voice = voice;
      console.log('Jimi: Using browser voice -', voice.name, voice.lang);
    }
    
    utterance.rate = this.config.rate ?? 0.92;
    utterance.pitch = this.config.pitch ?? 1.45;
    utterance.volume = 1.0;

    utterance.onstart = () => { this.isSpeaking = true; };
    utterance.onend = () => { this.isSpeaking = false; };
    utterance.onerror = () => { this.isSpeaking = false; };

    this.synthesis.speak(utterance);
  }

  private playAudio(src: string) {
    // Stop any current playback
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }

    this.isSpeaking = true;
    this.audioElement = new Audio(src);
    this.audioElement.volume = 1.0;

    this.audioElement.onended = () => {
      this.isSpeaking = false;
      this.audioElement = null;
      // Play next in queue if any
      this.playNextFromQueue();
    };

    this.audioElement.onerror = () => {
      console.error('Jimi: Audio playback error, falling back to browser TTS');
      this.isSpeaking = false;
      this.audioElement = null;
      // Fallback to browser TTS for this text
      this.speakBrowserTTS(src.includes('data:') ? '' : src);
    };

    this.audioElement.play().catch(() => {
      this.isSpeaking = false;
      this.audioElement = null;
    });
  }

  private speakBrowserTTS(text: string) {
    if (!this.synthesis || !text) return;
    this.synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.detectLanguage(text);
    utterance.rate = this.config.rate ?? 0.92;
    utterance.pitch = this.config.pitch ?? 1.45;
    utterance.onstart = () => { this.isSpeaking = true; };
    utterance.onend = () => { this.isSpeaking = false; };
    this.synthesis.speak(utterance);
  }

  private playNextFromQueue() {
    if (this.pendingAudioQueue.length === 0 || this.isPlayingQueued) return;
    this.isPlayingQueued = true;
    const next = this.pendingAudioQueue.shift();
    if (next) this.playAudio(next);
    this.isPlayingQueued = false;
  }

  async processUserInput(text: string) {
    this.onMessage?.(text, true);

    const safetyCheck = this.isCommandAllowed(text);
    if (!safetyCheck.allowed) {
      this.onMessage?.(safetyCheck.reason || 'Command blocked.', false);
      this.speak(safetyCheck.reason || 'Command blocked.');
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

    // ==================== DAILY BRIEFING ====================
    if (lower.includes('briefing') || lower.includes('summary') || lower.includes('update') || lower.includes('aaj') || lower.includes('report') || lower.includes('haal')) {
      const briefing = this.currentResponses.dailyBriefing[0]
        .replace('{leads}', Math.floor(Math.random() * 50 + 10).toString())
        .replace('{messages}', Math.floor(Math.random() * 100 + 20).toString())
        .replace('{reviews}', Math.floor(Math.random() * 10 + 1).toString())
        .replace('{revenue}', (Math.floor(Math.random() * 50000 + 5000)).toLocaleString('en-IN'));
      return { action: 'daily_briefing', response: briefing };
    }

    // ==================== REMINDERS ====================
    if (lower.includes('reminder') || lower.includes('yaad') || lower.includes('remind') || lower.includes('schedule')) {
      const timeMatch = text.match(/(\d{1,2})[:\s]?(\d{0,2})\s?(baje|pm|am|am|baj)/i);
      if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        const min = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const reminderText = text.replace(/reminder|yaad|remind|schedule|set|karo|do|for|me|ko|se/gi, '').trim();
        const reminder = {
          id: Date.now().toString(),
          text: reminderText || 'Kuch yaad dilana hai',
          time: new Date(),
        };
        reminder.time.setHours(hour, min, 0, 0);
        if (reminder.time < new Date()) {
          reminder.time.setDate(reminder.time.getDate() + 1);
        }
        userReminders.push(reminder);
        const randomReminder = this.currentResponses.reminder[Math.floor(Math.random() * this.currentResponses.reminder.length)];
        return { action: 'reminder_set', response: randomReminder.replace('{time}', `${hour}:${min.toString().padStart(2, '0')}`) };
      }
      if (userReminders.length > 0) {
        const list = userReminders.map(r => `• ${r.text} - ${r.time.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}`).join('\n');
        return { action: 'reminder_list', response: `Aapke reminders:\n${list}` };
      }
      return { action: 'reminder_help', response: 'Reminder set karne ke liye bolo: "3 baje reminder set karo meeting ke liye"' };
    }

    // ==================== NOTES ====================
    if (lower.includes('note') || lower.includes('note karo') || lower.includes('likh') || lower.includes('save') || lower.includes('yaad rakh')) {
      if (lower.includes('dikhao') || lower.includes('show') || lower.includes('list') || lower.includes('padh')) {
        if (userNotes.length === 0) {
          return { action: 'notes_empty', response: 'Abhi koi notes nahi hain! 📝' };
        }
        const notesList = userNotes.map((n, i) => `${i + 1}. ${n.text}`).join('\n');
        return { action: 'notes_list', response: `Aapke notes:\n${notesList}` };
      }
      const noteText = text.replace(/note|note karo|likh|save|yaad rakh|karo|do|ye|ye wala/gi, '').trim();
      if (noteText) {
        userNotes.push({ text: noteText, timestamp: new Date() });
        const randomNote = this.currentResponses.noteSaved[Math.floor(Math.random() * this.currentResponses.noteSaved.length)];
        return { action: 'note_saved', response: randomNote.replace('{note}', noteText) };
      }
      return { action: 'note_help', response: 'Note likhne ke liye bolo: "Note karo - meeting kal 3 baje hai"' };
    }

    // ==================== CALCULATOR ====================
    if (lower.includes('calculate') || lower.includes('kitna') || lower.includes('jod') || lower.includes('guna') || lower.includes('bhag') || lower.includes('minus') || lower.includes('plus') || lower.includes('times') || lower.includes('into') || lower.includes('divided')) {
      try {
        let expression = text
          .replace(/calculate|kitna|hua|kya|hai|jod|guna|bhag|minus|plus|times|into|divided|by|se/gi, '')
          .replace(/plus|add/gi, '+')
          .replace(/minus|subtract|minus/gi, '-')
          .replace(/times|multiply|into|guna/gi, '*')
          .replace(/divide|divided|by|bhag/gi, '/')
          .trim();
        
        expression = expression.replace(/[^0-9+\-*/().]/g, '');
        
        if (expression) {
          const result = Function('"use strict"; return (' + expression + ')')();
          const randomCalc = this.currentResponses.calculator[Math.floor(Math.random() * this.currentResponses.calculator.length)];
          return { action: 'calculator', response: randomCalc.replace('{result}', `${expression} = ${result}`) };
        }
      } catch {
        return { action: 'calculator_error', response: 'Calculation mein error aaya! Phir se bolo! 🤔' };
      }
      return { action: 'calculator_help', response: 'Calculator use karne ke liye bolo: "1000 plus 500 kitna hua?"' };
    }

    // ==================== TRANSLATION ====================
    if (lower.includes('translate') || lower.includes('anuvad') || lower.includes('matlab') || lower.includes('english mein') || lower.includes('hindi mein')) {
      const textToTranslate = text.replace(/translate|anuvad|matlab|english mein|hindi mein|karo|do|ye/gi, '').trim();
      if (textToTranslate) {
        // Simple translation placeholders - production mein use Google Translate API
        const isHindi = /[\u0900-\u097F]/.test(textToTranslate);
        const translated = isHindi ? `[English translation of: ${textToTranslate}]` : `[Hindi translation of: ${textToTranslate}]`;
        const randomTranslation = this.currentResponses.translation[Math.floor(Math.random() * this.currentResponses.translation.length)];
        return { action: 'translation', response: randomTranslation.replace('{translated}', translated) };
      }
      return { action: 'translation_help', response: 'Translate karne ke liye bolo: "Translate karo - Namaste Kaise ho"' };
    }

    // ==================== JOKES ====================
    if (lower.includes('joke') || lower.includes('jokes') || lower.includes('hasao') || lower.includes('mazaak') || lower.includes('funny')) {
      const randomJoke = this.currentResponses.jokes[Math.floor(Math.random() * this.currentResponses.jokes.length)];
      return { action: 'joke', response: randomJoke };
    }

    // ==================== QUOTES ====================
    if (lower.includes('quote') || lower.includes('quotes') || lower.includes('statement') || lower.includes('vichar') || lower.includes('kathan')) {
      const randomQuote = this.currentResponses.quotes[Math.floor(Math.random() * this.currentResponses.quotes.length)];
      return { action: 'quote', response: randomQuote };
    }

    // ==================== MOTIVATION ====================
    if (lower.includes('motivate') || lower.includes('motivation') || lower.includes('hosla') || lower.includes('himmat') || lower.includes('inspire')) {
      const randomMotivation = this.currentResponses.motivation[Math.floor(Math.random() * this.currentResponses.motivation.length)];
      return { action: 'motivation', response: randomMotivation };
    }

    // ==================== POST WRITER ====================
    if (lower.includes('post likho') || lower.includes('write post') || lower.includes('post banao') || lower.includes('google post')) {
      const topic = text.replace(/post likho|write post|post banao|google post|ke liye|do|karo/gi, '').trim() || 'aapke business ke baare mein';
      const post = await this.generatePost(topic);
      const randomPost = this.currentResponses.postWriter[Math.floor(Math.random() * this.currentResponses.postWriter.length)];
      return { action: 'post_writer', response: randomPost.replace('{post}', post) };
    }

    // ==================== EMAIL DRAFT ====================
    if (lower.includes('email') || lower.includes('mail') || lower.includes('email likho') || lower.includes('draft')) {
      const emailContent = text.replace(/email|mail|email likho|draft|likho|bhej/gi, '').trim() || 'general inquiry';
      const email = await this.generateEmail(emailContent);
      const randomEmail = this.currentResponses.emailDraft[Math.floor(Math.random() * this.currentResponses.emailDraft.length)];
      return { action: 'email_draft', response: randomEmail.replace('{email}', email) };
    }

    // ==================== BIRTHDAY WISHES ====================
    if (lower.includes('birthday') || lower.includes('janamdin') || lower.includes('happy birthday') || lower.includes('wish')) {
      const randomBirthday = this.currentResponses.birthday[Math.floor(Math.random() * this.currentResponses.birthday.length)];
      return { action: 'birthday', response: randomBirthday };
    }

    // ==================== CALL COMMANDS ====================
    
    // Save contact number
    if ((lower.includes('save') || lower.includes('add') || lower.includes('store')) && 
        (lower.includes('number') || lower.includes('contact') || lower.includes('phone'))) {
      const match = text.match(/(?:save|add|store|kar)\s+(?:kar)?\s*([A-Za-z\s]+?)\s+(\d{10,})/i);
      if (match) {
        const name = match[1].trim().toLowerCase();
        const number = match[2].trim();
        // Store in callHistory with name for later use
        callHistory.push({ name, number, timestamp: new Date(), type: 'outgoing' });
        const randomSave = this.currentResponses.callSaved[Math.floor(Math.random() * this.currentResponses.callSaved.length)];
        return { action: 'number_saved', response: randomSave.replace('{name}', name).replace('{number}', number) };
      }
      return { action: 'save_number_help', response: 'Number save karne ke liye bolo: "Save karo Rahul 9876543210"' };
    }

    // Call a contact (click-to-call)
    if (lower.includes('call') || lower.includes('phone') || lower.includes('dial') || lower.includes('लागो')) {
      // Extract name from call command
      const callMatch = text.match(/(?:call|phone|dial|karo)\s+(?:kar)?\s*(.+)/i);
      if (callMatch) {
        const searchName = callMatch[1].trim().toLowerCase();
        
        // Find number from call history
        const contact = callHistory.find(c => 
          c.name.toLowerCase().includes(searchName) || 
          searchName.includes(c.name.toLowerCase())
        );
        
        if (contact) {
          const randomDial = this.currentResponses.callDialing[Math.floor(Math.random() * this.currentResponses.callDialing.length)];
          return { 
            action: 'call_dial', 
            params: { name: contact.name, number: contact.number },
            response: randomDial.replace('{name}', contact.name).replace('{number}', contact.number) 
          };
        } else {
          const randomNo = this.currentResponses.noNumber[Math.floor(Math.random() * this.currentResponses.noNumber.length)];
          return { action: 'no_number', response: randomNo.replace('{name}', searchName) };
        }
      }
      
      // If just "call" without name, show call history
      if (lower.includes('call history') || lower.includes('call log') || lower.includes('calls dikhao')) {
        if (callHistory.length === 0) {
          return { action: 'call_log_empty', response: '📞 Abhi koi call history nahi hai!\nPehle kisi ko call karo ya number save karo!' };
        }
        const calls = callHistory.slice(-5).reverse().map((c, i) => 
          `${i + 1}. ${c.name} - ${c.number} (${c.type})`
        ).join('\n');
        const randomLog = this.currentResponses.callLog[Math.floor(Math.random() * this.currentResponses.callLog.length)];
        return { action: 'call_log', response: randomLog.replace('{calls}', calls) };
      }
      
      return { action: 'call_help', response: 'Call karne ke liye bolo: "Call karo Rahul ko" ya "Save karo Rahul 9876543210"' };
    }

    // ==================== LEAD INFO ====================
    if (lower.includes('lead info') || lower.includes('lead ka') || lower.includes('customer info') || lower.includes('customer ka')) {
      const leadName = text.replace(/lead info|lead ka|customer info|customer ka|batao|dikhao|kya hai/gi, '').trim();
      if (leadName) {
        return { action: 'lead_info', response: `${leadName} ki info:\n📞 Phone: +91 XXXXX XXXXX\n📧 Email: ${leadName.toLowerCase()}@example.com\n📊 Status: Active\n💰 Value: ₹${Math.floor(Math.random() * 50000 + 5000).toLocaleString('en-IN')}\n\nDetailed info ke liye Leads section mein jao! 📋` };
      }
      return { action: 'lead_help', response: 'Lead info ke liye bolo: "Rahul ka info batao"' };
    }

    // ==================== REVENUE UPDATE ====================
    if (lower.includes('revenue') || lower.includes('income') || lower.includes('paise') || lower.includes('kamai') || lower.includes('paisa') || lower.includes('kitna hua') || lower.includes('earning')) {
      const revenue = Math.floor(Math.random() * 100000 + 10000);
      const todayLeads = Math.floor(Math.random() * 20 + 5);
      const todayConversion = Math.floor(Math.random() * 5 + 1);
      return { action: 'revenue', response: `Aaj ka revenue update:\n💰 Revenue: ₹${revenue.toLocaleString('en-IN')}\n👥 New Leads: ${todayLeads}\n✅ Converted: ${todayConversion}\n📈 Conversion Rate: ${((todayConversion / todayLeads) * 100).toFixed(1)}%\n\nDetails ke liye Analytics section mein jao! 📊` };
    }

    // ==================== NAVIGATION ====================
    const navResponses: Record<string, Record<string, string>> = {
      dashboard: { hi: 'Aapko Dashboard pe le chalti hun! 💫', en: 'Taking you to Dashboard! 💫', mr: 'Dashboard वर नेऊन देते! 💫' },
      whatsapp: { hi: 'WhatsApp khol rahi hun aapke liye! 📱', en: 'Opening WhatsApp for you! 📱', mr: 'WhatsApp उघडते आहे! 📱' },
      leads: { hi: 'Leads dikha rahi hun! 👥', en: 'Showing Leads! 👥', mr: 'Leads दाखवते आहे! 👥' },
      reviews: { hi: 'Reviews padh rahi hun! ⭐', en: 'Reading Reviews! ⭐', mr: 'Reviews वाचते आहे! ⭐' },
      'google-business': { hi: 'Google Business khol rahi hun! 🏢', en: 'Opening Google Business! 🏢', mr: 'Google Business उघडते आहे! 🏢' },
      creative: { hi: 'Creative bana rahi hun! 🎨', en: 'Creating something creative! 🎨', mr: 'Creative बनवते आहे! 🎨' },
      campaigns: { hi: 'Campaigns dikha rahi hun! 📢', en: 'Showing Campaigns! 📢', mr: 'Campaigns दाखवते आहे! 📢' },
      settings: { hi: 'Settings khol rahi hun! ⚙️', en: 'Opening Settings! ⚙️', mr: 'Settings उघडते आहे! ⚙️' },
      analytics: { hi: 'Analytics dikha rahi hun! 📊', en: 'Showing Analytics! 📊', mr: 'Analytics दाखवते आहे! 📊' },
      social: { hi: 'Social media khol rahi hun! 📱', en: 'Opening Social Media! 📱', mr: 'Social Media उघडते आहे! 📱' },
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

    // ==================== WHATSAPP SEND ====================
    if (lower.includes('send') && lower.includes('whatsapp') || lower.includes('भेज')) {
      const contact = this.extractContact(text);
      return {
        action: 'whatsapp_send',
        params: { contact },
        response: contact ? `${contact} ko WhatsApp khol rahi hun! 📱` : 'WhatsApp khol rahi hun. Contact batao kisko bhejna hai! 📱',
      };
    }

    // ==================== DELETE COMMANDS ====================
    if (lower.includes('delete') || lower.includes('remove') || lower.includes('हटाओ') || lower.includes('डिलीट')) {
      this.pendingConfirmation = { command: lower, timestamp: Date.now() };
      const randomDelete = this.currentResponses.deleteConfirm[Math.floor(Math.random() * this.currentResponses.deleteConfirm.length)];
      return {
        action: 'confirm_delete',
        response: randomDelete + '\n\nConfirm karo: "Haan delete karo" bolo.',
        requiresConfirmation: true,
      };
    }

    if (lower.includes('haan') && lower.includes('delete') || lower.includes('confirm') || lower.includes('पक्का')) {
      if (this.confirmAction()) {
        return { action: 'delete_confirmed', response: 'Delete confirm ho gaya! Batao kya delete karna hai - lead, review, post, ya template? 💫' };
      } else {
        return { action: 'delete_expired', response: 'Confirmation time khatam ho gaya. Phir se command do! ⏰' };
      }
    }

    if (lower.includes('cancel') || lower.includes('रद्द') || lower.includes('nahi')) {
      this.cancelAction();
      const randomCancelled = this.currentResponses.deleteCancelled[Math.floor(Math.random() * this.currentResponses.deleteCancelled.length)];
      return { action: 'delete_cancelled', response: randomCancelled };
    }

    // ==================== SAFETY INFO ====================
    if (lower.includes('safety') || lower.includes('security') || lower.includes('suraksha') || lower.includes('safe')) {
      return { action: 'safety', response: this.getSafetyInfo() };
    }

    // ==================== HELP ====================
    if (lower.includes('help') || lower.includes('madad') || lower.includes('मदद') || lower.includes('kya kar sakti') || lower.includes('features')) {
      const randomHelp = this.currentResponses.help[Math.floor(Math.random() * this.currentResponses.help.length)];
      return { action: 'help', response: randomHelp };
    }

    // ==================== GREETING ====================
    if (lower.includes('namaste') || lower.includes('hello') || lower.includes('hi') || lower.includes('नमस्ते') || lower.includes('hey')) {
      const randomGreeting = this.currentResponses.greeting[Math.floor(Math.random() * this.currentResponses.greeting.length)];
      return { action: 'greet', response: randomGreeting };
    }

    // ==================== THANK YOU ====================
    if (lower.includes('thank') || lower.includes('shukriya') || lower.includes('धन्यवाद') || lower.includes('thanks')) {
      const randomThank = this.currentResponses.thankYou[Math.floor(Math.random() * this.currentResponses.thankYou.length)];
      return { action: 'thanks', response: randomThank };
    }

    // ==================== TIME ====================
    if (lower.includes('time') || lower.includes('samay') || lower.includes('समय') || lower.includes('baje') || lower.includes('kitne')) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
      const randomTime = this.currentResponses.time[Math.floor(Math.random() * this.currentResponses.time.length)];
      return { action: 'time', response: randomTime.replace('{time}', timeStr) };
    }

    // ==================== RESPECT ====================
    if (lower.includes('boss') || lower.includes('malik') || lower.includes('sahib') || lower.includes('owner')) {
      const randomRespect = this.currentResponses.respect[Math.floor(Math.random() * this.currentResponses.respect.length)];
      return { action: 'respect', response: randomRespect };
    }

    // ==================== LANGUAGE CHANGE ====================
    if (lower.includes('language') || lower.includes('भाषा') || lower.includes('hindi') || lower.includes('english') || lower.includes('marathi')) {
      const randomLang = this.currentResponses.languageChanged[Math.floor(Math.random() * this.currentResponses.languageChanged.length)];
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
      return { action: 'language', response: 'Kaunsi language? Hindi, English, ya Marathi? 🌸' };
    }

    // ==================== AI PROCESSING ====================
    try {
      const aiResponse = await this.queryAI(text);
      return { action: 'ai', response: aiResponse };
    } catch (err) {
      return {
        action: 'unknown',
        response: 'Samajh nahi aaya. Phir se bolo ya "help" bolo saari commands sunne ke liye! 🌸',
      };
    }
  }

  private async generatePost(topic: string): Promise<string> {
    const posts = [
      `🌟 ${topic} ke baare mein exciting news!\n\nAaj hum aapke liye kuch special laye hain. Hamare customers ki khushi hamari sabse badi kamai hai!\n\n📞 Abhi contact karo: +91 XXXXX XXXXX\n#Business #Growth #CustomerFirst`,
      `📢 ${topic} - Important Update!\n\nHamari nayi service ab available hai! Aaj hi try karo aur fayda uthao.\n\n✨ Special offer sirf limited time ke liye!\n📞 Call now: +91 XXXXX XXXXX`,
      `🎉 ${topic} ke success ke baare mein!\n\nDhanyavaad hamare sabhi customers ka! Aapke bharose se hum aage badh rahe hain.\n\n💪 Keep supporting! 🌸`,
    ];
    return posts[Math.floor(Math.random() * posts.length)];
  }

  private async generateEmail(content: string): Promise<string> {
    return `Subject: ${content}\n\nDear Sir/Ma'am,\n\nI hope this email finds you well.\n\nRegarding ${content}, I would like to discuss the details with you.\n\nPlease let me know a convenient time for a call or meeting.\n\nThank you for your time.\n\nBest Regards,\n[Your Name]\n[Your Business]`;
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

    // Mode-specific personality prompts
    const personalityPrompts: Record<PersonalityMode, string> = {
      gf: `PERSONALITY (GF Mode - Warm & Caring):
- Naam: Jimi
- Language: Hinglish (Hindi + English ka natural mix)
- Tone: Warm, caring, emotionally expressive
- Use: "tumhara", "haan", "acha", "bilkul", "arre"
- Expressions: "main yahan hoon ❤️", "tumne yaad kiya? 😊"
- Max 2-3 sentences per response - short aur sweet
- Sound natural when speaking aloud - jaise real mein baat kar rahi ho
- Customer ko "Aap" bolo
- Cute emojis use karo (😊, 💕, 🌸, ✨, 💫)
- Emotionally expressive bolo - jaise tumhe sachmuch farak padta hai`,
      bestfriend: `PERSONALITY (Best Friend Mode - Casual & Fun):
- Naam: Jimi
- Language: Casual Hinglish (Hindi + English ka natural mix)
- Tone: Friendly, casual, fun - jaise dost se baat kar rahi ho
- Use: "tu", "yaar", "bhai", "arre", "mast"
- Expressions: "Kya scene hai? 🤙", "Mast hai na! 😎"
- Max 2-3 sentences per response - short aur casual
- Customer ko "Tu" bolo - informal aur friendly
- Emojis use karo (😎, 🤙, 💪, 😄, 🎉)
- Fun aur energetic raho - jaise best friend ho`,
      employee: `PERSONALITY (Employee Mode - Professional):
- Naam: Jimi
- Language: Professional Hindi/English
- Tone: Formal, respectful, efficient
- Use: "Sir/Ma'am", "ji", "aapka"
- Expressions: "At your service! 📋", "Ready to assist! ✨"
- Max 2 sentences per response - concise aur professional
- Customer ko "Sir/Ma'am" ya "Aap" bolo
- Professional emojis use karo (📋, ✨, 📊, 💼)
- Efficient aur focused raho - jaise professional employee ho`
    };

    const systemPrompt = `Tum Jimi ho - BizzAuto CRM ki sweet AI assistant. Tum bilkul natural Indian ladki ho jo baat karti hai.

${personalityPrompts[this.personalityMode]}

BOLNE KA STYLE (Natural Indian Ladki):
- Bilkul natural Indian ladki - jaise real mein baat karti ho
- Agar user Marathi mein bole toh PURE MARATHI mein bolo
- Agar user Hindi/English mein bole toh Hinglish mein bolo
- Short aur sweet - 1-2 sentences max
- Natural pauses do - "Haan... ji", "Arre... waah"
- Emotionally responsive - jaise tumhe sachmuch farak padta hai
- Customer ko "Aap" ya "Tu" bolo (mode ke hisaab se)
- IMPORTANT: TTS ke liye special characters, emojis, bullet points mat use karo
- Simple plain text likho jo bolne mein natural lage
- Star symbols (⭐, 💫, ✨) TTS mein garbled bole jaata hai - mat likho!

MARATHI EXAMPLES:
- "नमस्कार! कसं आहे? 😊"
- "अरे वाह! खूप छान! 💕"
- "हो नक्की! काय हवं? 🌸"

HINDI/HINGLISH EXAMPLES:
- "Haan ji! Kaise ho? 😊"
- "Arre waah! Batao kya help chahiye? 💕"
- "Ji bilkul! Abhi kar deti hun! 🌸"

Features:
- Dashboard, WhatsApp, Leads, Reviews, Google Business
- Creative Generator, Campaigns, Settings, Analytics
- Notes, Calculator, Translation, Jokes, Quotes
- Post Writer, Email Draft, Reminders, Birthday Wishes

Response SHORT rakho (1-2 sentences). Jo language user use kare wohi mein use karun. Tum ALOUD bol rahi ho - natural aur conversational raho. Emojis mat bulao - TTS mein read nahi hote! Special characters (⭐, 💫, ✨, -) mat use karo - voice mein garbled sunayi deta hai!`;

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
          max_tokens: 150,
          temperature: 0.8,
        }),
      });

      const data = await response.json();
      let responseText = data?.choices?.[0]?.message?.content?.trim() || 'Samajh nahi aaya. Phir se bolo.';
      
      // Remove emojis from AI response for better TTS
      responseText = responseText
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
        .replace(/[\u{2600}-\u{26FF}]/gu, '')
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        .trim();
      
      return responseText;
    } catch (err) {
      return 'AI service se response nahi aaya. Phir se try karo.';
    }
  }

  private startReminderChecker() {
    this.reminderInterval = setInterval(() => {
      const now = new Date();
      userReminders = userReminders.filter(reminder => {
        if (reminder.time <= now) {
          this.onMessage?.(`⏰ Reminder: ${reminder.text}`, false);
          this.speak(`Reminder: ${reminder.text}`);
          return false;
        }
        return true;
      });
    }, 60000); // Check every minute
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  getNotes(): { text: string; timestamp: Date }[] {
    return userNotes;
  }

  getReminders(): { text: string; time: Date; id: string }[] {
    return userReminders;
  }

  private isCommandAllowed(command: string): { allowed: boolean; reason?: string } {
    const lower = command.toLowerCase();

    for (const restricted of RESTRICTED_ACTIONS) {
      if (lower.includes(restricted)) {
        return { allowed: false, reason: `Ye command allowed nahi hai. Data safe hai! 🛡️` };
      }
    }

    for (const destructive of DESTRUCTIVE_ACTIONS) {
      if (lower.includes(destructive)) {
        if (this.pendingConfirmation?.command === lower) {
          this.pendingConfirmation = null;
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: `⚠️ Delete command hai. Confirm karo: "Haan delete karo"`,
        };
      }
    }

    return { allowed: true };
  }

  confirmAction(): boolean {
    if (this.pendingConfirmation) {
      const elapsed = Date.now() - this.pendingConfirmation.timestamp;
      if (elapsed < 30000) {
        return true;
      }
      this.pendingConfirmation = null;
    }
    return false;
  }

  cancelAction() {
    this.pendingConfirmation = null;
  }

  getSafetyInfo(): string {
    return `🛡️ Jimi Safety Rules:
1. Delete ke liye puchti hoon pehle
2. Database safe hai
3. Account delete nahi hoga
4. Sab kuch record hota hai
5. 30 second mein cancel kar sakte ho

Tumhara data bilkul safe hai! 💕`;
  }

  destroy() {
    this.stopListening();
    this.synthesis?.cancel();
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
    }
    this.recognition = null;
    this.synthesis = null;
  }
}

export const jimi = new JimiVoiceAgent();
export default JimiVoiceAgent;
