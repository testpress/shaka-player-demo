window.manifestURL = 'https://d384padtbeqfgy.cloudfront.net/transcoded/8eaHZjXt6km/video.mpd';

function setUp() {
  // Install built-in polyfills to patch browser incompatibilities.
  shaka.polyfill.installAll();
  // Check to see if the browser supports the basic APIs Shaka needs.
  if (shaka.Player.isBrowserSupported()) {
    setupPlayer();
  } else {
    console.error('The Browser, you are using does not support Shaka Player!');
  }

  // Update the online status and add listeners so that we can visualize
  // our network state to the user.
  updateOnlineStatus();
  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
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
      console.log("Player license interceptor")
      request.headers['Content-type'] = 'application/octet-stream';
    }
  });
}

async function load() {
  // Try to load a manifest.
  // This is an asynchronous process.
  try {
    await window.player.load(window.manifestURL);
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
