// ══════════════════════════════════════════════════════════════════════════
// Firestore REST Client for Cloudflare Workers
// Uses service account JWT to authenticate with Google APIs
// No heavy Firebase SDK needed — just fetch() calls
// ══════════════════════════════════════════════════════════════════════════

/**
 * Create a JWT from the service account for Google API auth.
 * Signs with RS256 using the private key from the service account JSON.
 */
async function createSignedJwt(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const toSign = `${enc(header)}.${enc(payload)}`;

  // Import the private key
  const pem = sa.private_key;
  const binaryDer = Uint8Array.from(atob(pem.replace(/-----.*-----/g, "").replace(/\s/g, "")), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(toSign));
  const b64sig = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `${toSign}.${b64sig}`;
}

/**
 * Get a short-lived access token from Google.
 */
async function getAccessToken(sa) {
  const jwt = await createSignedJwt(sa);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  return data.access_token;
}

// ── Cached token ──────────────────────────────────────────────────────────

let _cachedToken = null;
let _tokenExpiry = 0;

async function getToken(sa) {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;
  _cachedToken = await getAccessToken(sa);
  _tokenExpiry = Date.now() + 3000 * 1000; // refresh 10 min before expiry
  return _cachedToken;
}

// ── Firestore REST API helpers ────────────────────────────────────────────

function firestoreUrl(projectId, path) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`;
}

/**
 * Get a single Firestore document.
 * Returns parsed data or null if not found.
 */
export async function getDoc(sa, projectId, docPath) {
  const token = await getToken(sa);
  const res = await fetch(firestoreUrl(projectId, docPath), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.warn("[firestore] GET failed:", res.status, await res.text());
    return null;
  }
  const doc = await res.json();
  return parseFirestoreFields(doc.fields ?? {});
}

/**
 * Set a Firestore document (full replace).
 */
export async function setDoc(sa, projectId, docPath, data) {
  const token = await getToken(sa);
  const fields = serializeToFirestoreFields(data);
  const res = await fetch(firestoreUrl(projectId, docPath), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    console.warn("[firestore] SET failed:", res.status, await res.text());
    return false;
  }
  return true;
}

/**
 * Update specific fields in a Firestore document.
 */
export async function updateDoc(sa, projectId, docPath, data) {
  const token = await getToken(sa);
  const fields = serializeToFirestoreFields(data);
  const res = await fetch(
    `${firestoreUrl(projectId, docPath)}?updateMask.fieldPaths=${Object.keys(fields).join("&updateMask.fieldPaths=")}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );
  return res.ok;
}

// ── Firestore format converters ───────────────────────────────────────────

function parseFirestoreFields(fields) {
  const result = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.integerValue !== undefined) result[key] = Number(val.integerValue);
    else if (val.doubleValue !== undefined) result[key] = val.doubleValue;
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
    else if (val.arrayValue) result[key] = (val.arrayValue.values ?? []).map(parseFirestoreValue);
    else if (val.mapValue) result[key] = parseFirestoreFields(val.mapValue.fields ?? {});
    else if (val.nullValue !== undefined) result[key] = null;
    else if (val.timestampValue) result[key] = val.timestampValue;
  }
  return result;
}

function parseFirestoreValue(val) {
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return Number(val.integerValue);
  if (val.doubleValue !== undefined) return val.doubleValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.arrayValue) return (val.arrayValue.values ?? []).map(parseFirestoreValue);
  if (val.mapValue) return parseFirestoreFields(val.mapValue.fields ?? {});
  return null;
}

function serializeToFirestoreFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof val === "string") {
      fields[key] = { stringValue: val };
    } else if (typeof val === "number") {
      fields[key] = Number.isInteger(val)
        ? { integerValue: val }
        : { doubleValue: val };
    } else if (typeof val === "boolean") {
      fields[key] = { booleanValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = { arrayValue: { values: val.map(v => serializeSingleValue(v)) } };
    } else if (typeof val === "object") {
      fields[key] = { mapValue: { fields: serializeToFirestoreFields(val) } };
    }
  }
  return fields;
}

function serializeSingleValue(val) {
  if (val === null) return { nullValue: null };
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "number") return Number.isInteger(val) ? { integerValue: val } : { doubleValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(serializeSingleValue) } };
  if (typeof val === "object") return { mapValue: { fields: serializeToFirestoreFields(val) } };
  return { stringValue: String(val) };
}
