function studioConfig() {
  const baseUrl = process.env.OMNISTUDIO_BASE_URL;
  const apiKey = process.env.OMNISTUDIO_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("Sosyal medya servisi ayarlı değil.");
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

async function studioPost(path, body, timeoutMs) {
  const { baseUrl, apiKey } = studioConfig();
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error?.name === "TimeoutError") throw new Error("Servis zamanında yanıt vermedi.");
    throw new Error("Servise bağlanılamadı.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || data?.success === false) {
    const message = data?.error?.message || data?.error || data?.message;
    throw new Error(typeof message === "string" ? message : "Servis isteği başarısız.");
  }
  return { data, baseUrl };
}

function messageParts(data) {
  const content = data?.choices?.[0]?.message?.content;
  return Array.isArray(content) ? content : [];
}

function replyText(data) {
  const fromParts = messageParts(data)
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n");
  if (fromParts) return fromParts;
  const reply = data?.reply || data?.choices?.[0]?.message?.content || data?.text;
  return typeof reply === "string" ? reply.trim() : "";
}

function imageSource(data) {
  const part = messageParts(data).find((item) => typeof item?.image_url?.url === "string");
  if (part) return part.image_url.url;
  const item = Array.isArray(data?.data) ? data.data[0] : data?.image;
  if (!item) return "";
  if (typeof item === "string") return item;
  if (typeof item.b64_json === "string") return `data:image/png;base64,${item.b64_json}`;
  return typeof item.url === "string" ? item.url : "";
}

function decodeDataUrl(value) {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) return null;
  return { buffer: Buffer.from(match[2].replace(/\s/g, ""), "base64"), contentType: match[1] };
}

async function downloadImage(rawUrl, baseUrl) {
  const embedded = decodeDataUrl(rawUrl);
  if (embedded) return embedded;

  const studio = new URL(baseUrl);
  const parsed = new URL(rawUrl);
  const localHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  const imageUrl = localHost ? new URL(`${parsed.pathname}${parsed.search}`, studio.origin) : parsed;
  if (imageUrl.hostname !== studio.hostname) throw new Error("Beklenmeyen görsel adresi.");

  let imageResponse;
  try {
    imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(60000) });
  } catch {
    throw new Error("Görsel indirilemedi.");
  }
  if (!imageResponse.ok) throw new Error("Görsel indirilemedi.");
  const type = (imageResponse.headers.get("content-type") || "image/png").split(";")[0];
  if (!type.startsWith("image/")) throw new Error("Servis görsel döndürmedi.");
  return { buffer: Buffer.from(await imageResponse.arrayBuffer()), contentType: type };
}

export async function completeChat(messages) {
  try {
    const { data } = await studioPost("/chat/completions", { model: "gpt-4o", messages }, 120000);
    const text = replyText(data);
    if (!text) throw new Error("Servis boş yanıt döndü.");
    return text;
  } catch (error) {
    if (/STALE_RESPONSE/i.test(error?.message || "")) {
      throw new Error("Metin servisi yeni bir yanıt üretemedi. Tekrar deneyin.");
    }
    throw error;
  }
}

export async function generateContent(prompt, referenceImages = [], options = {}) {
  const body = { prompt, size: options.size || "1024x1024" };
  if (referenceImages.length) body.referenceImages = referenceImages;
  const { data, baseUrl } = await studioPost("/images/generations", body, 240000);
  const source = imageSource(data);
  const text = replyText(data);
  if (source) {
    const image = await downloadImage(source, baseUrl);
    return { kind: "image", text, ...image };
  }
  if (text) return { kind: "text", text };
  throw new Error("Servis boş yanıt döndü.");
}
