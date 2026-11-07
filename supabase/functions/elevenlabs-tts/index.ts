const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_CHARS = 5000;
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!text || text.length > MAX_CHARS) {
      return jsonResponse({ error: "Text is missing or too long" }, 400);
    }

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "ElevenLabs API key is not configured" }, 500);
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, model_id: "eleven_monolingual_v1" }),
    });

    if (!response.ok) {
      console.error("elevenlabs-tts upstream failed", response.status);
      return jsonResponse({ error: "Could not generate speech" }, 502);
    }

    const audio = await response.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    console.error("elevenlabs-tts failed", err);
    return jsonResponse({ error: "Could not generate speech" }, 500);
  }
});
