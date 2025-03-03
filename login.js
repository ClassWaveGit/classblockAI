
document.addEventListener('DOMContentLoaded', function () {
    // Vérifier si Supabase est chargé sur l'objet window
    if (typeof window.supabase !== 'undefined') {
        const { createClient } = window.supabase;

        // Initialiser Supabase avec votre URL et clé
        const SUPABASE_URL = 'https://mwguiaxxyvlnfddevzjd.supabase.co'; // Remplacez par votre URL Supabase
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13Z3VpYXh4eXZsbmZkZGV2empkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NDY5OTIsImV4cCI6MjA1MDAyMjk5Mn0.U5bixZNP697H0A5rM9g69yXWJZfP0z98LX-Y44glSic'; // Remplacez par votre clé publique anon Supabase

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        // Récupérer les éléments du DOM
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const loginButton = document.getElementById('login-btn');
        const errorMessage = document.getElementById('error-message');

        // Fonction de connexion via Supabase Auth
        loginButton.addEventListener('click', async function () {
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (email === "" || password === "") {
                showErrorMessage("Veuillez entrer un email et un mot de passe.");
                return;
            }

            // Utiliser Supabase pour authentifier l'utilisateur
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                showErrorMessage("Erreur de connexion : " + error.message);
            } else {
                // Connexion réussie
                const user = data.user;
                console.log("Utilisateur connecté : ", user);

                // Stocker la session dans chrome.storage pour une utilisation ultérieure
                chrome.storage.local.set({ session: data.session }, function () {
                    console.log("Session enregistrée dans chrome.storage.");
                });

                // Rediriger vers popup.html
                window.location.href = "popup.html";
            }
        });

        // Afficher un message d'erreur
        function showErrorMessage(message) {
            errorMessage.textContent = message;
        }

    } else {
        console.error('Supabase library not loaded.');
    }
});
