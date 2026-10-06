import { createSupabaseContext } from "npm:@supabase/server@1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type ImageInput = {
  data: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
};

class AIProviderError extends Error {
  constructor(public readonly kind: "text" | "vision") {
    super(kind === "vision" ? "VISION_PROVIDER_UNAVAILABLE" : "TEXT_PROVIDER_UNAVAILABLE");
  }
}

const publicProviderMessage = (error: unknown) => {
  if (error instanceof AIProviderError && error.kind === "vision")
    return "Image analysis is temporarily unavailable. Your screenshot is safe; try again in a moment.";
  return "Planny AI is temporarily unavailable. Your tasks are safe; try again in a moment.";
};

async function callGemini(prompt: string, schema: object, image?: ImageInput) {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new AIProviderError(image ? "vision" : "text");
  const model = Deno.env.get("AI_MODEL") || "gemini-3.5-flash-lite";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            ...(image
              ? [{ inlineData: { mimeType: image.mimeType, data: image.data } }]
              : []),
          ],
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: schema,
          temperature: 0.2,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  const payload = await response.json();
  if (!response.ok) {
    console.error("Gemini provider request failed", {
      status: response.status,
      detail: payload?.error?.message,
    });
    throw new AIProviderError(image ? "vision" : "text");
  }
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new AIProviderError(image ? "vision" : "text");
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini returned invalid JSON", error);
    throw new AIProviderError(image ? "vision" : "text");
  }
}

async function callOllama(prompt: string, schema: object, image?: ImageInput) {
  const baseUrl = (Deno.env.get("OLLAMA_BASE_URL") || "").replace(/\/$/, "");
  if (!baseUrl) throw new AIProviderError(image ? "vision" : "text");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = Deno.env.get("OLLAMA_API_KEY");
  if (key) headers.Authorization = `Bearer ${key}`;
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: image
        ? Deno.env.get("AI_VISION_MODEL") || "qwen3.6:latest"
        : Deno.env.get("AI_MODEL") || "gemma4:31b",
      messages: [{
        role: "user",
        content: `${prompt}\n\nReturn only valid JSON matching this schema, without markdown:\n${JSON.stringify(schema)}`,
        ...(image ? { images: [image.data] } : {}),
      }],
      format: schema,
      stream: false,
      think: false,
      options: { temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json();
  if (!response.ok) {
    console.error("Ollama provider request failed", {
      status: response.status,
      model: image
        ? Deno.env.get("AI_VISION_MODEL") || "qwen3.6:latest"
        : Deno.env.get("AI_MODEL") || "gemma4:31b",
      detail: payload?.error,
    });
    throw new AIProviderError(image ? "vision" : "text");
  }
  const content = String(payload?.message?.content || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error("Ollama returned invalid JSON", error);
    throw new AIProviderError(image ? "vision" : "text");
  }
}

export default {
  fetch: async (request: Request) => {
    if (request.method === "OPTIONS")
      return new Response("ok", { headers: corsHeaders });
    if (request.method !== "POST")
      return json({ error: "Method not allowed." }, 405);

    try {
      const { data: context, error: authError } = await createSupabaseContext(
        request,
        { auth: "user" },
      );
      if (authError || !context)
        return json(
          { error: authError?.message || "Sign in to use Planny AI." },
          authError?.status || 401,
        );

      const body = await request.json();
      const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
      const schema = body?.schema;
      const rawImage = body?.image;
      let image: ImageInput | undefined;
      if (rawImage !== undefined) {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (
          !rawImage ||
          typeof rawImage !== "object" ||
          !allowedTypes.includes(rawImage.mimeType) ||
          typeof rawImage.data !== "string" ||
          rawImage.data.length < 16 ||
          rawImage.data.length > 8_400_000 ||
          !/^[A-Za-z0-9+/]+={0,2}$/.test(rawImage.data)
        ) return json({ error: "Invalid image. Use a JPG, PNG, or WebP up to 6 MB." }, 400);
        image = { mimeType: rawImage.mimeType, data: rawImage.data };
      }
      if (
        !prompt ||
        prompt.length > 30_000 ||
        !schema ||
        typeof schema !== "object" ||
        JSON.stringify(schema).length > 20_000
      )
        return json({ error: "Invalid AI request." }, 400);

      const { data: accepted, error: quotaError } = await context.supabase.rpc(
        "consume_ai_request",
      );
      if (quotaError) throw quotaError;
      if (!accepted)
        return json({ error: "Daily AI limit reached. Try again tomorrow." }, 429);

      const provider = (Deno.env.get("AI_PROVIDER") || "gemini").toLowerCase();
      const result = provider === "ollama"
        ? await callOllama(prompt, schema, image)
        : await callGemini(prompt, schema, image);
      return json({ result });
    } catch (error) {
      console.error(error);
      return json({ error: publicProviderMessage(error) }, 503);
    }
  },
};
