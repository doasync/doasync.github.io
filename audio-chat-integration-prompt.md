Phase 3:

```
Users can transcribe audio files through:

- Drag-and-drop audio files onto chat input (Not planned)
- Click attachment button and select audio file (Implemented)
- Paste audio file from clipboard (Not planned)
- (Note) Recording an audio (Implemented)
- (Note) Any audio file in the main chat window can be transcribed via an action button.

The transcription process shows:

- Upload progress indicator (Not planned)
- Audio waveform visualization (Not planned)
- Transcription progress bar (TBD)
- Option to insert transcribed text or create new message (Not planned)
- Language detection indicator (Not planned)
```

Actually, I understood now that this is Transcription integration to the chat
messages. Let's merge it with the Phase 4:

```
Users can send and receive audio messages:

- **Recording**: Click microphone button to record voice message (Implemented)
- **Playback**: Audio messages show inline player with controls (Implemented)
- **Transcription**: Option to show/hide transcript for audio messages (TBD)
- **Text-to-Speech**: Click speaker icon to hear any text message read aloud (TBD!!!)
- **Multi-modal**: Mix text and audio in same conversation

Audio message UI includes:

- Waveform visualization (Not planned)
- Play/pause button (Native)
- Progress bar with time (Native)
- Speed control (1x, 1.5x, 2x) (Native)
- Download button (Native)
- Transcript toggle (TBD)
- (Note) Speaker icon to hear the text (TBD)

Note: Text-to-speech Speaker button should generate a playable file below the message (as a part of it). We need a button to show/hide this additional file as well.

Important note: a generated transcript and TTS audio must bot be sent to the chat completions endpoint with the conversation history (user/assistant). These temporary files should be ephemeral and be kept only in UI state (effector). They should be marked as "Temporary" and probably highlighted or colored differently somehow.
```
