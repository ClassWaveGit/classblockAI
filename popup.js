document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase library not loaded.');
        return;
    }

    const { createClient } = window.supabase;
    const SUPABASE_URL = 'https://mwguiaxxyvlnfddevzjd.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13Z3VpYXh4eXZsbmZkZGV2empkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NDY5OTIsImV4cCI6MjA1MDAyMjk5Mn0.U5bixZNP697H0A5rM9g69yXWJZfP0z98LX-Y44glSic';
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);





    const aiToggle = document.getElementById('ai-toggle');
    const aiStatus = document.getElementById('ai-status');

    // Fonction utilitaire pour mettre à jour le texte du statut AI
    const updateAIStatusText = (isEnabled) => {
        if (aiStatus) {
            aiStatus.textContent = isEnabled ? 'AI est activé 🤖' : 'AI désactivé ❌';
        }
        // Vous pouvez également modifier d'autres styles ou comportements liés à l'apparence ici
    };

    if (aiToggle) {
        // Charger l'état stocké pour AI depuis chrome.storage
        chrome.storage.sync.get('aiEnabled', (data) => {
            aiToggle.checked = data.aiEnabled !== undefined ? data.aiEnabled : false;
            updateAIStatusText(aiToggle.checked);
        });

        aiToggle.addEventListener('change', () => {
            const isAIEnabled = aiToggle.checked;
            updateAIStatusText(isAIEnabled);
            // Stockage de l'état booléen
            chrome.storage.sync.set({ aiEnabled: isAIEnabled }, () => {
                console.log("AI status stored as:", isAIEnabled ? "on" : "off");
            });
            // Stockage explicite de l'état en tant que chaîne
            chrome.storage.sync.set({ aiStatus: isAIEnabled ? "on" : "off" }, () => {
                console.log("AI explicit status stored as:", isAIEnabled ? "on" : "off");
            });
            // Optionnel : envoyer un message d'action spécifique pour AI si nécessaire
            chrome.runtime.sendMessage({ action: 'toggleAI', isEnabled: isAIEnabled });
        });
    }

    // Utility function to update the status text in the UI
    const updateStatusText = (isEnabled) => {
        const status = document.getElementById('status');
        status.textContent = isEnabled ? 'ClassBlock est activé 👍' : 'ClassBlock désactivé ❌';
    };

    // Function to load the whitelist from the background script
    const loadWhitelist = () => {
        chrome.runtime.sendMessage({ action: 'getWhitelist' }, (response) => {
            if (response.success) {
                displayWhitelist(response.whitelist);
            }
        });
    };

    // Function to display the whitelist in the popup
    const displayWhitelist = (whitelist) => {
        const whitelistContainer = document.getElementById('whitelist-container');
        whitelistContainer.innerHTML = '';
        whitelist.forEach((url) => {
            const listItem = document.createElement('div');
            listItem.classList.add('whitelist-item');
            listItem.textContent = normalizeUrl(url);

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Supprimer';
            removeBtn.classList.add('remove-url-btn');
            removeBtn.addEventListener('click', () => removeUrlFromWhitelist(url));

            listItem.appendChild(removeBtn);
            whitelistContainer.appendChild(listItem);
        });
    };

    // Normalize URL to display only the hostname, if possible
    const normalizeUrl = (url) => {
        try {
            const urlObject = new URL(url);
            return urlObject.hostname;
        } catch (e) {
            return url; // Return the original URL if invalid
        }
    };

    // Function to add a URL to the whitelist
    const addUrlToWhitelist = (url) => {
        chrome.runtime.sendMessage({ action: 'addUrlToWhitelist', url }, (response) => {
            if (response.success) {
                loadWhitelist();
            } else {
                alert('Cette URL est déjà dans la whitelist.');
            }
        });
    };

    // Function to remove a URL from the whitelist
    const removeUrlFromWhitelist = (url) => {
        chrome.runtime.sendMessage({ action: 'removeUrlFromWhitelist', url }, (response) => {
            if (response.success) {
                loadWhitelist();
            }
        });
    };

    // Function to load and setup the ClassBlock UI components
    function loadClassBlockUI() {
        const toggle = document.getElementById('classblock-toggle');
        const status = document.getElementById('status');
        const addUrlButton = document.getElementById('add-url-btn');
        const urlInput = document.getElementById('url-input');
        const whitelistContainer = document.getElementById('whitelist-container');
        const logoutButton = document.getElementById('logout-btn');

        // Charger l'état de l'extension
        chrome.storage.sync.get('classblockEnabled', (data) => {
            toggle.checked = data.classblockEnabled !== undefined ? data.classblockEnabled : false;
            updateStatusText(toggle.checked);
        });

        toggle.addEventListener('change', () => {
            const isEnabled = toggle.checked;
            updateStatusText(isEnabled);
            chrome.storage.sync.set({ classblockEnabled: isEnabled });
            chrome.runtime.sendMessage({ action: 'toggleClassBlock', isEnabled });
            // Journalisation explicite en stockant l'état "on" ou "off"
            chrome.storage.sync.set({ classblockEnabled: isEnabled }, () => {
                console.log("ClassBlock status stored as:", isEnabled ? "on" : "off");
            });
            // Ajout : Stocke explicitement l'état en tant que "on" ou "off"
            chrome.storage.sync.set({ classblockStatus: isEnabled ? "on" : "off" }, () => {
                console.log("ClassBlock explicit status stored as:", isEnabled ? "on" : "off");
            });
        });

        addUrlButton.addEventListener('click', () => {
            const url = urlInput.value.trim();
            if (url) {
                addUrlToWhitelist(url);
                urlInput.value = '';
            } else {
                alert('Veuillez entrer une URL valide.');
            }
        });

        // Charger la whitelist au démarrage
        loadWhitelist();

        // Gestion du bouton de déconnexion
        logoutButton.addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Erreur lors de la déconnexion :', error.message);
            } else {
                // Envoyer un message pour désactiver le filtrage
                chrome.runtime.sendMessage({ action: 'disableFilterOnLogout' });
                window.location.href = 'login.html'; // Rediriger après déconnexion
            }
        });
    }

    // Vérifier l'état de connexion au chargement de la page
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        chrome.runtime.sendMessage({ action: 'disableFilterOnLogout' });
        window.location.href = 'login.html';
        return; // Arrêter l'exécution si l'utilisateur n'est pas connecté
    }

    // Charger l'interface de ClassBlock
    loadClassBlockUI();

    // Écouter les changements d'état d'authentification
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            chrome.runtime.sendMessage({ action: 'disableFilterOnLogout' });
            window.location.href = 'login.html'; // Rediriger si l'utilisateur se déconnecte
        }
    });
});