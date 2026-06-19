/**
 * Intrinsic Value Equity Advisors
 * Core Interactivity & Animations Script (Velvet Marigold Theme)
 */

// Global cached window dimensions to avoid mobile address bar scroll jumping
let cachedWindowHeight = window.innerHeight;
let cachedWindowWidth = window.innerWidth;

// Immediately lock scrolling while preloader is active
document.body.classList.add('preloader-active');

const dismissPreloader = () => {
    const preloader = document.getElementById('iv-preloader');
    if (preloader && !preloader.classList.contains('dismissed')) {
        preloader.classList.add('dismissed');
        setTimeout(() => {
            preloader.style.opacity = '0';
            preloader.style.visibility = 'hidden';
            document.body.classList.remove('preloader-active');
        }, 1300); // wait for 1.2s animation completion
    }
};

if (document.readyState === 'complete') {
    dismissPreloader();
} else {
    window.addEventListener('load', dismissPreloader);
    // Safety fallback (e.g. slow connections or stuck assets)
    setTimeout(dismissPreloader, 3500);
}

document.addEventListener('DOMContentLoaded', () => {
    // Force scroll restoration to manual and scroll to top on reload/load to reset layout states
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    // Clean up URLs for production (running on http: or https: but NOT on localhost/127.0.0.1)
    var isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if ((window.location.protocol === 'http:' || window.location.protocol === 'https:') && !isLocalhost) {
        document.querySelectorAll('a[href]').forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.endsWith('.html') && !href.startsWith('http') && !href.startsWith('//')) {
                var cleanHref = href.substring(0, href.length - 5);
                if (cleanHref === 'index' || cleanHref.endsWith('/index')) {
                    cleanHref = cleanHref.substring(0, cleanHref.length - 5) || '/';
                }
                link.setAttribute('href', cleanHref);
            }
        });
    }

    // Lock scroll stack height on load to prevent jumping when mobile address bar hides/shows
    const getScrollStackHeight = () => {
        const stackedSection = document.querySelector('.stacked-testimonials-section');
        // If the testimonials section is present, check if it has flow-layout, or if it will be initialized to it
        const isFlow = stackedSection ? (stackedSection.classList.contains('flow-layout') || true) : true;
        return isFlow ? 4.8 * cachedWindowHeight : 9.3 * cachedWindowHeight;
    };

    const scrollStack = document.querySelector('.scroll-stack');
    if (scrollStack) {
        scrollStack.style.height = `${getScrollStackHeight()}px`;
    }

    // Update dimensions on resize, ignoring minor height shifts (like mobile browser URL bar collapsing)
    window.addEventListener('resize', () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        // Trigger recalculation if width changes (desktop resize) or height changes significantly (orientation swap)
        if (Math.abs(newWidth - cachedWindowWidth) > 5 || Math.abs(newHeight - cachedWindowHeight) > 100) {
            cachedWindowHeight = newHeight;
            cachedWindowWidth = newWidth;
            if (scrollStack) {
                scrollStack.style.height = `${getScrollStackHeight()}px`;
            }
        }
    });

    // ==========================================================================
    // 1. SCROLL-SENSITIVE HEADER EFFECT
    // ==========================================================================
    const header = document.querySelector('.main-header');
    let lastScrollY = window.scrollY;
    
    const checkScroll = () => {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 20) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        const menuTrigger = document.querySelector('.menu-trigger');
        const isMenuOpen = menuTrigger && menuTrigger.classList.contains('open');

        if (currentScrollY <= 80 || isMenuOpen) {
            // Always show header at the very top of the page or if mobile menu is open
            header.classList.remove('header-hidden');
        } else if (currentScrollY > lastScrollY) {
            // Scrolling down -> Hide header
            header.classList.add('header-hidden');
        } else {
            // Scrolling up -> Reveal header
            header.classList.remove('header-hidden');
        }
        
        lastScrollY = currentScrollY;
    };
    
    window.addEventListener('scroll', checkScroll);
    checkScroll(); // Run on load in case page is refreshed while scrolled down

    // Handle header visibility during inner scrolling of the pricing/team section
    const pricingSection = document.getElementById('pricing-scroll-section');
    if (pricingSection) {
        let lastSectionScrollY = 0;
        pricingSection.addEventListener('scroll', () => {
            const currentSectionScrollY = pricingSection.scrollTop;
            const menuTrigger = document.querySelector('.menu-trigger');
            const isMenuOpen = menuTrigger && menuTrigger.classList.contains('open');

            if (currentSectionScrollY > 20) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            if (currentSectionScrollY <= 80 || isMenuOpen) {
                header.classList.remove('header-hidden');
            } else if (currentSectionScrollY > lastSectionScrollY) {
                // Scrolling down -> Hide header
                header.classList.add('header-hidden');
            } else {
                // Scrolling up -> Reveal header
                header.classList.remove('header-hidden');
            }
            lastSectionScrollY = currentSectionScrollY;
        });
    }

    // ==========================================================================
    // 2. MOBILE MENU DRAWER CONTROLLER
    // ==========================================================================
    const menuTrigger = document.querySelector('.menu-trigger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (menuTrigger && navMenu) {
        menuTrigger.addEventListener('click', () => {
            const isOpen = menuTrigger.classList.toggle('open');
            navMenu.classList.toggle('open', isOpen);
            
            // Prevent body scroll when menu is open
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });
        
        // Close menu when clicking links
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuTrigger.classList.remove('open');
                navMenu.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }



    // ==========================================================================
    // 5. CURRENT PAGE HIGHLIGHTER
    // ==========================================================================
    const currentPath = window.location.pathname;
    const pageLinks = document.querySelectorAll('.nav-link');
    
    pageLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        // Simple matching logic for standard paths
        if (currentPath.endsWith(linkPath) || (currentPath === '/' && linkPath === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    window.hasReachedBottom = false;

    // Truncate long philosophy text and bind to modals
    initPhilosophyModals();

    // Initialize 3D Philosophy Spiral Carousel
    init3DSpiral();

    // Initialize Featured In dynamic section
    initFeaturedSection();

    // Initialize Case Studies section and modals
    initCaseStudies();

    // Initialize Portfolio Carousel
    initPortfolioCarousel();

    // Initialize Stats Counter Animation
    initStatsCounters();

    // Initialize Comparison Modal
    initComparisonModal();

    // Initialize Stacked Testimonials
    initTestimonials();

    // Initialize Collapsible FAQs
    initFAQs();

    // Initialize Regulatory Disclosures Accordion
    initDisclosures();

    // Initialize Homepage Team Marquee
    initTeamMarquee();

    // Initialize Portfolio 3D Carousel
    initPortfolioCarousel();
});



// ==========================================================================
// PHILOSOPHY TEXT TRUNCATION & MODAL BINDING
// ==========================================================================
function initPhilosophyModals() {
    const spiralCards = document.querySelectorAll('.spiral-card');
    spiralCards.forEach(card => {
        const p = card.querySelector('p');
        const link = card.querySelector('a');
        if (!p || !link) return;
        
        const fullText = p.innerHTML; // get original HTML content
        const textContent = p.textContent.trim();
        
        // Find the target modal
        const modalId = link.getAttribute('href');
        if (modalId && modalId.startsWith('#')) {
            const targetModal = document.querySelector(modalId);
            if (targetModal) {
                const modalParagraph = targetModal.querySelector('p');
                if (modalParagraph) {
                    // Populate modal with full text from the card
                    modalParagraph.innerHTML = fullText;
                }
            }
        }
        
        // Truncate card text to a clean preview (e.g. 110 characters)
        const maxLength = 110;
        if (textContent.length > maxLength) {
            p.textContent = textContent.substring(0, maxLength).trim() + '...';
        }
    });
}

// ==========================================================================
// 3D SPIRAL PHILOSOPHY CAROUSEL
// ==========================================================================
function init3DSpiral() {
    const philosophySection = document.getElementById('philosophy');
    const carousel = document.querySelector('.spiral-carousel');
    const spiralCards = document.querySelectorAll('.spiral-card');
    
    if (philosophySection && carousel && spiralCards.length > 0) {
        // Dynamic adjustments for helix spacing depending on device width
        const getSpiralRadius = () => {
            return window.innerWidth <= 480 ? 230 : (window.innerWidth <= 768 ? 265 : 380);
        };
        
        const getSpiralYSpacingFactor = () => {
            return window.innerWidth <= 480 ? 3.0 : (window.innerWidth <= 768 ? 2.2 : 1.35);
        };
        
        // Bind hover listeners for scale pop
        spiralCards.forEach(card => {
            card.isHovered = false;
            card.currentHoverScale = 1.0;
            card.addEventListener('mouseenter', () => {
                card.isHovered = true;
            });
            card.addEventListener('mouseleave', () => {
                card.isHovered = false;
            });
        });
        
        // Helix geometry configuration constants
        const totalRange = 540;   // 1.5 full turns track length (540 degrees)
        const spacing = 60;       // 60 degrees spacing between cards (9 cards * 60 = 540)
        const startAngle = -270;  // Track starts at -270 degrees and wraps to +270
        
        let idleOffsetAngle = 0;
        let targetScrollOffsetAngle = 0;
        let currentScrollOffsetAngle = 0;
        
        // touch / drag rotation for mobile view (x-axis drag rotates the 3D helix)
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let dragStartAngle = 0;
        
        const sceneEl = document.querySelector('.spiral-scene');
        if (sceneEl) {
            sceneEl.addEventListener('touchstart', (e) => {
                if (window.innerWidth <= 768) {
                    isDragging = true;
                    dragStartX = e.touches[0].clientX;
                    dragStartY = e.touches[0].clientY;
                    dragStartAngle = targetScrollOffsetAngle;
                }
            }, { passive: false });
            
            sceneEl.addEventListener('touchmove', (e) => {
                if (isDragging && window.innerWidth <= 768) {
                    const clientX = e.touches[0].clientX;
                    const clientY = e.touches[0].clientY;
                    const deltaX = clientX - dragStartX;
                    const deltaY = clientY - dragStartY;
                    
                    // If drag is primarily horizontal, prevent page scrolling so helix rotates smoothly
                    if (Math.abs(deltaX) > Math.abs(deltaY)) {
                        if (e.cancelable) e.preventDefault();
                    }
                    
                    // Drag left (negative deltaX) should rotate forward (less sensitive drag)
                    const newAngle = dragStartAngle - deltaX * 0.35;
                    targetScrollOffsetAngle = Math.max(0, Math.min(360, newAngle));
                }
            }, { passive: false });
            
            sceneEl.addEventListener('touchend', () => {
                isDragging = false;
            });
        }
        
        const heroSec = document.querySelector('.iv-hero');
        const philosophySticky = document.querySelector('.spiral-philosophy-sticky');
        const featuredSec = document.querySelector('.iv-featured-section');
        const casesSec = document.querySelector('.iv-cases-section');
        const portfolioSec = document.getElementById('portfolio-scroll-section');
        const pricingSecEl = document.getElementById('pricing-scroll-section');
        const testimonialsSec = document.getElementById('testimonials-section');

        // Setup lerped values for the sections to make all viewport transitions buttery smooth
        const sectionsState = {
            hero: {
                el: heroSec,
                currOpacity: 1, targetOpacity: 1,
                currY: 0, targetY: 0,
                currScale: 1, targetScale: 1,
                pointerEvents: 'auto'
            },
            philosophy: {
                el: philosophySticky,
                currOpacity: 0, targetOpacity: 0,
                currY: 60, targetY: 60,
                currScale: 0.95, targetScale: 0.95,
                pointerEvents: 'none'
            },
            featured: {
                el: featuredSec,
                currOpacity: 0, targetOpacity: 0,
                currY: 60, targetY: 60,
                currScale: 0.95, targetScale: 0.95,
                pointerEvents: 'none',
                hasEntered: false
            },
            cases: {
                el: casesSec,
                currOpacity: 0, targetOpacity: 0,
                currY: 60, targetY: 60,
                currScale: 0.95, targetScale: 0.95,
                pointerEvents: 'none',
                hasEntered: false
            },
            portfolio: {
                el: portfolioSec,
                currOpacity: 0, targetOpacity: 0,
                currY: 60, targetY: 60,
                currScale: 0.95, targetScale: 0.95,
                pointerEvents: 'none'
            },
            pricing: {
                el: pricingSecEl,
                currOpacity: 0, targetOpacity: 0,
                currY: 60, targetY: 60,
                currScale: 0.95, targetScale: 0.95,
                pointerEvents: 'none'
            },
            testimonials: {
                el: testimonialsSec,
                currOpacity: 0, targetOpacity: 0,
                currY: 60, targetY: 60,
                currScale: 0.95, targetScale: 0.95,
                pointerEvents: 'none'
            }
        };

        const pricingTitle = document.querySelector('.pricing-title-block');
        const pricingCards = document.querySelectorAll('.pricing-card-3d');
        
        const pricingState = {
            hasAnimatedCounter: false,
            counterTimeout: null,
            title: {
                el: pricingTitle,
                currZ: -600, targetZ: -600,
                currScale: 0.3, targetScale: 0.3,
                currOpacity: 0, targetOpacity: 0
            },
            cards: Array.from(pricingCards).map(card => ({
                el: card,
                currZ: -600, targetZ: -600,
                currScale: 0.3, targetScale: 0.3,
                currOpacity: 0, targetOpacity: 0,
                currRotateX: 15, targetRotateX: 15,
                currY: 50, targetY: 50
            }))
        };

        const scrollIndicator = document.querySelector('.scroll-progress-indicator');
        const progressCircleFg = document.querySelector('.progress-circle-fg');

        let scrollDirection = 'down';
        let lastScrollY = window.scrollY;

        const getOffsets = () => {
            const windowHeight = cachedWindowHeight;
            const stackedSection = document.querySelector('.stacked-testimonials-section');
            const isFlow = stackedSection && stackedSection.classList.contains('flow-layout');
            const endOffset = isFlow ? 4.8 * windowHeight : 9.3 * windowHeight; 
            return [
                0,
                1.0 * windowHeight,
                1.8 * windowHeight,
                2.1 * windowHeight,
                2.5 * windowHeight, // Portfolio
                3.0 * windowHeight, // Pricing
                3.5 * windowHeight, // Testimonials
                3.8 * windowHeight, // Testimonials exit
                endOffset
            ];
        };

        const updateScrollIndicator = () => {
            if (!scrollIndicator || !progressCircleFg) return;

            const scrollY = window.scrollY;
            const windowHeight = cachedWindowHeight;

            // Update scroll direction
            if (scrollY > lastScrollY + 4) {
                scrollDirection = 'down';
            } else if (scrollY < lastScrollY - 4) {
                scrollDirection = 'up';
            }
            lastScrollY = scrollY;

            // Hide indicator when reaching FAQ/Footer bottom
            const stackedSection = document.querySelector('.stacked-testimonials-section');
            const isFlow = stackedSection && stackedSection.classList.contains('flow-layout');
            const hideThreshold = isFlow ? 3.9 * windowHeight : 8.2 * windowHeight;
            if (scrollY >= hideThreshold) {
                scrollIndicator.classList.remove('visible');
                return;
            }

            const offsets = getOffsets();
            let progress = 0;

            for (let i = 0; i < offsets.length - 1; i++) {
                if (scrollY >= offsets[i] && scrollY < offsets[i+1]) {
                    progress = (scrollY - offsets[i]) / (offsets[i+1] - offsets[i]);
                    break;
                }
            }

            progress = Math.max(0, Math.min(1, progress));

            const radius = 18;
            const circumference = 2 * Math.PI * radius; // ~113.10
            progressCircleFg.style.strokeDasharray = circumference.toFixed(2);
            const offset = circumference - progress * circumference;
            progressCircleFg.style.strokeDashoffset = offset.toFixed(2);

            // Update arrow rotation based on direction
            const arrow = scrollIndicator.querySelector('.scroll-indicator-arrow');
            if (arrow) {
                arrow.style.transform = scrollDirection === 'up' ? 'rotate(180deg)' : 'rotate(0deg)';
            }

            scrollIndicator.classList.add('visible');
        };

        // Add click listener to progress button to scroll directly to the next/prev section
        if (scrollIndicator) {
            scrollIndicator.addEventListener('click', () => {
                const scrollY = window.scrollY;
                const windowHeight = cachedWindowHeight;
                const offsets = getOffsets();
                
                let activeIdx = 0;
                let progress = 0;
                
                for (let i = 0; i < offsets.length - 1; i++) {
                    if (scrollY >= offsets[i] && scrollY < offsets[i+1]) {
                        activeIdx = i;
                        progress = (scrollY - offsets[i]) / (offsets[i+1] - offsets[i]);
                        break;
                    }
                }
                
                if (scrollY >= offsets[offsets.length - 1]) {
                    activeIdx = offsets.length - 1;
                }
                
                let targetScroll = scrollY;
                
                if (scrollDirection === 'down') {
                    if (activeIdx < offsets.length - 1) {
                        targetScroll = offsets[activeIdx + 1];
                    }
                } else {
                    if (progress > 0.08) {
                        targetScroll = offsets[activeIdx];
                    } else if (activeIdx > 0) {
                        targetScroll = offsets[activeIdx - 1];
                    }
                }
                
                window.scrollTo({
                    top: targetScroll,
                    behavior: 'smooth'
                });
            });
        }

        const handleScrollTransitions = () => {
            const scrollY = window.scrollY;
            const windowHeight = cachedWindowHeight;

            updateScrollIndicator();

            // Define scroll transition checkpoints relative to viewport height with uniform gaps:
            // Hero: 0.0 to 1.0
            // Philosophy card spin: 1.0 to 1.8
            // Featured logos: 1.8 to 2.1
            // Case studies: 2.1 to 2.5
            // Portfolio: 2.5 to 3.0
            // Pricing & Team: 3.0 to 3.5
            // Testimonials: 3.5 to 4.8
            
            const heroFadeEnd = 1.0 * windowHeight;

            const philFadeInStart = 0.5 * windowHeight;
            const philFadeInEnd = 1.0 * windowHeight;
            const philSpinStart = 1.0 * windowHeight;
            const philSpinEnd = 1.8 * windowHeight;
            const philFadeOutStart = 1.8 * windowHeight;

            const featuredFadeInStart = 1.8 * windowHeight;
            const featuredFadeInEnd = 2.0 * windowHeight;
            const featuredFadeOutStart = 2.1 * windowHeight;

            const casesFadeInStart = 2.1 * windowHeight;
            const casesFadeInEnd = 2.3 * windowHeight;
            const casesFadeOutStart = 2.5 * windowHeight;

            const portfolioFadeInStart = 2.5 * windowHeight;
            const portfolioFadeInEnd = 2.7 * windowHeight;
            const portfolioFadeOutStart = 3.0 * windowHeight;

            const pricingFadeInStart = 3.0 * windowHeight;
            const pricingFadeInEnd = 3.2 * windowHeight;
            const pricingZoomStart = 3.2 * windowHeight;
            const pricingZoomEnd = 3.5 * windowHeight;
            const pricingFadeOutStart = 3.5 * windowHeight;

            const testimonialsFadeInStart = 3.5 * windowHeight;
            const testimonialsFadeInEnd = 3.7 * windowHeight;
            const testimonialsFadeOutStart = 3.8 * windowHeight;

            // 1. Hero Section Fade & Translate (outward)
            if (heroSec) {
                sectionsState.hero.targetOpacity = 1;
                sectionsState.hero.targetScale = 1;
                sectionsState.hero.targetY = -scrollY;
                sectionsState.hero.pointerEvents = scrollY < heroFadeEnd ? 'auto' : 'none';
            }

            // 2. Philosophy Section (Entrance, Card Spin, and Exit)
            if (philosophySticky) {
                if (scrollY < philFadeInStart) {
                    sectionsState.philosophy.targetOpacity = 0;
                    sectionsState.philosophy.targetY = 0.45 * windowHeight;
                    sectionsState.philosophy.targetScale = 1;
                    sectionsState.philosophy.pointerEvents = 'none';
                    targetScrollOffsetAngle = scrollDirection === 'up' ? 360 : 0;
                } else if (scrollY >= philFadeInStart && scrollY <= philFadeInEnd) {
                    // Entrance Phase
                    const progress = (scrollY - philFadeInStart) / (philFadeInEnd - philFadeInStart);
                    sectionsState.philosophy.targetOpacity = progress;
                    sectionsState.philosophy.targetY = 0.45 * windowHeight * (1 - progress);
                    sectionsState.philosophy.targetScale = 1;
                    sectionsState.philosophy.pointerEvents = 'auto';
                    targetScrollOffsetAngle = scrollDirection === 'up' ? 360 : 0;
                } else if (scrollY > philFadeInEnd && scrollY < philFadeOutStart) {
                    // Active Spin Phase
                    sectionsState.philosophy.targetOpacity = 1;
                    sectionsState.philosophy.targetY = 0;
                    sectionsState.philosophy.targetScale = 1;
                    sectionsState.philosophy.pointerEvents = 'auto';

                    const spinProgress = (scrollY - philSpinStart) / (philSpinEnd - philSpinStart);
                    const clampedProgress = Math.max(0, Math.min(1, spinProgress));
                    targetScrollOffsetAngle = scrollDirection === 'up' ? 360 : (clampedProgress * 360);
                } else {
                    // Exiting Philosophy Section (scrollY >= philFadeOutStart) - scroll up naturally
                    const progress = Math.max(0, Math.min(1, (scrollY - philFadeOutStart) / (featuredFadeInEnd - philFadeOutStart)));
                    sectionsState.philosophy.targetOpacity = 1;
                    sectionsState.philosophy.targetY = -progress * windowHeight;
                    sectionsState.philosophy.targetScale = 1;
                    sectionsState.philosophy.pointerEvents = progress < 1 ? 'auto' : 'none';
                    targetScrollOffsetAngle = 360;
                }
            }

            // 3. Featured Section Fade & Translate (inward & outward)
            if (featuredSec) {
                if (scrollY < featuredFadeInStart) {
                    sectionsState.featured.targetOpacity = 0;
                    sectionsState.featured.targetY = windowHeight;
                    sectionsState.featured.targetScale = 1;
                    sectionsState.featured.pointerEvents = 'none';
                    sectionsState.featured.hasEntered = scrollDirection === 'up';
                } else if (scrollY >= featuredFadeInStart && scrollY <= featuredFadeInEnd) {
                    // Entrance Phase
                    const progress = (scrollY - featuredFadeInStart) / (featuredFadeInEnd - featuredFadeInStart);
                    sectionsState.featured.targetOpacity = progress;
                    sectionsState.featured.targetY = 0.45 * windowHeight * (1 - progress);
                    sectionsState.featured.targetScale = 1;
                    sectionsState.featured.pointerEvents = 'auto';
                    sectionsState.featured.hasEntered = true;
                } else if (scrollY > featuredFadeInEnd && scrollY < featuredFadeOutStart) {
                    // Active Phase
                    sectionsState.featured.targetOpacity = 1;
                    sectionsState.featured.targetY = 0;
                    sectionsState.featured.targetScale = 1;
                    sectionsState.featured.pointerEvents = 'auto';
                    sectionsState.featured.hasEntered = true;
                } else {
                    // Exiting Featured Section (scrollY >= featuredFadeOutStart) - scroll up naturally
                    const progress = Math.max(0, Math.min(1, (scrollY - featuredFadeOutStart) / (casesFadeInEnd - featuredFadeOutStart)));
                    sectionsState.featured.targetOpacity = 1;
                    sectionsState.featured.targetY = -progress * windowHeight;
                    sectionsState.featured.targetScale = 1;
                    sectionsState.featured.pointerEvents = progress < 1 ? 'auto' : 'none';
                    sectionsState.featured.hasEntered = true;
                }
            }

            // 4. Case Studies Section Fade & Translate (inward & outward)
            if (casesSec) {
                if (scrollY < casesFadeInStart) {
                    sectionsState.cases.targetOpacity = 0;
                    sectionsState.cases.targetY = windowHeight;
                    sectionsState.cases.targetScale = 1;
                    sectionsState.cases.pointerEvents = 'none';
                    sectionsState.cases.hasEntered = scrollDirection === 'up';
                } else if (scrollY >= casesFadeInStart && scrollY <= casesFadeInEnd) {
                    // Entrance Phase
                    const progress = (scrollY - casesFadeInStart) / (casesFadeInEnd - casesFadeInStart);
                    sectionsState.cases.targetOpacity = progress;
                    sectionsState.cases.targetY = 0.45 * windowHeight * (1 - progress);
                    sectionsState.cases.targetScale = 1;
                    sectionsState.cases.pointerEvents = 'auto';
                    sectionsState.cases.hasEntered = true;
                } else if (scrollY > casesFadeInEnd && scrollY < casesFadeOutStart) {
                    // Active Phase
                    sectionsState.cases.targetOpacity = 1;
                    sectionsState.cases.targetY = 0;
                    sectionsState.cases.targetScale = 1;
                    sectionsState.cases.pointerEvents = 'auto';
                    sectionsState.cases.hasEntered = true;
                } else {
                    // Exiting Cases Section (scrollY >= casesFadeOutStart) - scroll up naturally
                    const progress = Math.max(0, Math.min(1, (scrollY - casesFadeOutStart) / (portfolioFadeInEnd - casesFadeOutStart)));
                    sectionsState.cases.targetOpacity = 1;
                    sectionsState.cases.targetY = -progress * windowHeight;
                    sectionsState.cases.targetScale = 1;
                    sectionsState.cases.pointerEvents = progress < 1 ? 'auto' : 'none';
                    sectionsState.cases.hasEntered = true;
                }
            }

            // 4b. Portfolio Section Fade & Translate (inward & outward)
            const portfolioSec = sectionsState.portfolio.el;
            if (portfolioSec) {
                if (scrollY < portfolioFadeInStart) {
                    sectionsState.portfolio.targetOpacity = 0;
                    sectionsState.portfolio.targetY = windowHeight;
                    sectionsState.portfolio.targetScale = 1;
                    sectionsState.portfolio.pointerEvents = 'none';
                } else if (scrollY >= portfolioFadeInStart && scrollY <= portfolioFadeInEnd) {
                    // Entrance Phase
                    const progress = (scrollY - portfolioFadeInStart) / (portfolioFadeInEnd - portfolioFadeInStart);
                    sectionsState.portfolio.targetOpacity = progress;
                    sectionsState.portfolio.targetY = 0.45 * windowHeight * (1 - progress);
                    sectionsState.portfolio.targetScale = 1;
                    sectionsState.portfolio.pointerEvents = 'auto';
                } else if (scrollY > portfolioFadeInEnd && scrollY < portfolioFadeOutStart) {
                    // Active Phase
                    sectionsState.portfolio.targetOpacity = 1;
                    sectionsState.portfolio.targetY = 0;
                    sectionsState.portfolio.targetScale = 1;
                    sectionsState.portfolio.pointerEvents = 'auto';
                } else {
                    // Exiting Portfolio Section (scrollY >= portfolioFadeOutStart) - scroll up naturally
                    const progress = Math.max(0, Math.min(1, (scrollY - portfolioFadeOutStart) / (pricingFadeInEnd - portfolioFadeOutStart)));
                    sectionsState.portfolio.targetOpacity = 1;
                    sectionsState.portfolio.targetY = -progress * windowHeight;
                    sectionsState.portfolio.targetScale = 1;
                    sectionsState.portfolio.pointerEvents = progress < 1 ? 'auto' : 'none';
                }
            }

            // 5. Pricing Section Fade & Translate (inward & outward)
            const pricingSec = sectionsState.pricing.el;
            if (pricingSec) {
                if (scrollY < pricingFadeInStart) {
                    sectionsState.pricing.targetOpacity = 0;
                    sectionsState.pricing.targetY = windowHeight;
                    sectionsState.pricing.targetScale = 1;
                    sectionsState.pricing.pointerEvents = 'none';
                    
                    // Reset zoom state to background when section is hidden
                    pricingState.title.targetZ = -600;
                    pricingState.title.targetScale = 0.3;
                    pricingState.title.targetOpacity = 0;
                    pricingState.cards.forEach(c => {
                        c.targetZ = -600;
                        c.targetScale = 0.3;
                        c.targetOpacity = 0;
                        c.targetRotateX = 15;
                        c.targetY = 50;
                    });
                    
                    pricingState.hasAnimatedCounter = false;
                    if (pricingState.counterTimeout) {
                        clearTimeout(pricingState.counterTimeout);
                        pricingState.counterTimeout = null;
                    }
                } else if (scrollY >= pricingFadeInStart && scrollY <= pricingFadeInEnd) {
                    // Entrance Phase - Start zoom animation automatically immediately on reach
                    const progress = (scrollY - pricingFadeInStart) / (pricingFadeInEnd - pricingFadeInStart);
                    sectionsState.pricing.targetOpacity = progress;
                    sectionsState.pricing.targetY = 0.45 * windowHeight * (1 - progress);
                    sectionsState.pricing.targetScale = 1;
                    sectionsState.pricing.pointerEvents = 'auto';
                    
                    pricingState.title.targetZ = 0;
                    pricingState.title.targetScale = 1.0;
                    pricingState.title.targetOpacity = 1.0;
                    pricingState.cards.forEach(c => {
                        c.targetZ = 0;
                        c.targetScale = 1.0;
                        c.targetOpacity = 1.0;
                        c.targetRotateX = 0;
                        c.targetY = 0;
                    });
                    if (pricingState.counterTimeout) {
                        clearTimeout(pricingState.counterTimeout);
                        pricingState.counterTimeout = null;
                    }
                } else if (scrollY > pricingFadeInEnd && scrollY < pricingFadeOutStart) {
                    // Active Phase - Keep cards and title zoomed forward
                    sectionsState.pricing.targetOpacity = 1;
                    sectionsState.pricing.targetY = 0;
                    sectionsState.pricing.targetScale = 1;
                    sectionsState.pricing.pointerEvents = 'auto';

                    pricingState.title.targetZ = 0;
                    pricingState.title.targetScale = 1.0;
                    pricingState.title.targetOpacity = 1.0;

                    pricingState.cards.forEach(c => {
                        c.targetZ = 0;
                        c.targetScale = 1.0;
                        c.targetOpacity = 1.0;
                        c.targetRotateX = 0;
                        c.targetY = 0;
                    });

                    // Trigger dynamic count-down when cards zoom entrance is complete (visible properly)
                    if (!pricingState.hasAnimatedCounter && !pricingState.counterTimeout) {
                        pricingState.counterTimeout = setTimeout(() => {
                            animatePriceCounter();
                            pricingState.hasAnimatedCounter = true;
                            pricingState.counterTimeout = null;
                        }, 500);
                    }
                } else {
                    // Exiting Pricing Section (scrollY >= pricingFadeOutStart) - scroll up naturally
                    const progress = Math.max(0, Math.min(1, (scrollY - pricingFadeOutStart) / (testimonialsFadeInEnd - pricingFadeOutStart)));
                    sectionsState.pricing.targetOpacity = 1;
                    sectionsState.pricing.targetY = -progress * windowHeight;
                    sectionsState.pricing.targetScale = 1;
                    sectionsState.pricing.pointerEvents = progress < 1 ? 'auto' : 'none';

                    // Title & Cards remain zoomed forward
                    pricingState.title.targetZ = 0;
                    pricingState.title.targetScale = 1;
                    pricingState.title.targetOpacity = 1;
                    pricingState.cards.forEach(c => {
                        c.targetZ = 0;
                        c.targetScale = 1;
                        c.targetOpacity = 1;
                        c.targetRotateX = 0;
                        c.targetY = 0;
                    });
                    if (pricingState.counterTimeout) {
                        clearTimeout(pricingState.counterTimeout);
                        pricingState.counterTimeout = null;
                    }
                }
            }

            // 6. Testimonials Section Fade & Translate (inward & outward)
            const testimonialsSec = sectionsState.testimonials.el;
            if (testimonialsSec) {
                if (scrollY < testimonialsFadeInStart) {
                    sectionsState.testimonials.targetOpacity = 0;
                    sectionsState.testimonials.targetY = windowHeight;
                    sectionsState.testimonials.targetScale = 1;
                    sectionsState.testimonials.pointerEvents = 'none';
                } else if (scrollY >= testimonialsFadeInStart && scrollY <= testimonialsFadeInEnd) {
                    // Entrance Phase
                    const progress = (scrollY - testimonialsFadeInStart) / (testimonialsFadeInEnd - testimonialsFadeInStart);
                    sectionsState.testimonials.targetOpacity = progress;
                    sectionsState.testimonials.targetY = 0.45 * windowHeight * (1 - progress);
                    sectionsState.testimonials.targetScale = 1;
                    sectionsState.testimonials.pointerEvents = 'auto';
                } else if (scrollY > testimonialsFadeInEnd && scrollY < testimonialsFadeOutStart) {
                    // Active Phase
                    sectionsState.testimonials.targetOpacity = 1;
                    sectionsState.testimonials.targetY = 0;
                    sectionsState.testimonials.targetScale = 1;
                    sectionsState.testimonials.pointerEvents = 'auto';
                } else {
                    // Exiting Testimonials Section (scrollY >= testimonialsFadeOutStart) - scroll up naturally
                    const offsets = getOffsets();
                    const endOffset = offsets[offsets.length - 1];
                    const progress = Math.max(0, Math.min(1, (scrollY - testimonialsFadeOutStart) / (endOffset - testimonialsFadeOutStart)));
                    sectionsState.testimonials.targetOpacity = 1 - progress;
                    sectionsState.testimonials.targetY = -progress * windowHeight;
                    sectionsState.testimonials.targetScale = 1 - progress * 0.05;
                    sectionsState.testimonials.pointerEvents = progress < 1 ? 'auto' : 'none';
                }
            }
        };

        window.addEventListener('scroll', handleScrollTransitions);
        window.addEventListener('resize', handleScrollTransitions);
        handleScrollTransitions(); // Run initially
        
        // Continuous Animation Loop
        function animateSpiral() {
            if (carousel) {
                carousel.style.transform = '';
                carousel.currentX = 0;
            }

            // Idle rotation (slowly clockwise, moving cards upward)
            idleOffsetAngle += 0.05; 
            
            // Smooth linear interpolation (lerp) for scroll-driven rotation
            currentScrollOffsetAngle += (targetScrollOffsetAngle - currentScrollOffsetAngle) * 0.08;
            
            const baseAngle = idleOffsetAngle + currentScrollOffsetAngle;
            const radius = getSpiralRadius();
            const ySpacingFactor = getSpiralYSpacingFactor();
            
            // A. Smoothly update and apply section transitions (buttery smooth scroll transitions)
            const isMobileView = window.innerWidth <= 768;
            const sectionLerp = 0.16;
            for (const key in sectionsState) {
                const s = sectionsState[key];
                if (s.el) {
                    if (isMobileView) {
                        s.el.style.opacity = '';
                        s.el.style.transform = '';
                        s.el.style.pointerEvents = '';
                        s.el.style.display = '';
                        s.el.style.filter = '';
                        continue;
                    }
                    s.currOpacity += (s.targetOpacity - s.currOpacity) * sectionLerp;
                    s.currY += (s.targetY - s.currY) * sectionLerp;
                    s.currScale += (s.targetScale - s.currScale) * sectionLerp;
                    
                    // Apply standard fade to the previous (exiting) section as it scrolls out of view
                    const isPreviousSection = (scrollDirection === 'down' && s.targetY < 0) || 
                                              (scrollDirection === 'up' && s.targetY > 0);
                    
                    let fadeMultiplier = 1.0;
                    if (isPreviousSection) {
                        const exitProgress = Math.min(Math.max(Math.abs(s.currY) / cachedWindowHeight, 0), 1);
                        // Make exiting sections fade out fully
                        fadeMultiplier = 1.0 - exitProgress; 
                    }
                    
                    s.el.style.opacity = (s.currOpacity * fadeMultiplier).toFixed(3);
                    s.el.style.transform = `translateY(${s.currY.toFixed(2)}px) scale(${s.currScale.toFixed(3)})`;
                    s.el.style.pointerEvents = s.pointerEvents;
                    s.el.style.filter = ''; // Reset any previous filter blur
                    
                    // Hide completely when inactive to prevent blocking clicks
                    if (s.currOpacity < 0.01 && s.targetOpacity === 0) {
                        s.el.style.display = 'none';
                    } else {
                        s.el.style.display = '';
                    }
                    
                    // Toggle the entered class for trigger animations in case studies / featured
                    if (key === 'featured' || key === 'cases') {
                        if (s.hasEntered) {
                            s.el.classList.add('entered');
                        } else {
                            s.el.classList.remove('entered');
                        }
                    }
                }
            }
            
            // B. Position each card along the helix track coordinates with smooth flying/fading/blur transitions
            spiralCards.forEach((card, idx) => {
                const angle = baseAngle + idx * spacing;
                
                // Wrap the angle to stay within the repeating track range [-270, 270)
                let wrapped = (angle - startAngle) % totalRange;
                if (wrapped < 0) wrapped += totalRange;
                const trackAngle = startAngle + wrapped;
                
                const rotY = trackAngle;
                const y = -trackAngle * ySpacingFactor; // Negative to make increasing angle translate card upward
                
                // 1. Fade out cards near boundaries to make wrapping jumps invisible
                let boundaryOpacity = 1.0;
                const fadeWidth = 80; // degrees
                if (trackAngle < startAngle + fadeWidth) {
                    boundaryOpacity = (trackAngle - startAngle) / fadeWidth;
                } else if (trackAngle > (startAngle + totalRange - fadeWidth)) {
                    boundaryOpacity = (startAngle + totalRange - trackAngle) / fadeWidth;
                }
                boundaryOpacity = Math.max(0, Math.min(1, boundaryOpacity));
                
                // 2. Continuous flying & faded/blurred rotation based on angle from front (0 degrees)
                let normAngle = rotY % 360;
                if (normAngle < 0) normAngle += 360;
                
                let angleDiff = Math.abs(normAngle);
                if (angleDiff > 180) angleDiff = 360 - angleDiff; // [0, 180], where 0 is front, 180 is back
                
                let frontProgress = (180 - angleDiff) / 180; // 0 in back, 1 in front
                let t = (1 - Math.cos(frontProgress * Math.PI)) / 2; // Smooth cosine curve
                
                // Lerp scale, radius (depth), depth opacity, and blur amount
                let currentScale = 0.62 + 0.43 * t; // scales from 0.62 (back) to 1.05 (front)
                let currentRadius = radius * (0.55 + 0.53 * t); // tight core (0.55*R) to expanded front (1.08*R)
                
                // Steeper opacity curve: front card is fully opaque, neighbors and back cards are highly translucent
                let opacityExponent = window.innerWidth <= 768 ? 6.0 : 3.5;
                let depthOpacity = 0.03 + 0.97 * Math.pow(t, opacityExponent);
                let finalOpacity = boundaryOpacity * depthOpacity;
                let blurAmount = (1 - t) * 7.5; // up to 7.5px blur in back, 0px in front
                
                // 3. Smooth hover pop factor interpolation
                const targetHoverScale = card.isHovered ? 1.06 : 1.0;
                card.currentHoverScale += (targetHoverScale - card.currentHoverScale) * 0.15;
                currentScale *= card.currentHoverScale;
                
                // Apply computed styles
                card.style.transform = `rotateY(${rotY.toFixed(1)}deg) translateZ(${currentRadius.toFixed(1)}px) scale(${currentScale.toFixed(3)}) translateY(${y.toFixed(1)}px)`;
                card.style.opacity = finalOpacity.toFixed(3);
                card.style.filter = blurAmount > 0.15 ? `blur(${blurAmount.toFixed(2)}px)` : 'none';
                
                // Disable clicks and visibility of back-facing/out-of-bounds cards
                const isBackside = (normAngle > 85 && normAngle < 275);
                if (boundaryOpacity < 0.08 || finalOpacity < 0.05) {
                    card.style.visibility = 'hidden';
                    card.style.pointerEvents = 'none';
                } else {
                    card.style.visibility = 'visible';
                    card.style.pointerEvents = isBackside ? 'none' : 'auto';
                }
            });
            
            // C. Smoothly update and apply Pricing Section elements
            if (pricingSecEl) {
                if (isMobileView) {
                    if (pricingState.title.el) {
                        pricingState.title.el.style.transform = '';
                        pricingState.title.el.style.opacity = '';
                    }
                    pricingState.cards.forEach(c => {
                        if (c.el) {
                            c.el.style.transform = '';
                            c.el.style.opacity = '';
                        }
                    });
                } else {
                    const pricingLerp = 0.08;
                    
                    // Interpolate Title
                    pricingState.title.currZ += (pricingState.title.targetZ - pricingState.title.currZ) * pricingLerp;
                    pricingState.title.currScale += (pricingState.title.targetScale - pricingState.title.currScale) * pricingLerp;
                    pricingState.title.currOpacity += (pricingState.title.targetOpacity - pricingState.title.currOpacity) * pricingLerp;
                    
                    if (pricingState.title.el) {
                        pricingState.title.el.style.transform = `translate3d(0, 0, ${pricingState.title.currZ.toFixed(1)}px) scale(${pricingState.title.currScale.toFixed(3)})`;
                        pricingState.title.el.style.opacity = pricingState.title.currOpacity.toFixed(3);
                    }
                    
                    // Interpolate Cards
                    pricingState.cards.forEach(c => {
                        c.currZ += (c.targetZ - c.currZ) * pricingLerp;
                        c.currScale += (c.targetScale - c.currScale) * pricingLerp;
                        c.currOpacity += (c.targetOpacity - c.currOpacity) * pricingLerp;
                        c.currRotateX += (c.targetRotateX - c.currRotateX) * pricingLerp;
                        c.currY += (c.targetY - c.currY) * pricingLerp;
                        
                        if (c.el) {
                            c.el.style.transform = `translate3d(0, ${c.currY.toFixed(1)}px, ${c.currZ.toFixed(1)}px) scale(${c.currScale.toFixed(3)}) rotateX(${c.currRotateX.toFixed(1)}deg)`;
                            c.el.style.opacity = c.currOpacity.toFixed(3);
                        }
                    });
                }
            }
            
            requestAnimationFrame(animateSpiral);
        }
        
        requestAnimationFrame(animateSpiral);
        
        // Bind click events on cards to trigger modals natively
        const modals = document.querySelectorAll('.modal[id^="services_item"]');
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    modal.classList.remove('active');
                    setTimeout(() => {
                        modal.style.display = 'none';
                    }, 400);
                });
            }
            
            // Close on background overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    setTimeout(() => {
                        modal.style.display = 'none';
                    }, 400);
                }
            });
        });
        
        const spiralLinks = document.querySelectorAll('.spiral-card a');
        spiralLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const modalId = link.getAttribute('href');
                const targetModal = document.querySelector(modalId);
                if (targetModal) {
                    targetModal.style.display = 'flex';
                    void targetModal.offsetWidth; // Force layout repaint
                    targetModal.classList.add('active');
                }
            });
        });
    }
}

// ==========================================================================
// DYNAMIC FEATURED IN (PRESS & RECOGNITION) SECTION
// ==========================================================================
function initFeaturedSection() {
    const section = document.getElementById('featured');
    const displayQuote = document.querySelector('.featured-quote');
    const displaySource = document.querySelector('.featured-source');
    const cardsRow = document.querySelector('.featured-cards-row');
    const paginationDot = document.querySelector('.featured-pagination-dot');
    
    if (!section || !cardsRow) return;
    
    // 1. Clone cards for infinite loop marquee scroll
    const originalCardsList = Array.from(cardsRow.children);
    const totalOriginalCards = originalCardsList.length;
    originalCardsList.forEach(card => {
        const clone = card.cloneNode(true);
        clone.classList.remove('active');
        cardsRow.appendChild(clone);
    });
    
    // Query ALL cards including the newly cloned ones
    const cards = document.querySelectorAll('.featured-logo-card');
    if (cards.length === 0) return;
    
    let currentIndex = 0;
    let isPaused = false;
    let scrollSpeed = 0.7; // Speed of auto scroll in pixels per frame
    let halfScrollWidth = 0;
    let animationFrameId = null;
    
    // Calculate the wrap-around scroll width once layout is ready
    function initScrollMetrics() {
        if (cards.length > totalOriginalCards) {
            // offset of start of cloned set minus 1st card
            halfScrollWidth = cards[totalOriginalCards].offsetLeft - cards[0].offsetLeft;
        }
    }
    
    // Recalculate metrics once window is fully loaded to ensure styles/fonts are ready
    if (document.readyState === 'complete') {
        setTimeout(initScrollMetrics, 100);
    } else {
        window.addEventListener('load', initScrollMetrics);
    }
    
    // Recalculate when any image finishes loading (to handle layout shifts/cache)
    cardsRow.querySelectorAll('img').forEach(img => {
        img.addEventListener('load', initScrollMetrics);
    });
    
    // Run metrics recalculation on window resize
    window.addEventListener('resize', initScrollMetrics);
    
    // 3. Swapping function to update display quote with animations
    function updateDisplay(index, shouldScroll = true) {
        if (index < 0 || index >= cards.length) return;
        
        const card = cards[index];
        const quote = card.getAttribute('data-quote');
        const source = card.getAttribute('data-source');
        const dataIndex = parseInt(card.getAttribute('data-index'), 10);
        
        // Remove active class from all logo cards
        cards.forEach(c => c.classList.remove('active'));
        
        // Highlight all cards carrying this exact index (both original and clones)
        cards.forEach(c => {
            if (parseInt(c.getAttribute('data-index'), 10) === dataIndex) {
                c.classList.add('active');
            }
        });
        
        // Only trigger swap animation if content actually changes
        const currentDataIndex = parseInt(cards[currentIndex]?.getAttribute('data-index') || '-1', 10);
        if (dataIndex !== currentDataIndex) {
            displayQuote.classList.add('swapping');
            displaySource.classList.add('swapping');
            
            setTimeout(() => {
                displayQuote.innerHTML = quote;
                displaySource.innerHTML = source;
                
                displayQuote.classList.remove('swapping');
                displaySource.classList.remove('swapping');
            }, 220);
        }
        
        // Position pagination indicator dot
        updatePaginationDot(dataIndex);
        
        if (shouldScroll) {
            centerActiveCard(card);
        }
        
        currentIndex = index;
    }
    
    // 4. Position dynamic pagination indicator dot
    function updatePaginationDot(dataIndex) {
        if (!paginationDot) return;
        const trackWidth = 120; // matches CSS pagination track width (120px)
        const dotWidth = 15;   // matches CSS dot width (15px)
        
        const step = (trackWidth - dotWidth) / (totalOriginalCards - 1);
        const leftPos = dataIndex * step;
        paginationDot.style.left = `${leftPos}px`;
    }
    
    // 5. Center active card in overflow scroll area (used on hover/click interaction)
    function centerActiveCard(card) {
        if (!cardsRow) return;
        const rowWidth = cardsRow.clientWidth;
        const cardLeft = card.offsetLeft;
        const cardWidth = card.clientWidth;
        
        const scrollTarget = cardLeft - (rowWidth / 2) + (cardWidth / 2);
        cardsRow.scrollTo({
            left: scrollTarget,
            behavior: 'smooth'
        });
    }
    
    // 6. Find which card is closest to the middle of the scroll viewport
    function updateActiveCardFromScroll() {
        const rowCenter = cardsRow.scrollLeft + (cardsRow.clientWidth / 2);
        let closestIndex = 0;
        let minDistance = Infinity;
        
        cards.forEach((card, idx) => {
            const cardCenter = card.offsetLeft + (card.clientWidth / 2);
            const distance = Math.abs(rowCenter - cardCenter);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = idx;
            }
        });
        
        // Update selection quietly without centering scroll
        const currentDataIndex = parseInt(cards[currentIndex]?.getAttribute('data-index') || '-1', 10);
        const closestDataIndex = parseInt(cards[closestIndex]?.getAttribute('data-index'), 10);
        if (closestDataIndex !== currentDataIndex) {
            updateDisplay(closestIndex, false);
        }
    }
    
    // 7. Auto Scroll Loop (marquee animation)
    function tickScroll() {
        if (halfScrollWidth === 0) {
            initScrollMetrics();
        }
        if (!isPaused && halfScrollWidth > 0) {
            cardsRow.scrollLeft += scrollSpeed;
            
            // Loop around seamlessly
            if (cardsRow.scrollLeft >= halfScrollWidth) {
                cardsRow.scrollLeft -= halfScrollWidth;
            }
            
            // Auto update active card as it scrolls through the middle
            updateActiveCardFromScroll();
        }
        animationFrameId = requestAnimationFrame(tickScroll);
    }
    
    // 8. Event Listeners for Cards
    cards.forEach((card, idx) => {
        // Hover to preview and pause scroll
        card.addEventListener('mouseenter', () => {
            isPaused = true;
            updateDisplay(idx, false);
        });
        
        // Click to open outbound link
        card.addEventListener('click', () => {
            const url = card.getAttribute('data-link');
            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        });
    });
    
    // Pause auto scroll when hovering anywhere inside the cards row
    cardsRow.addEventListener('mouseenter', () => {
        isPaused = true;
    });
    
    // Resume scroll on mouse leave
    cardsRow.addEventListener('mouseleave', () => {
        isPaused = false;
    });
    
    // Support touchscreen touch drag pausing
    cardsRow.addEventListener('touchstart', () => {
        isPaused = true;
    });
    cardsRow.addEventListener('touchend', () => {
        setTimeout(() => {
            isPaused = false;
        }, 1500); // Resume scroll shortly after swipe ends
    });
    
    // 9. Initialize & Run
    initScrollMetrics();
    updateDisplay(0, false);
    
    // Start animation loop
    animationFrameId = requestAnimationFrame(tickScroll);
}

// ==========================================================================
// CASE STUDIES MODALS & INTERACTIVE HANDLERS
// ==========================================================================
function initCaseStudies() {
    const wrappers = document.querySelectorAll('.company-card-wrapper');
    const container = document.querySelector('.cases-buttons-container');

    if (wrappers.length === 0) return;

    wrappers.forEach(wrapper => {
        const trigger = wrapper.querySelector('.btn-company-trigger');
        
        if (trigger) {
            trigger.addEventListener('click', (e) => {
                const isAlreadyExpanded = wrapper.classList.contains('expanded');

                // 1. Collapse all other wrappers first
                wrappers.forEach(w => w.classList.remove('expanded'));

                // 2. Toggle this wrapper if it wasn't already expanded
                if (!isAlreadyExpanded) {
                    wrapper.classList.add('expanded');
                    if (container) {
                        container.classList.add('has-expanded');
                    }
                } else {
                    if (container) {
                        container.classList.remove('has-expanded');
                    }
                }
            });
        }

        // 3. Prevent click propagation inside report links
        const reportLinks = wrapper.querySelectorAll('.btn-report-item');
        reportLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
    });
}

// ==========================================================================
// HERO STATS COUNTER ANIMATION
// ==========================================================================
function initStatsCounters() {
    const counters = document.querySelectorAll('.count-up');
    if (counters.length === 0) return;

    // Options for Intersection Observer
    const options = {
        threshold: 0.1, // Trigger when 10% of the element is visible
        rootMargin: "0px"
    };

    const countUp = (counter) => {
        const target = parseInt(counter.getAttribute('data-target'), 10);
        const duration = 3500; // Animation duration in ms (3.5 seconds)
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);

            // Easing function: easeOutQuad
            const easeProgress = progress * (2 - progress);
            const currentValue = Math.floor(easeProgress * target);

            counter.textContent = currentValue;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                counter.textContent = target; // Ensure exact final value
            }
        };

        requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                countUp(entry.target);
                observer.unobserve(entry.target); // Run only once
            }
        });
    }, options);

    counters.forEach(counter => {
        observer.observe(counter);
    });
}

// PRICING COMPARISON MODAL CONTROLLER
// ==========================================================================
function initComparisonModal() {
    const comparisonModal = document.getElementById('comparisonModal');
    const openComparisonBtns = document.querySelectorAll('.open-comparison-btn');
    
    if (comparisonModal) {
        const closeBtn = comparisonModal.querySelector('.comparison-close');
        
        openComparisonBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                comparisonModal.style.display = 'flex';
                void comparisonModal.offsetWidth; // Force layout repaint
                comparisonModal.classList.add('active');
                document.body.style.overflow = 'hidden'; // Lock background scroll
            });
        });
        
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                comparisonModal.classList.remove('active');
                document.body.style.overflow = ''; // Restore background scroll
                setTimeout(() => {
                    comparisonModal.style.display = 'none';
                }, 400);
            });
        }
        
        comparisonModal.addEventListener('click', (e) => {
            if (e.target === comparisonModal) {
                comparisonModal.classList.remove('active');
                document.body.style.overflow = ''; // Restore background scroll
                setTimeout(() => {
                    comparisonModal.style.display = 'none';
                }, 400);
            }
        });
    }
}

// ==========================================================================
// PRICE COUNTDOWN COUNTER ANIMATION
// ==========================================================================
function animatePriceCounter() {
    const counterSpan = document.querySelector('.pricing-discount-counter');
    if (!counterSpan) return;
    
    const startVal = 45000;
    const endVal = 39871;
    const duration = 2500; // 2.5 seconds countdown (slower rate)
    const startTime = performance.now();
    
    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing out cubic: starts fast, slows down at the end
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentVal = Math.round(startVal - (startVal - endVal) * easeProgress);
        
        // Format with Indian commas
        counterSpan.textContent = currentVal.toLocaleString('en-IN');
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// ==========================================================================
// STACKED TESTIMONIALS 3D CAROUSEL ANIMATION (Auto-play + Manual Arrow Controls)
// ==========================================================================
function initTestimonials() {
    const stackedSection = document.querySelector('.stacked-testimonials-section');
    const stackedCards = document.querySelectorAll('.testimonial-card');
    
    if (stackedSection && stackedCards.length > 0) {
        const totalCards = stackedCards.length;
        let isDragging = false;
        let startX = 0;
        let dragOffsetStart = 0;
        let dragResumeTimeout = null;
        
        let autoScrollOffset = 0; // Target offset
        let renderOffset = 0;     // Smoothly eased offset used for rendering
        
        let lastX = 0;
        let lastMoveTime = 0;
        let dragVelocity = 0;
        let isMomentum = false;
        let momentumVelocity = 0;
        
        let lastInteractionTime = Date.now();
        let lastSlideTime = Date.now();
        let autoPlayTargetIndex = 0;
        let flowAnimationId = null;
        
        // Get card spacing based on viewport width (Card width + Gap)
        const getCardSpacing = () => {
            const windowWidth = window.innerWidth;
            if (windowWidth <= 480) return 230; // 190px width + 40px gap (centered card with peek layout)
            if (windowWidth <= 768) return 380; // 300px width + 80px gap
            return 480; // 360px width + 120px gap
        };

        // Drag-to-scroll interactions (mouse and touch)
        const container = document.querySelector('.testimonials-carousel-container');
        if (container) {
            const handleDragStart = (e) => {
                if (!stackedSection.classList.contains('flow-layout')) return;
                isDragging = true;
                isMomentum = false;
                momentumVelocity = 0;
                dragVelocity = 0;
                
                const x = e.pageX || (e.touches && e.touches[0].pageX);
                startX = x;
                lastX = x;
                lastMoveTime = Date.now();
                dragOffsetStart = autoScrollOffset;
                
                lastInteractionTime = Date.now();
                
                if (dragResumeTimeout) {
                    clearTimeout(dragResumeTimeout);
                }
            };
            
            const handleDragMove = (e) => {
                if (!isDragging) return;
                const x = e.pageX || (e.touches && e.touches[0].pageX);
                if (!x) return;
                const deltaX = x - startX;
                
                const S = getCardSpacing();
                const L = totalCards * S;
                
                // Drag left (negative deltaX) moves cards to left (increases autoScrollOffset)
                autoScrollOffset = (dragOffsetStart - deltaX) % L;
                if (autoScrollOffset < 0) autoScrollOffset += L;
                
                // Track velocity
                const now = Date.now();
                const dt = now - lastMoveTime;
                if (dt > 0) {
                    const dx = x - lastX;
                    dragVelocity = -dx / dt; // positive speed when moving left
                }
                lastX = x;
                lastMoveTime = now;
                lastInteractionTime = now;
            };
            
            const handleDragEnd = () => {
                if (!isDragging) return;
                isDragging = false;
                
                const now = Date.now();
                const S = getCardSpacing();
                const L = totalCards * S;
                
                // If the user released recently after moving, apply momentum
                if (now - lastMoveTime < 100 && Math.abs(dragVelocity) > 0.1) {
                    isMomentum = true;
                    const maxVel = 15;
                    momentumVelocity = Math.max(-maxVel, Math.min(maxVel, dragVelocity * 16)); // scale velocity to frame rate (~16ms)
                } else {
                    isMomentum = false;
                    autoPlayTargetIndex = Math.round(autoScrollOffset / S) % totalCards;
                    if (autoPlayTargetIndex < 0) autoPlayTargetIndex += totalCards;
                    autoScrollOffset = autoPlayTargetIndex * S;
                }
                
                lastInteractionTime = now;
            };
            
            container.addEventListener('mousedown', (e) => {
                if (stackedSection.classList.contains('flow-layout')) {
                    e.preventDefault();
                    handleDragStart(e);
                }
            });
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            
            container.addEventListener('touchstart', handleDragStart, { passive: true });
            window.addEventListener('touchmove', handleDragMove, { passive: true });
            window.addEventListener('touchend', handleDragEnd);

            // Mouse wheel / Trackpad scrolling support
            container.addEventListener('wheel', (e) => {
                if (!stackedSection.classList.contains('flow-layout')) return;
                
                // Only intercept horizontal wheel scrolling on trackpad / horizontal scroll wheel.
                // Do NOT prevent default or handle vertical scrolling (e.deltaY) so the page scrolls naturally.
                if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 0) {
                    e.preventDefault();
                    isMomentum = false; // Stop momentum on manual scroll
                    
                    const S = getCardSpacing();
                    const L = totalCards * S;
                    
                    // Update offset based on delta scroll
                    autoScrollOffset = (autoScrollOffset + e.deltaX * 0.5) % L;
                    if (autoScrollOffset < 0) autoScrollOffset += L;
                    
                    lastInteractionTime = Date.now();
                    
                    if (dragResumeTimeout) {
                        clearTimeout(dragResumeTimeout);
                    }
                    dragResumeTimeout = setTimeout(() => {
                        autoPlayTargetIndex = Math.round(autoScrollOffset / S) % totalCards;
                        if (autoPlayTargetIndex < 0) autoPlayTargetIndex += totalCards;
                        autoScrollOffset = autoPlayTargetIndex * S;
                        lastInteractionTime = Date.now();
                    }, 250);
                }
            }, { passive: false });
        }
        
        const startFlowAnimation = () => {
            if (flowAnimationId) return;
            
            const animateFlow = () => {
                if (!stackedSection.classList.contains('flow-layout')) return;
                
                const S = getCardSpacing();
                const L = totalCards * S;
                const now = Date.now();
                
                // 1. Momentum physics
                if (isMomentum) {
                    autoScrollOffset = (autoScrollOffset + momentumVelocity) % L;
                    if (autoScrollOffset < 0) autoScrollOffset += L;
                    
                    momentumVelocity *= 0.95;
                    
                    if (Math.abs(momentumVelocity) < 0.2) {
                        isMomentum = false;
                        momentumVelocity = 0;
                        autoPlayTargetIndex = Math.round(autoScrollOffset / S) % totalCards;
                        if (autoPlayTargetIndex < 0) autoPlayTargetIndex += totalCards;
                        autoScrollOffset = autoPlayTargetIndex * S;
                        lastInteractionTime = now;
                        lastSlideTime = now;
                    }
                }
                
                // 2. Auto-play logic
                const isIdle = !isDragging && !isMomentum && (now - lastInteractionTime > 2500);
                if (isIdle) {
                    if (now - lastSlideTime > 2500) {
                        autoPlayTargetIndex = (autoPlayTargetIndex + 1) % totalCards;
                        autoScrollOffset = autoPlayTargetIndex * S;
                        lastSlideTime = now;
                    }
                } else if (!isDragging && !isMomentum) {
                    lastSlideTime = now;
                }
                
                // 3. Easing renderOffset to autoScrollOffset (shortest-path circular wrap)
                let diff = autoScrollOffset - renderOffset;
                if (diff > L / 2) diff -= L;
                if (diff < -L / 2) diff += L;
                
                let easingFactor = 0.08; // default smooth slide ease
                if (isDragging) {
                    easingFactor = 0.25; // responsive drag follow
                } else if (isMomentum) {
                    easingFactor = 0.2;  // responsive momentum follow
                }
                
                renderOffset = (renderOffset + diff * easingFactor) % L;
                if (renderOffset < 0) renderOffset += L;
                
                // 4. Show/hide viewfinder corners dynamically
                const distToTarget = Math.abs(diff);
                if (distToTarget < 3 && !isDragging && !isMomentum) {
                    stackedSection.classList.add('show-corners');
                } else {
                    stackedSection.classList.remove('show-corners');
                }
                
                // 5. Position and transform all cards
                stackedCards.forEach((card, idx) => {
                    const val = (idx * S) - renderOffset;
                    let wrappedPosition = ((val + L/2) % L + L) % L - L/2;
                    
                    const d = Math.abs(wrappedPosition);
                    const midPoint = S / 2;
                    let scale = 1.0;
                    let glow = 0;
                    if (d < midPoint) {
                        const progress = 1 - d / midPoint;
                        const easeProgress = 1 - Math.pow(1 - progress, 3);
                        scale = 1.0 + 0.16 * easeProgress;
                        glow = easeProgress;
                    }
                    
                    card.style.transform = `translate3d(${wrappedPosition.toFixed(1)}px, 0, 0) scale(${scale.toFixed(3)})`;
                    card.style.opacity = '1';
                    card.style.visibility = 'visible';
                    card.style.zIndex = d < midPoint ? '10' : '5';
                    
                    card.style.boxShadow = glow > 0.01 
                        ? `0 25px 50px rgba(0, 0, 0, 0.6), 0 0 35px rgba(255, 140, 0, ${(0.5 * glow).toFixed(2)})` 
                        : '';
                    card.style.borderColor = glow > 0.01 
                        ? `rgba(255, 140, 0, ${(0.08 + 0.55 * glow).toFixed(2)})` 
                        : '';
                });
                
                flowAnimationId = requestAnimationFrame(animateFlow);
            };
            
            flowAnimationId = requestAnimationFrame(animateFlow);
        };

        // Initialize state on page load directly in flow layout
        stackedSection.classList.add('flow-layout');
        stackedSection.classList.add('show-corners');
        
        autoScrollOffset = 0;
        renderOffset = 0;
        lastInteractionTime = Date.now() - 1500; // Trigger first slide in 1.0 second
        lastSlideTime = Date.now() - 1500;
        autoPlayTargetIndex = 0;
        isMomentum = false;
        momentumVelocity = 0;
        isDragging = false;
        
        startFlowAnimation();
    }
}

// ==========================================================================
// FAQ ACCORDION & SCROLL REVEAL EFFECT
// ==========================================================================
function initFAQs() {
    const faqItems = document.querySelectorAll('.faq-item');
    const faqSection = document.getElementById('faq');
    
    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const header = item.querySelector('.faq-question-header');
            const answer = item.querySelector('.faq-answer');
            
            if (header && answer) {
                header.addEventListener('click', () => {
                    const isOpen = item.classList.contains('active');
                    
                    // Close all other FAQ items first for an accordion effect
                    faqItems.forEach(otherItem => {
                        if (otherItem !== item) {
                            otherItem.classList.remove('active');
                            const otherAnswer = otherItem.querySelector('.faq-answer');
                            if (otherAnswer) {
                                otherAnswer.style.maxHeight = '0px';
                                otherAnswer.style.opacity = '0';
                            }
                        }
                    });
                    
                    // Toggle this FAQ item
                    if (isOpen) {
                        item.classList.remove('active');
                        answer.style.maxHeight = '0px';
                        answer.style.opacity = '0';
                    } else {
                        item.classList.add('active');
                        answer.style.maxHeight = answer.scrollHeight + 'px';
                        answer.style.opacity = '1';
                    }
                });
            }
        });
    }
    
    // Scroll reveal observer (fading and sliding effect)
    if (faqSection) {
        const observerOptions = {
            threshold: 0.15,
            rootMargin: "0px"
        };
        
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        revealObserver.observe(faqSection);
    }
}

// ==========================================================================
// REGULATORY DISCLOSURES ACCORDION CONTROLLER
// ==========================================================================
function initDisclosures() {
    const disclosureItems = document.querySelectorAll('.disclosure-item');
    const disclosuresSection = document.getElementById('disclosures');
    
    if (disclosureItems.length > 0) {
        disclosureItems.forEach(item => {
            const header = item.querySelector('.disclosure-header');
            const panel = item.querySelector('.disclosure-panel');
            
            if (header && panel) {
                header.addEventListener('click', () => {
                    const isOpen = item.classList.contains('active');
                    
                    // Close all other main disclosure items first for accordion effect
                    disclosureItems.forEach(otherItem => {
                        if (otherItem !== item) {
                            otherItem.classList.remove('active');
                            const otherPanel = otherItem.querySelector('.disclosure-panel');
                            if (otherPanel) {
                                otherPanel.style.maxHeight = '0px';
                                otherPanel.style.opacity = '0';
                            }
                        }
                    });
                    
                    // Toggle this item
                    if (isOpen) {
                        // Collapse
                        item.classList.remove('active');
                        panel.style.maxHeight = panel.scrollHeight + 'px';
                        panel.offsetHeight; // Force reflow
                        panel.style.maxHeight = '0px';
                        panel.style.opacity = '0';
                    } else {
                        // Expand
                        item.classList.add('active');
                        panel.style.maxHeight = panel.scrollHeight + 'px';
                        panel.style.opacity = '1';
                        
                        const handleTransitionEnd = (e) => {
                            if (e.propertyName === 'max-height' && item.classList.contains('active')) {
                                panel.style.maxHeight = 'none';
                            }
                            panel.removeEventListener('transitionend', handleTransitionEnd);
                        };
                        panel.addEventListener('transitionend', handleTransitionEnd);
                    }
                });
            }
            
            // Nested sub-disclosure toggles
            const subItems = item.querySelectorAll('.sub-disclosure-item');
            if (subItems && subItems.length > 0) {
                subItems.forEach(subItem => {
                    const subHeader = subItem.querySelector('.sub-disclosure-header');
                    const subPanel = subItem.querySelector('.sub-disclosure-panel');
                    
                    if (subHeader && subPanel) {
                        // Set initial state for items with active class on load
                        if (subItem.classList.contains('active')) {
                            subPanel.style.maxHeight = subPanel.scrollHeight + 'px';
                            subPanel.style.opacity = '1';
                        }
                        
                        subHeader.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent parent accordion click events
                            
                            const isSubOpen = subItem.classList.contains('active');
                            const parentPanel = item.querySelector('.disclosure-panel');
                            
                            if (isSubOpen) {
                                // Collapse sub item
                                subItem.classList.remove('active');
                                
                                if (parentPanel && parentPanel.style.maxHeight === 'none') {
                                    parentPanel.style.maxHeight = parentPanel.scrollHeight + 'px';
                                    parentPanel.offsetHeight; // Force reflow
                                }
                                
                                subPanel.style.maxHeight = '0px';
                                subPanel.style.opacity = '0';
                                
                                if (parentPanel) {
                                    const newParentHeight = parentPanel.scrollHeight - subPanel.scrollHeight;
                                    parentPanel.style.maxHeight = Math.max(0, newParentHeight) + 'px';
                                    
                                    const restoreParentNone = (evt) => {
                                        if (evt.propertyName === 'max-height' && item.classList.contains('active')) {
                                            parentPanel.style.maxHeight = 'none';
                                        }
                                        parentPanel.removeEventListener('transitionend', restoreParentNone);
                                    };
                                    parentPanel.addEventListener('transitionend', restoreParentNone);
                                }
                            } else {
                                // Expand sub item
                                subItem.classList.add('active');
                                
                                if (parentPanel && parentPanel.style.maxHeight === 'none') {
                                    parentPanel.style.maxHeight = parentPanel.scrollHeight + 'px';
                                    parentPanel.offsetHeight; // Force reflow
                                }
                                
                                subPanel.style.maxHeight = subPanel.scrollHeight + 'px';
                                subPanel.style.opacity = '1';
                                
                                if (parentPanel) {
                                    const newParentHeight = parentPanel.scrollHeight + subPanel.scrollHeight;
                                    parentPanel.style.maxHeight = newParentHeight + 'px';
                                    
                                    const restoreParentNone = (evt) => {
                                        if (evt.propertyName === 'max-height' && item.classList.contains('active')) {
                                            parentPanel.style.maxHeight = 'none';
                                        }
                                        parentPanel.removeEventListener('transitionend', restoreParentNone);
                                    };
                                    parentPanel.addEventListener('transitionend', restoreParentNone);
                                }
                            }
                        });
                    }
                });
            }
        });
    }
    
    // Scroll reveal observer
    if (disclosuresSection) {
        const observerOptions = {
            threshold: 0.15,
            rootMargin: "0px"
        };
        
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        revealObserver.observe(disclosuresSection);
    }
}

function initTeamMarquee() {
    const cardsRow = document.querySelector('.team-cards-row');
    if (!cardsRow) return;
    
    // 1. Clone cards for infinite loop marquee scroll
    const originalCardsList = Array.from(cardsRow.children);
    const totalOriginalCards = originalCardsList.length;
    originalCardsList.forEach(card => {
        const clone = card.cloneNode(true);
        cardsRow.appendChild(clone);
    });
    
    // Query ALL cards including the newly cloned ones
    const cards = cardsRow.querySelectorAll('.team-card');
    if (cards.length === 0) return;
    
    let isPaused = false;
    let scrollSpeed = 0.6; // Speed of auto scroll in pixels per frame
    let halfScrollWidth = 0;
    let animationFrameId = null;
    
    // Calculate the wrap-around scroll width once layout is ready
    function initScrollMetrics() {
        if (cards.length > totalOriginalCards) {
            // offset of start of cloned set minus 1st card
            halfScrollWidth = cards[totalOriginalCards].offsetLeft - cards[0].offsetLeft;
        }
    }
    
    // Recalculate metrics once window is fully loaded to ensure styles/fonts are ready
    if (document.readyState === 'complete') {
        setTimeout(initScrollMetrics, 100);
    } else {
        window.addEventListener('load', initScrollMetrics);
    }
    
    // Recalculate when any image finishes loading (to handle layout shifts/cache)
    cardsRow.querySelectorAll('img').forEach(img => {
        img.addEventListener('load', initScrollMetrics);
    });
    
    // Run metrics recalculation on window resize
    window.addEventListener('resize', initScrollMetrics);
    
    // Auto Scroll Loop (marquee animation)
    function tickScroll() {
        if (halfScrollWidth === 0) {
            initScrollMetrics();
        }
        if (!isPaused && halfScrollWidth > 0) {
            cardsRow.scrollLeft += scrollSpeed;
            
            // Loop around seamlessly
            if (cardsRow.scrollLeft >= halfScrollWidth) {
                cardsRow.scrollLeft -= halfScrollWidth;
            }
        }
        animationFrameId = requestAnimationFrame(tickScroll);
    }
    
    // Pause auto scroll when hovering anywhere inside the cards row
    cardsRow.addEventListener('mouseenter', () => {
        isPaused = true;
    });
    
    // Resume scroll on mouse leave
    cardsRow.addEventListener('mouseleave', () => {
        isPaused = false;
    });
    
    // Support touchscreen touch drag pausing
    cardsRow.addEventListener('touchstart', () => {
        isPaused = true;
    });
    cardsRow.addEventListener('touchend', () => {
        setTimeout(() => {
            isPaused = false;
        }, 1500); // Resume scroll shortly after swipe ends
    });
    
    // Initialize & Run
    initScrollMetrics();
    
    // Start animation loop
    animationFrameId = requestAnimationFrame(tickScroll);
}

// ==========================================================================
// PORTFOLIO 3D CAROUSEL (KamayaKya Style Slider)
// ==========================================================================
function initPortfolioCarousel() {
    const container = document.querySelector('.portfolio-carousel-container');
    if (!container) return;
    
    const cards = container.querySelectorAll('.portfolio-card');
    const prevBtn = container.querySelector('.portfolio-arrow.prev');
    const nextBtn = container.querySelector('.portfolio-arrow.next');
    const progressBar = container.querySelector('#portfolioProgressBar');
    
    if (cards.length === 0) return;
    
    let currentIndex = 0;
    const totalCards = cards.length;
    let autoplayTimer = null;
    let isHovered = false;
    
    function updateCarousel() {
        cards.forEach((card, index) => {
            card.classList.remove('active', 'prev', 'next', 'hidden');
            
            if (index === currentIndex) {
                card.classList.add('active');
            } else if (index === (currentIndex - 1 + totalCards) % totalCards) {
                card.classList.add('prev');
            } else if (index === (currentIndex + 1) % totalCards) {
                card.classList.add('next');
            } else {
                card.classList.add('hidden');
            }
        });
        
        if (progressBar) {
            progressBar.style.animation = 'none';
            progressBar.offsetHeight; // trigger reflow
            progressBar.style.animation = 'portfolioProgressAnim 7s linear forwards';
            if (isHovered) {
                progressBar.style.animationPlayState = 'paused';
            } else {
                progressBar.style.animationPlayState = 'running';
            }
        }
    }
    
    function startAutoplay() {
        stopAutoplay();
        if (isHovered) return;
        autoplayTimer = setInterval(() => {
            nextSlide();
        }, 7000);
    }
    
    function stopAutoplay() {
        if (autoplayTimer) {
            clearInterval(autoplayTimer);
            autoplayTimer = null;
        }
    }
    
    function resetAutoplay() {
        if (!isHovered) {
            startAutoplay();
        }
    }
    
    function nextSlide() {
        currentIndex = (currentIndex + 1) % totalCards;
        updateCarousel();
        resetAutoplay();
    }
    
    function prevSlide() {
        currentIndex = (currentIndex - 1 + totalCards) % totalCards;
        updateCarousel();
        resetAutoplay();
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            nextSlide();
        });
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            prevSlide();
        });
    }
    
    // Click on side cards to slide them to center
    cards.forEach((card, index) => {
        card.addEventListener('click', (e) => {
            if (card.classList.contains('prev')) {
                e.preventDefault();
                prevSlide();
            } else if (card.classList.contains('next')) {
                e.preventDefault();
                nextSlide();
            }
        });
    });
    
    // Swipe gestures support
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    
    container.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    container.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        // Only trigger horizontal swipe if deltaX is larger than deltaY (horizontal intent)
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX < 0) {
                prevSlide(); // Swipe left (opposite direction)
            } else {
                nextSlide(); // Swipe right (opposite direction)
            }
        }
    }
    
    // Horizontal wheel/trackpad scrolling support
    let lastWheelTime = 0;
    container.addEventListener('wheel', (e) => {
        // Primary horizontal scroll check
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 10) {
            e.preventDefault(); // Lock vertical page scrolling and default actions
            const now = Date.now();
            if (now - lastWheelTime > 800) { // Cooldown between transitions
                if (e.deltaX > 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
                lastWheelTime = now;
            }
        }
    }, { passive: false });
    
    function handleMouseEnter() {
        isHovered = true;
        stopAutoplay();
        if (progressBar) {
            progressBar.style.animationPlayState = 'paused';
        }
    }

    function handleMouseLeave() {
        isHovered = false;
        startAutoplay();
        if (progressBar) {
            progressBar.style.animation = 'none';
            progressBar.offsetHeight; // trigger reflow
            progressBar.style.animation = 'portfolioProgressAnim 7s linear forwards';
            progressBar.style.animationPlayState = 'running';
        }
    }

    // Hover pause behavior for autoplay
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
    
    // Initialize the view and autoplay
    updateCarousel();
    startAutoplay();
}

