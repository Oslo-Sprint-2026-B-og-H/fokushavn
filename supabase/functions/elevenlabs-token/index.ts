import { getCallerUserId } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const callerId = await getCallerUserId(req);
    if (!callerId) {
      return jsonResponse({ error: "Sign in required" }, 401);
    }

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    const agentId = Deno.env.get("ELEVENLABS_AGENT_ID");
    if (!apiKey || !agentId) {
      return jsonResponse({ error: "ElevenLabs is not configured" }, 500);
    }

    const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/token");
    url.searchParams.set("agent_id", agentId);

    const response = await fetch(url, {
      method: "GET",
      headers: { "xi-api-key": apiKey },
    });

    if (!response.ok) {
      console.error("elevenlabs-token upstream failed", response.status);
      return jsonResponse({ error: "Could not start a voice session" }, 502);
    }

    const payload: unknown = await response.json();
    const token =
      typeof payload === "object" && payload !== null && "token" in payload ? payload.token : null;
    if (typeof token !== "string" || token.length === 0) {
      return jsonResponse({ error: "Unexpected response" }, 502);
    }

    return jsonResponse({ token });
  } catch (err) {
    console.error("elevenlabs-token failed", err);
    return jsonResponse({ error: "Could not start a voice session" }, 500);
  }
});
