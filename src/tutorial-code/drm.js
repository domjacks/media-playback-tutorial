export async function installClearKey(video, keys) {
  if (!window.isSecureContext) {
    throw new Error("EME requires a secure context or localhost.");
  }

  const config = [{
    initDataTypes: ["cenc"],
    videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.64001f"' }]
  }];

  const access = await navigator.requestMediaKeySystemAccess("org.w3.clearkey", config);
  const mediaKeys = await access.createMediaKeys();
  await video.setMediaKeys(mediaKeys);

  video.addEventListener("encrypted", async (event) => {
    const session = mediaKeys.createSession();
    session.addEventListener("message", async () => {
      await session.update(createClearKeyLicense(keys));
    });
    await session.generateRequest(event.initDataType, event.initData);
  });
}

function createClearKeyLicense(keys) {
  return new TextEncoder().encode(JSON.stringify({ keys, type: "temporary" }));
}
