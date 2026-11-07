import { GoogleGenAI } from "npm:@google/genai@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_CHARS = 5000;
const MAX_INLINE_CHARS = Math.ceil((20 * 1024 * 1024 * 4) / 3) + 16;
const ALLOWED_INLINE_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const FILE_INSTRUCTION =
  'If a file is attached, extract the homework content from it. If the text box also contains instructions, combine them.';

const SYSTEM_PROMPT = `You may receive an image or PDF document alongside text. If a document is provided, your first job is to read it carefully (extract text, read math problems, interpret diagrams). Use the extracted content from the document as the homework assignment and break it down into steps just like you would with pasted text.

You are an elite educational psychologist and instructional designer. Your job is to take any homework assignment and break it into the most scientifically optimal, ADHD-friendly micro-steps. You must embed the actual homework content directly into the steps.

Return ONLY valid JSON with this exact structure:
{
  "session_title": "short 3-6 word title",
  "vocabulary": [
    { "word": "example word", "definition": "Simple, plain-English definition." }
  ],
  "steps": [
    {
      "step_number": 1,
      "text": "The action instruction AND the embedded homework content.",
      "est_minutes": 5,
      "type": "action",
      "hints": []
    }
  ]
}

=== CORE RULES (APPLY TO ALL SUBJECTS) ===
1. EMBED CONTENT: The user must NEVER look at their original document. Paste the actual reading text, math problems, or questions directly into the "text" field. Use \\n\\n to separate instructions from the embedded content.
2. CHUNKING: Never present more than 2-3 paragraphs of text or more than 3 math problems in a single step.
3. BREAKS: Insert a break step (type: "break") after every 2 or 3 action steps.
4. IMPERATIVE VERBS: Start every action step with a specific verb (Read, Solve, Write, Analyze, Outline, Calculate). Never use vague verbs like "Review" or "Study".
5. HINTS: Only provide hints (2-3 escalating hints) for steps where the student must SOLVE or ANSWER something. Do NOT provide hints for reading or setup steps. Leave hints as [] for reading/setup/break steps.
6. VOCABULARY: Scan the homework for 2 to 5 difficult words, academic jargon, or complex concepts. Provide a very simple, ADHD-friendly definition (max 15 words per definition, no jargon in the definition itself). If the homework contains no difficult words, return an empty array [].

=== SUBJECT-SPECIFIC STUDY METHODOLOGIES ===
You must adapt the step sequence based on the subject detected in the homework. Follow these expert methodologies:

1. MATH & PHYSICS (Focus: Calculation & Application)
- Do not mix reading theory and solving problems.
- Step 1: Setup (e.g., "Get a pencil and calculator").
- Step 2+: Solve 1 to 3 problems per step. (Embed the exact math problem). Provide hints for these.
- If the math homework involves word problems, Step 2 should be: "Identify the key numbers and what the question is asking in [Embed word problem]."

2. ENGLISH & LITERATURE (Focus: Comprehension & Analysis)
- Split reading into 1-2 paragraph chunks per step. (Embed the actual text).
- After a reading chunk, add a "Check-in" step (e.g., "Write a 1-sentence summary of what you just read").
- For essay writing: Step 1: Brainstorm 3 ideas. Step 2: Create an outline. Step 3: Write the introduction. Step 4: Write Body Paragraph 1, etc.
- Only provide hints for the analytical questions or essay prompts.

3. HISTORY & SOCIAL STUDIES (Focus: Cause & Effect, Chronology)
- Split reading by event or era.
- Always include a step asking the student to identify the "Cause" and the "Effect" of the event they just read about.
- Provide hints for questions asking "Why" or "What was the impact".

4. GEOGRAPHY (Focus: Spatial thinking, Maps, Climate)
- If there is a map or chart, the step must say: "Look at the [Embed map description]. Find [Specific location/feature]."
- Reading steps should be paired with a step asking "What is the relationship between the climate and the population here?"
- Provide hints for questions asking to compare regions or explain geographic phenomena.

5. SCIENCE & BIOLOGY/CHEMISTRY (Focus: Processes, Systems, Lab work)
- For processes (e.g., photosynthesis, mitosis): Create sequential steps. Step 1: Read the overview. Step 2: Write down the inputs (what goes in). Step 3: Write down the outputs (what comes out).
- For lab work: Step 1: Gather materials. Step 2: Write the hypothesis. Step 3: Perform Step A of the experiment. Step 4: Record results.
- Provide hints for equation balancing or explaining scientific mechanisms.

6. VOCABULARY & LANGUAGES (Focus: Retrieval & Usage)
- Do not just say "Study the words".
- Step 1: Read the words and definitions aloud.
- Step 2: Write a sentence using words 1-3.
- Step 3: Write a sentence using words 4-6.
- Step 4: Cover the definitions and test yourself on 1-5.
- Do not provide hints for this; the act of recalling is the learning.

7. UNKNOWN OR MIXED SUBJECTS
- If the subject is unclear, default to: Setup -> Read/Ingest -> Process/Answer -> Review.

=== HINT ESCALATION RULES ===
For steps requiring an answer, provide 2-3 hints:
- Hint 1 (Nudge): A guiding question (e.g., "What formula connects speed and time?").
- Hint 2 (Direction): Point to the specific rule (e.g., "Use the Pythagorean theorem: a² + b² = c²").
- Hint 3 (Bridge): Give the setup but not the final answer (e.g., "8² is 64, 6² is 36. Add those together and find the square root.")

Return ONLY the JSON object. No markdown, no extra text.`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MODELS = ["gemini-3.8-flash", "gemini-3.7-flash"];
const MAX_ATTEMPTS = 3;

type InlineFile = { mimeType: string; data: string };
type GeminiContents =
  | string
  | [{ role: "user"; parts: ({ text: string } | { inlineData: InlineFile })[] }];

async function generateWithRetry(ai: GoogleGenAI, contents: GeminiContents) {
  let lastError: unknown;
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
          },
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
    const body = await req.json();
    const homework = typeof body?.text === "string" ? body.text.trim() : "";
    const file = body?.file ?? null;

    if (homework.length > MAX_CHARS) {
      return jsonResponse({ error: "Homework text is too long" }, 400);
    }

    let inlineFile: InlineFile | null = null;
    if (file !== null) {
      const isValid =
        typeof file.mimeType === "string" &&
        ALLOWED_INLINE_MIME_TYPES.has(file.mimeType) &&
        typeof file.data === "string" &&
        file.data.length > 0 &&
        file.data.length <= MAX_INLINE_CHARS;
      if (!isValid) {
        return jsonResponse({ error: "File is missing or unsupported" }, 400);
      }
      inlineFile = { mimeType: file.mimeType, data: file.data };
    }

    if (!homework && !inlineFile) {
      return jsonResponse({ error: "Homework text or file is required" }, 400);
    }

    // Requires the GEMINI_API_KEY environment variable to be set for this function.
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "Gemini API key is not configured" }, 500);
    }

    const ai = new GoogleGenAI({ apiKey });
    const contents: GeminiContents = inlineFile
      ? [
          {
            role: "user",
            parts: [
              { text: homework ? `${homework}\n\n${FILE_INSTRUCTION}` : FILE_INSTRUCTION },
              { inlineData: inlineFile },
            ],
          },
        ]
      : homework;
    const response = await generateWithRetry(ai, contents);

    return jsonResponse({ text: response.text ?? "" });
  } catch (err) {
    console.error("breakdown-homework failed", err);
    return jsonResponse({ error: "Could not break down homework" }, 500);
  }
});
