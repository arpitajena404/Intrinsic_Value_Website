(function() {
    function normalizeUrl(url) {
        if (!url) return '';
        url = url.trim();
        if (/^(https?:\/\/|\/\/|mailto:|tel:|#|javascript:|\/)/i.test(url)) {
            return url;
        }
        return 'https://' + url;
    }

    var config = (typeof LIVE_CONFIG !== 'undefined') ? LIVE_CONFIG : {};

    var isEditMode = false;

    var selectorKeyMap = [
        { selector: '.topbar', key: 'indexTopBarText', label: 'Top Bar Announcement' },
        { selector: '.eyebrow', key: 'indexEyebrow', label: 'Hero Eyebrow Badge' },
        { selector: '.hero h1, h1.reveal', key: 'indexHeroTitle', label: 'Hero Main Headline' },
        { selector: '.hero p.sub, p.sub.reveal', key: 'indexHeroSubtitle', label: 'Hero Subheadline' },
        { selector: '#heroDateTime', key: 'indexHeroChip', label: 'Live Session Chip Text' },
        { selector: '.trust-row span:nth-child(1)', key: 'indexTrustPill1', label: 'Trust Pill 1' },
        { selector: '.trust-row span:nth-child(2)', key: 'indexTrustPill2', label: 'Trust Pill 2' },
        { selector: '.trust-row span:nth-child(3)', key: 'indexTrustPill3', label: 'Trust Pill 3' },
        { selector: '.trust-row span:nth-child(4)', key: 'indexTrustPill4', label: 'Trust Pill 4' },
        { selector: 'button.btn.js-open, .hero button.btn', key: 'indexCtaBtnText', label: 'CTA Button Text' },
        { selector: '.rating span:nth-child(2)', key: 'indexRatingText', label: 'Rating & Credential Subtext' },
        
        // Understand Section
        { selector: '.sec:nth-of-type(1) .shead h2', key: 'indexUnderstandTitle', label: 'Understand Section Title' },
        { selector: '.cards .card:nth-child(1) p', key: 'indexCard1Text', label: 'Understand Card 1 Text' },
        { selector: '.cards .card:nth-child(2) p', key: 'indexCard2Text', label: 'Understand Card 2 Text' },
        { selector: '.cards .card:nth-child(3) p', key: 'indexCard3Text', label: 'Understand Card 3 Text' },
        { selector: '.cards .card:nth-child(4) p', key: 'indexCard4Text', label: 'Understand Card 4 Text' },
        { selector: '.cards .card:nth-child(5) p', key: 'indexCard5Text', label: 'Understand Card 5 Text' },
        
        // Who Title & Panels
        { selector: '.sec:nth-of-type(2) .shead h2', key: 'indexWhoTitle', label: 'Who Section Title' },
        { selector: '.panel.yes h3', key: 'indexForYouTitle', label: 'For You Panel Title' },
        { selector: '#forList li:nth-child(1) span:nth-child(2)', key: 'indexForYouItem1', label: 'For You Point 1' },
        { selector: '#forList li:nth-child(2) span:nth-child(2)', key: 'indexForYouItem2', label: 'For You Point 2' },
        { selector: '#forList li:nth-child(3) span:nth-child(2)', key: 'indexForYouItem3', label: 'For You Point 3' },
        { selector: '#forList li:nth-child(4) span:nth-child(2)', key: 'indexForYouItem4', label: 'For You Point 4' },
        { selector: '#forList li:nth-child(5) span:nth-child(2)', key: 'indexForYouItem5', label: 'For You Point 5' },
        
        { selector: '.panel.no h3', key: 'indexNotForYouTitle', label: 'Not For You Panel Title' },
        { selector: '.panel.no ul li:nth-child(1) span:nth-child(2)', key: 'indexNotForYouItem1', label: 'Not For You Point 1' },
        { selector: '.panel.no ul li:nth-child(2) span:nth-child(2)', key: 'indexNotForYouItem2', label: 'Not For You Point 2' },
        { selector: '.panel.no ul li:nth-child(3) span:nth-child(2)', key: 'indexNotForYouItem3', label: 'Not For You Point 3' },
        { selector: '.panel.no ul li:nth-child(4) span:nth-child(2)', key: 'indexNotForYouItem4', label: 'Not For You Point 4' },
        
        // Speaker Bio
        { selector: '.bio-card h3', key: 'indexSpeakerName', label: 'Speaker Name' },
        { selector: '.bio-card p.role', key: 'indexSpeakerRole', label: 'Speaker Role' },

        // VSL Page
        { selector: '.vsl-heading, h1.vsl-title', key: 'vslHeading', label: 'VSL Page Title' },
        { selector: 'a.btn-vsl-cta, #vslCheckoutBtn', key: 'vslCtaText', label: 'VSL Checkout Button Text' },

        // Thank You Page
        { selector: '.ty-heading, h1.thankyou-title', key: 'tyHeading', label: 'Thank You Title' },
        { selector: '.ty-subheading, p.thankyou-sub', key: 'tySubheading', label: 'Thank You Subtitle' },
        { selector: 'a.btn-whatsapp, #whatsappBtn', key: 'tyBtnText', label: 'WhatsApp Button Text' }
    ];

    function applyConfig() {
        selectorKeyMap.forEach(function(item) {
            var val = config[item.key];
            if (val !== undefined && val !== null && val !== '') {
                var els = document.querySelectorAll(item.selector);
                els.forEach(function(el) {
                    if (item.key.indexOf('Url') !== -1 || item.key.indexOf('Link') !== -1) {
                        el.setAttribute('href', normalizeUrl(val));
                    } else if (el.tagName === 'BUTTON' && el.querySelector('svg')) {
                        // Preserve SVG inside buttons
                        var svgHtml = el.querySelector('svg').outerHTML;
                        el.innerHTML = svgHtml + ' ' + val;
                    } else {
                        el.innerHTML = val;
                    }
                });
            }
        });
    }

    applyConfig();

    window.addEventListener('message', function(event) {
        var msg = event.data;
        if (!msg) return;

        if (msg.type === 'init_cms_state') {
            if (msg.config) {
                config = Object.assign({}, config, msg.config);
                applyConfig();
            }
            isEditMode = msg.enabled;
            updateVisuals();
        } else if (msg.type === 'toggle_edit_mode') {
            isEditMode = msg.enabled;
            updateVisuals();
        } else if (msg.type === 'update_value') {
            config[msg.key] = msg.value;
            applyConfig();
        }
    });

    if (window.self !== window.top) {
        var pageName = window.location.pathname.split('/').pop() || 'index.html';
        window.parent.postMessage({ type: 'iframe_ready', page: pageName }, '*');
    }

    function updateVisuals() {
        var existingStyle = document.getElementById('cms-injected-styles');
        if (isEditMode) {
            if (!existingStyle) {
                var style = document.createElement('style');
                style.id = 'cms-injected-styles';
                style.innerHTML = `
                    .cms-editable-highlight {
                        outline: 3px dashed #E6B53D !important;
                        outline-offset: 4px !important;
                        box-shadow: 0 0 20px rgba(230, 181, 61, 0.7) !important;
                        cursor: pointer !important;
                        transition: all 0.2s ease !important;
                    }
                    .cms-editable-highlight:hover {
                        transform: scale(1.01) !important;
                        outline-color: #ffc107 !important;
                    }
                `;
                document.head.appendChild(style);
            }

            // Bind mapped elements
            selectorKeyMap.forEach(function(item) {
                var els = document.querySelectorAll(item.selector);
                els.forEach(function(el) {
                    el.classList.add('cms-editable-highlight');
                    el.onclick = function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.parent.postMessage({
                            type: 'request_edit',
                            key: item.key,
                            label: item.label,
                            currentVal: config[item.key] || el.innerHTML.trim()
                        }, '*');
                    };
                });
            });

            // Universal fallback highlighter for all unmapped h1, h2, h3, h4, p, li text nodes!
            var unmappedCandidates = document.querySelectorAll('h1, h2, h3, h4, p, .card p, .panel p, .btn');
            unmappedCandidates.forEach(function(el, idx) {
                if (!el.classList.contains('cms-editable-highlight') && el.innerText.trim().length > 2) {
                    el.classList.add('cms-editable-highlight');
                    var autoKey = 'autoText_' + idx;
                    el.onclick = function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.parent.postMessage({
                            type: 'request_edit',
                            key: autoKey,
                            label: 'Text Element #' + (idx + 1),
                            currentVal: config[autoKey] || el.innerHTML.trim()
                        }, '*');
                    };
                }
            });

        } else {
            if (existingStyle) existingStyle.remove();
            document.querySelectorAll('.cms-editable-highlight').forEach(function(el) {
                el.classList.remove('cms-editable-highlight');
                el.onclick = null;
            });
        }
    }
})();
