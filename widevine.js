var DASH_URL = 'https://d384padtbeqfgy.cloudfront.net/transcoded/8eaHZjXt6km/video.mpd';
var WIDEVINE_LICENSE_URL = 'https://app.tpstreams.com/api/v1/6eafqn/assets/8eaHZjXt6km/drm_license/?access_token=16b608ba-9979-45a0-94fb-b27c1a86b3c1&download=true'

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
      request.headers['Content-type'] = 'application/octet-stream';
    }
  });

  initStorage(player);

  const downloadButton = document.getElementById('download-button');
  downloadButton.onclick = onDownloadClick;

  // Update the content list to show what items we initially have
  // stored offline.
  refreshContentList();
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

function selectTracks(tracks) {
  // This example stores the highest bandwidth variant.
  //
  // Note that this is just an example of an arbitrary algorithm, and not a best
  // practice for storing content offline.  Decide what your app needs, or keep
  // the default (user-pref-matching audio, best SD video, all text).
  console.log(tracks)
  const found = tracks
    .filter(function (track) { return track.type == 'variant'; })
    .sort(function (a, b) { return a.bandwidth - b.bandwidth; })
    .pop();
  console.log(found)
  
  console.log('Offline Track bandwidth: ' + found.bandwidth);
  return [ found ];
}

function initStorage(player) {
  // Create a storage instance and configure it with optional
  // callbacks. Set the progress callback so that we visualize
  // download progress and override the track selection callback.
  window.storage = new shaka.offline.Storage(player);
  window.storage.configure({
    offline: {
      usePersistentLicense: true,
      progressCallback: setDownloadProgress,
      trackSelectionCallback: selectTracks
    }
  });
}

function listContent() {
  return window.storage.list();
}

function playContent(content) {
  window.player.load(content.offlineUri);
}

function removeContent(content) {
  return window.storage.remove(content.offlineUri);
}

function downloadContent(manifestUri, title) {
    // Construct a metadata object to be stored along side the content.
  // This can hold any information the app wants to be stored with the
  // content.
  const metadata = {
    'title': title,
    'downloaded': Date()
  };

  return window.storage.store(manifestUri, metadata).promise;// TODO : save content with storage.
}

/*
 * UI callback for when the download button is clicked. This will
 * disable the button while the download is in progress, start the
 * download, and refresh the content list once the download is
 * complete.
 */
function onDownloadClick() {
  const downloadButton = document.getElementById('download-button');

  // Disable the download button to prevent user from requesting
  // another download until this download is complete.
  downloadButton.disabled = true;

  setDownloadProgress(null, 0);

  // Download the content and then re-enable the download button so
  // that more content can be downloaded.
  downloadContent(DASH_URL, "Big bunny buck")
    .then(function() {
      return refreshContentList();
    })
    .then(function(content) {
      setDownloadProgress(null, 1);
      downloadButton.disabled = false;
    })
    .catch(function(error) {
      // In the case of an error, re-enable the download button so
      // that the user can try to download another item.
      downloadButton.disabled = false;
      onError(error);
    });
}

/*
 * Update the online status box at the top of the page to tell the
 * user whether or not they have an internet connection.
 */
function updateOnlineStatus() {
  const signal = document.getElementById('online-signal');
  if (navigator.onLine) {
    signal.innerHTML = 'ONLINE';
    signal.style.background = 'green';
  } else {
    signal.innerHTML = 'OFFLINE';
    signal.style.background = 'grey';
  }
}

/*
 * Find our progress bar and set the value to show the progress we
 * have made.
 */
function setDownloadProgress(content, progress) {
  const progressBar = document.getElementById('progress-bar');
  progressBar.value = progress * progressBar.max;
}

/*
 * Clear our content table and repopulate it table with the current
 * list of downloaded content.
 */
function refreshContentList() {
  const contentTable = document.getElementById('content-table');

  // Clear old rows from the table.
  while (contentTable.rows.length) {
    contentTable.deleteRow(0);
  }

  const addRow = function(content) {
    const append = -1;

    const row = contentTable.insertRow(append);
    row.insertCell(append).innerHTML = content.offlineUri;
    Object.keys(content.appMetadata)
        .map(function(key) {
          return content.appMetadata[key];
        })
        .forEach(function(value) {
          row.insertCell(append).innerHTML = value;
        });

    row.insertCell(append).appendChild(createButton(
        'PLAY',
        function() { playContent(content); }));

    row.insertCell(append).appendChild(createButton(
        'REMOVE',
        function() {
          removeContent(content)
              .then(function() { refreshContentList() });
        }));
  };

  return listContent()
      .then(function(content) { content.forEach(addRow); });
};

/*
 * Create a new button but do not add it to the DOM. The caller
 * will need to do that.
 */
function createButton(text, action) {
  const button = document.createElement('button');
  button.innerHTML = text;
  button.onclick = action;
  return button;
}

setUp();
