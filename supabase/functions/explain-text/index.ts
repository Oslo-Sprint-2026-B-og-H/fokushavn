import { GoogleGenAI } from "npm:@google/genai@1.0.0";
import { getCallerUserId } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MIN_CHARS = 3;
const MAX_CHARS = 250;

const MODELS = ["gemini-3.8-flash", "gemini-3.7-flash"];
const MAX_ATTEMPTS = 3;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildSystemPrompt(phrase: string, language: string) {
  const languageLine =
    language === "no" ? "Write your explanation in Norwegian (bokmål)." : "Write your explanation in English.";
  return `You are a helpful, ADHD-friendly tutor. Explain the following phrase in 1 to 2 short sentences. Use very simple language, avoid jargon, and get straight to the point. ${languageLine}

Phrase: "${phrase}"`;
}

async function generateWithRetry(ai: GoogleGenAI, phrase: string, language: string) {
  let lastError: unknown;
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await ai.models.generateContent({
          model,
          contents: phrase,
          config: { systemInstruction: buildSystemPrompt(phrase, language) },
        });
      } catch (err) {
        lastError = err;
        const message = err instanceof Error ? err.message : String(err);
        if (!/\b(503|429|500)\b/.test(message)) throw err;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw lastError;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const callerId = await getCallerUserId(req);
    if (!callerId) {
      return jsonResponse({ error: "Sign in required" }, 401);
    }

    const body = await req.json();
    const phrase = typeof body?.text === "string" ? body.text.trim() : "";
    const language = typeof body?.language === "string" ? body.language : "en";

    if (phrase.length < MIN_CHARS || phrase.length > MAX_CHARS) {
      return jsonResponse({ error: "Selected text is missing or too long" }, 400);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "Gemini API key is not configured" }, 500);
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await generateWithRetry(ai, phrase, language);

    return jsonResponse({ text: (response.text ?? "").trim() });
  } catch (err) {
    console.error("explain-text failed", err);
    return jsonResponse({ error: "Could not explain the text" }, 500);
  }
});
