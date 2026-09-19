/**
 * read-label: a photo of a nutrition table in, the figures out.
 *
 * This runs on a server because the model needs an API key, and the app's
 * repository is public. Deploy it as a Supabase Edge Function (or run it
 * anywhere Deno runs) and point the app at it:
 *
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...  LABEL_READER_KEY=<any long random string>
 *   supabase functions deploy read-label --no-verify-jwt
 *
 * Then in the app's .env:
 *   EXPO_PUBLIC_LABEL_READER_URL=https://<project>.supabase.co/functions/v1/read-label
 *   EXPO_PUBLIC_LABEL_READER_KEY=<the same random string>
 *
 * `LABEL_READER_KEY` is the gate: without it the URL would be a free reader for
 * anyone who found it. It is shipped inside the app, so it stops drive-by
 * abuse, not a determined person; a per-account limit belongs here before the
 * app is public.
 *
 * The response is exactly the JSON the app's `readLabel` expects, every figure
 * per 100 g or 100 ml, `null` for anything the pack does not state.
 */
import Anthropic from "npm:@anthropic-ai/sdk";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";
import { z } from "npm:zod";

const Reading = z.object({
  name: z.string().nullable().describe("The product name as printed on the pack, or null if not visible"),
  brand: z.string().nullable().describe("The brand as printed, or null"),
  unit: z.enum(["g", "ml"]).describe("Whether the table is per 100 g (solids) or per 100 ml (drinks)"),
  kcal: z.number().nullable().describe("Energy in kcal per 100 g/ml. If only kJ is printed, divide by 4.184"),
  fat: z.number().nullable().describe("Fat in g per 100"),
  saturated: z.number().nullable().describe("Of which saturated fatty acids, g per 100"),
  carbs: z.number().nullable().describe("Carbohydrates in g per 100"),
  sugars: z.number().nullable().describe("Of which sugars, g per 100"),
  fibre: z.number().nullable().describe("Fibre in g per 100, null if not printed"),
  protein: z.number().nullable().describe("Protein in g per 100"),
  salt: z.number().nullable().describe("Salt in g per 100. If only sodium is printed, salt = sodium × 2.5"),
  serving: z.number().nullable().describe("One portion in g or ml if the pack states a portion size, else null"),
  legible: z.boolean().describe("False if the nutrition table cannot be made out at all"),
  note: z.string().nullable().describe("One short sentence, in the language of the pack, about anything you were unsure of or could not read. Null if everything was clear"),
});

const SYSTEM = `You read nutrition tables off photographs of food packaging, mostly Dutch and other European packs, and return the figures as JSON.

European tables are printed per 100 g or per 100 ml, sometimes with a second column per portion. Always report the per-100 column. If a pack prints only per-portion figures and states the portion size, convert to per 100. Dutch labels read: Energie (kJ / kcal), Vetten, waarvan verzadigde vetzuren, Koolhydraten, waarvan suikers, Vezels, Eiwitten, Zout. Report kcal, never kJ. A decimal comma is a decimal point.

Report only what is printed. Never estimate a figure that is not on the pack; use null. If the table is blurred, cut off or absent, set legible to false and say in note what you could see. Do not round beyond what is printed.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-cresq-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const GATE = Deno.env.get("LABEL_READER_KEY");
/** About 6 MB of base64: a resized phone photo is a tenth of that. */
const MAX_IMAGE = 6_000_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (GATE && req.headers.get("x-cresq-key") !== GATE) return json({ error: "no" }, 401);

  let image = "";
  let mime = "image/jpeg";
  try {
    const body = (await req.json()) as { image?: unknown; mime?: unknown };
    image = typeof body.image === "string" ? body.image : "";
    mime = body.mime === "image/png" || body.mime === "image/webp" ? body.mime : "image/jpeg";
  } catch {
    return json({ error: "body must be JSON with an image" }, 400);
  }
  if (!image) return json({ error: "no image" }, 400);
  if (image.length > MAX_IMAGE) return json({ error: "image too large" }, 413);

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 4096,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mime, data: image } },
            { type: "text", text: "Read the nutrition table on this pack." },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(Reading) },
    });
    if (response.stop_reason === "refusal") return json({ error: "declined", legible: false }, 422);
    if (!response.parsed_output) return json({ error: "unreadable", legible: false }, 422);
    return json(response.parsed_output);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: "busy, try again shortly" }, 429);
    if (error instanceof Anthropic.AuthenticationError) return json({ error: "the reader is not configured" }, 500);
    if (error instanceof Anthropic.APIError) return json({ error: `reader error ${error.status}` }, 502);
    return json({ error: "reader error" }, 502);
  }
});
