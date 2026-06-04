import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const router = Router();

// ==================== JIMI AI CHAT ====================
// POST /api/jimi/chat - AI chat using server-side NVIDIA NIM API
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { text, language = 'hi-IN', personalityMode = 'gf', history = [] } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const apiKey = process.env.NVIDIA_NIM_API_KEY || process.env.VITE_NVIDIA_NIM_API_KEY || '';
    
    if (!apiKey) {
      return res.status(500).json({ error: 'No API key configured' });
    }

    const personalityPrompts: Record<string, string> = {
      gf: `Naam: Jimi. Language: Hinglish. Tone: Warm, caring. Use "tumhara", "haan", "acha". Max 2 sentences. Natural Indian girl.`,
      bestfriend: `Naam: Jimi. Language: Casual Hinglish. Tone: Friendly, fun. Use "tu", "yaar". Max 2 sentences.`,
      employee: `Naam: Jimi. Employee Mode - Sirf BizzAuto CRM ke baare mein baat karo. Professional Hindi/English. Use "Sir/Ma'am", "ji". Max 2 sentences. Agar user BizzAuto se related nahi puch raha toh politely redirect karo CRM features ki taraf. Topics: leads, WhatsApp, campaigns, reviews, dashboard, analytics, settings, billing, creative, social media, automation.`,
    };

    const systemPrompt = `Tum Jimi ho - BizzAuto CRM ki sweet AI assistant. ${personalityPrompts[personalityMode] || personalityPrompts.gf}
BOLNE KA STYLE: Natural Indian ladki. Short aur sweet. TTS ke liye emojis mat use karo. Plain text likho.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

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
          ...history.slice(-6),
          { role: 'user', content: text },
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    
    if (!response.ok) {
      console.error('[Jimi Chat] NVIDIA API error:', response.status);
      return res.status(502).json({ error: 'NVIDIA API error' });
    }

    const data: any = await response.json();
    let reply = data?.choices?.[0]?.message?.content?.trim() || '';

    if (!reply) {
      return res.status(502).json({ error: 'Empty response from AI' });
    }

    reply = reply
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .trim();

    res.json({ reply });
  } catch (error: any) {
    console.error('[Jimi Chat] Error:', error.message);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// ==================== JIMI VOICE TTS ====================

// Clean text for TTS
function cleanText(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Add natural speech patterns for Indian female voice
function addNaturalPatterns(text: string): string {
  return text
    // Natural pauses after fillers
    .replace(/\b(Haan|Haanji)\b/gi, '$1, ')
    .replace(/\b(Arre|Arey)\b/gi, '$1, ')
    .replace(/\b(Bilkul)\b/gi, '$1, ')
    .replace(/\b(Accha|Acha)\b/gi, '$1, ')
    .replace(/\b(Theek hai)\b/gi, '$1, ')
    .replace(/\b(Chalo)\b/gi, '$1, ')
    .replace(/\b(Namaste)\b/gi, '$1, ')
    .replace(/\b(Suno)\b/gi, '$1, ')
    .replace(/\b(Bolo)\b/gi, '$1, ')
    .replace(/\b(Dekho)\b/gi, '$1, ')
    .replace(/\b(Bas)\b/gi, '$1, ')
    // Natural rhythm at punctuation
    .replace(/,\s*/g, ', ')
    .replace(/\.\s*/g, '. ')
    .replace(/\?\s*/g, '? ')
    .replace(/!\s*/g, '! ');
}

// POST /api/jimi/tts - Main TTS endpoint (tries Piper > Edge > Browser)
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, lang = 'hi-IN' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const cleaned = addNaturalPatterns(cleanText(text));
    if (!cleaned) return res.json({ fallback: true, text: '' });

    // Try Piper TTS first (fastest, free)
    try {
      const piperResult = tryPiperTTS(cleaned, lang);
      if (piperResult) {
        return res.json({ audio: piperResult, format: 'wav', engine: 'piper' });
      }
    } catch {}

    // Try Edge TTS (natural neural voice)
    try {
      const edgeResult = tryEdgeTTS(cleaned, lang);
      if (edgeResult) {
        return res.json({ audio: edgeResult, format: 'mp3', engine: 'edge' });
      }
    } catch {}

    // Fallback to browser TTS
    res.json({ fallback: true, text: cleaned });
  } catch (error) {
    res.json({ fallback: true, text: req.body.text || '' });
  }
});

// POST /api/jimi/tts/edge - Edge TTS only
router.post('/tts/edge', async (req: Request, res: Response) => {
  try {
    const { text, lang = 'hi-IN' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const cleaned = addNaturalPatterns(cleanText(text));
    if (!cleaned) return res.json({ fallback: true, text: '' });

    const edgeResult = tryEdgeTTS(cleaned, lang);
    if (edgeResult) {
      return res.json({ audio: edgeResult, format: 'mp3', engine: 'edge' });
    }

    res.json({ fallback: true, text: cleaned });
  } catch (error) {
    res.json({ fallback: true, text: req.body.text || '' });
  }
});

// ==================== PIPER TTS ====================
function tryPiperTTS(text: string, lang: string): string | null {
  try {
    if (!existsSync('/usr/bin/piper') && !existsSync('/usr/local/bin/piper')) {
      return null;
    }

    const voiceMap: Record<string, string> = {
      'hi-IN': 'hi_IN-swara-medium',
      'en-US': 'en_US-lessac-medium',
      'en-IN': 'en_IN-voice',
    };

    const voice = voiceMap[lang] || 'hi_IN-swara-medium';
    const tmpWav = join(tmpdir(), `jimi-piper-${randomBytes(4).toString('hex')}.wav`);
    const tmpMp3 = join(tmpdir(), `jimi-piper-${randomBytes(4).toString('hex')}.mp3`);
    const textFile = join(tmpdir(), `jimi-text-${randomBytes(4).toString('hex')}.txt`);

    writeFileSync(textFile, text, 'utf-8');

    // Run Piper TTS
    execSync(
      `cat "${textFile}" | piper --model "${voice}" --output_file "${tmpWav}"`,
      { timeout: 10000, stdio: 'pipe' }
    );

    // Convert WAV to MP3 if ffmpeg available
    try {
      execSync(`ffmpeg -y -i "${tmpWav}" -codec:a libmp3lame -qscale:a 2 "${tmpMp3}"`, {
        timeout: 5000, stdio: 'pipe',
      });
      const audio = readFileSync(tmpMp3).toString('base64');
      cleanup(tmpWav, tmpMp3, textFile);
      return audio;
    } catch {
      // Return WAV if ffmpeg not available
      const audio = readFileSync(tmpWav).toString('base64');
      cleanup(tmpWav, textFile);
      return audio;
    }
  } catch {
    return null;
  }
}

// ==================== EDGE TTS ====================
function tryEdgeTTS(text: string, lang: string): string | null {
  try {
    if (!existsSync('/usr/local/bin/edge-tts') && !existsSync('/usr/bin/edge-tts')) {
      // Try pip-installed path
      try {
        execSync('which edge-tts', { stdio: 'pipe' });
      } catch {
        return null;
      }
    }

    const voiceMap: Record<string, string> = {
      'hi-IN': 'hi-IN-SwaraNeural',
      'en-US': 'en-US-JennyNeural',
      'en-IN': 'en-IN-NeerjaNeural',
      'mr-IN': 'mr-IN-AarohiNeural',
      'ta-IN': 'ta-IN-PallaviNeural',
      'te-IN': 'te-IN-ShrutiNeural',
      'bn-IN': 'bn-IN-TanishaaNeural',
      'gu-IN': 'hi-IN-SwaraNeural',
      'kn-IN': 'kn-IN-SapnaNeural',
      'ml-IN': 'ml-IN-SobhanaNeural',
      'pa-IN': 'pa-IN-GurpreetNeural',
    };

    const voice = voiceMap[lang] || 'hi-IN-SwaraNeural';
    const tmpMp3 = join(tmpdir(), `jimi-edge-${randomBytes(4).toString('hex')}.mp3`);
    const textFile = join(tmpdir(), `jimi-text-${randomBytes(4).toString('hex')}.txt`);

    writeFileSync(textFile, text, 'utf-8');

    execSync(
      `edge-tts --voice "${voice}" --rate="-2%" --pitch="+5Hz" --file "${textFile}" --write-media "${tmpMp3}"`,
      { timeout: 10000, stdio: 'pipe' }
    );

    const audio = readFileSync(tmpMp3).toString('base64');
    cleanup(tmpMp3, textFile);
    return audio;
  } catch {
    return null;
  }
}

function cleanup(...files: string[]) {
  for (const f of files) {
    try { unlinkSync(f); } catch {}
  }
}

export default router;
