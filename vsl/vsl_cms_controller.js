(function() {
    function normalizeUrl(url) {
        if (!url) return '';
        url = url.trim();
        if (/^(https?:\/\/|\/\/|mailto:|tel:|#|javascript:|\/)/i.test(url)) {
            return url;
        }
        return 'https://' + url;
    }

    var config = (typeof VSL_CONFIG !== 'undefined') ? VSL_CONFIG : {
        badgeText: "ONLY FOR INVESTORS WITH ₹40 TO 50 LAKH+ INVESTMENT CAPITAL",
        headingTitle: "Learn How Institutes <span style=\"color: #FF6B35\">manage money</span> and How SEBI Registered Research Analyst help you make better investment decisions from <span style=\"color: #FF6B35\">7500+ Listed Stocks</span>",
        subheadingTitle: "Know How SEBI-Registered Research Analyst Can Support You In:",
        featureItem1: "Understanding Quality Stock Research Methods",
        featureItem2: "Learning Portfolio Risk Assessment Techniques",
        featureItem3: "Developing Structured Investment Approaches",
        wistiaMediaId: "necvm00k9r",
        buttonText: "Book Your FREE Consultation Call",
        checkoutUrl: "https://premium.intrinsicvalueequity.in/checkout/57732990-cd31-4ae1-af3a-5d8105b52f96?init_booking=true",
        noteText: "⚠️This is not for everyone. Only continue if you're serious about getting results.",
        disclaimerText: "Investment in securities market are subjected to market risks, Read all the related documents carefully before investing<br /><strong>Disclaimer</strong>: Registration granted by and certification from NISM in no way guarantee performance of the Research Analyst or provide any assurance of returns to investor.<br />This site is not a part of Meta Platforms, Inc. Information on this page is for informational and promotional use only.",
        contactInfoText: "<p>+917354259486</p><p>+919806471956</p><p>info@intrinsicvalueequity.in</p><p>Baner, Pune, Maharashtra - 411045</p>"
    };

    var isEditMode = false;

    function applyConfig() {
        // Badge
        var badgeEl = document.querySelector('[data-id="6395cd0"] .elementor-icon-list-text');
        if (badgeEl) badgeEl.innerHTML = config.badgeText;

        // Heading
        var headingEl = document.querySelector('[data-id="66d1c25"] .elementor-heading-title');
        if (headingEl) headingEl.innerHTML = config.headingTitle;

        // Subheading
        var subheadEl = document.querySelector('[data-id="db32e03"] .elementor-heading-title');
        if (subheadEl) subheadEl.innerHTML = config.subheadingTitle;

        // Features
        var f1 = document.querySelector('[data-id="ceb41a9"] .elementor-icon-list-text');
        if (f1) f1.innerHTML = config.featureItem1;

        var f2 = document.querySelector('[data-id="7252abb"] .elementor-icon-list-text');
        if (f2) f2.innerHTML = config.featureItem2;

        var f3 = document.querySelector('[data-id="d7a73a8"] .elementor-icon-list-text');
        if (f3) f3.innerHTML = config.featureItem3;

        // Button
        var btn = document.getElementById('applyNowBtn');
        if (btn) {
            btn.setAttribute('href', normalizeUrl(config.checkoutUrl));
            var btnTitle = btn.querySelector('.elementor-heading-title');
            if (btnTitle) btnTitle.innerHTML = config.buttonText || "Book Your FREE Consultation Call";
        }

        // Note
        var noteEl = document.getElementById('noteText');
        if (noteEl) noteEl.innerHTML = config.noteText;

        // Disclaimer
        var discEl = document.querySelector('[data-id="73c5149"] .tatsu-module');
        if (discEl) discEl.innerHTML = config.disclaimerText;

        // Contact
        var contactEl = document.querySelector('[data-id="b776ff7"] .tatsu-module');
        if (contactEl) contactEl.innerHTML = config.contactInfoText;
    }

    // Intercept CTA button click when in edit mode
    window.addEventListener('click', function(e) {
        var target = e.target;
        var btn = null;
        while (target && target !== document.body) {
            if (target.id === 'applyNowBtn' || (target.tagName === 'A' && target.classList.contains('apply-now-btn'))) {
                btn = target;
                break;
            }
            target = target.parentElement;
        }

        if (btn) {
            if (isEditMode) {
                e.preventDefault();
                e.stopPropagation();
                window.parent.postMessage({
                    type: 'request_edit',
                    key: 'checkoutUrl',
                    label: 'Strategy Call Checkout Link',
                    currentVal: config.checkoutUrl
                }, '*');
            } else {
                e.preventDefault();
                window.top.location.href = normalizeUrl(config.checkoutUrl);
            }
        }
    }, true);

    applyConfig();

    // CMS Visual Highlight & Message Handler
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
        window.parent.postMessage({ type: 'iframe_ready', page: 'vsl.html' }, '*');
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

            var elementsMap = [
                { selector: '[data-id="6395cd0"]', key: 'badgeText', label: 'Badge Text' },
                { selector: '[data-id="66d1c25"]', key: 'headingTitle', label: 'Main Heading' },
                { selector: '[data-id="db32e03"]', key: 'subheadingTitle', label: 'Subheading Title' },
                { selector: '[data-id="ceb41a9"]', key: 'featureItem1', label: 'Feature Item 1' },
                { selector: '[data-id="7252abb"]', key: 'featureItem2', label: 'Feature Item 2' },
                { selector: '[data-id="d7a73a8"]', key: 'featureItem3', label: 'Feature Item 3' },
                { selector: '#applyNowBtn', key: 'buttonText', label: 'Button CTA Text' },
                { selector: '#noteText', key: 'noteText', label: 'Warning Note Text' },
                { selector: '[data-id="73c5149"]', key: 'disclaimerText', label: 'Disclaimer Text' },
                { selector: '[data-id="b776ff7"]', key: 'contactInfoText', label: 'Contact Info Text' }
            ];

            elementsMap.forEach(function(item) {
                var el = document.querySelector(item.selector);
                if (el) {
                    el.classList.add('cms-editable-highlight');
                    el.onclick = function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.parent.postMessage({
                            type: 'request_edit',
                            key: item.key,
                            label: item.label,
                            currentVal: config[item.key]
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
