import { apiRequest } from "@/lib/api/config";

export type AISource = "training_details" | "training_config";

export interface AskAIRequest {
  provider: "gemini";
  source: AISource;
  question: string;
  context: Record<string, unknown>;
}

export interface AskAIResponse {
  answer: string;
  provider: "gemini";
}

/**
 * Ask AI backend endpoint (Gemini or other LLM behind the backend)
 * POST /api/ai/ask
 */
export const askAI = async (payload: AskAIRequest, signal?: AbortSignal): Promise<AskAIResponse> => {
  return apiRequest<AskAIResponse>("/ai/ask", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
    // One attempt: the server answers within ~45 s (or says it took too long); retrying
    // a slow AI question only multiplies the wait
    maxRetries: 1,
  });
};
