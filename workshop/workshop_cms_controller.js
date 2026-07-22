(function() {
    function normalizeUrl(url) {
        if (!url) return '';
        url = url.trim();
        if (/^(https?:\/\/|\/\/|mailto:|tel:|#|javascript:|\/)/i.test(url)) {
            return url;
        }
        return 'https://' + url;
    }

    // Ensure testimonial carousel & video embeds are always visible
    function fixTestimonialsLayout() {
        var styleId = 'cms-testimonials-layout-fix';
        if (!document.getElementById(styleId)) {
            var style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .e-n-carousel .swiper-wrapper {
                    display: flex !important;
                    flex-wrap: wrap !important;
                    gap: 24px !important;
                    justify-content: center !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                    height: auto !important;
                    transform: none !important;
                }
                .e-n-carousel .swiper-slide {
                    flex: 1 1 320px !important;
                    max-width: 380px !important;
                    width: 100% !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                    margin-right: 0 !important;
                    display: block !important;
                }
                .elementor-widget-video .elementor-wrapper {
                    position: relative !important;
                    width: 100% !important;
                    padding-bottom: 56.25% !important;
                    height: 0 !important;
                    border-radius: 12px !important;
                    overflow: hidden !important;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
                    background: #000 !important;
                }
                .elementor-widget-video iframe {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    border: none !important;
                    border-radius: 12px !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    fixTestimonialsLayout();

    var config = (typeof WORKSHOP_CONFIG !== 'undefined') ? WORKSHOP_CONFIG : {};

    var isEditMode = false;
    var countdownInterval = null;

    document.querySelectorAll('.elementor-widget-video').forEach(function(el) {
        el.setAttribute('data-widget_type', 'video.custom');
    });

    function getYouTubeId(url) {
        if (!url) return '';
        var m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        if (m && m[1]) return m[1];
        if (url.length === 11) return url;
        return '';
    }

    function loadVideo(selector, url) {
        var container = document.querySelector(selector);
        if (!container) return;
        var videoId = getYouTubeId(url);
        if (!videoId) return;

        var wrapper = container.closest('.elementor-wrapper') || container.parentElement;
        if (wrapper) {
            wrapper.style.position = 'relative';
            wrapper.style.paddingBottom = '56.25%';
            wrapper.style.height = '0';
            wrapper.style.overflow = 'hidden';
            wrapper.style.borderRadius = '14px';
            wrapper.style.minHeight = '200px';
            wrapper.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';
            wrapper.style.background = '#0d1e3d';
        }

        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';

        var thumbnailUrl = 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg';

        container.innerHTML = `
            <div class="yt-play-card" style="position:absolute;top:0;left:0;width:100%;height:100%;background:url('${thumbnailUrl}') center/cover no-repeat;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:14px;overflow:hidden;">
                <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);transition:background 0.3s ease;"></div>
                <div class="yt-play-btn" style="width:68px;height:48px;background:#ff0000;border-radius:14px;display:flex;align-items:center;justify-content:center;position:relative;z-index:2;box-shadow:0 6px 20px rgba(255,0,0,0.4);transition:transform 0.2s ease;">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="#ffffff"><path d="M8 5v14l11-7z"/></svg>
                </div>
            </div>
            ${isEditMode ? '<div class="cms-video-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:999;background:transparent;cursor:pointer;"></div>' : ''}
        `;

        if (isEditMode) {
            var overlay = container.querySelector('.cms-video-overlay');
            if (overlay) {
                overlay.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var keyMap = {
                        '84a0e89': 'youtubeVideo1',
                        '20f4b2e': 'youtubeVideo2',
                        '5e58f49': 'youtubeVideo3'
                    };
                    var widget = container.closest('.elementor-widget-video');
                    var key = widget ? keyMap[widget.dataset.id] : 'youtubeVideo1';
                    window.parent.postMessage({
                        type: 'request_edit',
                        key: key,
                        label: 'YouTube Testimonial Video Link',
                        currentVal: config[key]
                    }, '*');
                };
            }
        } else {
            var playCard = container.querySelector('.yt-play-card');
            if (playCard) {
                playCard.onclick = function() {
                    container.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:14px;"></iframe>`;
                };
            }
        }
    }

    function startCountdown(targetStr) {
        if (countdownInterval) clearInterval(countdownInterval);
        var daysEl = document.querySelector('[data-id="4a936b93"] .elementor-countdown-days');
        var hoursEl = document.querySelector('[data-id="4a936b93"] .elementor-countdown-hours');
        var minsEl = document.querySelector('[data-id="4a936b93"] .elementor-countdown-minutes');
        var secsEl = document.querySelector('[data-id="4a936b93"] .elementor-countdown-seconds');

        function update() {
            var target = new Date(targetStr).getTime();
            var now = new Date().getTime();
            var diff = target - now;
            if (isNaN(diff) || diff < 0) diff = 0;

            var days = Math.floor(diff / (1000 * 60 * 60 * 24));
            var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            var secs = Math.floor((diff % (1000 * 60)) / 1000);

            if (daysEl) daysEl.innerText = String(days).padStart(2, '0');
            if (hoursEl) hoursEl.innerText = String(hours).padStart(2, '0');
            if (minsEl) minsEl.innerText = String(mins).padStart(2, '0');
            if (secsEl) secsEl.innerText = String(secs).padStart(2, '0');
        }

        update();
        countdownInterval = setInterval(update, 1000);
    }

    var selectorKeyMap = [
        { selector: '[data-id="574bc8de"] .elementor-heading-title', key: 'heroTitle', label: 'Main Hero Title' },
        { selector: '[data-id="64d09b09"] .elementor-heading-title', key: 'heroSubtitle', label: 'Hero Subtitle' },
        { selector: '[data-id="582ba74c"] .elementor-heading-title', key: 'ctaBtnText', label: 'CTA Button Text' },
        { selector: '[data-id="66a3865f"] .elementor-heading-title', key: 'workshopDateText', label: 'Workshop Date/Time' },
        { selector: '[data-id="35052769"] .elementor-heading-title', key: 'workshopCapacity', label: 'Capacity Text' },
        { selector: '[data-id="e17480d"] .elementor-heading-title', key: 'seatsLeft', label: 'Seats Left Text' },
        { selector: '[data-id="484c3d5d"] .elementor-heading-title', key: 'box1Text', label: 'Info Box 1' },
        { selector: '[data-id="a934439"] .elementor-heading-title', key: 'box2Text', label: 'Info Box 2' },
        { selector: '[data-id="78ed9475"] .elementor-heading-title', key: 'box3Text', label: 'Info Box 3' },
        { selector: '[data-id="21b75917"] .elementor-heading-title', key: 'box4Text', label: 'Info Box 4' },
        { selector: '[data-id="76775251"] .elementor-heading-title', key: 'box5Text', label: 'Info Box 5' },
        { selector: '[data-id="6edc5d01"] .elementor-heading-title', key: 'speakerName', label: 'Speaker Name' },
        { selector: '[data-id="64559210"] .elementor-heading-title', key: 'mediaHeading', label: 'Featured Media Heading' },
        
        { selector: '[data-id="5a23408b"] .elementor-heading-title', key: 'nodSectionTitle', label: 'Nod Section Title' },
        { selector: '[data-id="7f2b21dc"] .elementor-heading-title', key: 'nodItem1', label: 'Nod Point 1' },
        { selector: '[data-id="7cd0c17e"] .elementor-heading-title', key: 'nodItem2', label: 'Nod Point 2' },
        { selector: '[data-id="a8e3eb0"] .elementor-heading-title', key: 'nodItem3', label: 'Nod Point 3' },
        { selector: '[data-id="68c8a5aa"] .elementor-heading-title', key: 'nodItem4', label: 'Nod Point 4' },
        { selector: '[data-id="5162048c"] .elementor-heading-title', key: 'nodItem5', label: 'Nod Point 5' },
        { selector: '[data-id="a7eff93"] .elementor-heading-title', key: 'nodItem6', label: 'Nod Point 6' },
        { selector: '[data-id="552d6c31"] .elementor-heading-title', key: 'nodItem7', label: 'Nod Point 7' },
        { selector: '[data-id="3e66c17"] .elementor-heading-title', key: 'nodItem8', label: 'Nod Point 8' },
        { selector: '[data-id="5a372a11"] .elementor-heading-title', key: 'nodItem9', label: 'Nod Point 9' },
        { selector: '[data-id="63674a90"] .elementor-heading-title', key: 'nodItem10', label: 'Nod Point 10' },
        { selector: '[data-id="73d2a7c0"] .elementor-heading-title', key: 'nodTagline', label: 'Nod Section Tagline' },
        { selector: '[data-id="3386c69f"] .elementor-heading-title', key: 'nodCtaTitle', label: 'Register CTA Title' },

        { selector: '[data-id="62b2d9ec"] .elementor-heading-title', key: 'wantSectionTitle', label: 'Want Section Title' },
        { selector: '[data-id="54c79bb2"] .elementor-heading-title', key: 'wantItem1', label: 'Want Point 1' },
        { selector: '[data-id="a8320b5"] .elementor-heading-title', key: 'wantItem2', label: 'Want Point 2' },
        { selector: '[data-id="7dde02e2"] .elementor-heading-title', key: 'wantItem3', label: 'Want Point 3' }
    ];

    function applyConfig() {
        selectorKeyMap.forEach(function(item) {
            var val = config[item.key];
            if (val !== undefined && val !== null && val !== '') {
                var el = document.querySelector(item.selector);
                if (el) el.innerHTML = val;
            }
        });

        // Experience texts
        var expEl1 = document.querySelector('[data-id="f7132d0"] .elementor-icon-list-item:nth-child(2) .elementor-icon-list-text');
        if (expEl1) expEl1.innerText = config.experienceText || "13+ years of experience";

        var expEl2 = document.querySelector('[data-id="6c71720d"] .elementor-icon-list-text');
        if (expEl2) expEl2.innerText = config.experienceText || "13+ years of experience";

        loadVideo('[data-id="84a0e89"] .elementor-video', config.youtubeVideo1);
        loadVideo('[data-id="20f4b2e"] .elementor-video', config.youtubeVideo2);
        loadVideo('[data-id="5e58f49"] .elementor-video', config.youtubeVideo3);
    }

    window.addEventListener('click', function(e) {
        var target = e.target;
        var isButton = false;
        while (target && target !== document.body) {
            if (target.tagName === 'A' && (target.classList.contains('btn') || (target.getAttribute('href') && target.getAttribute('href').indexOf('popup%3Aopen') !== -1))) {
                isButton = true;
                break;
            }
            target = target.parentElement;
        }

        if (isButton) {
            e.preventDefault();
            e.stopPropagation();
            if (isEditMode) {
                window.parent.postMessage({
                    type: 'request_edit',
                    key: 'checkoutUrl',
                    label: 'Checkout Page Link',
                    currentVal: config.checkoutUrl
                }, '*');
            } else {
                window.top.location.href = normalizeUrl(config.checkoutUrl);
            }
        }
    }, true);

    applyConfig();
    startCountdown(config.countdownTarget);

    window.addEventListener('message', function(event) {
        var msg = event.data;
        if (!msg) return;

        if (msg.type === 'init_cms_state') {
            if (msg.config) {
                config = Object.assign({}, config, msg.config);
                applyConfig();
                startCountdown(config.countdownTarget);
            }
            isEditMode = msg.enabled;
            updateVisuals();
        } else if (msg.type === 'toggle_edit_mode') {
            isEditMode = msg.enabled;
            updateVisuals();
        } else if (msg.type === 'update_value') {
            config[msg.key] = msg.value;
            applyConfig();
            if (msg.key === 'countdownTarget') {
                startCountdown(config.countdownTarget);
            }
        }
    });

    if (window.self !== window.top) {
        window.parent.postMessage({ type: 'iframe_ready', page: 'index.html' }, '*');
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
                            currentVal: config[item.key] || el.innerHTML.trim()
                        }, '*');
                    };
                }
            });

            // Universal fallback highlighter for all unmapped headings, list items, and text blocks!
            var unmappedCandidates = document.querySelectorAll('.elementor-heading-title, .elementor-icon-list-text, h1, h2, h3, p');
            unmappedCandidates.forEach(function(el, idx) {
                if (!el.classList.contains('cms-editable-highlight') && el.innerText.trim().length > 2) {
                    el.classList.add('cms-editable-highlight');
                    var autoKey = 'autoWorkshopText_' + idx;
                    el.onclick = function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.parent.postMessage({
                            type: 'request_edit',
                            key: autoKey,
                            label: 'Text Node #' + (idx + 1),
                            currentVal: config[autoKey] || el.innerHTML.trim()
                        }, '*');
                    };
                }
            });

            loadVideo('[data-id="84a0e89"] .elementor-video', config.youtubeVideo1);
            loadVideo('[data-id="20f4b2e"] .elementor-video', config.youtubeVideo2);
            loadVideo('[data-id="5e58f49"] .elementor-video', config.youtubeVideo3);

        } else {
            if (existingStyle) existingStyle.remove();
            document.querySelectorAll('.cms-editable-highlight').forEach(function(el) {
                el.classList.remove('cms-editable-highlight');
                el.onclick = null;
            });
            applyConfig();
        }
    }
})();
