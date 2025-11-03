/**
 * Title Animation with Continuous Gradient
 * Gradiente sempre in movimento + bounce ogni tanto
 */

(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', function() {
    
    const navTitle = document.querySelector('.nav-title');
    
    if (!navTitle) return;

    // Imposta gradiente iniziale con più colori + stroke nero
    navTitle.style.background = 'linear-gradient(90deg, #2563eb, #0ea5e9, #06b6d4, #14b8a6, #10b981, #a855f7, #8b5cf6, #6366f1, #2563eb)';
    navTitle.style.backgroundSize = '300% 100%';
    navTitle.style.backgroundClip = 'text';
    navTitle.style.webkitBackgroundClip = 'text';
    navTitle.style.webkitTextFillColor = 'transparent';
    navTitle.style.backgroundPosition = '0% 50%';
    navTitle.style.webkitTextStroke = '1px rgba(0, 0, 0, 0.7)';
    navTitle.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';

    // Animazione gradiente continua (loop infinito)
    gsap.to(navTitle, {
      backgroundPosition: '300% 50%',
      duration: 8,
      ease: "none",
      repeat: -1
    });

    // Funzione bounce (solo il rimbalzo, gradiente continua)
    function bounce() {
      gsap.to(navTitle, {
        y: -10,
        duration: 0.4,
        ease: "power2.out",
        yoyo: true,
        repeat: 1
      });
    }

    // Prima volta dopo 5 secondi
    setTimeout(bounce, 5000);

    // Poi ogni 5 secondi
    setInterval(bounce, 5000);

  });

})();
