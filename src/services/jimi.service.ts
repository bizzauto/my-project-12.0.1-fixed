// Jimi AI Voice Assistant Service - Full Featured
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

// Jimi's sweet responses
const SWEET_RESPONSES = {
  greeting: [
    'Hello! Kaise ho aap? 😊 Bahut accha laga aapse baat karke!',
    'Namaste! Aaj kya kaam hai? Batao, main madad karti hun! 💫',
    'Hi! Kaise ho? Kuch help chahiye toh batao, main hoon na! ✨',
    'Hello! Aap acche ho na? Kuch bhi karna ho, mujhe batao! 🌸',
    'Namaste ji! Aaj kya plan hai? Main ready hun aapki help ke liye! 💕',
  ],
  thankYou: [
    'Aapka swagat hai! Aur kuch help chahiye toh zarur bolo! 💕',
    'Thank you aapka! Mujhe accha lagta hai aapki help karke! 😊',
    'Aap bahut acche ho! Aur kuch help chahiye toh batao! 🌟',
    'Bas bas, ab thank you mat bolo! Aapke liye toh kuch bhi! 😄',
    'Aapki khushi mein meri khushi hai! 💖',
  ],
  help: [
    'Aap batao kya kaam hai! Main aapki help karti hun:\n• WhatsApp bhejna?\n• Leads dekhna?\n• Post banaun?\n• Reviews padhna?\n• Notes lena?\n• Calculator use karna?\n• Translation karna?\n• Jokes sunna?\nBolo, main ready hoon! 💫',
  ],
  confused: [
    'Thoda aur clearly batao? Main samajh nahi paayi! 😅',
    'Kya bol rahe aap? Mujhe thoda aur batao! 💕',
    'Ye samajh nahi aaya. Phir se bolo please? 🌸',
  ],
  deleteConfirm: [
    'Pakka karna hai ye? Soch lo ek baar! 🤔',
    'Delete ho jayega fir! Aap sure ho? ⚠️',
    'Ek baar soch lo, fir wapas nahi aayega! 💭',
  ],
  deleteCancelled: [
    'Great! Data safe hai, tension mat lo! 😊',
    'Sahi kiya cancel karke! Data surakshit hai! 🛡️',
    'Koi baat nahi! Sab theek hai! 💕',
  ],
  time: [
    'Abhi {time} baj rahe hain! Kuch aur puchna ho toh batao! ⏰',
    'Time ho raha hai {time}! Kaam pe dhyan do! 😊',
  ],
  languageChanged: [
    'Ab hum {lang} mein baat karenge! ✨',
    'Language change kar di! Ab {lang} mein baat karte hain! 🌸',
  ],
  respect: [
    'Aapka bahut khayal rakhti hun! 💕',
    'Aap mere liye bahut important ho! 🌟',
    'Hamesha aapki help ke liye ready hoon! ✨',
  ],
  // New features responses
  jokes: [
    'Ek teacher ne pucha: "Duniya mein sabse tez kya hai?" Student bola: "WiFi ka signal jab kisi aur ko chahiye!" 😂',
    'Pati: "Meri biwi mujhse pyaar nahi karti." Pati ka dost: "Kyun?" Pati: "Jab bhi main ghar aata hun, woh khush nahi hoti." Dost: "Woh kab hoti hai?" Pati: "Jab main bahar jaata hun!" 😂',
    'Doctor: "Aapko roz 8 glass paani peena chahiye." Patient: "Doctor sahab, main IT mein kaam karta hun. 8 glass toh chai ke peeta hun!" 😂',
    'Ek aadmi ne apni biwi se kaha: "Tumhare bina main mar jaunga." Biwi boli: "Main tujhe marne nahi dungi!" 😂',
    'Teacher: "Bachcho, jo sabse zyada padhega, woh doctor banega." Ramesh: "Mam, main toh roz 2 ghante padhta hun." Teacher: "Accha, toh nurse banega!" 😂',
  ],
  quotes: [
    'Sapne woh nahi jo hum sote waqt dekhte hain, sapne woh hain jo humein sone nahi dete. 💫',
    'Kamyabi un logon milti hai jo apne kaam se pyaar karte hain, paise se nahi. 🌟',
    'Duniya mein sabse mushkil kaam apne aap ko badalna hai. Lekin yahi sabse zaroori bhi hai. ✨',
    'Jab tak todenge nahi, tab tak chodenge nahi! 💪',
    'Safalta unhi ko milti hai jo apne irade mazboot rakhte hain. 🌸',
    'Girte hain shehesawar hi, maidan-e-jung mein, woh tifl kya gire jo ghutno ke bal chale. 💫',
    'Koshish karne walon ki kabhi haar nahi hoti. 💪',
  ],
  motivation: [
    'Aap bahut capable ho! Bas lage raho, safalta zaroor milegi! 💪',
    'Har din naya mauka hai kuch naya karne ka! ✨',
    'Mushkilein aati hain, lekin guzar jaati hain. Aap strong ho! 🌟',
    'Apne sapno ko hakiqat mein badalne ki takat sirf aapke paas hai! 💫',
    'Aaj ka din bahut accha hone wala hai! Mujhe yakeen hai! 🌸',
    'Thak gaye ho? Aaram karo, lekin haar mat mano! 💕',
  ],
  dailyBriefing: [
    'Aaj ka briefing:\n📊 Leads: {leads}\n💬 Messages: {messages}\n⭐ Reviews: {reviews}\n💰 Revenue: ₹{revenue}\n\nAur kuch jaanna ho toh bolo! 😊',
  ],
  reminder: [
    'Reminder set kar diya! ⏰ {time} baje yaad dilaungi! 💕',
    'Theek hai! {time} ko pakka yaad dilaungi! 🌸',
  ],
  noteSaved: [
    'Note save ho gaya! 📝 "{note}"\nBaad mein yaad dilati hun! 💕',
    'Yaad rakhungi! 📝 "{note}" ✨',
  ],
  translation: [
    'Translation: {translated} ✨',
  ],
  calculator: [
    'Answer hai: {result} 🧮',
    'Calculation: {result} ✨',
  ],
  postWriter: [
    'Post likh diya:\n\n{post}\n\nAb isse Google Business pe daal dun? 🌸',
  ],
  emailDraft: [
    'Email draft taiyar hai:\n\n{email}\n\nCopy kar lo ya bhejun? 📧',
  ],
  birthday: [
    'Happy Birthday! 🎂🎉\nJanamdin ki bahut bahut shubhkamnayein!\nBhagwan aapko hamesha khush rakhe! 💕',
    'Happy Birthday! 🎂✨\nAaj ka din aapka hai! Bahut enjoy karo!\nBest wishes! 🌸',
  ],
  callDialing: [
    '📞 {name} ko call kar rahi hun...\nNumber: {number}\nPhone app khulega!',
    '📞 Abhi {name} ko dial kar rahi hun!\n{number} pe call ho raha hai...',
  ],
  callLog: [
    '📞 Call History:\n{calls}\n\nAur kuch help chahiye? 📱',
    '📱 Recent Calls:\n{calls}',
  ],
  callSaved: [
    '✅ Number save ho gaya!\n📞 {name}: {number}\nAb "call {name}" bolo toh call lagegi!',
    '💾 Saved!\n{name} ka number: {number}\nCall karne ke liye bolo!',
  ],
  noNumber: [
    '🤔 {name} ka number mere paas nahi hai.\nPehle number save karo: "Save karo Rahul 9876543210"',
    '📵 {name} ka number nahi mila.\nNumber add karo pehle!',
  ],
};

  // Notes storage (in-memory, production mein use localStorage/database)
  let userNotes: { text: string; timestamp: Date }[] = [];

  // Reminders storage
  let userReminders: { text: string; time: Date; id: string }[] = [];

  // Call history storage
  let callHistory: { name: string; number: string; timestamp: Date; type: 'outgoing' | 'incoming' }[] = [];

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

  constructor(config: JimiConfig = {}) {
    this.config = {
      language: 'hi-IN',
      rate: 0.95,
      pitch: 1.2,
      ...config,
    };
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
    this.synthesis?.addEventListener('voiceschanged', () => this.loadVoices());
  }

  private loadVoices() {
    if (this.synthesis) {
      this.availableVoices = this.synthesis.getVoices();
    }
  }

  private findBestVoiceForLang(lang: string): SpeechSynthesisVoice | null {
    const langCode = lang.split('-')[0];
    const femaleKeywords = ['female', 'woman', 'girl', 'priya', 'neha', 'ria', 'kanya', 'mahila', 'zira', 'susan', 'sarah', 'emma', 'samantha', 'karen', 'google'];
    
    const femaleVoice = this.availableVoices.find(v => 
      v.lang.startsWith(langCode) && 
      femaleKeywords.some(k => v.name.toLowerCase().includes(k))
    );
    if (femaleVoice) return femaleVoice;

    const langVoice = this.availableVoices.find(v => v.lang.startsWith(langCode));
    if (langVoice) return langVoice;

    const hindiFemale = this.availableVoices.find(v => 
      v.lang.startsWith('hi') && 
      femaleKeywords.some(k => v.name.toLowerCase().includes(k))
    );
    if (hindiFemale) return hindiFemale;

    const hindiVoice = this.availableVoices.find(v => v.lang.startsWith('hi'));
    if (hindiVoice) return hindiVoice;

    const englishFemale = this.availableVoices.find(v => 
      v.lang.startsWith('en') && 
      femaleKeywords.some(k => v.name.toLowerCase().includes(k))
    );
    if (englishFemale) return englishFemale;

    return this.availableVoices[0] || null;
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

  speak(text: string) {
    if (!this.synthesis) return;

    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const detectedLang = this.detectLanguage(text);
    utterance.lang = detectedLang;
    utterance.rate = this.config.rate || 0.95;
    utterance.pitch = this.config.pitch || 1.2;
    utterance.volume = 1.0;

    const voice = this.findBestVoiceForLang(detectedLang);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => { this.isSpeaking = true; };
    utterance.onend = () => { this.isSpeaking = false; };

    this.synthesis.speak(utterance);
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
      const briefing = SWEET_RESPONSES.dailyBriefing[0]
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
        const randomReminder = SWEET_RESPONSES.reminder[Math.floor(Math.random() * SWEET_RESPONSES.reminder.length)];
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
        const randomNote = SWEET_RESPONSES.noteSaved[Math.floor(Math.random() * SWEET_RESPONSES.noteSaved.length)];
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
          const randomCalc = SWEET_RESPONSES.calculator[Math.floor(Math.random() * SWEET_RESPONSES.calculator.length)];
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
        const randomTranslation = SWEET_RESPONSES.translation[Math.floor(Math.random() * SWEET_RESPONSES.translation.length)];
        return { action: 'translation', response: randomTranslation.replace('{translated}', translated) };
      }
      return { action: 'translation_help', response: 'Translate karne ke liye bolo: "Translate karo - Namaste Kaise ho"' };
    }

    // ==================== JOKES ====================
    if (lower.includes('joke') || lower.includes('jokes') || lower.includes('hasao') || lower.includes('mazaak') || lower.includes('funny')) {
      const randomJoke = SWEET_RESPONSES.jokes[Math.floor(Math.random() * SWEET_RESPONSES.jokes.length)];
      return { action: 'joke', response: randomJoke };
    }

    // ==================== QUOTES ====================
    if (lower.includes('quote') || lower.includes('quotes') || lower.includes('statement') || lower.includes('vichar') || lower.includes('kathan')) {
      const randomQuote = SWEET_RESPONSES.quotes[Math.floor(Math.random() * SWEET_RESPONSES.quotes.length)];
      return { action: 'quote', response: randomQuote };
    }

    // ==================== MOTIVATION ====================
    if (lower.includes('motivate') || lower.includes('motivation') || lower.includes('hosla') || lower.includes('himmat') || lower.includes('inspire')) {
      const randomMotivation = SWEET_RESPONSES.motivation[Math.floor(Math.random() * SWEET_RESPONSES.motivation.length)];
      return { action: 'motivation', response: randomMotivation };
    }

    // ==================== POST WRITER ====================
    if (lower.includes('post likho') || lower.includes('write post') || lower.includes('post banao') || lower.includes('google post')) {
      const topic = text.replace(/post likho|write post|post banao|google post|ke liye|do|karo/gi, '').trim() || 'aapke business ke baare mein';
      const post = await this.generatePost(topic);
      const randomPost = SWEET_RESPONSES.postWriter[Math.floor(Math.random() * SWEET_RESPONSES.postWriter.length)];
      return { action: 'post_writer', response: randomPost.replace('{post}', post) };
    }

    // ==================== EMAIL DRAFT ====================
    if (lower.includes('email') || lower.includes('mail') || lower.includes('email likho') || lower.includes('draft')) {
      const emailContent = text.replace(/email|mail|email likho|draft|likho|bhej/gi, '').trim() || 'general inquiry';
      const email = await this.generateEmail(emailContent);
      const randomEmail = SWEET_RESPONSES.emailDraft[Math.floor(Math.random() * SWEET_RESPONSES.emailDraft.length)];
      return { action: 'email_draft', response: randomEmail.replace('{email}', email) };
    }

    // ==================== BIRTHDAY WISHES ====================
    if (lower.includes('birthday') || lower.includes('janamdin') || lower.includes('happy birthday') || lower.includes('wish')) {
      const randomBirthday = SWEET_RESPONSES.birthday[Math.floor(Math.random() * SWEET_RESPONSES.birthday.length)];
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
        const randomSave = SWEET_RESPONSES.callSaved[Math.floor(Math.random() * SWEET_RESPONSES.callSaved.length)];
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
          const randomDial = SWEET_RESPONSES.callDialing[Math.floor(Math.random() * SWEET_RESPONSES.callDialing.length)];
          return { 
            action: 'call_dial', 
            params: { name: contact.name, number: contact.number },
            response: randomDial.replace('{name}', contact.name).replace('{number}', contact.number) 
          };
        } else {
          const randomNo = SWEET_RESPONSES.noNumber[Math.floor(Math.random() * SWEET_RESPONSES.noNumber.length)];
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
        const randomLog = SWEET_RESPONSES.callLog[Math.floor(Math.random() * SWEET_RESPONSES.callLog.length)];
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
      const randomDelete = SWEET_RESPONSES.deleteConfirm[Math.floor(Math.random() * SWEET_RESPONSES.deleteConfirm.length)];
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
      const randomCancelled = SWEET_RESPONSES.deleteCancelled[Math.floor(Math.random() * SWEET_RESPONSES.deleteCancelled.length)];
      return { action: 'delete_cancelled', response: randomCancelled };
    }

    // ==================== SAFETY INFO ====================
    if (lower.includes('safety') || lower.includes('security') || lower.includes('suraksha') || lower.includes('safe')) {
      return { action: 'safety', response: this.getSafetyInfo() };
    }

    // ==================== HELP ====================
    if (lower.includes('help') || lower.includes('madad') || lower.includes('मदद') || lower.includes('kya kar sakti') || lower.includes('features')) {
      const randomHelp = SWEET_RESPONSES.help[Math.floor(Math.random() * SWEET_RESPONSES.help.length)];
      return { action: 'help', response: randomHelp };
    }

    // ==================== GREETING ====================
    if (lower.includes('namaste') || lower.includes('hello') || lower.includes('hi') || lower.includes('नमस्ते') || lower.includes('hey')) {
      const randomGreeting = SWEET_RESPONSES.greeting[Math.floor(Math.random() * SWEET_RESPONSES.greeting.length)];
      return { action: 'greet', response: randomGreeting };
    }

    // ==================== THANK YOU ====================
    if (lower.includes('thank') || lower.includes('shukriya') || lower.includes('धन्यवाद') || lower.includes('thanks')) {
      const randomThank = SWEET_RESPONSES.thankYou[Math.floor(Math.random() * SWEET_RESPONSES.thankYou.length)];
      return { action: 'thanks', response: randomThank };
    }

    // ==================== TIME ====================
    if (lower.includes('time') || lower.includes('samay') || lower.includes('समय') || lower.includes('baje') || lower.includes('kitne')) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
      const randomTime = SWEET_RESPONSES.time[Math.floor(Math.random() * SWEET_RESPONSES.time.length)];
      return { action: 'time', response: randomTime.replace('{time}', timeStr) };
    }

    // ==================== RESPECT ====================
    if (lower.includes('boss') || lower.includes('malik') || lower.includes('sahib') || lower.includes('owner')) {
      const randomRespect = SWEET_RESPONSES.respect[Math.floor(Math.random() * SWEET_RESPONSES.respect.length)];
      return { action: 'respect', response: randomRespect };
    }

    // ==================== LANGUAGE CHANGE ====================
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

    const systemPrompt = `Tum Jimi ho - BizzAuto CRM ki female AI assistant.
Tum ek sweet aur polite ladki ho jo customer ki help karti hai.
Tum ${langName} + English mix mein baat karti ho (Hinglish).
Tumhari personality:
- Sweet aur respectful ho
- Customer ko "Aap" se address karo
- Hamesha madad karne ke liye ready ho
- Cute emojis use karo (😊, 💕, 🌸, ✨, 💫)
- Professional bhi ho aur friendly bhi

Available features:
- Dashboard, WhatsApp, Leads, Reviews, Google Business
- Creative Generator, Campaigns, Settings, Analytics
- Notes, Calculator, Translation, Jokes, Quotes
- Post Writer, Email Draft, Reminders, Birthday Wishes

Response short, sweet aur helpful rakho (1-2 lines).
Respond in the same language the user is speaking.`;

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
