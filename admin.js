(function () {
    // 1. GOOGLE CLIENT ID CONFIGURATION
    // Replace this string with your Google OAuth Web Client ID from the Google Cloud Console.
    var GOOGLE_CLIENT_ID = "401614238694-vrh7s1nq778753efm7lllaip0vqfclar.apps.googleusercontent.com";

    // 2. WHITELISTED ADMIN EMAILS
    var ALLOWED_ADMINS = [
        "harshitsaraan@gmail.com",
        "arpitajena762@gmail.com"
    ];

    var SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes of inactivity

    var app = document.body;

    // Helper to decode JWT token client-side
    function decodeJwt(token) {
        try {
            var base64Url = token.split('.')[1];
            var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            var jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error("JWT decoding failed:", e);
            return null;
        }
    }

    // Helper to escape HTML characters
    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Retrieve active session from sessionStorage
    function getAdminSession() {
        var sessionStr = sessionStorage.getItem('admin_session');
        if (!sessionStr) return null;
        try {
            var session = JSON.parse(sessionStr);
            if (session.exp && Date.now() > session.exp) {
                logoutAdmin(true);
                return null;
            }
            return session;
        } catch (e) {
            return null;
        }
    }

    // Inactivity and timeout monitoring
    function checkSessionTimeout() {
        var session = getAdminSession();
        if (!session) return;

        var lastActivity = sessionStorage.getItem('admin_last_activity');
        if (!lastActivity) {
            resetInactivityTimer();
            return;
        }

        var elapsed = Date.now() - parseInt(lastActivity, 10);
        if (elapsed > SESSION_TIMEOUT) {
            logoutAdmin(true);
        }
    }

    function resetInactivityTimer() {
        var session = getAdminSession();
        if (session) {
            sessionStorage.setItem('admin_last_activity', Date.now().toString());
        }
    }

    // Log out admin and reset state
    function logoutAdmin(isExpired) {
        sessionStorage.removeItem('admin_session');
        sessionStorage.removeItem('admin_last_activity');

        updateAuthState();

        if (isExpired) {
            showLoginError('Session expired due to inactivity. Please log in again.');
            var errBox = app.querySelector('#loginErrorMessage');
            if (errBox) {
                errBox.style.borderColor = 'rgba(255, 140, 0, 0.2)';
                errBox.style.background = 'rgba(255, 140, 0, 0.04)';
                errBox.style.color = 'var(--text-muted)';
            }
        }
    }

    // Display error notices
    function showLoginError(msg) {
        var errBox = app.querySelector('#loginErrorMessage');
        if (errBox) {
            errBox.innerHTML = msg;
            errBox.style.display = 'block';
        }
    }

    // Synchronize UI view with authentication state
    function updateAuthState() {
        var session = getAdminSession();
        var loginSection = app.querySelector('#adminLoginSection');
        var dashSection = app.querySelector('#adminDashboardSection');

        var badge = app.querySelector('#adminUserBadge');
        var avatar = app.querySelector('#adminAvatar');
        var nameEl = app.querySelector('#adminName');
        var emailEl = app.querySelector('#adminEmail');

        if (session) {
            if (loginSection) loginSection.style.display = 'none';
            if (dashSection) dashSection.style.display = 'block';

            if (badge && avatar && nameEl && emailEl) {
                avatar.src = session.picture || 'https://lh3.googleusercontent.com/a/default-user=s100';
                nameEl.textContent = session.name;
                emailEl.textContent = session.email;
                badge.style.display = 'flex';
            }
        } else {
            if (loginSection) loginSection.style.display = 'block';
            if (dashSection) dashSection.style.display = 'none';
            if (badge) badge.style.display = 'none';
        }
    }

    // Initialize Google Identity Services
    function initGoogleSignIn() {
        if (typeof google === 'undefined' || !google.accounts) {
            setTimeout(initGoogleSignIn, 300);
            return;
        }

        var isPlaceholder = GOOGLE_CLIENT_ID.indexOf('YOUR_GOOGLE_CLIENT_ID') !== -1;
        var isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        // Render mock container for development bypass
        if (isPlaceholder || isLocalhost) {
            var mockContainer = app.querySelector('#mockLoginContainer');
            if (mockContainer) mockContainer.style.display = 'block';
        }

        if (!isPlaceholder && GOOGLE_CLIENT_ID) {
            try {
                google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleCredentialResponse
                });

                google.accounts.id.renderButton(
                    document.getElementById("googleBtnContainer"),
                    {
                        theme: "filled_blue",
                        size: "large",
                        shape: "pill",
                        text: "signin_with",
                        logo_alignment: "left"
                    }
                );
            } catch (err) {
                console.error("Error initializing Google Identity Services:", err);
            }
        } else {
            var btnContainer = document.getElementById("googleBtnContainer");
            if (btnContainer) {
                btnContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; margin: 10px 0; border: 1px dashed var(--border-color); padding: 16px; border-radius: 12px; background: var(--bg-secondary); text-align: left; line-height: 1.5;">Google Sign-In requires a Client ID.<br><small style="font-size: 11px; opacity: 0.7; display: block; margin-top: 4px;">Configure your Web Client ID as the <code>GOOGLE_CLIENT_ID</code> variable inside <code>admin.js</code> to enable Google login.</small></div>';
            }
        }
    }

    // Google API callback response
    function handleCredentialResponse(response) {
        var jwt = response.credential;
        var payload = decodeJwt(jwt);
        if (!payload) {
            showLoginError("Failed to parse identity credential from Google. Please try again.");
            return;
        }

        processLogin(payload.email, payload.name, payload.picture, jwt, payload.exp * 1000);
    }

    // Whitelist and authenticate session creation
    function processLogin(email, name, picture, token, expiryMs) {
        var errBox = app.querySelector('#loginErrorMessage');
        if (errBox) errBox.style.display = 'none';

        if (!email) {
            showLoginError("Could not retrieve email address from your Google account.");
            return;
        }

        // Case-insensitive validation against ALLOWED_ADMINS list
        var isAllowed = ALLOWED_ADMINS.some(function (allowedEmail) {
            return allowedEmail.toLowerCase() === email.toLowerCase();
        });

        if (!isAllowed) {
            showLoginError("Access Denied: <strong>" + escapeHtml(email) + "</strong> is not authorized to access this administrative portal.");
            return;
        }

        var session = {
            email: email,
            name: name || email.split('@')[0],
            picture: picture || '',
            token: token,
            exp: expiryMs || (Date.now() + 60 * 60 * 1000) // Default 1 Hour session
        };

        sessionStorage.setItem('admin_session', JSON.stringify(session));
        resetInactivityTimer();
        updateAuthState();
    }

    // Bind event handlers
    function bindMockLoginEvents() {
        var mockBtn = app.querySelector('#developerMockBtn');
        if (!mockBtn) return;

        mockBtn.addEventListener('click', function () {
            processLogin(
                "harshitsaraan@gmail.com",
                "Harshit Saraan (Developer)",
                "https://lh3.googleusercontent.com/a/default-user=s100",
                "mock-google-developer-token",
                Date.now() + 60 * 60 * 1000 // 1 hour session
            );
        });
    }

    function bindLogoutEvents() {
        var logoutBtn = app.querySelector('#adminLogoutButton');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', function () {
            logoutAdmin(false);
            // Hide CMS workspace if open
            var workspace = document.getElementById('homepageCmsWorkspace');
            if (workspace) workspace.style.display = 'none';
        });
    }

    // ----------------------------------------------------
    // HOMEPAGE CMS WORKSPACE ENGINE
    // ----------------------------------------------------
    var cmsState = {};
    var DEFAULT_FALLBACK_CONFIG = {
            "navigation": [
                    {
                            "text": "Service",
                            "url": "pricing.html"
                    },
                    {
                            "text": "About Us",
                            "url": "about.html"
                    },
                    {
                            "text": "Blogs",
                            "url": "blogs.html"
                    },
                    {
                            "text": "Analytics",
                            "url": "analytics/index.html"
                    }
            ],
            "hero": {
                    "tag": "SEBI Registered Research Analyst",
                    "heading_html": "Accelerate<br>\n                            <span class=\"iv-typing-container\"><span class=\"iv-typing-text\"></span></span>",
                    "typewriter_words": [
                            "Wealth Creation.",
                            "Capital Growth.",
                            "Portfolio Alpha.",
                            "Financial Freedom."
                    ],
                    "desc1": "Discover the power of systematic <strong>sector rotation investing</strong> paired with\n                            precise <strong>value unlocking</strong> strategies. Our methodology targets high-quality,\n                            overlooked businesses positioned for major structural turnarounds and multi-year growth.",
                    "desc2": "At Intrinsic Value, alpha is a natural result of a robust, data-driven strategy.\n                            <strong>Capital protection, strict risk management, and process</strong> govern every stock\n                            recommendation. We are a SEBI-registered equity research analyst service dedicated to\n                            sustainable wealth creation.",
                    "cta_text": "Accelerate Your Wealth Now",
                    "cta_url": "index.html",
                    "sebi_badge": "SEBI Registered · INH000009047",
                    "stats": [
                            {
                                    "num": "15",
                                    "suffix": "+",
                                    "label": "Years of Experience"
                            },
                            {
                                    "num": "3000",
                                    "suffix": "+",
                                    "label": "Clients Serviced"
                            },
                            {
                                    "num": "300",
                                    "suffix": "cr+",
                                    "label": "Peak AUA"
                            },
                            {
                                    "num": "70",
                                    "suffix": "+",
                                    "label": "Stocks Recommended"
                            }
                    ],
                    "media": {
                            "type": "animation",
                            "url": ""
                    }
            },
            "philosophy": {
                    "title": "Investment philosophy<em>.</em>",
                    "cards": [
                            {
                                    "icon": "fas fa-sort-numeric-up",
                                    "title": "Numbers don’t lie",
                                    "desc": "Our Research is based on Numbers not narratives, while there is nothing wrong with\n                                    Growth stories, a lot of over valued narratives end up very badly when the Tide is\n                                    over. If you have numbers you don’t need a story, if you don’t have numbers, story\n                                    can’t help you. Remember Cons are the best story tellers.",
                                    "link": "#services_item1"
                            },
                            {
                                    "icon": "fas fa-hand-holding-usd",
                                    "title": "Charlie Munger at Ben Graham",
                                    "desc": "If we can Buy Charlie’s stocks at Benjamin Graham prices, it will be some thing\n                                    Extraordinary- Mohnish Pabrai <br>\n                                    We are trying to achieve that.",
                                    "link": "#services_item2"
                            },
                            {
                                    "icon": "fas fa-industry",
                                    "title": "Industry Experience",
                                    "desc": "Having worked in Engineering companies , Founders have an unparallel advantage over\n                                    those who have always seen business from annual reports lenses. Some times, you need\n                                    to Zoom in.",
                                    "link": "#services_item3"
                            },
                            {
                                    "icon": "fas fa-chess",
                                    "title": "Skin in the Game",
                                    "desc": "We practice what we preach and we preach what we practice. We are investors first,\n                                    advisors after.",
                                    "link": "#services_item4"
                            },
                            {
                                    "icon": "fa fa-line-chart",
                                    "title": "No loss is profit",
                                    "desc": "Our concept of Buying at Minimum intrinsic value gives us Huge margin of safety\n                                    against any unforeseen events or future unpredictability. We are rigid on not having\n                                    loss, Profit is just the natural outcome.",
                                    "link": "#services_item5"
                            },
                            {
                                    "icon": "fas fa-glass-martini-alt",
                                    "title": "<s>Biases</s>",
                                    "desc": "Every strategy has opportunities as well as Traps. A defined Process, check lists and\n                                    due diligence help us make unbiased decisions.",
                                    "link": "#services_item6"
                            },
                            {
                                    "icon": "fa fa-piggy-bank",
                                    "title": "Buying Peace in Chaos",
                                    "desc": "When the whole narrative is creating chaos against your investment decision, buying\n                                    at such level is difficult but that is the most peaceful thing to do.",
                                    "link": "#services_item7"
                            },
                            {
                                    "icon": "fas fa-coffee",
                                    "title": "Patience",
                                    "desc": "Patience is not Gyan, Patience is the strategy. Long term attitude puts you in Diff\n                                    league of investors.",
                                    "link": "#services_item8"
                            },
                            {
                                    "icon": "fas fa-solid fa-gears",
                                    "title": "Archive",
                                    "desc": "HNI research Lab lets you Access our Old research, Newsletters, meetups and\n                                    everything else. Which makes you master of value investing over the time.",
                                    "link": "#services_item9"
                            }
                    ]
            },
            "case_studies": {
                    "title": "Proven Wealth Unlocking <em>Cases</em>.",
                    "companies": [
                            {
                                    "num": "01",
                                    "name": "JSW Holdings",
                                    "reports": [
                                            {
                                                    "name": "Buy Report",
                                                    "url": "CS reports/JSW/JSW Holding Buy.pdf"
                                            },
                                            {
                                                    "name": "Company Overview",
                                                    "url": "CS reports/JSW/JSW Holding CO.pdf"
                                            },
                                            {
                                                    "name": "Exit Report",
                                                    "url": "CS reports/JSW/JSW Holding Exit.pdf"
                                            }
                                    ]
                            },
                            {
                                    "num": "02",
                                    "name": "Hero MotoCorp",
                                    "reports": [
                                            {
                                                    "name": "Exit Report",
                                                    "url": "CS reports/HeroMotoCorp Exit.pdf"
                                            },
                                            {
                                                    "name": "Company Overview",
                                                    "url": "CS reports/HeroMotoCorp CO.pdf"
                                            }
                                    ]
                            },
                            {
                                    "num": "03",
                                    "name": "Ircon International",
                                    "reports": [
                                            {
                                                    "name": "Company Overview",
                                                    "url": "CS reports/Ircon International CO.pdf"
                                            }
                                    ]
                            },
                            {
                                    "num": "04",
                                    "name": "Texmaco",
                                    "reports": [
                                            {
                                                    "name": "Buy Report",
                                                    "url": "CS reports/Texmaco/Texmaco Buy.pdf"
                                            },
                                            {
                                                    "name": "Company Overview",
                                                    "url": "CS reports/Texmaco/Texmaco CO.pdf"
                                            },
                                            {
                                                    "name": "Exit Report",
                                                    "url": "CS reports/Texmaco/Texmaco Exit.pdf"
                                            }
                                    ]
                            }
                    ]
            },
            "news": {
                    "title": "Recognized by the <em>Best</em>.",
                    "items": [
                            {
                                    "label": "Business Standard",
                                    "link": "https://www.business-standard.com/finance/personal-finance/gold-up-65-small-caps-down-7-5-where-investors-should-invest-in-2026-125121700275_1.html",
                                    "quote": "Gold up 6.5%, small-caps down 7.5%: Where investors should invest in 2026",
                                    "source": "Business Standard",
                                    "logo": "featuring_icon/business standard.png",
                                    "wrapperClass": "brand-bs"
                            },
                            {
                                    "label": "Josh Talks",
                                    "link": "https://www.youtube.com/watch?v=y-SOR_JGtKg",
                                    "quote": "From IIT Madras to building a SEBI-registered advisory: My journey on value investing",
                                    "source": "Guest speaker at Josh Talks",
                                    "logo": "featuring_icon/joshtalk.png",
                                    "wrapperClass": "brand-josh"
                            },
                            {
                                    "label": "Money 9",
                                    "link": "https://www.youtube.com/watch?v=rbc_PGQY-FU",
                                    "quote": "Analyzing market cycles, sectoral rotation, and compounding frameworks",
                                    "source": "Guest on Money9",
                                    "logo": "featuring_icon/money9.png",
                                    "wrapperClass": "brand-money9"
                            },
                            {
                                    "label": "Business Today",
                                    "link": "https://www.businesstoday.in/personal-finance/investment/story/2025-will-be-challenging-for-equity-markets-but-familiar-says-nikhil-gangil-of-intrinsic-value-455725-2024-11-30",
                                    "quote": "2025 will be challenging for equity markets but familiar: A structural forecast",
                                    "source": "Business Today",
                                    "logo": "featuring_icon/businesstoday.jpeg",
                                    "wrapperClass": "brand-bt"
                            },
                            {
                                    "label": "Business Today",
                                    "link": "https://www.businesstoday.in/markets/story/6700-returns-heres-how-this-29-year-old-iitian-spotted-10-multi-baggers-346796-2022-09-09",
                                    "quote": "6700% returns: Here's how this 29-year-old IITian spotted 10 multi-baggers",
                                    "source": "Business Today",
                                    "logo": "featuring_icon/businesstoday.jpeg",
                                    "wrapperClass": "brand-bt"
                            },
                            {
                                    "label": "Economic Times",
                                    "link": "https://economictimes.indiatimes.com/markets/etmarkets-live/sharing-a-potential-outperformer/streamsrecorded/streamid-npnf7p7g6k,expertid-60.cms",
                                    "quote": "Sharing potential outperformers and value unlocking strategies",
                                    "source": "Economic Times",
                                    "logo": "featuring_icon/et.png",
                                    "wrapperClass": "brand-et"
                            },
                            {
                                    "label": "Economic Times",
                                    "link": "https://economictimes.indiatimes.com/news/india/15-business-leaders-to-lookout-in-2024/articleshow/108236623.cms?from=mdr",
                                    "quote": "🏆 Recognized by The Economic Times as One of the 15 Business Leaders to Look Out for in 2024",
                                    "source": "Economic Times",
                                    "logo": "featuring_icon/et.png",
                                    "wrapperClass": "brand-et"
                            },
                            {
                                    "label": "Stockgro",
                                    "link": "https://www.youtube.com/watch?v=equLqWn3H_E",
                                    "quote": "Detailed talk on equity analysis, stock valuation models, and portfolio tracking",
                                    "source": "Stockgro",
                                    "logo": "featuring_icon/stockgro.png",
                                    "wrapperClass": "brand-stockgro"
                            },
                            {
                                    "label": "SAMCO Securities",
                                    "link": "https://youtu.be/ZBJJqq8fcqI?si=5mn4oukOmGUUTcHG",
                                    "quote": "Compounding strategies, margin of safety, and behavioral biases in trading",
                                    "source": "SAMCO Securities",
                                    "logo": "featuring_icon/samco.png",
                                    "wrapperClass": "brand-samco"
                            },
                            {
                                    "label": "Elearnmarkets",
                                    "link": "https://youtu.be/dXEipa5_M3I?si=jhgShzMJh-z13nkx",
                                    "quote": "Practical value investing frameworks: Decoding balance sheets and cash flows",
                                    "source": "Elearnmarkets",
                                    "logo": "featuring_icon/elm.jpg",
                                    "wrapperClass": "brand-elm"
                            },
                            {
                                    "label": "Vishal Hours",
                                    "link": "https://www.youtube.com/watch?v=vKs1OAGWKLU&t=38s",
                                    "quote": "An in-depth talk on finding mispriced bets in the Indian equity markets",
                                    "source": "Vishal Hours",
                                    "logo": "inline-svg:<svg viewBox=\"0 0 104 104\" class=\"svg-logo\" xmlns=\"http://www.w3.org/2000/svg\"> <rect width=\"104\" height=\"104\" fill=\"#ffffff\" /> <rect x=\"22\" y=\"32\" width=\"60\" height=\"40\" rx=\"8\" fill=\"#FF0000\" /> <polygon points=\"45,42 45,62 62,52\" fill=\"#FFFFFF\" /> <text x=\"50%\" y=\"86\" dominant-baseline=\"middle\" text-anchor=\"middle\" font-family=\"'Plus Jakarta Sans', sans-serif\" font-weight=\"800\" font-size=\"10\" fill=\"#111111\">VISHAL HOURS</text> </svg>",
                                    "wrapperClass": "brand-vishal"
                            },
                            {
                                    "label": "Upsurge",
                                    "link": "https://youtu.be/K1Cvm67LhJw?si=RE7uK9rKV9GX3Ntb",
                                    "quote": "Detailed framework on finding mispriced bets and high margin of safety stocks",
                                    "source": "Upsurge",
                                    "logo": "featuring_icon/upsurge.jpeg",
                                    "wrapperClass": "brand-upsurge"
                            },
                            {
                                    "label": "MSN",
                                    "link": "https://www.msn.com/en-us/money/economy/indian-solar-firms-may-face-margin-squeeze-if-tariff-shield-fades-sebi-ra-warns-of-sunshine-trap/ar-AA1Gv35r?ocid=BingNewsVerp",
                                    "quote": "Indian solar firms may face margin squeeze if tariff shield fades: SEBI RA warns of sunshine trap",
                                    "source": "MSN Money",
                                    "logo": "featuring_icon/msn.png",
                                    "wrapperClass": "brand-msn"
                            },
                            {
                                    "label": "Rediff",
                                    "link": "https://www.rediff.com/business/interview/why-it-is-time-to-double-your-sips/20260522.htm",
                                    "quote": "Why it is time to double your SIPs and ignore short-term market corrections",
                                    "source": "Rediff Business",
                                    "logo": "featuring_icon/rediff.svg",
                                    "wrapperClass": "brand-rediff"
                            },
                            {
                                    "label": "Investing.com",
                                    "link": "https://in.investing.com/news/stock-market-news/every-3-months-expect-a-dip-sebi-ra-nikhil-gangil-on-why-market-corrections-are-not-a-bug-but-a-feature-4875149",
                                    "quote": "Every 3 months, expect a dip: SEBI RA Nikhil Gangil on why market corrections are not a bug, but a feature",
                                    "source": "Investing.com",
                                    "logo": "featuring_icon/investingcom.png",
                                    "wrapperClass": "brand-investing"
                            },
                            {
                                    "label": "Business Standard",
                                    "link": "https://www.business-standard.com/content/specials/29-year-old-iitian-value-investor-makes-1500-here-is-how-he-did-it-123022000841_1.html",
                                    "quote": "29-year-old IITian value investor makes 1500%: Here is how he did it",
                                    "source": "Business Standard",
                                    "logo": "featuring_icon/business standard.png",
                                    "wrapperClass": "brand-bs"
                            },
                            {
                                    "label": "IIT Madras",
                                    "link": "https://www.linkedin.com/posts/oealumnitalks-iitmadras-oceanengineering-share-7434859154181218304-OhAF/",
                                    "quote": "Honored by IIT Madras to share alumni talks on Ocean Engineering &amp; entrepreneurship",
                                    "source": "IIT Madras",
                                    "logo": "inline-svg:<svg viewBox=\"0 0 104 104\" class=\"svg-logo\" xmlns=\"http://www.w3.org/2000/svg\"> <rect width=\"104\" height=\"104\" fill=\"#ffffff\" /> <circle cx=\"52\" cy=\"52\" r=\"32\" fill=\"#7D1E1E\" stroke=\"#DBB468\" stroke-width=\"1.8\" /> <circle cx=\"52\" cy=\"52\" r=\"23\" fill=\"#ffffff\" /> <path d=\"M42 56 C42 62, 62 62, 62 56 Z\" fill=\"#7D1E1E\" /> <path d=\"M52 35 C52 46, 48 46, 52 46 C56 46, 52 46, 52 35 Z\" fill=\"#FF8C00\" /> <path d=\"M52 46 L52 56\" stroke=\"#7D1E1E\" stroke-width=\"2\" /> <circle cx=\"52\" cy=\"52\" r=\"36\" fill=\"none\" stroke=\"#DBB468\" stroke-dasharray=\"3 3\" stroke-width=\"1\" /> </svg>",
                                    "wrapperClass": "brand-iitm"
                            },
                            {
                                    "label": "SSRN",
                                    "link": "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5283330",
                                    "quote": "Academic publication: Gangil Age wealth Parity index is revolutionary, age-adjusted framework to calculate wealth",
                                    "source": "SSRN Research",
                                    "logo": "featuring_icon/ssrn.png",
                                    "wrapperClass": "brand-ssrn"
                            },
                            {
                                    "label": "Inshorts",
                                    "link": "https://shrts.in/7aDPi",
                                    "quote": "Quick summary: Value rotation strategies and market warnings on solar valuations",
                                    "source": "Inshorts",
                                    "logo": "featuring_icon/inshort.png",
                                    "wrapperClass": "brand-inshorts"
                            },
                            {
                                    "label": "Twitter (X)",
                                    "link": "https://x.com/ias_summit/status/1736068719426580640?s=20",
                                    "quote": "Invited to Share Investment Insights at Investing Accelerator Summit 2023",
                                    "source": "Twitter (X)",
                                    "logo": "inline-svg:<svg viewBox=\"0 0 104 104\" class=\"svg-logo\" xmlns=\"http://www.w3.org/2000/svg\"> <rect width=\"104\" height=\"104\" fill=\"#000000\" /> <g transform=\"translate(26, 26) scale(2.16)\"> <path d=\"M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z\" fill=\"#FFFFFF\" /> </g> </svg>",
                                    "wrapperClass": "brand-x"
                            },
                            {
                                    "label": "Twitter (X)",
                                    "link": "https://x.com/Intrinsic_cycle/status/2017490604331307093?s=20",
                                    "quote": "By the time an opportunity becomes obvious, most of the returns are already behind it.",
                                    "source": "Twitter (X)",
                                    "logo": "inline-svg:<svg viewBox=\"0 0 104 104\" class=\"svg-logo\" xmlns=\"http://www.w3.org/2000/svg\"> <rect width=\"104\" height=\"104\" fill=\"#000000\" /> <g transform=\"translate(26, 26) scale(2.16)\"> <path d=\"M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z\" fill=\"#FFFFFF\" /> </g> </svg>",
                                    "wrapperClass": "brand-x"
                            },
                            {
                                    "label": "YouTube",
                                    "link": "https://youtu.be/cMSGq2VGiK8?si=7xYhfCjQbxOk6wN3",
                                    "quote": "On 29 March 2026, We Said the Market Had Bottomed: Here Are the 7 Reasons Behind Our View",
                                    "source": "YouTube",
                                    "logo": "inline-svg:<svg viewBox=\"0 0 104 104\" class=\"svg-logo\" xmlns=\"http://www.w3.org/2000/svg\"> <rect width=\"104\" height=\"104\" fill=\"#ffffff\" /> <g transform=\"translate(22, 22) scale(2.5)\"> <path d=\"M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837z\" fill=\"#FF0000\" /> <polygon points=\"9.545,15.568 9.545,8.432 15.818,12\" fill=\"#ffffff\" /> </g> </svg>",
                                    "wrapperClass": "brand-youtube"
                            }
                    ]
            },
            "testimonials": {
                    "title": "Client <em>Testimonials</em>.",
                    "items": [
                            {
                                    "name": "Vivek Bajaj",
                                    "position": "CEO/Founder, Elearn Market/ Stockedge",
                                    "quote": "Nikhil is doing a great Job in investing, He was associated with us on stockedge\n                                social. His stock picking skills are exceptional. I wish him all the best.",
                                    "avatar": "testimonials_images/avatar_page_1.jpg"
                            },
                            {
                                    "name": "Amit Kumar Agarwal",
                                    "position": "Founder & CEO, NoBroker.com",
                                    "quote": "Nikhil's core recommendation service is doing fabulously well. I wish him all the\n                                best.",
                                    "avatar": "testimonials_images/avatar_page_2.jpg"
                            },
                            {
                                    "name": "Tirumala Rao",
                                    "position": "Business, Hyderabad",
                                    "quote": "Very good, trying to understand their style",
                                    "avatar": "testimonials_images/avatar_page_3.jpg"
                            },
                            {
                                    "name": "Vikram Bhatt",
                                    "position": "Director, XYZ, Dubai",
                                    "quote": "Nikhil is an amazingly intuitive value investing advisor. His recommendations have\n                                made my portfolio soar in less than one year. I am following his advice to hold\n                                value stocks for the long term, which i am sure will reap handsome gains.",
                                    "avatar": "testimonials_images/avatar_page_4.jpg"
                            },
                            {
                                    "name": "Deepak Rai",
                                    "position": "Director, AVM Engineering India Pvt. Ltd., Gurugram",
                                    "quote": "Beautiful",
                                    "avatar": "testimonials_images/avatar_page_5.jpg"
                            },
                            {
                                    "name": "Santosh Kumar",
                                    "position": "Vice President, Natwest, Hyderabad",
                                    "quote": "Excellent Analyst who has great powers to find the stock when no one thinking about\n                                it and wait till it becomes many times the purchase price. 100 percent recommend\n                                Nikhil ji as best advisor if anyone looking to invest in stock markets",
                                    "avatar": "testimonials_images/avatar_page_6.jpg"
                            },
                            {
                                    "name": "Harish Gunda",
                                    "position": "IT Professional, NewEraTech, Hyderabad",
                                    "quote": "Very good. I never had experience of holding a stock with conviction after it is\n                                20% up. With intrinsic value, I see the results of holding a value buy for long\n                                term. Thank you so much.",
                                    "avatar": "testimonials_images/avatar_page_7.jpg"
                            },
                            {
                                    "name": "Paul Inasu",
                                    "position": "Technical Training Superintendent, BSM, Kochi",
                                    "quote": "The downward risk is hugely protected in the portfolio stocks and we only need to\n                                keep riding the winners",
                                    "avatar": "testimonials_images/avatar_page_8.jpg"
                            },
                            {
                                    "name": "Narender",
                                    "position": "Government Employee, Police, Chandigarh",
                                    "quote": "Awesome work",
                                    "avatar": "testimonials_images/avatar_page_9.jpg"
                            },
                            {
                                    "name": "Sudhanshu Jain",
                                    "position": "Assistant Vice President, Barclays, Pune",
                                    "quote": "My experience has been great. Really been happy with the advisory service. Best\n                                part is there is no panic involved in his style of investing. So really great\n                                admirer of his methods and definitely have helped me to make gains.",
                                    "avatar": "testimonials_images/avatar_page_10.jpg"
                            },
                            {
                                    "name": "Vasuraj",
                                    "position": "Doctor, Dr. Agarwal Eye Hospital",
                                    "quote": "Excellent and Trustworthy.",
                                    "avatar": "testimonials_images/avatar_page_11.jpg"
                            },
                            {
                                    "name": "Dr. Sarang Pandit",
                                    "position": "Professional, Samvedna Neuropsychiatry Clinic, Jabalpur",
                                    "quote": "My experience with Intrinsic Value so far has been very satisfactory in whatever\n                                services offered by them I opted for. The team led by Nikhil is responsive and take\n                                necessary action to fulfill the requirements. The quality of research is also good\n                                though I have not invested in their all calls yet fully as I joined late there\n                                service is really good. I wish there would be more such service like that in\n                                future.",
                                    "avatar": "testimonials_images/avatar_page_12.jpg"
                            },
                            {
                                    "name": "Suvajit Mukhopadhyay",
                                    "position": "Technology Architect, UNO Bank, Kolkata",
                                    "quote": "Excellent. Portfolio is running at 45% XIRR. Got 100% returns in a stock for the\n                                first time in my life. Nikhil is also prompt with doubt and query resolution.",
                                    "avatar": "testimonials_images/avatar_page_13.jpg"
                            },
                            {
                                    "name": "Lokesh Kumar",
                                    "position": "Inspector, Central Government, Chennai",
                                    "quote": "Fantastic and valuable for me",
                                    "avatar": "testimonials_images/avatar_page_14.jpg"
                            },
                            {
                                    "name": "Nirbhay Chand Tiwary",
                                    "position": "Structural Engineer, NPCC ENGG LTD, Mumbai",
                                    "quote": "Made good amount of money.",
                                    "avatar": "testimonials_images/avatar_page_15.jpg"
                            },
                            {
                                    "name": "Ajay Gupta",
                                    "position": "Senior Manager, HDFC Bank, Pune",
                                    "quote": "1 year experience with founder Mr. Nikhil Gangil. he has excellant domain knowledge\n                                and knows how things go work in market. Really appreciative and recommended",
                                    "avatar": "testimonials_images/avatar_page_16.jpg"
                            },
                            {
                                    "name": "Anoop",
                                    "position": "Software Architect, Danske Bank, Bangalore",
                                    "quote": "I'm associated with Nikhil for the last 1.5 years.",
                                    "avatar": "testimonials_images/avatar_page_17.jpg"
                            },
                            {
                                    "name": "Dr. Shiraj Sherasia",
                                    "position": "NDDB, Gujarat",
                                    "quote": "I came across IVI and Nikhil about an year ago through social media. It has been a\n                                great learning experience. Would surely continue my association with IVI and the\n                                team for the future too.",
                                    "avatar": "testimonials_images/avatar_page_18.jpg"
                            },
                            {
                                    "name": "Akshay Tiwary",
                                    "position": "Senior Project Engineer, McDermott International, Dubai",
                                    "quote": "Intrinsic Value has been a rich source of information and guidance on the concept\n                                of value investing. I have been associated with the founders from almost two years\n                                now and have been satisfied with the outcome specially in the volatile phase of\n                                initial Covid outbreak",
                                    "avatar": "testimonials_images/avatar_page_19.jpg"
                            },
                            {
                                    "name": "Anuraj Sharma",
                                    "position": "Operations Manager, Amazon, Gurugram",
                                    "quote": "Intrinsic Value team is doing a fantastic job in Value investing. Most of the\n                                Stocks are doing exceptionally better than the so called \\\"Hot Stocks\\\". The\n                                approach is simple and easy to understand, even for beginners like me. Would\n                                definitely recommend everyone to subscribe and enjoy wealth creation.",
                                    "avatar": "testimonials_images/avatar_page_20.jpg"
                            }
                    ]
            },
            "team": {
                    "title": "<span class=\"text-white\">Meet Our</span><span class=\"text-orange\">Team.</span>",
                    "members": [
                            {
                                    "name": "Nikhil Gangil",
                                    "role": "Founder & Research Analyst",
                                    "photo": "profile.jpeg",
                                    "linkedin": ""
                            },
                            {
                                    "name": "Ragini Gupta",
                                    "role": "Marketing Head",
                                    "photo": "testimonials_images/ragini.jpeg",
                                    "linkedin": ""
                            },
                            {
                                    "name": "Mahesh Ekdare",
                                    "role": "Head - Business Development & Operation",
                                    "photo": "testimonials_images/mahesh.jpg",
                                    "linkedin": ""
                            },
                            {
                                    "name": "Vaibhav Gupta",
                                    "role": "Operation Manager",
                                    "photo": "testimonials_images/vaibhav.jpg",
                                    "linkedin": ""
                            },
                            {
                                    "name": "Anil Ghavalkar",
                                    "role": "Business Development Manager",
                                    "photo": "testimonials_images/anil.png",
                                    "linkedin": ""
                            },
                            {
                                    "name": "Daksh Kamble",
                                    "role": "Research Intern",
                                    "photo": "testimonials_images/daksh.png",
                                    "linkedin": ""
                            },
                            {
                                    "name": "Gaurav Arvind Bhivgade",
                                    "role": "Research Intern",
                                    "photo": "testimonials_images/gaurav.jpeg",
                                    "linkedin": ""
                            },
                            {
                                    "name": "Arpita Jena",
                                    "role": "Tech Partner",
                                    "photo": "testimonials_images/arpita.jpeg",
                                    "linkedin": ""
                            },
                            {
                                    "name": "Harshit Saaran",
                                    "role": "Tech partner",
                                    "photo": "testimonials_images/harshit.jpeg",
                                    "linkedin": ""
                            }
                    ]
            },
            "faqs": {
                    "title": "Frequently Asked <em>Questions</em>.",
                    "items": [
                            {
                                    "question": "What is the investing approach.",
                                    "answer": "As a value investors, we look for the opportunities when great businesses go through\n                            rough phase. so whenever businesses goes through such period we buy stakes in them at\n                            their min intrinsic Value and when they do better and market understands their worth, we\n                            sell them at higher valuations, near their Maximum Intrinsic Value. (Refer <a\n                                href=\"blogs.html\" class=\"faq-link\">BLOG LINK</a> to understand the concept of\n                            Minimum/Maximum Intrinsic Value)"
                            },
                            {
                                    "question": "What do we mean by long term",
                                    "answer": "Our average holding period is 2.5 yrs, it can vary from 2 to 5 years for individual\n                            investments. If your holding period is above 2.5 years then only you should opt for the\n                            service"
                            },
                            {
                                    "question": "What is the difference in all three listed service",
                                    "answer": "It primarily depends on the capital, If your capital exceeds 10 Lacs over the year, HNI\n                            service is recommended for you, For Institutes and family offices having over 5 Crore\n                            capital. Enterprize is Must. Enterprize is a focused service only designed for Ultra\n                            Large capital investors. where the Model portfolio is maintained for each investor\n                            separately. Book a call to know more about Enterprise. Meanwhile HNI is one to many\n                            information service which is provided on our own App \"Intrinsic Value Equity\""
                            },
                            {
                                    "question": "What can one expect from the recommendation service?",
                                    "answer": "<ol>\n                                <li>Total 20-22 stock recommendation</li>\n                                <li>Research reports (with Buying price, %Allocation, and actionable insights)</li>\n                                <li>Quarterly newsletters</li>\n                                <li>One video meet every quarter</li>\n                                <li>0-4 no of Dark horses, (High risk – High Reward Stocks)</li>\n                                <li>1 stock of the month ( 7-8 every year) from Large cap.</li>\n                                <li>Peaceful long term behavior through thick and thin of market.</li>\n                                <li>Exit Recommendations when the price reaches the Target.</li>\n                                <li>Stock picks based on their potential of becoming the multibagger over the next\n                                    3-5 years.</li>\n                            </ol>"
                            },
                            {
                                    "question": "What should not be expected from the service?",
                                    "answer": "<ol>\n                                <li>Short term/F&O calls/Momentum/Swing trading</li>\n                                <li>PMS / profit sharing kind of system.</li>\n                                <li>Money management from our side.</li>\n                                <li>Crypto/NFT or other unrecognized assets related advice.</li>\n                                <li>If your investment horizon is less than 2-5 years, Plz do not Join.</li>\n                                <li>Daily/weekly video calls or Meets</li>\n                            </ol>"
                            },
                            {
                                    "question": "I am having Queries/Concern , Who should i connect?",
                                    "answer": "You mail to <a href=\"mailto:info@intrinsicvalueequity.in\"\n                                class=\"faq-link\">info@intrinsicvalueequity.in</a> or connect on our business\n                            numbers: <span class=\"faq-highlight\">+91 7354259486</span> and <span\n                                class=\"faq-highlight\">+91 9806471956</span>. <a\n                                href=\"https://api.whatsapp.com/send/?phone=917354259486&text=Hello%2C%0D%0Ai+want+to+understand+about+your+services&type=phone_number&app_absent=0\" class=\"faq-link\" target=\"_blank\"\n                                rel=\"noopener noreferrer\">Learn more</a>"
                            }
                    ]
            },
            "footer": {
                    "desc": "SEBI-registered value investing research and advisory service dedicated to sustainable\n                        wealth creation.",
                    "quick_links": [
                            {
                                    "text": "Service",
                                    "url": "pricing.html"
                            },
                            {
                                    "text": "About Us",
                                    "url": "about.html"
                            },
                            {
                                    "text": "Blogs",
                                    "url": "blogs.html"
                            },
                            {
                                    "text": "Analytics",
                                    "url": "analytics/index.html"
                            }
                    ],
                    "important_info": [
                            {
                                    "text": "Terms And Conditions/ MITC",
                                    "url": "Legal&Compliance/tnc.html"
                            },
                            {
                                    "text": "Privacy Policy",
                                    "url": "Legal&Compliance/privacypolicy.html"
                            },
                            {
                                    "text": "Disclaimer",
                                    "url": "Legal&Compliance/disclaimer.html"
                            },
                            {
                                    "text": "Investor Grievance",
                                    "url": "Legal&Compliance/Grievance Redressal.html"
                            },
                            {
                                    "text": "Investor Charter",
                                    "url": "Legal&Compliance/investorcharter.html"
                            },
                            {
                                    "text": "Smart ODR",
                                    "url": "https://smartodr.in/login"
                            }
                    ],
                    "disclaimer": "SEBI Registration No: INH000009047. Investment in securities market are subject to market risks. Read all the related documents carefully before investing."
            }
    };;;

    // Simulated file upload configurations
    var simulatedUploadTargetId = '';
    var simulatedUploadFolder = '';

    window.simulateFileUpload = function(targetInputId, folderName) {
        simulatedUploadTargetId = targetInputId;
        simulatedUploadFolder = folderName;
        var picker = document.getElementById('cmsSimulatedFilePicker');
        if (picker) {
            picker.click();
        }
    };

    window.handleSimulatedFileChange = function(input) {
        if (input.files && input.files[0]) {
            var file = input.files[0];
            var path = '';
            if (simulatedUploadFolder) {
                path = simulatedUploadFolder + '/' + file.name;
            } else {
                path = file.name;
            }
            var targetInput = document.getElementById(simulatedUploadTargetId);
            if (targetInput) {
                targetInput.value = path;
                targetInput.dispatchEvent(new Event('input'));
                
                alert("File selected: " + file.name + "\n\nIMPORTANT: Since this is a static site run on a browser environment, you MUST manually copy this file into the local project folder '" + simulatedUploadFolder + "/' so the site can reference it correctly.");
            }
        }
    };

    // Load configurations safely
    function loadCmsData() {
        fetch('homepage_config.json')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                cmsState = data;
                populateCmsForms();
            })
            .catch(function (err) {
                console.warn("Could not fetch homepage_config.json directly. Loading fallback configuration:", err);
                cmsState = JSON.parse(JSON.stringify(DEFAULT_FALLBACK_CONFIG));
                populateCmsForms();
            });
    }

    // Toggle hero media url input depending on type
    function toggleMediaUrlField() {
        var mediaType = document.getElementById('cms-hero-media-type').value;
        var urlGroup = document.getElementById('cms-hero-media-url-group');
        if (mediaType === 'animation') {
            urlGroup.style.display = 'none';
        } else {
            urlGroup.style.display = '';
        }
    }

    function populateCmsForms() {
        if (!cmsState.hero) return;

        // Simple Inputs
        document.getElementById('cms-hero-tag').value = cmsState.hero.tag || '';
        document.getElementById('cms-hero-heading').value = cmsState.hero.heading_html || '';
        document.getElementById('cms-hero-typewriter-words').value = (cmsState.hero.typewriter_words || []).join(', ');
        document.getElementById('cms-hero-desc1').value = cmsState.hero.desc1 || '';
        document.getElementById('cms-hero-desc2').value = cmsState.hero.desc2 || '';
        document.getElementById('cms-hero-cta-text').value = cmsState.hero.cta_text || '';
        document.getElementById('cms-hero-cta-url').value = cmsState.hero.cta_url || '';
        document.getElementById('cms-hero-sebi-badge').value = cmsState.hero.sebi_badge || '';
        
        document.getElementById('cms-hero-media-type').value = cmsState.hero.media.type || 'animation';
        document.getElementById('cms-hero-media-url').value = cmsState.hero.media.url || '';
        toggleMediaUrlField();

        document.getElementById('cms-philosophy-title').value = cmsState.philosophy.title || '';
        document.getElementById('cms-news-title').value = cmsState.news.title || '';
        document.getElementById('cms-case-title').value = cmsState.case_studies.title || '';
        document.getElementById('cms-team-title').value = cmsState.team.title || '';
        document.getElementById('cms-testimonials-title').value = cmsState.testimonials.title || '';
        document.getElementById('cms-faq-title').value = cmsState.faqs.title || '';
        
        document.getElementById('cms-footer-desc').value = cmsState.footer.desc || '';
        document.getElementById('cms-footer-disclaimer').value = cmsState.footer.disclaimer || '';

        // Dynamic lists render
        renderNavMenu();
        renderHeroStats();
        renderPhilosophyCards();
        renderNewsItems();
        renderCaseStudies();
        renderTeamMembers();
        renderTestimonials();
        renderFaqs();
        renderFooterQuickLinks();
        renderFooterImportantLinks();
    }

    // Compile from forms to output JSON
    function compileCmsState() {
        cmsState.hero.tag = document.getElementById('cms-hero-tag').value;
        cmsState.hero.heading_html = document.getElementById('cms-hero-heading').value;
        
        var typewriterWordsVal = document.getElementById('cms-hero-typewriter-words').value;
        cmsState.hero.typewriter_words = typewriterWordsVal.split(',').map(function (s) {
            return s.trim();
        }).filter(function (s) { return s.length > 0; });
        
        cmsState.hero.desc1 = document.getElementById('cms-hero-desc1').value;
        cmsState.hero.desc2 = document.getElementById('cms-hero-desc2').value;
        cmsState.hero.cta_text = document.getElementById('cms-hero-cta-text').value;
        cmsState.hero.cta_url = document.getElementById('cms-hero-cta-url').value;
        cmsState.hero.sebi_badge = document.getElementById('cms-hero-sebi-badge').value;

        cmsState.hero.media.type = document.getElementById('cms-hero-media-type').value;
        cmsState.hero.media.url = document.getElementById('cms-hero-media-url').value;

        cmsState.philosophy.title = document.getElementById('cms-philosophy-title').value;
        cmsState.news.title = document.getElementById('cms-news-title').value;
        cmsState.case_studies.title = document.getElementById('cms-case-title').value;
        cmsState.team.title = document.getElementById('cms-team-title').value;
        cmsState.testimonials.title = document.getElementById('cms-testimonials-title').value;
        cmsState.faqs.title = document.getElementById('cms-faq-title').value;
        
        cmsState.footer.desc = document.getElementById('cms-footer-desc').value;
        cmsState.footer.disclaimer = document.getElementById('cms-footer-disclaimer').value;

        var jsonText = JSON.stringify(cmsState, null, 4);
        var jsonDisplay = document.getElementById('cmsJsonDisplay');
        if (jsonDisplay) {
            jsonDisplay.textContent = jsonText;
        }
        return jsonText;
    }

    // REPEATER RENDERERS & EVENT BINDINGS
    // 1. Navigation Menu
    function renderNavMenu() {
        var container = document.getElementById('cms-nav-list');
        container.innerHTML = '';
        (cmsState.navigation || []).forEach(function (link, index) {
            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            div.innerHTML = `
                <button type="button" class="iv-cms-btn-remove" onclick="removeNavItem(${index})">&times;</button>
                <div class="iv-cms-row" style="margin-bottom: 0;">
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <label class="iv-cms-label">Link Text</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(link.text)}" oninput="updateNavItem(${index}, 'text', this.value)">
                    </div>
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <label class="iv-cms-label">Link URL</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(link.url)}" oninput="updateNavItem(${index}, 'url', this.value)">
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    window.removeNavItem = function (idx) {
        cmsState.navigation.splice(idx, 1);
        renderNavMenu();
    };
    window.updateNavItem = function (idx, field, val) {
        cmsState.navigation[idx][field] = val;
    };
    document.getElementById('cms-nav-add-btn').addEventListener('click', function () {
        cmsState.navigation.push({ text: "New Link", url: "#" });
        renderNavMenu();
    });

    // 2. Hero stats (Fixed 4 counters)
    function renderHeroStats() {
        var container = document.getElementById('cms-hero-stats-container');
        container.innerHTML = '';
        (cmsState.hero.stats || []).forEach(function (stat, index) {
            var div = document.createElement('div');
            div.style.marginBottom = '16px';
            div.style.border = '1px solid var(--border-color)';
            div.style.padding = '12px';
            div.style.borderRadius = '8px';
            div.style.background = 'rgba(255, 255, 255, 0.01)';
            div.innerHTML = `
                <div style="font-weight: 700; font-size: 11px; margin-bottom: 8px; color: var(--accent);">Counter Stat ${index + 1}</div>
                <div class="iv-cms-row" style="margin-bottom: 0;">
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <label class="iv-cms-label">Value Number</label>
                        <input type="text" class="iv-cms-input" style="padding: 8px 12px; font-size: 13px;" value="${escapeHtml(stat.num)}" oninput="updateHeroStat(${index}, 'num', this.value)">
                    </div>
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <label class="iv-cms-label">Suffix (e.g. +, cr+)</label>
                        <input type="text" class="iv-cms-input" style="padding: 8px 12px; font-size: 13px;" value="${escapeHtml(stat.suffix)}" oninput="updateHeroStat(${index}, 'suffix', this.value)">
                    </div>
                    <div class="iv-cms-group" style="margin-bottom: 0; grid-column: span 2;">
                        <label class="iv-cms-label">Label</label>
                        <input type="text" class="iv-cms-input" style="padding: 8px 12px; font-size: 13px;" value="${escapeHtml(stat.label)}" oninput="updateHeroStat(${index}, 'label', this.value)">
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    window.updateHeroStat = function (idx, field, val) {
        cmsState.hero.stats[idx][field] = val;
    };

    // 3. Philosophy Cards
    function renderPhilosophyCards() {
        var container = document.getElementById('cms-philosophy-list');
        container.innerHTML = '';
        (cmsState.philosophy.cards || []).forEach(function (card, index) {
            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            div.innerHTML = `
                <button type="button" class="iv-cms-btn-remove" onclick="removePhilosophyCard(${index})">&times;</button>
                <div class="iv-cms-row">
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Icon Class (FontAwesome)</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(card.icon)}" placeholder="e.g. fas fa-sort-numeric-up" oninput="updatePhilosophyCard(${index}, 'icon', this.value)">
                    </div>
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Card Title</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(card.title)}" oninput="updatePhilosophyCard(${index}, 'title', this.value)">
                    </div>
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Section anchor/link</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(card.link)}" placeholder="e.g. #services_item1" oninput="updatePhilosophyCard(${index}, 'link', this.value)">
                    </div>
                </div>
                <div class="iv-cms-group" style="margin-bottom: 0;">
                    <label class="iv-cms-label">Description text</label>
                    <textarea class="iv-cms-textarea" style="min-height: 80px;" oninput="updatePhilosophyCard(${index}, 'desc', this.value)">${escapeHtml(card.desc)}</textarea>
                </div>
            `;
            container.appendChild(div);
        });
    }

    window.removePhilosophyCard = function (idx) {
        cmsState.philosophy.cards.splice(idx, 1);
        renderPhilosophyCards();
    };
    window.updatePhilosophyCard = function (idx, field, val) {
        cmsState.philosophy.cards[idx][field] = val;
    };
    document.getElementById('cms-philosophy-add-btn').addEventListener('click', function () {
        cmsState.philosophy.cards.push({
            icon: "fas fa-chess",
            title: "New Philosophy Title",
            desc: "Description of the investment philosophy card.",
            link: "#"
        });
        renderPhilosophyCards();
    });

    // 4. News items
    function renderNewsItems() {
        var container = document.getElementById('cms-news-list');
        container.innerHTML = '';
        (cmsState.news.items || []).forEach(function (item, index) {
            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            var randId = 'news-logo-' + index;
            div.innerHTML = `
                <button type="button" class="iv-cms-btn-remove" onclick="removeNewsItem(${index})">&times;</button>
                <div class="iv-cms-row">
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Outlet Label</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(item.label)}" placeholder="e.g. Josh Talks" oninput="updateNewsItem(${index}, 'label', this.value)">
                    </div>
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Source attribution</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(item.source)}" placeholder="e.g. Guest speaker at Josh Talks" oninput="updateNewsItem(${index}, 'source', this.value)">
                    </div>
                </div>
                <div class="iv-cms-row">
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Article URL</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(item.link)}" oninput="updateNewsItem(${index}, 'link', this.value)">
                    </div>
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Logo Path (suggested featuring_icon/ folder)</label>
                        <div class="iv-cms-file-picker">
                            <input type="text" id="${randId}" class="iv-cms-input" value="${escapeHtml(item.logo)}" oninput="updateNewsItem(${index}, 'logo', this.value)">
                            <button type="button" class="iv-cms-file-btn" onclick="simulateFileUpload('${randId}', 'featuring_icon')">Select</button>
                        </div>
                    </div>
                </div>
                <div class="iv-cms-group" style="margin-bottom: 0;">
                    <label class="iv-cms-label">Article Quote / Title</label>
                    <textarea class="iv-cms-textarea" style="min-height: 60px;" oninput="updateNewsItem(${index}, 'quote', this.value)">${escapeHtml(item.quote)}</textarea>
                </div>
            `;
            container.appendChild(div);
        });
    }

    window.removeNewsItem = function (idx) {
        cmsState.news.items.splice(idx, 1);
        renderNewsItems();
    };
    window.updateNewsItem = function (idx, field, val) {
        cmsState.news.items[idx][field] = val;
    };
    document.getElementById('cms-news-add-btn').addEventListener('click', function () {
        cmsState.news.items.push({
            label: "New Outlet",
            link: "#",
            quote: "Write quoted text here.",
            source: "Source details",
            logo: ""
        });
        renderNewsItems();
    });

    // 5. Case studies (Companies & PDF reports list - Max 8)
    function renderCaseStudies() {
        var container = document.getElementById('cms-case-list');
        container.innerHTML = '';
        
        var addBtn = document.getElementById('cms-case-add-btn');
        if (cmsState.case_studies.companies.length >= 8) {
            addBtn.disabled = true;
            addBtn.style.opacity = '0.5';
            addBtn.title = 'Maximum 8 companies allowed';
        } else {
            addBtn.disabled = false;
            addBtn.style.opacity = '1';
            addBtn.title = '';
        }

        (cmsState.case_studies.companies || []).forEach(function (comp, cIdx) {
            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            div.style.border = '1px solid rgba(255, 140, 0, 0.15)';
            
            var reportsHtml = '';
            comp.reports = comp.reports || [];
            comp.reports.forEach(function (rep, rIdx) {
                var repRandId = 'rep-url-' + cIdx + '-' + rIdx;
                reportsHtml += `
                    <div style="display:flex; gap:10px; margin-bottom:8px; align-items:center;">
                        <input type="text" class="iv-cms-input" style="width:30%; font-size:12px; padding:8px 12px;" value="${escapeHtml(rep.name)}" placeholder="Report Name" oninput="updateCompanyReport(${cIdx}, ${rIdx}, 'name', this.value)">
                        <div class="iv-cms-file-picker" style="flex-grow:1;">
                            <input type="text" id="${repRandId}" class="iv-cms-input" style="font-size:12px; padding:8px 12px;" value="${escapeHtml(rep.url)}" placeholder="PDF Path" oninput="updateCompanyReport(${cIdx}, ${rIdx}, 'url', this.value)">
                            <button type="button" class="iv-cms-file-btn" style="padding:8px 12px; font-size:11px;" onclick="simulateFileUpload('${repRandId}', 'CS reports')">Upload PDF</button>
                        </div>
                        <button type="button" class="iv-cms-btn-remove" style="position:static; margin-left:5px; height:32px; width:32px; display:inline-flex;" onclick="removeCompanyReport(${cIdx}, ${rIdx})">&times;</button>
                    </div>
                `;
            });

            div.innerHTML = `
                <button type="button" class="iv-cms-btn-remove" onclick="removeCompany(${cIdx})">&times;</button>
                <div class="iv-cms-row">
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Company Number (e.g. 01, 02)</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(comp.num)}" oninput="updateCompany(${cIdx}, 'num', this.value)">
                    </div>
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Company Name</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(comp.name)}" oninput="updateCompany(${cIdx}, 'name', this.value)">
                    </div>
                </div>
                
                <div style="margin-top:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">PDF Reports List</span>
                        <button type="button" class="iv-cms-btn-add" style="padding:4px 8px; font-size:10px;" onclick="addCompanyReport(${cIdx})">+ Add PDF Report</button>
                    </div>
                    <div id="company-reports-container-${cIdx}">
                        ${reportsHtml}
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    window.removeCompany = function (idx) {
        cmsState.case_studies.companies.splice(idx, 1);
        renderCaseStudies();
    };
    window.updateCompany = function (idx, field, val) {
        cmsState.case_studies.companies[idx][field] = val;
    };
    document.getElementById('cms-case-add-btn').addEventListener('click', function () {
        if (cmsState.case_studies.companies.length >= 8) {
            alert("Maximum 8 companies allowed in the case study section!");
            return;
        }
        var nextNum = String(cmsState.case_studies.companies.length + 1).padStart(2, '0');
        cmsState.case_studies.companies.push({
            num: nextNum,
            name: "New Company",
            reports: []
        });
        renderCaseStudies();
    });

    window.addCompanyReport = function (cIdx) {
        cmsState.case_studies.companies[cIdx].reports.push({
            name: "Report Name",
            url: ""
        });
        renderCaseStudies();
    };
    window.removeCompanyReport = function (cIdx, rIdx) {
        cmsState.case_studies.companies[cIdx].reports.splice(rIdx, 1);
        renderCaseStudies();
    };
    window.updateCompanyReport = function (cIdx, rIdx, field, val) {
        cmsState.case_studies.companies[cIdx].reports[rIdx][field] = val;
    };

    // 6. Team Members
    function renderTeamMembers() {
        var container = document.getElementById('cms-team-list');
        container.innerHTML = '';
        (cmsState.team.members || []).forEach(function (member, index) {
            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            var randId = 'team-photo-' + index;
            div.innerHTML = `
                <button type="button" class="iv-cms-btn-remove" onclick="removeTeamMember(${index})">&times;</button>
                <div class="iv-cms-row">
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Name</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(member.name)}" oninput="updateTeamMember(${index}, 'name', this.value)">
                    </div>
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Role</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(member.role)}" oninput="updateTeamMember(${index}, 'role', this.value)">
                    </div>
                </div>
                <div class="iv-cms-row" style="margin-bottom:0;">
                    <div class="iv-cms-group" style="margin-bottom:0;">
                        <label class="iv-cms-label">Photo (suggested root or testimonials_images/ folder)</label>
                        <div class="iv-cms-file-picker">
                            <input type="text" id="${randId}" class="iv-cms-input" value="${escapeHtml(member.photo)}" oninput="updateTeamMember(${index}, 'photo', this.value)">
                            <button type="button" class="iv-cms-file-btn" onclick="simulateFileUpload('${randId}', 'testimonials_images')">Select</button>
                        </div>
                    </div>
                    <div class="iv-cms-group" style="margin-bottom:0;">
                        <label class="iv-cms-label">LinkedIn profile URL</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(member.linkedin)}" oninput="updateTeamMember(${index}, 'linkedin', this.value)">
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    window.removeTeamMember = function (idx) {
        cmsState.team.members.splice(idx, 1);
        renderTeamMembers();
    };
    window.updateTeamMember = function (idx, field, val) {
        cmsState.team.members[idx][field] = val;
    };
    document.getElementById('cms-team-add-btn').addEventListener('click', function () {
        cmsState.team.members.push({
            name: "Member Name",
            role: "Role",
            photo: "",
            linkedin: ""
        });
        renderTeamMembers();
    });

    // 7. Testimonials
    function renderTestimonials() {
        var container = document.getElementById('cms-testimonials-list');
        container.innerHTML = '';
        (cmsState.testimonials.items || []).forEach(function (item, index) {
            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            var randId = 'testimonial-avatar-' + index;
            div.innerHTML = `
                <button type="button" class="iv-cms-btn-remove" onclick="removeTestimonial(${index})">&times;</button>
                <div class="iv-cms-row">
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Client Name</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(item.name)}" oninput="updateTestimonial(${index}, 'name', this.value)">
                    </div>
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Position / Company</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(item.position)}" oninput="updateTestimonial(${index}, 'position', this.value)">
                    </div>
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Avatar Image</label>
                        <div class="iv-cms-file-picker">
                            <input type="text" id="${randId}" class="iv-cms-input" value="${escapeHtml(item.avatar)}" oninput="updateTestimonial(${index}, 'avatar', this.value)">
                            <button type="button" class="iv-cms-file-btn" onclick="simulateFileUpload('${randId}', 'testimonials_images')">Select</button>
                        </div>
                    </div>
                </div>
                <div class="iv-cms-group" style="margin-bottom: 0;">
                    <label class="iv-cms-label">Quote Text</label>
                    <textarea class="iv-cms-textarea" style="min-height: 80px;" oninput="updateTestimonial(${index}, 'quote', this.value)">${escapeHtml(item.quote)}</textarea>
                </div>
            `;
            container.appendChild(div);
        });
    }

    window.removeTestimonial = function (idx) {
        cmsState.testimonials.items.splice(idx, 1);
        renderTestimonials();
    };
    window.updateTestimonial = function (idx, field, val) {
        cmsState.testimonials.items[idx][field] = val;
    };
    document.getElementById('cms-testimonials-add-btn').addEventListener('click', function () {
        cmsState.testimonials.items.push({
            name: "Client Name",
            position: "Position",
            quote: "Client testimonial statement text.",
            avatar: ""
        });
        renderTestimonials();
    });

    // 8. FAQs
    function renderFaqs() {
        var container = document.getElementById('cms-faq-list');
        container.innerHTML = '';
        (cmsState.faqs.items || []).forEach(function (item, index) {
            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            div.innerHTML = `
                <button type="button" class="iv-cms-btn-remove" onclick="removeFaq(${index})">&times;</button>
                <div class="iv-cms-group">
                    <label class="iv-cms-label">Question</label>
                    <input type="text" class="iv-cms-input" value="${escapeHtml(item.question)}" oninput="updateFaq(${index}, 'question', this.value)">
                </div>
                <div class="iv-cms-group" style="margin-bottom: 0;">
                    <label class="iv-cms-label">Answer</label>
                    <textarea class="iv-cms-textarea" style="min-height: 80px;" oninput="updateFaq(${index}, 'answer', this.value)">${escapeHtml(item.answer)}</textarea>
                </div>
            `;
            container.appendChild(div);
        });
    }

    window.removeFaq = function (idx) {
        cmsState.faqs.items.splice(idx, 1);
        renderFaqs();
    };
    window.updateFaq = function (idx, field, val) {
        cmsState.faqs.items[idx][field] = val;
    };
    document.getElementById('cms-faq-add-btn').addEventListener('click', function () {
        cmsState.faqs.items.push({
            question: "Question text?",
            answer: "Answer explanation paragraph."
        });
        renderFaqs();
    });

    // 9. Footer Quick Links
    function renderFooterQuickLinks() {
        var container = document.getElementById('cms-footer-quick-list');
        container.innerHTML = '';
        (cmsState.footer.quick_links || []).forEach(function (link, index) {
            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            div.innerHTML = `
                <button type="button" class="iv-cms-btn-remove" onclick="removeFooterQuickLink(${index})">&times;</button>
                <div class="iv-cms-row" style="margin-bottom: 0;">
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <label class="iv-cms-label">Link Text</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(link.text)}" oninput="updateFooterQuickLink(${index}, 'text', this.value)">
                    </div>
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <label class="iv-cms-label">Link URL</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(link.url)}" oninput="updateFooterQuickLink(${index}, 'url', this.value)">
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    window.removeFooterQuickLink = function (idx) {
        cmsState.footer.quick_links.splice(idx, 1);
        renderFooterQuickLinks();
    };
    window.updateFooterQuickLink = function (idx, field, val) {
        cmsState.footer.quick_links[idx][field] = val;
    };
    document.getElementById('cms-footer-quick-add-btn').addEventListener('click', function () {
        cmsState.footer.quick_links.push({ text: "New Link", url: "#" });
        renderFooterQuickLinks();
    });

    // 10. Footer Important Compliance Links
    function renderFooterImportantLinks() {
        var container = document.getElementById('cms-footer-imp-list');
        container.innerHTML = '';
        (cmsState.footer.important_info || []).forEach(function (link, index) {
            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            div.innerHTML = `
                <button type="button" class="iv-cms-btn-remove" onclick="removeFooterImportantLink(${index})">&times;</button>
                <div class="iv-cms-row" style="margin-bottom: 0;">
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <label class="iv-cms-label">Link Text</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(link.text)}" oninput="updateFooterImportantLink(${index}, 'text', this.value)">
                    </div>
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <label class="iv-cms-label">Link URL</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(link.url)}" oninput="updateFooterImportantLink(${index}, 'url', this.value)">
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    window.removeFooterImportantLink = function (idx) {
        cmsState.footer.important_info.splice(idx, 1);
        renderFooterImportantLinks();
    };
    window.updateFooterImportantLink = function (idx, field, val) {
        cmsState.footer.important_info[idx][field] = val;
    };
    document.getElementById('cms-footer-imp-add-btn').addEventListener('click', function () {
        cmsState.footer.important_info.push({ text: "New Link", url: "#" });
        renderFooterImportantLinks();
    });

    // Helper functions for clipboard copy and alerts
    function copyJsonToClipboard() {
        var jsonText = compileCmsState();
        navigator.clipboard.writeText(jsonText)
            .then(function () {
                showToast("Copied to Clipboard!");
            })
            .catch(function (err) {
                console.error("Could not copy text: ", err);
                var textarea = document.createElement('textarea');
                textarea.value = jsonText;
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    showToast("Copied to Clipboard!");
                } catch (e) {
                    alert("Failed to copy. Please select the text inside the block and copy manually.");
                }
                document.body.removeChild(textarea);
            });
    }

    function downloadJsonFile() {
        var jsonText = compileCmsState();
        var blob = new Blob([jsonText], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = "homepage_config.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function showToast(msg) {
        var toast = document.getElementById('cmsToast');
        if (toast) {
            toast.textContent = msg;
            toast.style.display = 'block';
            setTimeout(function () {
                toast.style.display = 'none';
            }, 2500);
        }
    }

    function initTabs() {
        var tabLinks = document.querySelectorAll('.iv-cms-tab-link');
        tabLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                var tabId = link.getAttribute('data-tab');
                
                tabLinks.forEach(function (l) { l.classList.remove('active'); });
                link.classList.add('active');

                var contents = document.querySelectorAll('.iv-cms-tab-content');
                contents.forEach(function (c) { c.classList.remove('active'); });

                var targetContent = document.getElementById(tabId);
                if (targetContent) {
                    targetContent.classList.add('active');
                }

                if (tabId === 'tab-export') {
                    compileCmsState();
                }
            });
        });
    }

    function bindCmsWorkspaceEvents() {
        var workspace = document.getElementById('homepageCmsWorkspace');
        var openBtn = document.getElementById('openCmsBtn');
        var closeBtn = document.getElementById('closeCmsBtn');
        var saveBtn = document.getElementById('cmsSaveBtn');
        var copyBtn = document.getElementById('cmsCopyJsonBtn');
        var downloadBtn = document.getElementById('cmsDownloadJsonBtn');
        
        if (openBtn && workspace) {
            openBtn.addEventListener('click', function () {
                workspace.style.display = 'block';
                loadCmsData();
                var firstTabLink = document.querySelector('.iv-cms-tab-link[data-tab="tab-hero-nav"]');
                if (firstTabLink) firstTabLink.click();
            });
        }

        if (closeBtn && workspace) {
            closeBtn.addEventListener('click', function () {
                workspace.style.display = 'none';
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                compileCmsState();
                var exportTabLink = document.querySelector('.iv-cms-tab-link[data-tab="tab-export"]');
                if (exportTabLink) exportTabLink.click();
            });
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', copyJsonToClipboard);
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadJsonFile);
        }

        document.getElementById('cms-hero-media-type').addEventListener('change', toggleMediaUrlField);
    }

    // Initialize on DOM load
    document.addEventListener('DOMContentLoaded', function () {
        initGoogleSignIn();
        bindMockLoginEvents();
        bindLogoutEvents();
        updateAuthState();
        
        // Initialize CMS Workspace controls
        initTabs();
        bindCmsWorkspaceEvents();

        // Monitor activity to reset inactivity timer
        var activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        activityEvents.forEach(function (eventName) {
            document.addEventListener(eventName, resetInactivityTimer, { passive: true });
        });

        // Run session check every 10 seconds
        setInterval(checkSessionTimeout, 10000);
    });
})();
