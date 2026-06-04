import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Google Cloud TTS - Natural voice
// POST /api/jimi/tts
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, lang = 'hi-IN', gender = 'FEMALE', speed = 1.0, pitch = 0 } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 chars)' });
    }

    // Google Cloud TTS API key
    const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_CLOUD_TTS_API_KEY;
    
    if (!apiKey) {
      // Fallback: return text so frontend can use Web Speech API
      return res.json({ 
        fallback: true, 
        text,
        message: 'Google TTS not configured, using browser TTS' 
      });
    }

    // Map our lang codes to Google TTS voice names
    const voiceMap: Record<string, string> = {
      'hi-IN': 'hi-IN-Wavenet-A',     // Hindi female - natural
      'en-US': 'en-US-Wavenet-F',     // English female
      'mr-IN': 'mr-IN-Wavenet-A',     // Marathi female
      'ta-IN': 'ta-IN-Wavenet-A',     // Tamil female
      'te-IN': 'te-IN-Wavenet-A',     // Telugu female
      'bn-IN': 'bn-IN-Wavenet-A',     // Bengali female
      'gu-IN': 'gu-IN-Wavenet-A',     // Gujarati female
      'kn-IN': 'kn-IN-Wavenet-A',     // Kannada female
      'ml-IN': 'ml-IN-Wavenet-A',     // Malayalam female
      'pa-IN': 'pa-IN-Wavenet-A',     // Punjabi female
    };

    const voiceName = voiceMap[lang] || 'hi-IN-Wavenet-A';

    // Google Cloud TTS API
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: lang,
            name: voiceName,
            ssmlGender: gender,
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: speed,
            pitch: pitch,
            volumeGainDb: 0,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Google TTS error:', error);
      return res.json({ 
        fallback: true, 
        text,
        message: 'TTS API error, using browser TTS' 
      });
    }

    const data: any = await response.json();
    
    if (data.audioContent) {
      // Return base64 audio
      res.json({
        audio: data.audioContent,
        format: 'mp3',
        voice: voiceName,
        lang,
      });
    } else {
      res.json({ 
        fallback: true, 
        text,
        message: 'No audio content returned' 
      });
    }
  } catch (error: any) {
    console.error('TTS endpoint error:', error);
    res.json({ 
      fallback: true, 
      text: req.body.text || '',
      message: 'TTS service unavailable' 
    });
  }
});

// Edge TTS alternative (free, no API key needed)
// POST /api/jimi/tts/edge
router.post('/tts/edge', async (req: Request, res: Response) => {
  try {
    const { text, lang = 'hi-IN', gender = 'Female' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Edge TTS voice mapping
    const edgeVoiceMap: Record<string, string> = {
      'hi-IN': 'hi-IN-SwaraNeural',      // Hindi female - very natural
      'en-US': 'en-US-JennyNeural',       // English female
      'mr-IN': 'mr-IN-AarohiNeural',     // Marathi female
      'ta-IN': 'ta-IN-PallaviNeural',    // Tamil female
      'te-IN': 'te-IN-ShrutiNeural',     // Telugu female
      'bn-IN': 'bn-IN-TanishaaNeural',   // Bengali female
      'gu-IN': 'gu-IN-DhwaniNeural',     // Gujarati female
      'kn-IN': 'kn-IN-SapnaNeural',      // Kannada female
      'ml-IN': 'ml-IN-SobhanaNeural',    // Malayalam female
      'pa-IN': 'pa-IN-GurpreetNeural',   // Punjabi female
    };

    const voice = edgeVoiceMap[lang] || 'hi-IN-SwaraNeural';

    // Use edge-tts via subprocess
    const { execSync } = await import('child_process');
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');

    const tmpFile = path.join(os.tmpdir(), `jimi-tts-${Date.now()}.mp3`);
    
    try {
      // edge-tts command
      const rate = '+0%';
      const pitch = '+0Hz';
      
      execSync(
        `edge-tts --voice "${voice}" --rate="${rate}" --pitch="${pitch}" --text "${text.replace(/"/g, '\\"')}" --write-media "${tmpFile}"`,
        { timeout: 10000, stdio: 'pipe' }
      );

      const audioBuffer = fs.readFileSync(tmpFile);
      fs.unlinkSync(tmpFile);

      res.json({
        audio: audioBuffer.toString('base64'),
        format: 'mp3',
        voice,
        lang,
        engine: 'edge-tts',
      });
    } catch (execError) {
      // edge-tts not installed, fall back to browser TTS
      res.json({
        fallback: true,
        text,
        message: 'Edge TTS not available, using browser TTS',
      });
    }
  } catch (error: any) {
    console.error('Edge TTS error:', error);
    res.json({
      fallback: true,
      text: req.body.text || '',
      message: 'Edge TTS service unavailable',
    });
  }
});

export default router;
