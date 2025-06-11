import { TTSParams, TTSResponse, VoiceProvider } from './types';
import { $apiKey, $providerApiUrl } from '../chat-settings/model';

interface ProviderConfig {
  endpoint: string;
  headers: Record<string, string>;
  body: (params: TTSParams) => Record<string, any>;
  parseResponse: (response: Response) => Promise<TTSResponse>;
}

async function getProviderConfig(provider: VoiceProvider): Promise<ProviderConfig> {
  const apiKey = $apiKey.getState();
  const providerUrl = $providerApiUrl.getState();
  
  if (!apiKey) {
    throw new Error('API key is not set');
  }

  const baseConfigs: Record<VoiceProvider, ProviderConfig> = {
    voidai: {
      endpoint: `${providerUrl}/v1/audio/speech`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: (params) => ({
        model: params.model,
        input: params.text,
        voice: params.voice,
        response_format: params.format,
        ...(params.speed && params.model !== 'gpt-4o-mini-tts' ? { speed: params.speed } : {}),
      }),
      parseResponse: async (response) => {
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`TTS failed: ${error}`);
        }
        const audio = await response.arrayBuffer();
        return {
          audio,
          format: 'mp3', // Default format
        };
      },
    },
    openai: {
      endpoint: 'https://api.openai.com/v1/audio/speech',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: (params) => ({
        model: params.model,
        input: params.text,
        voice: params.voice,
        response_format: params.format,
        ...(params.speed && params.model !== 'gpt-4o-mini-tts' ? { speed: params.speed } : {}),
        ...(params.instructions && params.model === 'gpt-4o-mini-tts' ? { instructions: params.instructions } : {}),
      }),
      parseResponse: async (response) => {
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`TTS failed: ${error}`);
        }
        const audio = await response.arrayBuffer();
        return {
          audio,
          format: 'mp3',
        };
      },
    },
    gemini: {
      endpoint: '', // Will be set dynamically in body function
      headers: {
        'Content-Type': 'application/json',
      },
      body: (params) => {
        // Parse speaker format: "Speaker1: text\nSpeaker2: text"
        const lines = params.text.split('\n');
        const speakers = new Map<string, string>();
        let singleSpeakerText = params.text;
        
        // Check if text contains speaker format
        lines.forEach(line => {
          const match = line.match(/^(Speaker\d+):\s*(.+)$/);
          if (match) {
            speakers.set(match[1], match[2]);
          }
        });

        const hasMultipleSpeakers = speakers.size > 1;
        
        if (hasMultipleSpeakers) {
          // Multi-speaker configuration
          const speakerVoiceConfigs = Array.from(speakers.keys()).map((speaker, index) => ({
            speaker,
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: index === 0 ? params.voice : 'Kore', // Use selected voice for first speaker
              },
            },
          }));

          return {
            contents: [{
              parts: [{
                text: params.text,
              }],
            }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                multiSpeakerVoiceConfig: {
                  speakerVoiceConfigs,
                },
              },
            },
          };
        } else {
          // Single speaker configuration
          return {
            contents: [{
              parts: [{
                text: singleSpeakerText,
              }],
            }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: params.voice,
                  },
                },
              },
            },
          };
        }
      },
      parseResponse: async (response) => {
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`TTS failed: ${error}`);
        }
        
        const data = await response.json();
        const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.audioData;
        
        if (!audioBase64) {
          throw new Error('No audio data in response');
        }
        
        // Convert base64 to ArrayBuffer
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Gemini returns PCM audio at 24kHz, convert to WAV
        const audio = createWavFromPcm(bytes.buffer, 24000);
        
        return {
          audio,
          format: 'wav',
        };
      },
    },
  };

  return baseConfigs[provider];
}

// Helper function to create WAV file from PCM data
function createWavFromPcm(pcmData: ArrayBuffer, sampleRate: number): ArrayBuffer {
  const pcmLength = pcmData.byteLength;
  const wavBuffer = new ArrayBuffer(44 + pcmLength);
  const view = new DataView(wavBuffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, 'data');
  view.setUint32(40, pcmLength, true);
  
  // Copy PCM data
  const pcmView = new Uint8Array(pcmData);
  const wavView = new Uint8Array(wavBuffer);
  wavView.set(pcmView, 44);
  
  return wavBuffer;
}

export async function generateSpeech(params: TTSParams): Promise<TTSResponse> {
  // Determine provider from model or use selected provider
  let provider: VoiceProvider = 'voidai';
  
  if (params.model.includes('gemini')) {
    provider = 'gemini';
  } else if (params.model.includes('gpt-4o')) {
    provider = 'openai';
  }
  
  const config = await getProviderConfig(provider);
  
  // Special handling for Gemini endpoint
  let endpoint = config.endpoint;
  if (provider === 'gemini') {
    const apiKey = $apiKey.getState();
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${apiKey}`;
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: config.headers,
    body: JSON.stringify(config.body(params)),
  });
  
  return config.parseResponse(response);
}