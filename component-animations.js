/**
 * Component Animations with GSAP
 * Animazioni professionali per card, bottoni, form e altri elementi
 */

(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', function() {

    // Registra ScrollTrigger
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    // ===== 1. ANIMAZIONI CARDS (cadono dall'alto) =====
    
    // Funzione per animare le card
    function animateCards(cards) {
      if (cards.length === 0) return;
      
      gsap.from(cards, {
        opacity: 0,
        y: -100,
        rotation: -5,
        duration: 0.8,
        stagger: 0.08,
        ease: "bounce.out",
        clearProps: "all"
      });

      // Hover effect (evita duplicati)
      cards.forEach(card => {
        if (!card.hasAttribute('data-hover-initialized')) {
          card.setAttribute('data-hover-initialized', 'true');
          
          card.addEventListener('mouseenter', function() {
            gsap.to(this, {
              y: -8,
              scale: 1.02,
              duration: 0.3,
              ease: "power2.out"
            });
          });

          card.addEventListener('mouseleave', function() {
            gsap.to(this, {
              y: 0,
              scale: 1,
              duration: 0.3,
              ease: "power2.out"
            });
          });
        }
      });
    }
    
    // Selettore per tutte le card
    const cardSelector = '.item, .serie, .serie-card, .user-card, .notification-card, .brand-card, .message-item, .item-admin-card';
    
    // Anima card esistenti
    const initialCards = document.querySelectorAll(cardSelector);
    animateCards(initialCards);
    
    // Observer per card aggiunte dinamicamente
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Se il nodo è una card
            if (node.matches && node.matches(cardSelector)) {
              animateCards([node]);
            }
            // Se il nodo contiene card
            const newCards = node.querySelectorAll ? node.querySelectorAll(cardSelector) : [];
            if (newCards.length > 0) {
              animateCards(newCards);
            }
          }
        });
      });
    });
    
    // Osserva il body per card aggiunte dinamicamente
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // ===== 2. BOTTONI CON EFFETTO RIPPLE =====
    const buttons = document.querySelectorAll('button, .btn');
    
    buttons.forEach(button => {
      button.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ripple = document.createElement('span');
        ripple.style.position = 'absolute';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.width = '0px';
        ripple.style.height = '0px';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(255, 255, 255, 0.5)';
        ripple.style.transform = 'translate(-50%, -50%)';
        ripple.style.pointerEvents = 'none';
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        gsap.to(ripple, {
          width: 300,
          height: 300,
          opacity: 0,
          duration: 0.6,
          ease: "power2.out",
          onComplete: () => ripple.remove()
        });
      });

      // Scale on hover
      button.addEventListener('mouseenter', function() {
        gsap.to(this, {
          scale: 1.05,
          duration: 0.2,
          ease: "power2.out"
        });
      });

      button.addEventListener('mouseleave', function() {
        gsap.to(this, {
          scale: 1,
          duration: 0.2,
          ease: "power2.out"
        });
      });
    });

    // ===== 3. FORM INPUTS CON LABEL FLOATING =====
    const inputs = document.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
      input.addEventListener('focus', function() {
        gsap.to(this, {
          scale: 1.02,
          duration: 0.2,
          ease: "power2.out"
        });
      });

      input.addEventListener('blur', function() {
        gsap.to(this, {
          scale: 1,
          duration: 0.2,
          ease: "power2.out"
        });
      });
    });

    // ===== 4. NAVBAR HIDE/SHOW ON SCROLL =====
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;
    
    if (navbar) {
      window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > lastScroll && currentScroll > 100) {
          // Scroll down - hide
          gsap.to(navbar, {
            y: -100,
            duration: 0.3,
            ease: "power2.inOut"
          });
        } else {
          // Scroll up - show
          gsap.to(navbar, {
            y: 0,
            duration: 0.3,
            ease: "power2.inOut"
          });
        }
        
        lastScroll = currentScroll;
      }, { passive: true });
    }

    // ===== 5. BOTTOM NAV ICONS CON BOUNCE =====
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    
    navItems.forEach(item => {
      item.addEventListener('click', function() {
        const icon = this.querySelector('.icon');
        if (icon) {
          gsap.timeline()
            .to(icon, {
              y: -10,
              duration: 0.2,
              ease: "power2.out"
            })
            .to(icon, {
              y: 0,
              duration: 0.3,
              ease: "bounce.out"
            });
        }
      });
    });

    // ===== 6. SEARCH BAR EXPAND ON FOCUS =====
    const searchInput = document.querySelector('#search-input, .search-bar input');
    
    if (searchInput) {
      searchInput.addEventListener('focus', function() {
        gsap.to(this, {
          scale: 1.05,
          boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
          duration: 0.3,
          ease: "power2.out"
        });
      });

      searchInput.addEventListener('blur', function() {
        gsap.to(this, {
          scale: 1,
          boxShadow: "none",
          duration: 0.3,
          ease: "power2.out"
        });
      });
    }

    // ===== 7. NOTIFICATION BADGE PULSE =====
    const badge = document.querySelector('.notifiche-badge');
    
    if (badge && badge.textContent !== '0') {
      gsap.to(badge, {
        scale: 1.2,
        duration: 0.5,
        ease: "power2.inOut",
        yoyo: true,
        repeat: -1,
        repeatDelay: 2
      });
    }

    // ===== 8. LOADING SPINNER SMOOTH =====
    const spinner = document.querySelector('.spinner');
    
    if (spinner) {
      gsap.to(spinner, {
        rotation: 360,
        duration: 1,
        ease: "none",
        repeat: -1
      });
    }

    // ===== 9. MODAL/LIGHTBOX FADE IN =====
    const lightbox = document.querySelector('.lightbox');
    
    if (lightbox) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.target.style.display === 'flex') {
            gsap.fromTo(lightbox, 
              { opacity: 0, scale: 0.9 },
              { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" }
            );
          }
        });
      });
      
      observer.observe(lightbox, { attributes: true, attributeFilter: ['style'] });
    }

    // ===== 10. MESSAGES/ALERTS SLIDE IN =====
    const messages = document.querySelectorAll('.message, .error, .success');
    
    if (messages.length > 0) {
      gsap.from(messages, {
        y: -50,
        opacity: 0,
        duration: 0.5,
        stagger: 0.2,
        ease: "back.out(1.7)"
      });
    }

    // ===== 11. PROFILE AVATAR ROTATE ON HOVER =====
    const profileAvatar = document.querySelector('.profile-avatar');
    
    if (profileAvatar) {
      profileAvatar.parentElement.addEventListener('mouseenter', function() {
        gsap.to(profileAvatar, {
          rotation: 360,
          duration: 0.6,
          ease: "back.out(2)"
        });
      });
    }

    // ===== 12. FILTERS SLIDE DOWN =====
    const filterToggle = document.querySelector('#toggle-filters');
    const filtersContainer = document.querySelector('#filters-container');
    
    if (filterToggle && filtersContainer) {
      // Imposta stato iniziale
      filtersContainer.style.display = 'none';
      filtersContainer.style.overflow = 'hidden';
      
      filterToggle.addEventListener('click', function() {
        const isHidden = filtersContainer.style.display === 'none';
        
        if (isHidden) {
          // Mostra filtri
          filtersContainer.style.display = 'grid';
          filtersContainer.style.height = 'auto';
          
          // Ottieni l'altezza reale del contenuto
          const targetHeight = filtersContainer.scrollHeight;
          
          // Resetta a 0 per l'animazione
          filtersContainer.style.height = '0px';
          filtersContainer.style.opacity = '0';
          
          filterToggle.textContent = '🔧 Nascondi Filtri';
          filterToggle.classList.add('active');
          
          // Anima verso l'altezza target
          gsap.to(filtersContainer, {
            height: targetHeight,
            opacity: 1,
            duration: 0.4,
            ease: "power2.out",
            onComplete: () => {
              filtersContainer.style.height = 'auto';
            }
          });
        } else {
          // Nascondi filtri
          filterToggle.textContent = '🔧 Mostra Filtri';
          filterToggle.classList.remove('active');
          
          // Ottieni l'altezza attuale prima di animare
          const currentHeight = filtersContainer.scrollHeight;
          filtersContainer.style.height = currentHeight + 'px';
          
          gsap.to(filtersContainer, {
            height: 0,
            opacity: 0,
            duration: 0.35,
            ease: "power2.in",
            onComplete: () => {
              filtersContainer.style.display = 'none';
            }
          });
        }
      });
    }

    // ===== 13. PAGE TITLE FADE IN =====
    const pageTitle = document.querySelector('h1');
    
    if (pageTitle) {
      gsap.from(pageTitle, {
        opacity: 0,
        y: -30,
        duration: 0.8,
        ease: "power3.out",
        delay: 0.2
      });
    }

    // ===== 14. IMAGES LAZY LOAD FADE =====
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      if (img.complete) {
        gsap.from(img, {
          opacity: 0,
          scale: 0.95,
          duration: 0.6,
          ease: "power2.out"
        });
      } else {
        img.addEventListener('load', function() {
          gsap.from(this, {
            opacity: 0,
            scale: 0.95,
            duration: 0.6,
            ease: "power2.out"
          });
        });
      }
    });

    // ===== 15. STATISTICS COUNTER ANIMATION =====
    function animateCounter(element) {
      const target = parseFloat(element.textContent);
      const isPercentage = element.textContent.includes('%');
      const isDecimal = element.textContent.includes('.');
      
      if (!isNaN(target)) {
        gsap.from(element, {
          textContent: 0,
          duration: 2,
          ease: "power2.out",
          snap: { textContent: isDecimal ? 0.1 : 1 },
          onUpdate: function() {
            const value = parseFloat(element.textContent);
            element.textContent = isDecimal ? value.toFixed(1) : Math.round(value);
            if (isPercentage) element.textContent += '%';
          }
        });
      }
    }

    // Selettori per numeri statistiche
    const statNumbers = document.querySelectorAll('.stat-number, .stat-number-large, .completion-percentage, .count-text');
    statNumbers.forEach(el => {
      // Usa ScrollTrigger se disponibile, altrimenti anima subito
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.create({
          trigger: el,
          start: "top 80%",
          once: true,
          onEnter: () => animateCounter(el)
        });
      } else {
        animateCounter(el);
      }
    });

    // ===== 16. PROGRESS BAR FILL ANIMATION =====
    const progressBars = document.querySelectorAll('.progress-fill, .progress-fill-chart');
    
    progressBars.forEach(bar => {
      const targetWidth = bar.style.width || '0%';
      bar.style.width = '0%';
      
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.create({
          trigger: bar,
          start: "top 80%",
          once: true,
          onEnter: () => {
            gsap.to(bar, {
              width: targetWidth,
              duration: 1.5,
              ease: "power2.out"
            });
          }
        });
      } else {
        gsap.to(bar, {
          width: targetWidth,
          duration: 1.5,
          ease: "power2.out",
          delay: 0.3
        });
      }
    });

    // ===== 17. EMPTY STATE FLOAT ANIMATION =====
    const emptyIcons = document.querySelectorAll('.empty-icon, .empty-state .icon');
    
    emptyIcons.forEach(icon => {
      gsap.to(icon, {
        y: -15,
        duration: 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      });
    });

    // ===== 18. ERROR SHAKE ANIMATION =====
    window.shakeElement = function(element) {
      gsap.timeline()
        .to(element, { x: -10, duration: 0.1 })
        .to(element, { x: 10, duration: 0.1 })
        .to(element, { x: -10, duration: 0.1 })
        .to(element, { x: 10, duration: 0.1 })
        .to(element, { x: 0, duration: 0.1 });
    };

    // Auto-shake su errori
    const errorElements = document.querySelectorAll('.error, .error-message');
    errorElements.forEach(el => {
      if (el.textContent.trim()) {
        window.shakeElement(el);
      }
    });

    // ===== 19. STAGGER LIST ITEMS (slide from left/right alternating) =====
    const lists = document.querySelectorAll('.brand-list, .series-list, .collection-section');
    
    lists.forEach(list => {
      const items = list.children;
      if (items.length > 0) {
        Array.from(items).forEach((item, index) => {
          const fromLeft = index % 2 === 0;
          
          if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.create({
              trigger: item,
              start: "top 90%",
              once: true,
              onEnter: () => {
                gsap.from(item, {
                  x: fromLeft ? -100 : 100,
                  opacity: 0,
                  duration: 0.8,
                  ease: "power2.out"
                });
              }
            });
          }
        });
      }
    });

    // ===== 20. GLOW EFFECT FOR NEW ITEMS =====
    window.highlightNewItem = function(element) {
      const timeline = gsap.timeline();
      
      timeline
        .to(element, {
          boxShadow: "0 0 20px rgba(111, 71, 201, 0.6)",
          duration: 0.3,
          ease: "power2.out"
        })
        .to(element, {
          boxShadow: "0 0 40px rgba(111, 71, 201, 0.8)",
          duration: 0.5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: 3
        })
        .to(element, {
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          duration: 0.5,
          ease: "power2.out"
        });
    };

    // ===== 21. SMOOTH SCROLL REVEAL =====
    if (typeof ScrollTrigger !== 'undefined') {
      const revealElements = document.querySelectorAll('.stat-card, .profile-section, .chart-container');
      
      revealElements.forEach(el => {
        gsap.from(el, {
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            once: true
          },
          y: 50,
          opacity: 0,
          duration: 0.8,
          ease: "power2.out"
        });
      });
    }

    // ===== 22. IMAGE BLUR-UP EFFECT =====
    const itemImages = document.querySelectorAll('.item-foto, .item-image, .serie-preview-image');
    
    itemImages.forEach(img => {
      if (!img.complete) {
        img.style.filter = 'blur(10px)';
        img.style.transform = 'scale(1.1)';
        
        img.addEventListener('load', function() {
          gsap.to(this, {
            filter: 'blur(0px)',
            scale: 1,
            duration: 0.6,
            ease: "power2.out"
          });
        });
      }
    });

    // ===== 23. CONFETTI CELEBRATION =====
    window.celebrateCompletion = function() {
      const colors = ['#6f47c9', '#4b2e97', '#f093fb', '#f5576c', '#43aa8b', '#ffd700'];
      const confettiCount = 50;
      
      for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-20px';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        confetti.style.zIndex = '10001';
        confetti.style.pointerEvents = 'none';
        
        document.body.appendChild(confetti);
        
        gsap.to(confetti, {
          y: window.innerHeight + 100,
          x: (Math.random() - 0.5) * 400,
          rotation: Math.random() * 720,
          opacity: 0,
          duration: 2 + Math.random() * 2,
          ease: "power2.in",
          onComplete: () => confetti.remove()
        });
      }
    };

    // ===== 24. CARD FLIP ANIMATION =====
    window.flipCard = function(card) {
      gsap.timeline()
        .to(card, {
          rotationY: 90,
          duration: 0.3,
          ease: "power2.in"
        })
        .to(card, {
          rotationY: 0,
          duration: 0.3,
          ease: "power2.out"
        });
    };

    // ===== 25. BADGE ENTRANCE ANIMATION =====
    const badges = document.querySelectorAll('.badge, .item-status, .priority-alta, .priority-media, .priority-bassa');
    
    badges.forEach((badge, index) => {
      gsap.from(badge, {
        scale: 0,
        opacity: 0,
        duration: 0.5,
        ease: "back.out(2)",
        delay: index * 0.1
      });
    });

    // ===== 26. PARALLAX BACKGROUND =====
    if (typeof ScrollTrigger !== 'undefined') {
      const parallaxSections = document.querySelectorAll('.profile-section, .welcome-section');
      
      parallaxSections.forEach(section => {
        gsap.to(section, {
          backgroundPosition: "50% 100px",
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true
          }
        });
      });
    }

    // ===== 27. NOTIFICATION SLIDE IN =====
    const observer27 = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.matches && node.matches('.notification-card, .message-item, .alert')) {
              gsap.from(node, {
                x: 100,
                opacity: 0,
                duration: 0.5,
                ease: "back.out(1.7)"
              });
            }
          }
        });
      });
    });

    observer27.observe(document.body, {
      childList: true,
      subtree: true
    });

  });

})();
