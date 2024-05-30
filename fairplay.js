var DASH_URL = 'https://d384padtbeqfgy.cloudfront.net/transcoded/8eaHZjXt6km/video.m3u8';
var CERTIFICATE_PATH = 'https://static.testpress.in/static/fairplay.cer';
var FAIRPLAY_STAGE =
  'https://app.tpstreams.com/api/v1/6eafqn/assets/8eaHZjXt6km/drm_license/?access_token=16b608ba-9979-45a0-94fb-b27c1a86b3c1&drm_type=fairplay';

var licenseURL;

function setUp() {
  // Install built-in polyfills to patch browser incompatibilities.
  shaka.polyfill.installAll();
  shaka.polyfill.PatchedMediaKeysApple.install();

  // Check to see if the browser supports the basic APIs Shaka needs.
  if (shaka.Player.isBrowserSupported()) {
    setupPlayer();
  } else {
    console.error('Browser not supported!');
  }
}

function setupPlayer() {
  // Create a Player instance.
  var video = document.getElementById('video');
  var player = new shaka.Player(video);
  // Attach player to the window to make it easy to access in the JS console.
  window.player = player;
  // Listen for error events.
  player.addEventListener('error', onErrorEvent);

  player.getNetworkingEngine().registerRequestFilter(function (type, request) {
    if (type == shaka.net.NetworkingEngine.RequestType.LICENSE) {
      request.uris = [FAIRPLAY_STAGE];
      request.method = 'POST';
      request.headers['Content-Type'] = 'application/json';
      const originalPayload = new Uint8Array(request.body);
      const base64Payload = shaka.util.Uint8ArrayUtils.toStandardBase64(originalPayload);
      request.body = JSON.stringify({
        spc: base64Payload,
      });
    }
  });
}

function onErrorEvent(event) {
  // Extract the shaka.util.Error object from the event.
  onError(event.detail);
}

function onError(error) {
  alert(error);
  console.error('Error code', error.code, 'object', error);
  if (window.player) {
    window.player.detach();
  }
}

async function load() {
  const response = await fetch(CERTIFICATE_PATH);
  if (!response.ok) {
    alert('Could not get certificate!');
    return;
  }
  const certificate = await response.arrayBuffer();
  player.configure({
    drm: {
      servers: {
        'com.apple.fps.1_0': FAIRPLAY_STAGE,
      },
      advanced: {
        'com.apple.fps.1_0': {
          serverCertificate: new Uint8Array(certificate),
        },
      },
    },
  });
  player.configure('drm.initDataTransform', (initData, type, drmInfo) => {
    if (type != 'skd') return initData;
    const skdURL = shaka.util.StringUtils.fromBytesAutoDetect(initData);
    const contentId = new TextDecoder("utf-16").decode(initData.slice(16));
    const cert = player.drmInfo().serverCertificate;
    licenseURL = skdURL.replace('skd://', 'https://');
    return shaka.util.FairPlayUtils.initDataTransform(
      initData,
      contentId,
      cert
    );
  });

  try {
    await player.load(DASH_URL);
    console.log('The video has now been loaded!');
  } catch (exception) {
    onError(exception);
  }
}

setUp();
