const JWT_SECRET = process.env.ADMIN_PASSWORD || "vibepanel";

const te = new TextEncoder();
const td = new TextDecoder();

function base64urlEncode(str: string | Uint8Array): string {
  const binary = typeof str === "string" ? te.encode(str) : str;
  let base64 = btoa(String.fromCharCode(...binary));
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function getSigningKey(): Promise<CryptoKey> {
  const keyData = te.encode(JWT_SECRET);
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJWT(payload: Record<string, any>): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const headerPart = base64urlEncode(JSON.stringify(header));
  const payloadPart = base64urlEncode(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7-day expiration
    })
  );
  const tokenString = `${headerPart}.${payloadPart}`;

  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, te.encode(tokenString));

  return `${tokenString}.${base64urlEncode(new Uint8Array(signature))}`;
}

export async function verifyJWT(token: string): Promise<Record<string, any> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerPart, payloadPart, signaturePart] = parts;
    const tokenString = `${headerPart}.${payloadPart}`;

    const key = await getSigningKey();
    const verified = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlDecode(signaturePart) as any,
      te.encode(tokenString)
    );

    if (!verified) return null;

    const payload = JSON.parse(td.decode(base64urlDecode(payloadPart)));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
