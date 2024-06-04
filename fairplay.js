window.manifestURL = 'https://d384padtbeqfgy.cloudfront.net/transcoded/8eaHZjXt6km/video.m3u8';
var CERTIFICATE_PATH = 'https://static.testpress.in/static/fairplay.cer';


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
      request.uris = [FAIRPLAY_LICENSE_URL];
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
        'com.apple.fps.1_0': FAIRPLAY_LICENSE_URL,
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
    const contentId = new TextDecoder("utf-16").decode(initData.slice(16));
    const cert = player.drmInfo().serverCertificate;
    return shaka.util.FairPlayUtils.initDataTransform(
      initData,
      contentId,
      cert
    );
  });

  try {
    await player.load(window.manifestURL);
    console.log('The video has now been loaded!');
  } catch (exception) {
    onError(exception);
  }
}

setUp();
