import { GoogleGenAI, type LiveServerMessage } from '@google/genai';

export type ToolCall = { id: string; name: string; args: Record<string, unknown> };
export type LiveHandlers = {
  onAudio: (base64Pcm24k: string) => void;
  onInputText: (text: string) => void;
  onOutputText: (text: string) => void;
  onTurnComplete: () => void;
  onInterrupted: () => void;
  onToolCalls: (calls: ToolCall[]) => void;
  onClose: (reason: string) => void;
};
export type LiveConnection = {
  sendAudio: (base64Pcm16k: string) => void;
  sendText: (text: string) => void;
  sendToolResponses: (responses: { id: string; name: string; response: Record<string, unknown> }[]) => void;
  close: () => void;
};

/**
 * Connects straight to Gemini Live with the single-use token our backend minted.
 * The model, prompt, voice and tool list are locked inside that token, so nothing
 * here (or in a modified client) can change them.
 */
export async function connectLive(token: string, model: string, handlers: LiveHandlers): Promise<LiveConnection> {
  const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } });
  let closed = false;
  const session = await ai.live.connect({
    model,
    callbacks: {
      onmessage: (message: LiveServerMessage) => {
        const content = message.serverContent;
        for (const part of content?.modelTurn?.parts ?? []) {
          if (part.inlineData?.data) handlers.onAudio(part.inlineData.data);
        }
        if (content?.inputTranscription?.text) handlers.onInputText(content.inputTranscription.text);
        if (content?.outputTranscription?.text) handlers.onOutputText(content.outputTranscription.text);
        if (content?.interrupted) handlers.onInterrupted();
        if (content?.turnComplete) handlers.onTurnComplete();
        const calls = message.toolCall?.functionCalls;
        if (calls?.length) {
          handlers.onToolCalls(calls.map((c) => ({ id: c.id ?? '', name: c.name ?? '', args: (c.args ?? {}) as Record<string, unknown> })));
        }
        if (message.goAway) handlers.onClose('The assistant session is ending.');
      },
      onerror: (event: { message?: string }) => {
        if (!closed) handlers.onClose(event.message || 'The voice connection failed.');
      },
      onclose: (event: { reason?: string }) => {
        if (!closed) handlers.onClose(event.reason || 'The voice connection closed.');
      },
    },
  });
  return {
    sendAudio: (data) => {
      if (!closed) session.sendRealtimeInput({ audio: { data, mimeType: 'audio/pcm;rate=16000' } });
    },
    sendText: (text) => {
      if (!closed) session.sendRealtimeInput({ text });
    },
    sendToolResponses: (responses) => {
      if (!closed) session.sendToolResponse({ functionResponses: responses });
    },
    close: () => {
      closed = true;
      try {
        session.close();
      } catch {
        // already closed
      }
    },
  };
}
