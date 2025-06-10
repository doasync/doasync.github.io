import { createParser } from "eventsource-parser";
import {
  StreamChatParams,
  EventSourceParserEvent,
  isParsedDataEvent,
  isCompletionEvent,
  APIParsedChunkData,
} from "./types";
import { buildChatCompletionsUrl } from "@/features/api-config";

/**
 * Performs the actual fetch request and processes the SSE stream.
 * This function is intended to be used as the handler for an Effector effect.
 * It communicates progress, data, completion, errors, and abortion via callbacks.
 *
 * @param params Parameters including API request details, API key, and callbacks.
 * @param params Parameters including API request details, API key, callbacks, and the consumer-generated streamId.
 * @param signal An AbortSignal to allow cancellation of the fetch request.
 * @throws An error if a non-abort related issue occurs (e.g., initial fetch failure, critical stream error).
 *         AbortError is caught and handled via the onAbort callback, allowing the promise to resolve.
 */
export async function fetchChatStream(
  params: StreamChatParams, // streamId is now inside params
  signal: AbortSignal
): Promise<void> {
  const {
    streamId, // Destructure streamId from params
    apiKey,
    providerApiUrl, // Add providerApiUrl parameter
    model,
    messages,
    temperature,
    max_tokens,
    top_p,
    // Callbacks
    onChunk,
    onComplete,
    onError,
    onAbort,
  } = params;

  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens,
    top_p,
    stream: true, // Explicitly enable streaming
    // Add any other passthrough parameters here
  };

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  try {
    const chatCompletionsUrl = buildChatCompletionsUrl(providerApiUrl);
    const response = await fetch(chatCompletionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // Add any other required headers e.g., HTTP-Referer, X-Title
      },
      body: JSON.stringify(requestBody),
      signal, // Pass the AbortSignal to fetch
    });

    // Handle immediate non-2xx responses before attempting to stream
    if (!response.ok) {
      let errorPayload: any = {};
      try {
        errorPayload = await response.json();
      } catch {
        // Ignore JSON parsing error if body is not valid JSON
      }
      throw new Error(
        `API Error (${response.status}): ${
          errorPayload?.error?.message || response.statusText
        }`
      );
    }

    if (!response.body) {
      throw new Error("Response body is missing.");
    }

    const decoder = new TextDecoder();
    reader = response.body.getReader(); // Assign reader here

    // Callback for eventsource-parser
    const onParse = (event: EventSourceParserEvent) => {
      if (signal.aborted) {
        // Avoid processing events after abortion is signaled
        // Although the reader loop should stop, this adds robustness.
        return;
      }

      if (isCompletionEvent(event)) {
        // console.log(`[Stream ${streamId}] Completion event received.`);
        onComplete({ streamId });
        return; // Stop further processing for this stream
      }

      if (isParsedDataEvent(event)) {
        try {
          const jsonData: APIParsedChunkData = JSON.parse(event.data);
          // console.log(`[Stream ${streamId}] Data chunk received:`, jsonData);
          
          // Check if this is an error response
          if ('error' in jsonData) {
            const errorData = jsonData as any;
            console.error(`[Stream ${streamId}] API Error:`, errorData.error);
            onError({
              streamId,
              error: new Error(`API Error: ${errorData.error.message || 'Unknown error'}`),
            });
            return;
          }
          
          // Validate chunk structure before passing to callback
          if (!jsonData.choices || !Array.isArray(jsonData.choices)) {
            console.warn(`[Stream ${streamId}] Chunk missing choices array:`, jsonData);
            return; // Skip this chunk but continue stream
          }
          
          onChunk({ streamId, chunk: jsonData });
        } catch (parseError) {
          console.error(
            `[Stream ${streamId}] Error parsing JSON chunk:`,
            event.data,
            parseError
          );
          // Decide if a single parse error should terminate the stream
          // For now, report error but let the stream continue if possible
          onError({
            streamId,
            error: new Error(`Failed to parse JSON chunk: ${parseError}`),
          });
        }
      }
      // else if (isCommentEvent(event)) {
      //   console.log(`[Stream ${streamId}] Comment received:`, event); // Ignore comments
      // }
      // else if (event.type === 'reconnect-interval') {
      //    console.log(`[Stream ${streamId}] Reconnect interval received:`, event.retry);
      // }
    };

    const parser = createParser({ onEvent: onParse }); // Try 'onEvent' as the callback key

    // Read loop
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Check signal before reading - fetch might not throw immediately
      if (signal.aborted) {
        // This check might be redundant if reader.read() throws AbortError reliably,
        // but provides an extra safety layer.
        throw new DOMException("Stream aborted by signal", "AbortError");
      }

      const { done, value } = await reader.read();

      if (done) {
        // console.log(`[Stream ${streamId}] Reader finished.`);
        // If [DONE] wasn't received, signal completion here
        // Check if onComplete has already been called by the [DONE] event
        // This requires managing state, which we aim to avoid here.
        // Relying on [DONE] event is safer. If the stream ends without
        // [DONE], it might indicate an issue. We could call onError here instead.
        // For now, assume API provider sends [DONE] reliably.
        break;
      }

      // Feed the chunk to the parser
      parser.feed(decoder.decode(value, { stream: true }));
    }
  } catch (error: any) {
    if (error.name === "AbortError") {
      // console.log(`[Stream ${streamId}] Aborted.`);
      onAbort({ streamId });
      // Do not re-throw AbortError, let the promise resolve successfully
      // This aligns with the 'silent cancellation' requirement for the effect consumer
    } else {
      // Handle other errors (network, initial response error, parsing errors thrown, etc.)
      console.error(
        `[Stream ${streamId}] Error during fetch or stream processing:`,
        error
      );
      onError({ streamId, error });
      // Re-throw the error so the wrapping Effector effect rejects
      throw error;
    }
  } finally {
    // Clean up the reader if it was assigned and not already closed/cancelled.
    // reader.releaseLock() might be needed if cancellation doesn't automatically release it.
    // However, modern browsers often handle this. Let's omit explicit cleanup for now
    // unless resource leaks are observed.
    // if (reader && !signal.aborted) { // Avoid cancelling if already aborted
    //   try { await reader.cancel(); } catch {}
    // }
  }
}
