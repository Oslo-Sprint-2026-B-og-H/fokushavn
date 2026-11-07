import { GoogleGenAI } from "npm:@google/genai@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_STEPS = 60;
const MAX_VOCABULARY = 10;
const MODELS = ["gemini-3.8-flash", "gemini-3.7-flash"];
const MAX_ATTEMPTS = 3;

const SYSTEM_PROMPT = `Translate these instructions into the target language given below. Keep any original homework text or foreign language passages intact. Return the same JSON structure.

If the homework is language-learning practice (the student must work with text written in a foreign language), leave every field exactly as it was given.

Input and output use this JSON structure:
{
  "session_title": "short title",
  "vocabulary": [{ "word": "word", "definition": "definition" }],
  "steps": [{ "text": "instruction and embedded homework content", "hints": ["hint"] }]
}

Keep the same number of steps, the same number of vocabulary items in the same order, and the same number of hints per step. Return ONLY the JSON object.`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

type VocabularyItem = { word: string; definition: string };
type StepInput = { text: string; hints: string[] };
type Content = { session_title: string; vocabulary: VocabularyItem[]; steps: StepInput[] };

function parseInput(body: unknown): { content: Content; language: string } | null {
  if (!isRecord(body)) return null;
  const { steps, vocabulary, session_title: title, language } = body;
  if (typeof title !== "string" || typeof language !== "string") return null;
  if (!Array.isArray(steps) || steps.length === 0 || steps.length > MAX_STEPS) return null;
  if (!Array.isArray(vocabulary) || vocabulary.length > MAX_VOCABULARY) return null;

  const validSteps = steps.every(
    (step) => isRecord(step) && typeof step.text === "string" && isStringArray(step.hints),
  );
  const validVocabulary = vocabulary.every(
    (item) => isRecord(item) && typeof item.word === "string" && typeof item.definition === "string",
  );
  if (!validSteps || !validVocabulary) return null;

  return {
    language,
    content: {
      session_title: title,
      vocabulary: vocabulary as VocabularyItem[],
      steps: (steps as Record<string, unknown>[]).map((step) => ({
        text: step.text as string,
        hints: step.hints as string[],
      })),
    },
  };
}

function matchesShape(payload: unknown, input: Content): payload is Content {
  if (!isRecord(payload) || typeof payload.session_title !== "string") return false;
  const { steps, vocabulary } = payload;
  if (!Array.isArray(steps) || steps.length !== input.steps.length) return false;
  if (!Array.isArray(vocabulary) || vocabulary.length !== input.vocabulary.length) return false;

  const stepsValid = steps.every(
    (step, index) =>
      isRecord(step) &&
      typeof step.text === "string" &&
      isStringArray(step.hints) &&
      step.hints.length === input.steps[index].hints.length,
  );
  const vocabularyValid = vocabulary.every(
    (item) => isRecord(item) && typeof item.word === "string" && typeof item.definition === "string",
  );
  return stepsValid && vocabularyValid;
}

function languageName(language: string) {
  return language === "no" ? "Norwegian (bokmål)" : "English";
}

const MODEL_RETRY_PATTERN = /\b(503|429|500)\b/;

async function generateWithRetry(ai: GoogleGenAI, prompt: string) {
  let lastError: unknown;
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        });
      } catch (err) {
        lastError = err;
        const message = err instanceof Error ? err.message : String(err);
        if (!MODEL_RETRY_PATTERN.test(message)) throw err;
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
    const parsed = parseInput(await req.json());
    if (!parsed) {
      return jsonResponse({ error: "Steps, vocabulary, and language are required" }, 400);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "Gemini API key is not configured" }, 500);
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `${SYSTEM_PROMPT}\n\nTarget language: ${languageName(parsed.language)}\n\nInput:\n${JSON.stringify(parsed.content)}`;
    const response = await generateWithRetry(ai, prompt);

    let payload: unknown;
    try {
      payload = JSON.parse(response.text ?? "");
    } catch {
      return jsonResponse({ error: "Could not translate session" }, 502);
    }

    if (!matchesShape(payload, parsed.content)) {
      return jsonResponse({ error: "Could not translate session" }, 502);
    }

    return jsonResponse(payload);
  } catch (err) {
    console.error("translate-session failed", err);
    return jsonResponse({ error: "Could not translate session" }, 500);
  }
});
