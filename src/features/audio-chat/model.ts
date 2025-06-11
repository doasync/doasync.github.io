import { createDomain, createEffect, sample, combine } from 'effector';
import { debug } from 'patronum/debug';
import { AudioChatState, AudioMessageData, AudioRecordingState, PlaybackState } from './types';
import { startRecording, stopRecording, processAudioBlob } from './utils/audio-processing';

const domain = createDomain('audio-chat');

// Stores
export const $isRecording = domain.createStore<boolean>(false);
export const $recordingDuration = domain.createStore<number>(0);
export const $audioBlob = domain.createStore<Blob | null>(null);
export const $recordingWaveform = domain.createStore<number[]>([]);
export const $playbackStates = domain.createStore<Record<string, PlaybackState>>({});
export const $activePlayer = domain.createStore<string | null>(null);
export const $audioChatError = domain.createStore<string | null>(null);

export const $recordingState = combine({
  isRecording: $isRecording,
  recordingDuration: $recordingDuration,
  audioBlob: $audioBlob,
  waveform: $recordingWaveform,
});

export const $audioChatState = combine({
  recording: $recordingState,
  playbackStates: $playbackStates,
  activePlayer: $activePlayer,
  error: $audioChatError,
});

// Events
export const recordingStarted = domain.createEvent();
export const recordingStopped = domain.createEvent();
export const recordingCancelled = domain.createEvent();
export const audioMessageSent = domain.createEvent<Blob>();
export const playbackToggled = domain.createEvent<string>();
export const playbackRateChanged = domain.createEvent<{ id: string; rate: number }>();
export const playbackTimeUpdated = domain.createEvent<{ id: string; time: number }>();
export const playbackEnded = domain.createEvent<string>();
export const transcriptToggled = domain.createEvent<string>();
export const waveformUpdated = domain.createEvent<number[]>();
export const clearAudioError = domain.createEvent();
export const recordingDurationTick = domain.createEvent();

// Effects
export const startRecordingFx = createEffect<void, MediaRecorder, Error>({
  handler: startRecording,
});

export const stopRecordingFx = createEffect<MediaRecorder, Blob, Error>({
  handler: stopRecording,
});

export const processAudioBlobFx = createEffect<Blob, AudioMessageData, Error>({
  handler: processAudioBlob,
});

export const generateTranscriptFx = createEffect<Blob, string, Error>({
  handler: async (audioBlob) => {
    // This will use the STT feature to generate transcript
    // For now, return placeholder
    return 'Audio transcript will be generated here';
  },
});

// Recording state management
$isRecording
  .on(startRecordingFx.done, () => true)
  .on([stopRecordingFx.done, recordingCancelled], () => false);

// Recording duration timer
let recordingInterval: NodeJS.Timeout | null = null;

$recordingDuration
  .on(recordingDurationTick, (duration) => duration + 0.1)
  .reset([recordingStarted, recordingCancelled]);

sample({
  clock: recordingStarted,
  fn: () => {
    // Start recording duration timer
    recordingInterval = setInterval(() => {
      recordingDurationTick();
    }, 100);
  },
});

sample({
  clock: [recordingStopped, recordingCancelled],
  fn: () => {
    // Stop recording duration timer
    if (recordingInterval) {
      clearInterval(recordingInterval);
      recordingInterval = null;
    }
  },
});

// Audio blob management
$audioBlob
  .on(stopRecordingFx.doneData, (_, blob) => blob)
  .reset([recordingStarted, audioMessageSent, recordingCancelled]);

// Waveform updates
$recordingWaveform
  .on(waveformUpdated, (_, waveform) => waveform)
  .reset([recordingStarted, recordingCancelled]);

// Error handling
$audioChatError
  .on(startRecordingFx.fail, (_, { error }) => error.message)
  .on(stopRecordingFx.fail, (_, { error }) => error.message)
  .on(processAudioBlobFx.fail, (_, { error }) => error.message)
  .reset(clearAudioError);

// Start recording
sample({
  clock: recordingStarted,
  target: startRecordingFx,
});

// Stop recording and get blob
let mediaRecorder: MediaRecorder | null = null;

startRecordingFx.doneData.watch((recorder) => {
  mediaRecorder = recorder;
});

sample({
  clock: recordingStopped,
  source: startRecordingFx.doneData,
  filter: Boolean,
  fn: () => mediaRecorder!,
  target: stopRecordingFx,
});

// Cancel recording
sample({
  clock: recordingCancelled,
  fn: () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder = null;
    }
  },
});

// Process audio blob when ready to send
sample({
  clock: audioMessageSent,
  target: processAudioBlobFx,
});

// Playback state management
export const initializePlayback = domain.createEvent<{ id: string; duration: number }>();

$playbackStates.on(initializePlayback, (states, { id, duration }) => ({
  ...states,
  [id]: {
    isPlaying: false,
    currentTime: 0,
    playbackRate: 1,
    duration,
  },
}));

$playbackStates.on(playbackToggled, (states, id) => {
  const state = states[id];
  if (!state) return states;
  
  return {
    ...states,
    [id]: {
      ...state,
      isPlaying: !state.isPlaying,
    },
  };
});

$playbackStates.on(playbackRateChanged, (states, { id, rate }) => {
  const state = states[id];
  if (!state) return states;
  
  return {
    ...states,
    [id]: {
      ...state,
      playbackRate: rate,
    },
  };
});

$playbackStates.on(playbackTimeUpdated, (states, { id, time }) => {
  const state = states[id];
  if (!state) return states;
  
  return {
    ...states,
    [id]: {
      ...state,
      currentTime: time,
    },
  };
});

$playbackStates.on(playbackEnded, (states, id) => {
  const state = states[id];
  if (!state) return states;
  
  return {
    ...states,
    [id]: {
      ...state,
      isPlaying: false,
      currentTime: 0,
    },
  };
});

// Active player management
$activePlayer
  .on(playbackToggled, (current, id) => {
    const state = $playbackStates.getState()[id];
    return state?.isPlaying ? id : null;
  })
  .on(playbackEnded, (current, id) => current === id ? null : current);

// Stop other players when a new one starts
sample({
  clock: playbackToggled,
  source: { active: $activePlayer, states: $playbackStates },
  filter: ({ states }, id) => states[id]?.isPlaying === false,
  fn: ({ active }) => {
    if (active) {
      // Stop the currently playing audio
      const states = $playbackStates.getState();
      if (states[active]?.isPlaying) {
        return active;
      }
    }
    return null;
  },
}).watch((activeId) => {
  if (activeId) {
    playbackToggled(activeId);
  }
});

// Debug
if (process.env.NODE_ENV === 'development') {
  debug(domain);
}