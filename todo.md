🤖 Özel ChatGPT & DALL-E API Entegrasyon Dokümantasyonu
Bu API, Hetzner sunucunuzda çalışan yerel ChatGPT ve DALL-E servisiniz üzerinden dış uygulamalara OpenAI uyumlu bir arayüz sunar. Resmi OpenAI API'sine gitmez, ekstra maliyet veya token ücreti çıkarmaz.

📌 Hızlı Başlangıç & Bağlantı Bilgileri
Parametre	Değer
Base URL	http://167.233.201.31:3456/v1
API Key (Bearer Token)	sk-omnistudio-2026
Desteklenen Modeller	gpt-4o, gpt-4o-mini, chatgpt-4o, dall-e-3
1. Metin Sohbeti (Chat Completions)
Resmi OpenAI formatıyla birebir uyumludur.

Uç Nokta (Endpoint)
POST http://167.233.201.31:3456/v1/chat/completions

Headerlar
http

Content-Type: application/json
Authorization: Bearer sk-omnistudio-2026
İstek Gövdesi (Body)
json

{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "Sen yardımsever ve kurumsal bir asistansın." },
    { "role": "user", "content": "Müşterilerimize hitaben profesyonel bir karşılama mesajı yazar mısın?" }
  ]
}
İpucu: Basit entegrasyonlar için messages yerine doğrudan tek satırda {"prompt": "Mesajınız"} da gönderebilirsiniz.

Başarılı Yanıt (Response - HTTP 200)
json

{
  "id": "chatcmpl-job_ebe64412e2716116",
  "object": "chat.completion",
  "created": 1790516505,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Değerli Müşterimiz, şirketimize hoş geldiniz. Size nasıl yardımcı olabiliriz?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 14,
    "completion_tokens": 12,
    "total_tokens": 26
  },
  "reply": "Değerli Müşterimiz, şirketimize hoş geldiniz. Size nasıl yardımcı olabiliriz?",
  "success": true
}
2. Görsel Üretimi (Text-to-Image / DALL-E)
Uç Nokta (Endpoint)
POST http://167.233.201.31:3456/v1/images/generations

Headerlar
http

Content-Type: application/json
Authorization: Bearer sk-omnistudio-2026
İstek Gövdesi (Body)
json

{
  "prompt": "İstanbul Boğazı gün batımı, 4k ultra gerçekçi fotoğraf",
  "size": "1024x1024"
}
Başarılı Yanıt (Response - HTTP 200)
json

{
  "created": 1790516500,
  "data": [
    {
      "url": "http://167.233.201.31:3456/public/outputs/dalle_image_123.png"
    }
  ]
}
3. Kod Örnekleri
A) Node.js / TypeScript (Resmi OpenAI SDK)
javascript

import OpenAI from "openai";
const client = new OpenAI({
  baseURL: "http://167.233.201.31:3456/v1",
  apiKey: "sk-omnistudio-2026",
});
async function main() {
  // 1. Soru sor / sohbet et
  const chatResponse = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "Sen yazılım uzmanısın." },
      { role: "user", content: "React 19 hakkında 2 cümlelik bilgi ver." },
    ],
  });
  console.log("Cevap:", chatResponse.choices[0].message.content);
  // 2. Görsel üret
  const imageResponse = await client.images.generate({
    prompt: "Geleceğin şehir silüeti, siberpunk",
    size: "1024x1024",
  });
  console.log("Görsel URL:", imageResponse.data[0].url);
}
main();
B) Python (Resmi OpenAI SDK)
python

from openai import OpenAI
client = OpenAI(
    base_url="http://167.233.201.31:3456/v1",
    api_key="sk-omnistudio-2026"
)
# 1. Metin Sohbeti
completion = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Türkiye'nin başkenti neresidir?"}
    ]
)
print("Yanıt:", completion.choices[0].message.content)
# 2. Görsel Üretimi
image = client.images.generate(
    prompt="Yeşil çimler üzerinde koşan yavru köpek",
    size="1024x1024"
)
print("Görsel:", image.data[0].url)
C) cURL / Postman
bash

# Sohbet İsteği:
curl -X POST http://167.233.201.31:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-omnistudio-2026" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Merhaba!"}]
  }'
4. Hazır Masaüstü ve Web Uygulamaları Entegrasyonu
Eğer arkadaşınız Chatbox, NextChat, LibreChat, TypingMind veya n8n gibi hazır bir AI arayüzü kullanıyorsa:

Uygulama ayarlarında Model Sağlayıcısı (Provider) olarak OpenAI seçin.
API Host / Base URL kutusuna: http://167.233.201.31:3456/v1 yazın.
API Key kutusuna: sk-omnistudio-2026 yazın.
Model adı olarak gpt-4o seçin.
Tüm sistem anında bağlanacak ve çalışmaya başlayacaktır!