import { AudioMessageData, AudioProcessingOptions } from '../types';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export async function startRecording(): Promise<MediaRecorder> {
  // Request microphone permission
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  // Determine supported mime type
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/mp4')
    ? 'audio/mp4'
    : 'audio/wav';
  
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    audioBitsPerSecond: 128000,
  });
  
  const chunks: Blob[] = [];
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };
  
  mediaRecorder.onstop = () => {
    // Clean up stream
    stream.getTracks().forEach(track => track.stop());
  };
  
  // Store chunks on the recorder for later retrieval
  (mediaRecorder as any).chunks = chunks;
  
  mediaRecorder.start(100); // Collect data every 100ms for waveform
  
  // Set up waveform visualization
  setupWaveformVisualization(stream);
  
  return mediaRecorder;
}

export async function stopRecording(mediaRecorder: MediaRecorder): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const chunks = (mediaRecorder as any).chunks || [];
    
    mediaRecorder.onstop = () => {
      const mimeType = mediaRecorder.mimeType;
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };
    
    mediaRecorder.onerror = (event) => {
      reject(new Error('Recording failed'));
    };
    
    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  });
}

export async function processAudioBlob(blob: Blob): Promise<AudioMessageData> {
  const url = URL.createObjectURL(blob);
  const duration = await getAudioDuration(blob);
  const waveform = await generateWaveform(blob);
  
  return {
    url,
    duration,
    format: blob.type.split('/')[1] || 'webm',
    waveform,
    size: blob.size,
  };
}

async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
    };
    audio.onerror = reject;
    audio.src = URL.createObjectURL(blob);
  });
}

async function generateWaveform(blob: Blob, samples: number = 100): Promise<number[]> {
  const context = getAudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await context.decodeAudioData(arrayBuffer);
  
  const channelData = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / samples);
  const waveform: number[] = [];
  
  for (let i = 0; i < samples; i++) {
    const start = blockSize * i;
    let sum = 0;
    
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[start + j]);
    }
    
    waveform.push(sum / blockSize);
  }
  
  // Normalize waveform
  const max = Math.max(...waveform);
  return waveform.map(v => v / max);
}

function setupWaveformVisualization(stream: MediaStream): void {
  const context = getAudioContext();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  
  analyser.fftSize = 256;
  source.connect(analyser);
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  // This would emit waveform updates in a real implementation
  const updateWaveform = () => {
    analyser.getByteFrequencyData(dataArray);
    
    // Convert to normalized waveform
    const waveform = Array.from(dataArray.slice(0, 50)).map(v => v / 255);
    
    // Emit waveform update event
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('waveformUpdate', { detail: waveform }));
    }
  };
  
  // Update waveform 10 times per second
  const interval = setInterval(updateWaveform, 100);
  
  // Clean up on stream end
  stream.getTracks()[0].onended = () => {
    clearInterval(interval);
    source.disconnect();
  };
}

export function createAudioPlayer(url: string): HTMLAudioElement {
  const audio = new Audio(url);
  audio.preload = 'metadata';
  return audio;
}

export async function convertAudioFormat(
  blob: Blob,
  targetFormat: 'mp3' | 'wav' | 'webm',
  options?: AudioProcessingOptions
): Promise<Blob> {
  // This is a placeholder - in a real implementation, you would:
  // 1. Use Web Audio API to decode the audio
  // 2. Re-encode in the target format
  // 3. Or use a library like lamejs for MP3 encoding
  
  console.warn('Audio format conversion not implemented, returning original blob');
  return blob;
}