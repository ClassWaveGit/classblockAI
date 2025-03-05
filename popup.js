document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase library not loaded.');
        return;
    }

    const { createClient } = window.supabase;
    const SUPABASE_URL = 'https://mwguiaxxyvlnfddevzjd.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13Z3VpYXh4eXZsbmZkZGV2empkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NDY5OTIsImV4cCI6MjA1MDAyMjk5Mn0.U5bixZNP697H0A5rM9g69yXWJZfP0z98LX-Y44glSic';
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // AI Toggle Functionality
    const aiToggle = document.getElementById('ai-toggle');
    const aiStatus = document.getElementById('ai-status');

    // Update the AI status text while preserving the tooltip element.
    const updateAIStatusText = (isEnabled) => {
        const aiStatus = document.getElementById('ai-status');
        if (!aiStatus) return;
        const tooltip = aiStatus.querySelector('.tooltip');
        aiStatus.innerHTML = "";
  
        const textSpan = document.createElement('span');
        textSpan.className = 'ai-status-text';
        textSpan.style.textDecoration = 'underline';
        textSpan.textContent = isEnabled ? 'Renforcement AI activé' : 'Renforcement AI désactivé';
  
        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'emoji';
        emojiSpan.style.textDecoration = 'none';
        // Ajout de display inline-block pour éviter l'underline héritée et marge-gauche pour l'espacement
        emojiSpan.style.display = 'inline-block';
        emojiSpan.style.marginLeft = '5px';
        emojiSpan.textContent = isEnabled ? '🤖' : '❌';
  
        aiStatus.appendChild(textSpan);
        aiStatus.appendChild(emojiSpan);
  
        if (tooltip) {
            aiStatus.appendChild(tooltip);
        }
    };

    if (aiToggle) {
        // Load stored AI state from chrome.storage
        chrome.storage.sync.get('aiEnabled', (data) => {
            aiToggle.checked = data.aiEnabled !== undefined ? data.aiEnabled : false;
            updateAIStatusText(aiToggle.checked);
        });

        aiToggle.addEventListener('change', () => {
            const isAIEnabled = aiToggle.checked;
            updateAIStatusText(isAIEnabled);
            // Store boolean state
            chrome.storage.sync.set({ aiEnabled: isAIEnabled }, () => {
                console.log("AI status stored as:", isAIEnabled ? "on" : "off");
            });
            // Store explicit state as a string
            chrome.storage.sync.set({ aiStatus: isAIEnabled ? "on" : "off" }, () => {
                console.log("AI explicit status stored as:", isAIEnabled ? "on" : "off");
            });
            // Optional: send a specific action message for AI if needed
            chrome.runtime.sendMessage({ action: 'toggleAI', isEnabled: isAIEnabled });
        });
    }

    // Utility function to update the ClassBlock status text in the UI.
    // Note: This function replaces the text node of the 'status' element.
    const updateStatusText = (isEnabled) => {
        const status = document.getElementById('status');
        if (!status) return;
        // Récupérer la tooltip existante si présente.
        const tooltip = status.querySelector('.tooltip');
        // Réinitialiser le contenu du conteneur.
        status.innerHTML = "";
  
        // Création du span pour le texte souligné sans espace final.
        const textSpan = document.createElement('span');
        textSpan.className = 'status-text';
        textSpan.style.textDecoration = 'underline';
        textSpan.textContent = isEnabled ? 'ClassBlock est activé' : 'ClassBlock désactivé';
  
        // Création du span pour l’emoji qui ne sera pas souligné.
        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'emoji';
        emojiSpan.style.textDecoration = 'none';
        // Ajout de display inline-block pour éviter l'héritage de l'underline, et une marge pour l'espacement
        emojiSpan.style.display = 'inline-block';
        emojiSpan.style.marginLeft = '5px';
        emojiSpan.textContent = isEnabled ? '👍' : '❌';
  
        // Ajouter les spans au conteneur.
        status.appendChild(textSpan);
        status.appendChild(emojiSpan);
  
        // Réinsérer la tooltip si elle existait.
        if (tooltip) {
            status.appendChild(tooltip);
        }
    };
  

    // Function to load the whitelist from the background process.
    const loadWhitelist = () => {
        chrome.runtime.sendMessage({ action: 'getWhitelist' }, (response) => {
            if (response.success) {
                displayWhitelist(response.whitelist);
            }
        });
    };

    // Display the whitelist in the popup.
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

    // Normalize URL to display only the hostname if possible.
    const normalizeUrl = (url) => {
        try {
            const urlObject = new URL(url);
            return urlObject.hostname;
        } catch (e) {
            return url; // Return original URL if invalid
        }
    };

    // Function to add a URL to the whitelist.
    const addUrlToWhitelist = (url) => {
        chrome.runtime.sendMessage({ action: 'addUrlToWhitelist', url }, (response) => {
            if (response.success) {
                loadWhitelist();
            } else {
                alert('Cette URL est déjà dans la whitelist.');
            }
        });
    };

    // Function to remove a URL from the whitelist.
    const removeUrlFromWhitelist = (url) => {
        chrome.runtime.sendMessage({ action: 'removeUrlFromWhitelist', url }, (response) => {
            if (response.success) {
                loadWhitelist();
            }
        });
    };

    // Function to load and set up the ClassBlock UI components.
    function loadClassBlockUI() {
        const toggle = document.getElementById('classblock-toggle');
        const status = document.getElementById('status');
        const addUrlButton = document.getElementById('add-url-btn');
        const urlInput = document.getElementById('url-input');
        const logoutButton = document.getElementById('logout-btn');

        // Load extension state for ClassBlock.
        chrome.storage.sync.get('classblockEnabled', (data) => {
            toggle.checked = data.classblockEnabled !== undefined ? data.classblockEnabled : false;
            updateStatusText(toggle.checked);
        });

        toggle.addEventListener('change', () => {
            const isEnabled = toggle.checked;
            updateStatusText(isEnabled);
            chrome.storage.sync.set({ classblockEnabled: isEnabled });
            chrome.runtime.sendMessage({ action: 'toggleClassBlock', isEnabled });
            // Log state explicitly as both a boolean and a string.
            chrome.storage.sync.set({ classblockEnabled: isEnabled }, () => {
                console.log("ClassBlock status stored as:", isEnabled ? "on" : "off");
            });
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

        // Load the whitelist on startup.
        loadWhitelist();

        // Handle the logout button click.
        logoutButton.addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Erreur lors de la déconnexion :', error.message);
            } else {
                // Send message to disable filtering.
                chrome.runtime.sendMessage({ action: 'disableFilterOnLogout' });
                window.location.href = 'login.html'; // Redirect after sign-out.
            }
        });
    }

    // Verify auth state on page load.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        chrome.runtime.sendMessage({ action: 'disableFilterOnLogout' });
        window.location.href = 'login.html';
        return; // Stop execution if no session exists.
    }

    // Load ClassBlock UI components.
    loadClassBlockUI();

    // Listen for auth state changes.
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            chrome.runtime.sendMessage({ action: 'disableFilterOnLogout' });
            window.location.href = 'login.html'; // Redirect if user signs out.
        }
    });
});
