import { ENV } from "./_core/env";

const bucketId = "dexus-documents";

function storageBaseUrl() {
  if (!ENV.supabaseUrl || !ENV.supabaseSecretKey) {
    throw new Error("Private document storage is not configured.");
  }
  return `${ENV.supabaseUrl.replace(/\/+$/, "")}/storage/v1`;
}

function storageHeaders(extra?: Record<string, string>) {
  return {
    apikey: ENV.supabaseSecretKey,
    Authorization: `Bearer ${ENV.supabaseSecretKey}`,
    ...extra,
  };
}

function normalizeKey(value: string) {
  const key = value
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "-"))
    .join("/");
  if (!key) throw new Error("Document storage key is invalid.");
  return key;
}

function objectPath(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

function appendHashSuffix(relKey: string): string {
  const key = normalizeKey(relKey);
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = key.lastIndexOf(".");
  return lastDot === -1 ? `${key}_${hash}` : `${key.slice(0, lastDot)}_${hash}${key.slice(lastDot)}`;
}

let bucketReady: Promise<void> | undefined;

async function ensureBucket() {
  if (bucketReady) return bucketReady;
  bucketReady = (async () => {
    const baseUrl = storageBaseUrl();
    const listResponse = await fetch(`${baseUrl}/bucket`, { headers: storageHeaders() });
    if (!listResponse.ok) throw new Error("Private document storage is temporarily unavailable.");
    const buckets = (await listResponse.json()) as Array<{ id?: string }>;
    if (buckets.some((bucket) => bucket.id === bucketId)) return;

    const createResponse = await fetch(`${baseUrl}/bucket`, {
      method: "POST",
      headers: storageHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ id: bucketId, name: bucketId, public: false }),
    });
    if (!createResponse.ok && createResponse.status !== 409) {
      throw new Error("Dexus could not prepare private document storage.");
    }
  })();
  try {
    await bucketReady;
  } catch (error) {
    bucketReady = undefined;
    throw error;
  }
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  await ensureBucket();
  const key = appendHashSuffix(relKey);
  const response = await fetch(`${storageBaseUrl()}/object/${bucketId}/${objectPath(key)}`, {
    method: "POST",
    headers: storageHeaders({ "content-type": contentType, "x-upsert": "false" }),
    body: typeof data === "string" ? data : new Blob([data as any], { type: contentType }),
  });
  if (!response.ok) throw new Error("Dexus could not upload the private document.");
  return { key, url: `private://${bucketId}/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `private://${bucketId}/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  await ensureBucket();
  const key = normalizeKey(relKey);
  const response = await fetch(`${storageBaseUrl()}/object/sign/${bucketId}/${objectPath(key)}`, {
    method: "POST",
    headers: storageHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ expiresIn: 60 }),
  });
  if (!response.ok) throw new Error("Dexus could not prepare private document access.");
  const payload = (await response.json()) as { signedURL?: string; signedUrl?: string };
  const signedPath = payload.signedURL ?? payload.signedUrl;
  if (!signedPath) throw new Error("Dexus received an invalid private document URL.");
  return signedPath.startsWith("http")
    ? signedPath
    : `${storageBaseUrl()}${signedPath.startsWith("/") ? signedPath : `/${signedPath}`}`;
}

export async function storageDelete(relKey: string): Promise<void> {
  await ensureBucket();
  const key = normalizeKey(relKey);
  const response = await fetch(`${storageBaseUrl()}/object/${bucketId}/${objectPath(key)}`, {
    method: "DELETE",
    headers: storageHeaders(),
  });
  if (!response.ok) throw new Error("Dexus could not remove the private document.");
}
