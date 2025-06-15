import { createDomain, createEvent, Effect } from 'effector';
import { fetchChatStream } from './api';
import {
  StreamChatParams,
  AbortStreamPayload,
  StreamErrorPayload,
  StreamAbortPayload, // Import StreamAbortPayload
} from './types';

// --- Domain ---
const chatStreamDomain = createDomain('chatStream');

// --- Abort Controller Management ---
// Store active AbortControllers outside of Effector's state,
// as it's purely an internal implementation detail for cancellation.
const activeStreams = new Map<string, AbortController>();

// --- Events ---
/**
 * Event to request the abortion of an ongoing chat stream.
 * Payload should contain the `streamId` of the stream to abort.
 */
export const abortStream = createEvent<AbortStreamPayload>('abortStream');

// --- Effects ---
/**
 * Effect to initiate an API provider chat stream.
 * Handles the underlying fetch request, SSE parsing, and cancellation.
 * Communicates results via callbacks provided in StreamChatParams.
 *
 * Resolves (void) on successful completion or successful abortion.
 * Rejects (Error) on unrecoverable errors during setup or streaming.
 */
export const streamChatFx: Effect<StreamChatParams, void, Error> =
  chatStreamDomain.effect({
    name: 'streamChatFx',
    handler: async (params: StreamChatParams): Promise<void> => {
      // streamId is now provided in params by the consumer
      const { streamId } = params;
      const controller = new AbortController();

      // Register the controller using the consumer-provided streamId
      activeStreams.set(streamId, controller);

      // Add a safety check callback for errors that might not reject the promise directly
      const originalOnError = params.onError;
      const wrappedOnError = (payload: StreamErrorPayload) => {
        // Ensure cleanup happens even if onError is called without promise rejection
        if (payload.streamId === streamId) {
          activeStreams.delete(streamId);
        }
        originalOnError(payload);
      };

      // Add a cleanup callback for successful abortion
      const originalOnAbort = params.onAbort;
      const wrappedOnAbort = (payload: StreamAbortPayload) => {
        // Cleanup is already handled by the finally block, but added for symmetry if desired
        // if (payload.streamId === streamId) {
        //    activeStreams.delete(streamId);
        // }
        originalOnAbort(payload);
      };

      try {
        // Call the core API function, passing the generated ID and signal
        // Prepare final params including wrapped callbacks
        const finalParams = {
          ...params, // Includes streamId from the consumer
          onError: wrappedOnError,
          onAbort: wrappedOnAbort,
        };
        // Call the core API function with only params and signal
        await fetchChatStream(finalParams, controller.signal);
        // If fetchChatStream completes without throwing (including caught AbortError),
        // the effect resolves successfully.
      } catch (error) {
        // Errors thrown by fetchChatStream (excluding caught AbortError)
        // will cause the effect to reject.
        // Ensure cleanup happens on catastrophic failure before fetchChatStream's finally.
        // activeStreams.delete(streamId); // Cleanup handled in finally
        console.error(
          `[Stream ${params.streamId}] Effect handler caught error:`, // Log using ID from params
          error,
        );
        // Re-throw to reject the effect promise
        throw error;
      } finally {
        // Always clean up the controller map when the operation finishes,
        // regardless of success, failure, or abortion.
        // fetchChatStream's internal try/catch/finally handles most cases,
        // but this ensures cleanup even if the handler itself throws early.
        activeStreams.delete(params.streamId); // Cleanup using ID from params
        // console.log(`[Stream ${streamId}] Cleaned up controller.`);
      }
    },
  });

// --- Logic ---

// Watch for abortStream events and trigger the corresponding AbortController
abortStream.watch(({ streamId }) => {
  const controller = activeStreams.get(streamId);
  if (controller) {
    // console.log(`[Stream ${streamId}] Abort requested via event.`);
    controller.abort();
    // No need to delete here, the effect's finally block handles cleanup
  } else {
    console.warn(
      `[Stream ${streamId}] Abort requested for unknown or completed stream.`,
    );
  }
});

import { debug } from 'patronum';
debug(abortStream, streamChatFx);
