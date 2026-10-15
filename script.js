// ============================================
// LA VIE DE TITOUAN — Navigation principale
// Gère les scènes (chapitres) via data-scene
// ============================================

const SCENES = {
    // Chapitre 1
    'cuisine': 'chapitre2.html',
    
    // Chapitre 2 — Cuisine
    'yaourt': 'chapitre2-yaourt.html',
    'tapas': 'chapitre2-tapas.html',
    'chambre': 'chapitre2-chambre.html',
    
    // Chapitre 2 — Discord
    'discord': 'chapitre2-discord.html',
    'rocket-league': 'chapitre2-rocket-league.html',
    'fifa': 'chapitre2-fifa.html',
    'minecraft': 'chapitre2-minecraft.html',
    
    // Rocket League — Revanche
    'revanche': 'chapitre2-rocket-revanche.html',
    
    // Fins
    'fin-tapas': 'chapitre2-fin-tapas.html'
};

// Garde globale : n'intercepte QUE les .choix SANS data-js
// (les boutons avec data-js sont gérés par leur propre page)
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.choix[data-scene]');
    if (!btn) return;
    if (btn.hasAttribute('data-js')) return; // laissé à la page
    
    e.preventDefault();
    const scene = btn.getAttribute('data-scene');
    const target = SCENES[scene];
    if (target) {
        window.location.href = target;
    }
});

// Raccourci clavier : Entrée sur un bouton focused
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const btn = document.querySelector('.choix[data-scene]:focus');
        if (btn && !btn.hasAttribute('data-js')) {
            btn.click();
        }
    }
});