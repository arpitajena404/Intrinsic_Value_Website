(function() {
    // 1. Normalize URLs
    function normalizeUrl(url) {
        if (!url) return '';
        url = url.trim();
        if (/^(https?:\/\/|\/\/|mailto:|tel:|#|javascript:|\/)/i.test(url)) {
            return url;
        }
        return 'https://' + url;
    }

    // 2. Load configuration variables
    var config = (typeof WORKSHOP_CONFIG !== 'undefined') ? WORKSHOP_CONFIG : {
        workshopDateText: "5th April, Sunday | 11:00 AM",
        countdownTarget: "2026-04-05T11:00:00",
        checkoutUrl: "https://premium.intrinsicvalueequity.in/checkout/bc918fe9-de4a-4bc3-8fe4-cb7261a52903/",
        youtubeVideo1: "https://www.youtube.com/watch?v=lXyYY8I9e44",
        youtubeVideo2: "https://www.youtube.com/watch?v=knvVbwdm0TE",
        youtubeVideo3: "https://www.youtube.com/watch?v=yu7KYacrV80",
        workshopCapacity: "Workshop capacity 50",
        seatsLeft: "Only 23 seats left.",
        box1Text: "3 Hour total",
        box2Text: "On Zoom",
        box3Text: "Actionable Workshop",
        box4Text: "100% Practical Strategy",
        box5Text: "Language: English",
        experienceText: "11+ years of experience"
    };

    var isEditMode = false;
    var countdownInterval = null;

    // Disable Elementor's default video widget initialization to prevent "Error 153"
    document.querySelectorAll('.elementor-widget-video').forEach(function(el) {
        el.setAttribute('data-widget_type', 'video.custom');
    });

    // Helper to get YouTube ID
    function getYouTubeId(url) {
        if (!url) return '';
        var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        var match = url.match(regExp);
        return (match && match[2].length == 11) ? match[2] : url;
    }

    // Dynamic Video Loader
    function loadVideo(selector, url) {
        var container = document.querySelector(selector);
        if (!container) return;
        var videoId = getYouTubeId(url);
        if (!videoId) {
            container.innerHTML = '<div style="color:white;text-align:center;padding:20px;background:#000;">No video URL configured</div>';
            return;
        }
        container.style.position = 'relative';
        container.innerHTML = `
            <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"></iframe>
            ${isEditMode ? '<div class="cms-video-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:999;background:transparent;cursor:pointer;"></div>' : ''}
        `;

        // If in edit mode, bind click on overlay
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
                    var labels = {
                        'youtubeVideo1': 'YouTube Testimonial Video 1 Link',
                        'youtubeVideo2': 'YouTube Testimonial Video 2 Link',
                        'youtubeVideo3': 'YouTube Testimonial Video 3 Link'
                    };
                    window.parent.postMessage({
                        type: 'request_edit',
                        key: key,
                        label: labels[key] || 'YouTube Video link',
                        currentVal: config[key]
                    }, '*');
                };
            }
        }
    }

    // High accuracy countdown timer
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
            if (isNaN(diff) || diff < 0) {
                diff = 0;
            }

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

    // Apply values to elements
    function applyConfig() {
        // Apply texts
        var dateEl = document.querySelector('[data-id="66a3865f"] .elementor-heading-title');
        if (dateEl) dateEl.innerText = config.workshopDateText;

        var capEl = document.querySelector('[data-id="35052769"] .elementor-heading-title');
        if (capEl) capEl.innerText = config.workshopCapacity;

        var seatsEl = document.querySelector('[data-id="e17480d"] .elementor-heading-title');
        if (seatsEl) seatsEl.innerText = config.seatsLeft;

        // Apply box texts
        var box1 = document.querySelector('[data-id="484c3d5d"] .elementor-heading-title');
        if (box1) box1.innerText = config.box1Text;

        var box2 = document.querySelector('[data-id="a934439"] .elementor-heading-title');
        if (box2) box2.innerText = config.box2Text;

        var box3 = document.querySelector('[data-id="78ed9475"] .elementor-heading-title');
        if (box3) box3.innerText = config.box3Text;

        var box4 = document.querySelector('[data-id="21b75917"] .elementor-heading-title');
        if (box4) box4.innerText = config.box4Text;

        var box5 = document.querySelector('[data-id="76775251"] .elementor-heading-title');
        if (box5) box5.innerText = config.box5Text;

        // Apply experience texts
        var expEl1 = document.querySelector('[data-id="f7132d0"] .elementor-icon-list-item:nth-child(2) .elementor-icon-list-text');
        if (expEl1) expEl1.innerText = config.experienceText || "11+ years of experience";

        var expEl2 = document.querySelector('[data-id="6c71720d"] .elementor-icon-list-text');
        if (expEl2) expEl2.innerText = config.experienceText || "11+ years of experience";

        // Load YouTube videos
        loadVideo('[data-id="84a0e89"] .elementor-video', config.youtubeVideo1);
        loadVideo('[data-id="20f4b2e"] .elementor-video', config.youtubeVideo2);
        loadVideo('[data-id="5e58f49"] .elementor-video', config.youtubeVideo3);
    }

    // 3. Intercept clicks during capture phase to bypass popup
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

    // Initial setup
    applyConfig();
    startCountdown(config.countdownTarget);

    // 4. CMS Visual Editor Integration
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

    // Notify parent admin frame that index.html is ready
    if (window.self !== window.top) {
        window.parent.postMessage({ type: 'iframe_ready', page: 'index.html' }, '*');
    }

    // Manage highlights
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
                        position: relative !important;
                        transition: all 0.2s ease !important;
                    }
                    .cms-editable-highlight:hover {
                        transform: scale(1.01) !important;
                        outline-color: #ffc107 !important;
                    }
                `;
                document.head.appendChild(style);
            }

            // Bind click & highlight for Date & Time Text
            var dateWidget = document.querySelector('[data-id="66a3865f"]');
            if (dateWidget) {
                dateWidget.classList.add('cms-editable-highlight');
                dateWidget.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.parent.postMessage({
                        type: 'request_edit',
                        key: 'workshopDateText',
                        label: 'Date & Time Text',
                        currentVal: config.workshopDateText
                    }, '*');
                };
            }

            // Bind click & highlight for Workshop Capacity Text
            var capWidget = document.querySelector('[data-id="35052769"]');
            if (capWidget) {
                capWidget.classList.add('cms-editable-highlight');
                capWidget.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.parent.postMessage({
                        type: 'request_edit',
                        key: 'workshopCapacity',
                        label: 'Workshop Capacity Text',
                        currentVal: config.workshopCapacity
                    }, '*');
                };
            }

            // Bind click & highlight for Seats Left Text
            var seatsWidget = document.querySelector('[data-id="e17480d"]');
            if (seatsWidget) {
                seatsWidget.classList.add('cms-editable-highlight');
                seatsWidget.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.parent.postMessage({
                        type: 'request_edit',
                        key: 'seatsLeft',
                        label: 'Seats Left Text',
                        currentVal: config.seatsLeft
                    }, '*');
                };
            }

            // Bind click & highlight for Countdown
            var countdownWidget = document.querySelector('[data-id="4a936b93"]');
            if (countdownWidget) {
                countdownWidget.classList.add('cms-editable-highlight');
                countdownWidget.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.parent.postMessage({
                        type: 'request_edit',
                        key: 'countdownTarget',
                        label: 'Countdown Target Date/Time',
                        currentVal: config.countdownTarget
                    }, '*');
                };
            }

            // Bind click & highlight for Box 1
            var box1Widget = document.querySelector('[data-id="484c3d5d"]');
            if (box1Widget) {
                box1Widget.classList.add('cms-editable-highlight');
                box1Widget.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.parent.postMessage({
                        type: 'request_edit',
                        key: 'box1Text',
                        label: 'Workshop Info Box 1 Text',
                        currentVal: config.box1Text
                    }, '*');
                };
            }

            // Bind click & highlight for Box 2
            var box2Widget = document.querySelector('[data-id="a934439"]');
            if (box2Widget) {
                box2Widget.classList.add('cms-editable-highlight');
                box2Widget.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.parent.postMessage({
                        type: 'request_edit',
                        key: 'box2Text',
                        label: 'Workshop Info Box 2 Text',
                        currentVal: config.box2Text
                    }, '*');
                };
            }

            // Bind click & highlight for Box 3
            var box3Widget = document.querySelector('[data-id="78ed9475"]');
            if (box3Widget) {
                box3Widget.classList.add('cms-editable-highlight');
                box3Widget.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.parent.postMessage({
                        type: 'request_edit',
                        key: 'box3Text',
                        label: 'Workshop Info Box 3 Text',
                        currentVal: config.box3Text
                    }, '*');
                };
            }

            // Bind click & highlight for Box 4
            var box4Widget = document.querySelector('[data-id="21b75917"]');
            if (box4Widget) {
                box4Widget.classList.add('cms-editable-highlight');
                box4Widget.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.parent.postMessage({
                        type: 'request_edit',
                        key: 'box4Text',
                        label: 'Workshop Info Box 4 Text',
                        currentVal: config.box4Text
                    }, '*');
                };
            }

            // Bind click & highlight for Box 5
            var box5Widget = document.querySelector('[data-id="76775251"]');
            if (box5Widget) {
                box5Widget.classList.add('cms-editable-highlight');
                box5Widget.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.parent.postMessage({
                        type: 'request_edit',
                        key: 'box5Text',
                        label: 'Workshop Info Box 5 Text',
                        currentVal: config.box5Text
                    }, '*');
                };
            }

            // Bind click & highlight for Experience Text
            var expEl1 = document.querySelector('[data-id="f7132d0"] .elementor-icon-list-item:nth-child(2)');
            if (expEl1) {
                expEl1.classList.add('cms-editable-highlight');
                expEl1.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.parent.postMessage({
                        type: 'request_edit',
                        key: 'experienceText',
                        label: 'Years of Experience Text',
                        currentVal: config.experienceText || "11+ years of experience"
                    }, '*');
                };
            }

            var expEl2 = document.querySelector('[data-id="6c71720d"]');
            if (expEl2) {
                expEl2.classList.add('cms-editable-highlight');
                expEl2.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.parent.postMessage({
                        type: 'request_edit',
                        key: 'experienceText',
                        label: 'Years of Experience Text',
                        currentVal: config.experienceText || "11+ years of experience"
                    }, '*');
                };
            }

            // Highlight Youtube Videos
            var vid1 = document.querySelector('[data-id="84a0e89"]');
            if (vid1) vid1.classList.add('cms-editable-highlight');
            var vid2 = document.querySelector('[data-id="20f4b2e"]');
            if (vid2) vid2.classList.add('cms-editable-highlight');
            var vid3 = document.querySelector('[data-id="5e58f49"]');
            if (vid3) vid3.classList.add('cms-editable-highlight');

            // Highlight Registration buttons
            var buttons = document.querySelectorAll('a.btn, a[href*="popup%3Aopen"]');
            buttons.forEach(function(btn) {
                btn.classList.add('cms-editable-highlight');
            });

            // Re-apply video embeds with overlays
            applyConfig();

         } else {
            if (existingStyle) existingStyle.remove();
            
            var targets = [
                '[data-id="66a3865f"]',
                '[data-id="35052769"]',
                '[data-id="e17480d"]',
                '[data-id="4a936b93"]',
                '[data-id="484c3d5d"]',
                '[data-id="a934439"]',
                '[data-id="78ed9475"]',
                '[data-id="21b75917"]',
                '[data-id="76775251"]',
                '[data-id="84a0e89"]',
                '[data-id="20f4b2e"]',
                '[data-id="5e58f49"]',
                '[data-id="f7132d0"] .elementor-icon-list-item:nth-child(2)',
                '[data-id="6c71720d"]'
            ];
            targets.forEach(function(sel) {
                var el = document.querySelector(sel);
                if (el) {
                    el.classList.remove('cms-editable-highlight');
                    el.onclick = null;
                }
            });

            var buttons = document.querySelectorAll('a.btn, a[href*="popup%3Aopen"]');
            buttons.forEach(function(btn) {
                btn.classList.remove('cms-editable-highlight');
            });

            // Re-apply standard video embeds without overlays
            applyConfig();
        }
    }
})();
