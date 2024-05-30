var DASH_URL = 'https://d384padtbeqfgy.cloudfront.net/transcoded/8eaHZjXt6km/video.mpd';
var WIDEVINE_LICENSE_URL = 'https://app.tpstreams.com/api/v1/6eafqn/assets/8eaHZjXt6km/drm_license/?access_token=16b608ba-9979-45a0-94fb-b27c1a86b3c1'

function setUp() {
  // Install built-in polyfills to patch browser incompatibilities.
  shaka.polyfill.installAll();
  // Check to see if the browser supports the basic APIs Shaka needs.
  if (shaka.Player.isBrowserSupported()) {
    setupPlayer();
  } else {
    console.error('The Browser, you are using does not support Shaka Player!');
  }
}

function setupPlayer() {
  var video = document.getElementById('video');
  var player = new shaka.Player(video);
  // Attach player to the window to make it easy to access in the browser console.
  window.player = player;

  // Listen for errors.
  player.addEventListener('error', onErrorEvent);

  player.configure({
    drm: {
      servers: {
        'com.widevine.alpha': WIDEVINE_LICENSE_URL,
      },
    },
  });

  player.getNetworkingEngine().registerRequestFilter(function (type, request) {
    if (type == shaka.net.NetworkingEngine.RequestType.LICENSE) {
      request.headers['Content-type'] = 'application/octet-stream';
    }
  });
}

async function load() {
  // Try to load a manifest.
  // This is an asynchronous process.
  try {
    await window.player.load(DASH_URL);
    // This runs if the asynchronous load is successful.
    console.log('The video has now been loaded!');
  } catch (exception) {
    // shakaOnError is executed if the asynchronous load fails.
    onError(exception);
  }
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

setUp();
