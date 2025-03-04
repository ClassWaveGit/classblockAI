"use strict";

// Global settings to disable functions
let DISABLE_AI = false;
let DISABLE_YOUTUBE = false;

// Manage classblockEnabled from storage
chrome.storage.sync.get('classblockEnabled', (data) => {
  const enabled = data.classblockEnabled;
  // By default, if no data, disable classblock functions.
  DISABLE_YOUTUBE = (enabled === false);
  console.log('Initial classblockEnabled:', enabled, '=> DISABLE_YOUTUBE:', DISABLE_YOUTUBE);
});

// Listen to changes for classblockEnabled and update state accordingly.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.classblockEnabled) {
    const newEnabled = changes.classblockEnabled.newValue;
    DISABLE_YOUTUBE = (newEnabled === false);
    console.log('Updated classblockEnabled:', newEnabled, '=> DISABLE_YOUTUBE:', DISABLE_YOUTUBE);
  }
});

// Retrieve aiEnabled setting
chrome.storage.sync.get('aiEnabled', (data) => {
  const enabled = data.aiEnabled;
  // By default, AI is enabled if not explicitly disabled.
  DISABLE_AI = (enabled === false);
  console.log('Initial aiEnabled:', enabled, '=> DISABLE_AI:', DISABLE_AI);
});

// Listen to changes for aiEnabled and update state.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.aiEnabled) {
    const newEnabled = changes.aiEnabled.newValue;
    DISABLE_AI = (newEnabled === false);
    console.log('Updated aiEnabled:', newEnabled, '=> DISABLE_AI:', DISABLE_AI);
  }
});

// Combined CSS selectors for ads.
const adSelectors = [
  '.ytd-ad-slot-renderer',
  '.video-ads',
  '.ytp-ad-module',
  '.ad-container',
  '#player-ads',
  '.ytp-ad-overlay-container',
  '.ytd-display-ad-renderer',
  '.ytd-in-feed-ad-layout-renderer',
  '#masthead-ad'
].join(',');

// Flag to ensure single refresh after ad skipping.
let refreshTriggered = false;

// Remove ad DOM elements in one go.
function removeAdElements() {
  if (DISABLE_YOUTUBE) return;
  const adElements = document.querySelectorAll(adSelectors);
  adElements.forEach(element => {
    element.remove();
  });
}

// Skip video ads by forcing video time to end and clicking skip button if available.
function skipVideoAds() {
  if (DISABLE_YOUTUBE) return;
  
  const player = document.querySelector('.html5-video-player');
  if (player && player.classList.contains('ad-showing')) {
    const video = player.querySelector('video');
    let adSkipped = false;

    // Advance the video to its duration to force end of ad.
    if (video && video.duration && !isNaN(video.duration)) {
      video.currentTime = video.duration;
      console.log('Ad forced to end.');
      adSkipped = true;
    }

    // Click skip button if available.
    const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-container');
    if (skipButton) {
      skipButton.click();
      console.log('Skip Ad button clicked.');
      adSkipped = true;
    }

    // Refresh page once after ad skip.
    if (adSkipped && !refreshTriggered) {
      refreshTriggered = true;
      console.log('Refreshing the page in 1 second...');
      setTimeout(() => {
        location.reload();
      }, 1000);
    }
  }
}

// Block ads by removing elements and skipping video ads.
function blockAds() {
  if (DISABLE_YOUTUBE) return;
  removeAdElements();
  skipVideoAds();
}

// Save the current video playback position when no ad is running.
function updateResumeTime() {
  if (DISABLE_YOUTUBE) return;
  const player = document.querySelector('.html5-video-player');
  const video = document.querySelector('video');
  if (player && video && !player.classList.contains('ad-showing')) {
    localStorage.setItem('YTVideoResumeTime', video.currentTime);
  }
}

// Restore saved video playback position after refresh.
function restoreVideoTime() {
  if (DISABLE_YOUTUBE) return;
  const resumeTime = localStorage.getItem('YTVideoResumeTime');
  if (resumeTime !== null) {
    const video = document.querySelector('video');
    if (video) {
      video.addEventListener('loadedmetadata', function() {
        video.currentTime = parseFloat(resumeTime);
        localStorage.removeItem('YTVideoResumeTime');
        console.log('Playback time restored:', resumeTime);
      }, { once: true });
    } else {
      setTimeout(restoreVideoTime, 500);
    }
  }
}

// Debounce mechanism for DOM mutations to prevent redundant calls.
let debounceTimer = null;
function debouncedBlockAds(mutationsList) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    blockAds();
    debounceTimer = null;
  }, 100); // 100ms debounce interval
}

// Observe DOM mutations to detect when new ads appear.
const observer = new MutationObserver(debouncedBlockAds);
observer.observe(document.body, { childList: true, subtree: true });

// Initiate ad blocking and resume time updates at a controlled interval.
if (!DISABLE_YOUTUBE) {
  blockAds();
  setInterval(blockAds, 500);  // Adjust frequency based on performance needs.
  setInterval(updateResumeTime, 1000);
}

// For SPA behavior on YouTube: re-run the ad block and restore resume on navigation.
if (!DISABLE_YOUTUBE) {
  window.addEventListener('yt-navigate-finish', () => {
    setTimeout(() => {
      blockAds();
      restoreVideoTime();
    }, 1000);
  });
  
  window.addEventListener('load', restoreVideoTime);
}

console.log('YouTube Ad Blocker loaded with auto-refresh and resume functionality.');

/* ------------------------------------------
   Gemini API Content Analysis Section
---------------------------------------------*/

// API keys for Gemini 1.5 Flash model.
// Le premier correspond à l'API 1, le second à l'API 2, le troisième à l'API 3, 
// le quatrième à l'API 4, le cinquième à l'API 5, le sixième à l'API 6,
// le septième à l'API 7, et le nouveau correspond à l'API 8.
const apiKeys = [
  'AIzaSyDsxv3QIZ6bW1UX4taPCWWbgUmHkxlRVAU',  // API 1
  'AIzaSyChZoditA795EQGN_RyRt8bMmHN3WAhLLI',  // API 2
  'AIzaSyB_VC4fiG9uUBDmy-payEOgW7SbhSkKivo',    // API 3
  'AIzaSyC1EZl9JdYd7BYG-nu-a42Tw4gR6PAlIDQ',    // API 4
  'AIzaSyCW9s1x1mzK7NhWqCLaSaKr9iPFGLjNRg0',    // API 5
  'AIzaSyA6fy6Dg8BSjSknMjKVnQ78t_d8UeVftDk',    // API 6
  'AIzaSyDapB0EReV_rN1QHbSeNLvS7wE-kZ4eMHw',     // API 7
  'AIzaSyDc6nMeGTT4HoKwlapF0KbqyBCmzgah2Oo'      // API 8
];

/**
 * Remove markdown delimiters and unwanted text to extract JSON string.
 * @param {string} str - The raw response string.
 * @returns {string} Clean JSON string.
 */
function cleanJSONResult(str) {
  if (DISABLE_AI) return "";
  return str.replace(/```(json)?/gi, '').replace(/```/g, '').trim();
}

/**
 * Wait until the document is fully loaded.
 * @returns {Promise<void>}
 */
function waitForPageLoad() {
  if (DISABLE_AI) return Promise.resolve();
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });
}

/**
 * Sends a request to the Gemini API using the provided payload.
 * Cette version effectue plusieurs tentatives avec différentes clés API en cas d'erreur.
 * @param {Object} data - The payload for the API call.
 * @param {number} [maxAttempts=3] - Maximum number of retry attempts.
 * @returns {Promise<Response>} The successful response.
 */
async function sendGeminiRequest(data, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Génère un nombre aléatoire entre 1 et 8 pour sélectionner une clé API.
    const randomNumber = Math.floor(Math.random() * 8) + 1;
    const key = apiKeys[randomNumber - 1];
    const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    try {
      console.log(\`🌐 Sending request to CWAI (attempt \${attempt}) using API key #\${randomNumber}.\`);
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        console.log(\`✅ Received response successfully on attempt \${attempt}.\`);
        return response;
      } else {
        console.error(\`❌ HTTP Error on attempt \${attempt} with API key #\${randomNumber}:\`, { status: response.status, statusText: response.statusText });
      }
    } catch (error) {
      console.error(\`❌ Error on attempt \${attempt} with API key #\${randomNumber}:\`, error);
    }
    if (attempt < maxAttempts) {
      console.log(\`🔄 Retrying with a different API key (attempt \${attempt + 1}/\${maxAttempts})...\`);
    }
  }
  throw new Error('La requête a échoué après plusieurs tentatives avec différentes clés API.');
}

(async function() {
  if (DISABLE_AI) {
    console.log('AI functions disabled. Script execution cancelled.');
    return;
  }
  
  // Await full page load.
  await waitForPageLoad();
  console.log('🚀 Page fully loaded. Starting content analysis.');

  // Gather elements (<div> and <iframe>) for analysis.
  const elements = document.querySelectorAll('div, iframe');
  console.log(\`📊 Found \${elements.length} elements (div/iframe) to analyze\`);

  let elementData = [];

  elements.forEach((el, index) => {
    el.dataset.adBlockerId = index;
    let snippet = '';
    if (el.tagName.toLowerCase() === 'iframe') {
      snippet = el.title || el.src || '';
    } else {
      snippet = el.innerText ? el.innerText.substring(0, 200) : '';
    }
    elementData.push(\`ID \${index}: \${snippet}\`);
  });

  // Build prompt for Gemini.
  const prompt =
    \`Tu es un analyseur de contenu pour des pages web. \` +
    \`Voici une liste d'éléments extraits de la page, chacun numéroté avec un identifiant suivi de son contenu textuel :\n\` +
    elementData.join('\n') +
    \n\n +
    \`Ta tâche est d'identifier lesquels de ces éléments correspondent à des publicités.\` +
    \` Merci de renvoyer uniquement un objet JSON au format suivant, sans aucun texte supplémentaire :\n\` +
    \`{"blocked": [numéros]}\n\` +
    \`Par exemple, si tu considères que les éléments ayant les identifiants 2, 5 et 10 sont des publicités, \` +
    \`ta réponse devra être :\n{"blocked": [2, 5, 10]}\`;

  console.log('📝 Prepared prompt for CWAI:', {
    promptLength: prompt.length,
    elementCount: elementData.length
  });

  // Prepare payload for API.
  const data = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  try {
    const response = await sendGeminiRequest(data);
    if (!response) {
      console.error("❌ No valid response received from the selected API key.");
      return;
    }

    const responseData = await response.json();
    console.log('📦 Raw API response:', responseData);

    let resultText = '';
    if (
      responseData.candidates &&
      responseData.candidates[0] &&
      responseData.candidates[0].content &&
      responseData.candidates[0].content.parts &&
      responseData.candidates[0].content.parts[0] &&
      responseData.candidates[0].content.parts[0].text
    ) {
      resultText = responseData.candidates[0].content.parts[0].text;
      console.log('📄 Extracted response text:', resultText);
    } else {
      console.error("❌ Unexpected response structure:", responseData);
      return;
    }

    let result;
    try {
      const cleanedText = cleanJSONResult(resultText);
      result = JSON.parse(cleanedText);
      console.log('🎯 Parsed JSON result:', result);
    } catch (err) {
      console.error("❌ JSON parsing error:", err);
      return;
    }

    // Hide elements identified as advertisements.
    if (result.blocked && Array.isArray(result.blocked)) {
      console.log(\`🚫 Hiding \${result.blocked.length} elements identified as ads\`);
      result.blocked.forEach(id => {
        const elToHide = document.querySelector(\`[data-ad-blocker-id="\${id}"]\`);
        if (elToHide) {
          const rect = elToHide.getBoundingClientRect();
          if (rect.width >= window.innerWidth * 0.9 &&
              rect.height >= window.innerHeight * 0.9) {
            console.log(\`⚠️ Skipping hiding element with ID \${id} because it covers most of the screen.\`);
            return;
          }
          elToHide.style.setProperty('display', 'none', 'important');
          console.log(\`✂️ Hidden element with ID \${id}\`);
        } else {
          console.log(\`⚠️ Could not find element with ID \${id}\`);
        }
      });
    } else {
      console.error("❌ Response JSON missing 'blocked' array:", result);
    }
  } catch (error) {
    console.error("❌ Fatal error during API call:", error);
  }

  console.log('🏁 Script execution completed');
})();
