/*
  background.js
  Cette version écoute le message du popup pour demander l'activation ou la désactivation du content script.
*/

// Fonction pour normaliser l'URL
function normalizeURL(url) {
    console.log("Normalizing URL:", url);
    let normalized = url.replace(/^https?:\/\//, '');  // Retirer le protocole (http://, https://)
    normalized = normalized.replace(/:\d+$/, '');     // Retirer les numéros de port (par exemple :8080)
    normalized = normalized.split('/')[0];             // Ne garder que le domaine
    normalized = normalized.replace(/^www\./, '');     // Retirer le sous-domaine "www" si présent
    console.log("Normalized URL:", normalized);
    return normalized;
}

// Fonction pour activer/désactiver le content script dans tous les onglets
function toggleContentScript(isEnabled, sendResponse) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id && tab.url) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'toggleContentScript',
            isEnabled: isEnabled
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn(`Aucun content script dans l'onglet ${tab.id} :`, chrome.runtime.lastError.message);
            } else {
              console.log(`Content script basculé dans l'onglet ${tab.id}:`, response);
            }
          });
        }
      });
    });
    sendResponse({ success: true });
}

// Charger la whitelist depuis chrome.storage.sync, whitelist.json et prewhite.json
function loadWhitelist(callback) {
    console.log("Loading whitelist from storage...");

    // Charger la whitelist depuis chrome.storage.sync
    chrome.storage.sync.get('whitelist', function (data) {
        let whitelist = data.whitelist || [];  // Si la whitelist n'existe pas, commencer avec un tableau vide
        console.log("Whitelist loaded from chrome storage:", whitelist);

        // Charger aussi la whitelist.json si elle existe
        fetch(chrome.runtime.getURL('whitelist.json'))
            .then(response => response.json())
            .then(data => {
                const externalWhitelist = data.whitelistedSites || [];
                console.log("Whitelist loaded from whitelist.json:", externalWhitelist);

                // Charger aussi le prewhite.json pour filtrer, mais NE PAS l'inclure dans la whitelist visible
                fetch(chrome.runtime.getURL('prewhite.json'))
                    .then(response => response.json())
                    .then(data => {
                        const prewhitelistedSites = data.prewhitelistedSites || [];
                        console.log("Prewhite sites loaded:", prewhitelistedSites);

                        // Fusionner les whitelist de chrome.storage et whitelist.json
                        const allWhitelistedSites = [...new Set([...whitelist, ...externalWhitelist])];
                        // Retourner la whitelist visible et les sites prewhitelisted pour le filtrage
                        callback(allWhitelistedSites, prewhitelistedSites);
                    })
                    .catch(error => {
                        console.error("Error loading prewhite.json:", error);
                        // En cas d'erreur sur prewhite.json, fusionner seulement la whitelist de chrome.storage et whitelist.json
                        const allWhitelistedSites = [...new Set([...whitelist, ...externalWhitelist])];
                        callback(allWhitelistedSites, []);  // Retourner la whitelist sans prewhite
                    });
            })
            .catch(error => {
                console.error("Error loading whitelist.json:", error);
                const allWhitelistedSites = whitelist;  // Si whitelist.json échoue, utiliser seulement celle de chrome.storage
                callback(allWhitelistedSites, []);  // Retourner la whitelist uniquement de chrome.storage
            });
    });
}

// Ajouter une URL à la whitelist
function addUrlToWhitelist(url, callback) {
    console.log("Adding URL to whitelist:", url);
    loadWhitelist((whitelist, prewhitelistedSites) => {
        const normalizedUrl = normalizeURL(url);
        if (!whitelist.some(item => normalizeURL(item) === normalizedUrl)) {
            whitelist.push(url);
            chrome.storage.sync.set({ whitelist: whitelist }, function () {
                console.log("URL added to whitelist successfully:", url);
                callback(true);  // Indiquer que l'ajout a réussi
            });
        } else {
            console.log("URL already in whitelist:", url);
            callback(false);  // URL déjà dans la whitelist
        }
    });
}

// Supprimer une URL de la whitelist
function removeUrlFromWhitelist(url, callback) {
    loadWhitelist((whitelist, prewhitelistedSites) => {
        const normalizedUrl = normalizeURL(url);
        const updatedWhitelist = whitelist.filter(item => normalizeURL(item) !== normalizedUrl);

        chrome.storage.sync.set({ whitelist: updatedWhitelist }, () => {
            console.log("URL removed from whitelist:", url);
            callback(true);
        });
    });
}

// Appliquer ou désactiver les règles de filtrage
function applyFilteringRules(isEnabled, currentSite, whitelistedSites, prewhitelistedSites) {
    if (!currentSite) {
        console.error("URL actuelle du site non définie.");
        return;
    }

    console.log("Current site:", currentSite);
    console.log("Filtering enabled status:", isEnabled);
    console.log("Whitelisted sites:", whitelistedSites);

    const normalizedCurrentSite = normalizeURL(currentSite);
    const isWhitelisted = whitelistedSites.some(site => normalizeURL(site) === normalizedCurrentSite);
    const isPrewhitelisted = prewhitelistedSites.some(site => normalizeURL(site) === normalizedCurrentSite);

    if (isEnabled) {
        // Si le toggle est sur ON, le filtrage doit être appliqué uniquement pour les sites non whitelistés
        if (isWhitelisted || isPrewhitelisted) {
            // Désactiver les règles de filtrage pour les sites whitelistés ou prewhitelisted
            console.log("Filtrage désactivé pour le site whitelisté ou prewhitelisted:", currentSite);
            chrome.declarativeNetRequest.updateEnabledRulesets({
                disableRulesetIds: ["ruleset_1"]
            });
        } else {
            // Appliquer les règles de filtrage pour les sites non whitelistés
            console.log("Filtrage activé pour le site non whitelisté:", currentSite);
            chrome.declarativeNetRequest.updateEnabledRulesets({
                enableRulesetIds: ["ruleset_1"]
            });
        }
    } else {
        // Si le toggle est sur OFF, désactiver le filtrage pour tous les sites
        console.log("Filtrage désactivé car le toggle est à OFF.");
        chrome.declarativeNetRequest.updateEnabledRulesets({
            disableRulesetIds: ["ruleset_1"]
        });
    }
}

// Surveiller les messages du popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received:", message);

    // Gérer le message pour basculer le Content Script
    if (message.action === 'toggleContentScript') {
        toggleContentScript(message.isEnabled, sendResponse);
        return true;  // Attente de la réponse asynchrone
    }

    if (message.action === 'toggleClassBlock') {
        chrome.storage.sync.set({ 'classblockEnabled': message.isEnabled }, () => {
            console.log("Class blocking status set to:", message.isEnabled);
            sendResponse({ success: true });
        });
        return true;  // Attente de la réponse asynchrone
    }

    if (message.action === 'addUrlToWhitelist') {
        addUrlToWhitelist(message.url, (success) => {
            sendResponse({ success: success });
        });
        return true;  // Attente de la réponse asynchrone
    }

    if (message.action === 'getWhitelist') {
        loadWhitelist((whitelist, prewhitelistedSites) => {
            sendResponse({ success: true, whitelist: whitelist });
        });
        return true;  // Attente de la réponse asynchrone
    }

    if (message.action === 'removeUrlFromWhitelist') {
        removeUrlFromWhitelist(message.url, (success) => {
            sendResponse({ success: success });
        });
        return true;
    }

    if (message.action === 'disableFilterOnLogout') {
        chrome.storage.sync.set({ 'classblockEnabled': false }, () => {
            console.log("Class blocking status set to false.");
            // Désactiver les règles de filtrage sur tous les onglets
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    if (tab.url) {
                        loadWhitelist((whitelistedSites, prewhitelistedSites) => {
                            applyFilteringRules(false, tab.url, whitelistedSites, prewhitelistedSites);
                        });
                    }
                });
            });
            sendResponse({ success: true });
        });
        return true;
    }
});

// Surveiller les onglets activés
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab.url) {
            console.log("Tab activated:", tab.url);
            loadWhitelist((whitelistedSites, prewhitelistedSites) => {
                chrome.storage.sync.get('classblockEnabled', function (data) {
                    const isEnabled = data.classblockEnabled || false;
                    console.log("Filtering enabled status:", isEnabled);
                    applyFilteringRules(isEnabled, tab.url, whitelistedSites, prewhitelistedSites);
                });
            });
        }
    });
});

// Surveiller les mises à jour des onglets
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log("Tab updated:", tab.url);
        loadWhitelist((whitelistedSites, prewhitelistedSites) => {
            chrome.storage.sync.get('classblockEnabled', function (data) {
                const isEnabled = data.classblockEnabled || false;
                console.log("Filtering enabled status:", isEnabled);
                applyFilteringRules(isEnabled, tab.url, whitelistedSites, prewhitelistedSites);
            });
        });
    }
});