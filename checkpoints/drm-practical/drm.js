// keys: [{ kid: "<32 hex chars>", key: "<32 hex chars>" }, ...] (16-byte key IDs and keys)
// log(text) is an optional callback so a page can show the EME lifecycle.
export async function installClearKey(video, keys, log = () => {}) {
  if (!window.isSecureContext) {
    throw new Error("EME requires a secure context or localhost.");
  }

  const config = [{
    initDataTypes: ["cenc"],
    videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.64001f"' }],
    audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }]
  }];

  // #region request-access
  const access = await navigator.requestMediaKeySystemAccess("org.w3.clearkey", config);
  const mediaKeys = await access.createMediaKeys();
  await video.setMediaKeys(mediaKeys);
  log(`key system ${access.keySystem} ready, MediaKeys attached`);
  // #endregion request-access

  const keyTable = new Map(keys.map(({ kid, key }) => [hexToBase64Url(kid), hexToBase64Url(key)]));
  const seenInitData = new Set();

  // #region encrypted-handler
  video.addEventListener("encrypted", async (event) => {
    // Audio and video each fire "encrypted", often with identical initData: one session per distinct value.
    const id = bytesToBase64(new Uint8Array(event.initData));
    log(`encrypted event: initDataType "${event.initDataType}", ${event.initData.byteLength} bytes`);
    if (seenInitData.has(id)) return;
    seenInitData.add(id);

    try {
      const session = mediaKeys.createSession();
      session.addEventListener("message", async (messageEvent) => {
        log(`message: type "${messageEvent.messageType}", ${new TextDecoder().decode(messageEvent.message)}`);
        await session.update(createClearKeyLicense(messageEvent.message, keyTable));
        log("session.update() resolved");
      });
      session.addEventListener("keystatuseschange", () => {
        for (const [keyId, status] of session.keyStatuses) {
          log(`keystatuseschange: kid ${bytesToHex(new Uint8Array(keyId))} is "${status}"`);
        }
      });
      await session.generateRequest(event.initDataType, event.initData);
    } catch (error) {
      seenInitData.delete(id);
      log(`session failed: ${error.message}`);
      console.error("ClearKey session failed", error);
    }
  });
  // #endregion encrypted-handler
}

// #region license-builder
// The request message is JSON: { "kids": ["<base64url key id>", ...], "type": "temporary" }.
export function createClearKeyLicense(message, keyTable) {
  const request = JSON.parse(new TextDecoder().decode(message));
  const keys = request.kids
    .filter((kid) => keyTable.has(kid))
    .map((kid) => ({ kty: "oct", kid, k: keyTable.get(kid) }));

  if (!keys.length) throw new Error(`No ClearKey key for requested kids: ${request.kids.join(", ")}`);
  return new TextEncoder().encode(JSON.stringify({ keys, type: "temporary" }));
}

// #endregion license-builder

// #region hex-to-base64url
// ClearKey wants kid and k as base64url (no padding) of the raw 16 bytes.
export function hexToBase64Url(hex) {
  if (!/^(?:[0-9a-f]{2}){16}$/i.test(hex)) throw new Error("Expected 32 hex characters (16 bytes)");
  const bytes = hex.match(/../g).map((pair) => parseInt(pair, 16));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

// #endregion hex-to-base64url

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
