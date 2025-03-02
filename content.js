// Clé API fournie
const apiKey = 'AIzaSyDsxv3QIZ6bW1UX4taPCWWbgUmHkxlRVAU';

// Utilisation du modèle Gemini 1.5 Flash
const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;

window.addEventListener('load', async function() {
    console.log('🚀 Script started - Analyzing page content');

    // Sélection des éléments à analyser (ici, tous les <div>)
    const elements = document.querySelectorAll('div');
    console.log(`📊 Found ${elements.length} div elements to analyze`);

    let elementData = [];

    elements.forEach((el, index) => {
        // Ajout d'un identifiant unique à chaque élément
        el.dataset.adBlockerId = index;

        // Récupération d'un extrait de texte (limité à 200 caractères)
        let snippet = el.innerText ? el.innerText.substring(0, 200) : '';
        elementData.push(`ID ${index}: ${snippet}`);
        
        console.log(`🔍 Processing element ${index}:`, {
            id: index,
            textLength: snippet.length,
            preview: snippet.substring(0, 50) + '...'
        });
    });

    // Construction du prompt pour Gemini
    const prompt = `Tu es un analyseur de contenu pour des pages web. Voici une liste d'éléments extraits de la page, chacun numéroté avec un identifiant suivi de son contenu textuel :\n` +
        elementData.join('\n') +
        `\n\n` +
        `Ta tâche est d'identifier lesquels de ces éléments correspondent à des publicités.` +
        `Merci de renvoyer uniquement un objet JSON au format suivant, sans aucun texte supplémentaire :\n` +
        `{"blocked": [numéros]}\n` +
        `Par exemple, si tu considères que les éléments ayant les identifiants 2, 5 et 10 sont des publicités, ta réponse devra être :\n` +
        `{"blocked": [2, 5, 10]}`;

    console.log('📝 Prepared prompt for Gemini API:', {
        promptLength: prompt.length,
        elementCount: elementData.length
    });

    // Préparation du payload
    const data = {
        contents: [{
            parts: [{ text: prompt }]
        }]
    };

    try {
        console.log('🌐 Sending request to Gemini API...');
        
        // Appel à l'API Gemini 1.5 Flash
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            console.error('❌ HTTP Error from Gemini API:', {
                status: response.status,
                statusText: response.statusText
            });
            return;
        }

        console.log('✅ Received response from Gemini API');
        const responseData = await response.json();
        console.log('📦 Raw API response:', responseData);

        // Extraction du texte de réponse
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

        // Parsing de la réponse JSON
        let result;
        try {
            result = JSON.parse(resultText);
            console.log('🎯 Parsed JSON result:', result);
        } catch (err) {
            console.error("❌ JSON parsing error:", err);
            return;
        }

        // Masquer les éléments identifiés comme publicités
        if (result.blocked && Array.isArray(result.blocked)) {
            console.log(`🚫 Hiding ${result.blocked.length} elements identified as ads`);
            result.blocked.forEach(id => {
                const elToHide = document.querySelector(`[data-ad-blocker-id="${id}"]`);
                if (elToHide) {
                    elToHide.style.display = "none";
                    console.log(`✂️ Hidden element with ID ${id}`);
                } else {
                    console.warn(`⚠️ Could not find element with ID ${id}`);
                }
            });
        } else {
            console.error("❌ Response JSON missing 'blocked' array:", result);
        }

    } catch (error) {
        console.error("❌ Fatal error during API call:", error);
    }

    console.log('🏁 Script execution completed');
});
