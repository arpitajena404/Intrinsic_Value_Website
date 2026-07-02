(function () {
    // 1. GOOGLE CLIENT ID CONFIGURATION
    // Replace this string with your Google OAuth Web Client ID from the Google Cloud Console.
    var GOOGLE_CLIENT_ID = "401614238694-vrh7s1nq778753efm7lllaip0vqfclar.apps.googleusercontent.com";

    // 2. WHITELISTED ADMIN EMAILS
    var ALLOWED_ADMINS = [
        "harshitsaraan@gmail.com",
        "arpitajena762@gmail.com",
        "nikhilgangil333@gmail.com",
        "intrinsicvalueequity@gmail.com",
        "gvaibhav870@gmail.com",
        "valuemev.jayate@gmail.com"
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
                btnContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; margin: 10px 0; border: 1px dashed var(--border-color); padding: 16px; border-radius: 12px; background: var(--bg-secondary); text-align: left; line-height: 1.5;">Google Sign-In requires a Client ID.<br><small style="font-size: 11px; opacity: 0.7; display: block; margin-top: 4px;">Configure your Web Client ID as the <code>GOOGLE_CLIENT_ID</code> variable inside <code>iv_admin.js</code> to enable Google login.</small></div>';
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
    var pricingCmsState = {};
    var liveCmsState = {};
    var DEFAULT_LIVE_FALLBACK_CONFIG = {
        "indexRedirectUrl": "vsl.html",
        "vslCheckoutUrl": "https://premium.intrinsicvalueequity.in/checkout/28180dfc-84a9-488e-854e-9f7958a1b8d7",
        "tyWhatsAppUrl": "https://chat.whatsapp.com/EZzUNyMTkklAxMMQNZw6so"
    };
    var DEFAULT_PRICING_FALLBACK_CONFIG = {
        "pricing_title": "Intrinsic Value Pricing",
        "pricing_subtitle": "Select the perfect advisory tier aligned with your capital size and research requirement.",
        "comparison_title": "Advisory Tiers Comparison",
        "comparison_subtitle": "Compare the exact features, query resolutions, and platforms for each tier.",
        "cards": [
            {
                "name": "HNI Premium",
                "min_capital": "10 - 15 Lakhs",
                "price_display": "₹<span class=\"pricing-discount-counter\">45,000</span> + GST / year",
                "duration": "1 Year Subscription"
            },
            {
                "name": "Inner Circle",
                "min_capital": "2 Crore+",
                "price_display": "₹1.51 Lacs + GST / year",
                "duration": "1 Year Subscription"
            },
            {
                "name": "Invest Biz",
                "min_capital": "5 Cr+ (Business money only)",
                "price_display": "Custom Pricing",
                "duration": "Quarterly Billing"
            }
        ],
        "parameters": [
            "Bill Tenure",
            "Minimum Capital",
            "Asset Class",
            "Volatility / Risk",
            "Market cap",
            "Alternate assets",
            "Holding",
            "Face to Face",
            "Target returns",
            "Possible Drawdown",
            "Portfolio",
            "SME Stocks",
            "Query resolution",
            "Access",
            "Platform",
            "Model portfolio",
            "Who should join",
            "Fee/Year"
        ],
        "table_plans": [
            {
                "name": "HNI Premium",
                "cta_link": "https://premium.intrinsicvalueequity.in/checkout/efe6d23f-bf90-4e14-92c2-6fd0fb8f0237?init_booking=true",
                "values": {
                    "Bill Tenure": "Annual",
                    "Minimum Capital": "10–15 Lakhs",
                    "Asset Class": "Equity only",
                    "Volatility / Risk": "Mid/High",
                    "Market cap": "Small/mid cap",
                    "Alternate assets": "Only at Extremes",
                    "Holding": "2–5 years",
                    "Face to Face": "Once/&#8203;Quarter",
                    "Target returns": "Index +6-9%",
                    "Possible Drawdown": ">15%",
                    "Portfolio": ">20 stocks",
                    "SME Stocks": "No",
                    "Query resolution": "3 days",
                    "Access": "Single",
                    "Platform": "App",
                    "Model portfolio": "Equity research",
                    "Who should join": "Professional / HNI/ Self Employed",
                    "Fee/Year": "39,871+GST"
                }
            },
            {
                "name": "Inner Circle",
                "cta_link": "https://premium.intrinsicvalueequity.in/checkout/311e8d9b-8d7c-4bfa-95c3-53704355ca4a",
                "values": {
                    "Bill Tenure": "Annual",
                    "Minimum Capital": "50L+",
                    "Asset Class": "Equity+ SME+ ETF",
                    "Volatility / Risk": "Mid/High",
                    "Market cap": "Small/mid/micro",
                    "Alternate assets": "When required",
                    "Holding": "2–5 years",
                    "Face to Face": "As needed",
                    "Target returns": "Index +6-9%",
                    "Possible Drawdown": ">12%",
                    "Portfolio": ">20 stocks",
                    "SME Stocks": "Opportunity based",
                    "Query resolution": "24 hours",
                    "Access": "2 people",
                    "Platform": "WhatsApp plus App",
                    "Model portfolio": "Focused Model Portfolio",
                    "Who should join": "Founders/ Entrepreneurs/ Wealthy",
                    "Fee/Year": "1.51 Lacs +GST"
                }
            },
            {
                "name": "Invest Biz",
                "cta_link": "https://premium.intrinsicvalueequity.in/checkout/28180dfc-84a9-488e-854e-9f7958a1b8d7",
                "values": {
                    "Bill Tenure": "Quarterly",
                    "Minimum Capital": "5 Cr+ (Business money only)",
                    "Asset Class": "ETFs only",
                    "Volatility / Risk": "Low",
                    "Market cap": "—",
                    "Alternate assets": "Always",
                    "Holding": "9–12 months",
                    "Face to Face": "Active all time",
                    "Target returns": "FD +6-9%",
                    "Possible Drawdown": "<8%",
                    "Portfolio": ">3 ETFs",
                    "SME Stocks": "No",
                    "Query resolution": "24 hours",
                    "Access": "Multi",
                    "Platform": "Personalized WA Group",
                    "Model portfolio": "Business worthy",
                    "Who should join": "Corporates with Cash Holdings",
                    "Fee/Year": "Custom"
                }
            }
        ]
    };
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
                    "cta_url": "pricing.html",
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
                                    "logo": "CS reports/JSW Logo.png",
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
                                    "logo": "CS reports/Hero Logo.png",
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
                                    "logo": "CS reports/Ircon Logo.png",
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
                                    "logo": "CS reports/Texmaco Logo.png",
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
                    "disclaimer": "SEBI Registration No: INH000009047. Investment in securities market are subject to market risks. Read all the related documents carefully before investing.",
                    "apps": {
                        "play_store": {
                            "url": "https://play.google.com/store/apps/details?id=com.exly.intrinsicvalueequity&pli=1",
                            "new_tab": true
                        },
                        "app_store": {
                            "url": "https://apps.apple.com/in/app/intrinsic-value-equity/id6755237343",
                            "new_tab": true
                        }
                    },
                    "contact": {
                        "phones": ["+91 73542 59486", "+91 98064 71956"],
                        "email": "info@intrinsicvalueequity.in",
                        "address": "Floor No : 3, Office No :106, Mont vert Spectra Opp. Hotel Wadeshwar, Baner, Pune, Maharashtra PIN Code: 411045",
                        "timings": ["Sat–Thursday: 8:00 AM–8:00 PM", "Friday: Closed", "Sat-Sun:- Open"]
                    }
            },
            "compliance": {
                "years": ["2022", "2023", "2024", "2025", "2026"],
                "audits": [
                    {
                        "fy": "FY 2022-23",
                        "status": "Conducted",
                        "remarks": "N/A"
                    },
                    {
                        "fy": "FY 2023-24",
                        "status": "Conducted",
                        "remarks": "N/A"
                    },
                    {
                        "fy": "FY 2024-25",
                        "status": "Conducted",
                        "remarks": "N/A"
                    }
                ],
                "grievances": {
                    "2026": {
                        "May": {
                            "direct": { "pending_last": 0, "received": 0, "resolved": 0, "pending_total": 0, "pending_gt_3m": 0, "avg_res_time": 0 },
                            "sebi": { "pending_last": 0, "received": 0, "resolved": 0, "pending_total": 0, "pending_gt_3m": 0, "avg_res_time": 0 },
                            "other": { "pending_last": 0, "received": 0, "resolved": 0, "pending_total": 0, "pending_gt_3m": 0, "avg_res_time": 0 }
                        }
                    }
                }
            }
    };

    // Simulated file upload configurations
    var simulatedUploadTargetId = '';
    var simulatedUploadFolder = '';
    
    // Load pending file uploads from localStorage
    var pendingUploads = [];
    try {
        pendingUploads = JSON.parse(localStorage.getItem('pending_file_uploads')) || [];
    } catch(e) {
        pendingUploads = [];
    }

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

            var reader = new FileReader();
            reader.onload = function(e) {
                var base64Data = e.target.result.split(',')[1];
                
                // Add to pending uploads, overwriting duplicates
                pendingUploads = pendingUploads.filter(function(up) { return up.path !== path; });
                pendingUploads.push({
                    path: path,
                    content: base64Data,
                    encoding: 'base64'
                });
                localStorage.setItem('pending_file_uploads', JSON.stringify(pendingUploads));

                // If this is local development, write to Python server if active
                var isLocal = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                if (isLocal) {
                    var formData = new FormData();
                    formData.append('file', file);
                    formData.append('folder', simulatedUploadFolder);
                    fetch('/api/upload-file', {
                        method: 'POST',
                        body: formData
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) { console.log("Local upload success:", data); })
                    .catch(function(err) { console.warn("Local upload skipped/failed:", err); });
                }

                // Highlight the push button to indicate unsaved edits
                var pushBtn = document.getElementById('gitPushBtn');
                if (pushBtn) {
                    pushBtn.style.boxShadow = '0 0 12px var(--accent)';
                    pushBtn.innerHTML = '<i class="fa-brands fa-github"></i> Publish Edits to GitHub';
                }

                // Populate target inputs
                if (simulatedUploadTargetId && simulatedUploadTargetId.indexOf('blog-block-temp-upload-id-') === 0) {
                    var blockIdx = parseInt(simulatedUploadTargetId.replace('blog-block-temp-upload-id-', ''));
                    if (currentEditingBlog && currentEditingBlog.blocks && currentEditingBlog.blocks[blockIdx]) {
                        currentEditingBlog.blocks[blockIdx].url = path;
                        renderBlogElements();
                        updateLivePreview();
                    }
                    showToast("File '" + file.name + "' selected for blog! Ready to publish to GitHub.");
                } else {
                    var targetInput = document.getElementById(simulatedUploadTargetId);
                    if (targetInput) {
                        targetInput.value = path;
                        targetInput.dispatchEvent(new Event('input'));
                        showToast("File '" + file.name + "' selected! Ready to publish to GitHub.");
                    }
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Load configurations safely
    function loadCmsData() {
        var pendingCms = localStorage.getItem('pending_homepage_config');
        if (pendingCms) {
            try {
                cmsState = JSON.parse(pendingCms);
                populateCmsForms();
            } catch (e) {
                console.error("Error parsing pending_homepage_config", e);
            }
        } else {
            fetch('homepage_config.json?t=' + Date.now())
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

        var pendingPricing = localStorage.getItem('pending_pricing_config');
        if (pendingPricing) {
            try {
                pricingCmsState = JSON.parse(pendingPricing);
                populatePricingForms();
            } catch (e) {
                console.error("Error parsing pending_pricing_config", e);
            }
        } else {
            fetch('pricing.json?t=' + Date.now())
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    pricingCmsState = data;
                    populatePricingForms();
                })
                .catch(function (err) {
                    console.warn("Could not fetch pricing.json directly. Loading fallback configuration:", err);
                    pricingCmsState = JSON.parse(JSON.stringify(DEFAULT_PRICING_FALLBACK_CONFIG));
                    populatePricingForms();
                });
        }

        var pendingLive = localStorage.getItem('pending_live_config');
        if (pendingLive) {
            try {
                liveCmsState = JSON.parse(pendingLive);
                populateLiveForms();
            } catch (e) {
                console.error("Error parsing pending_live_config", e);
            }
        } else if (typeof LIVE_CONFIG !== 'undefined') {
            liveCmsState = Object.assign({}, DEFAULT_LIVE_FALLBACK_CONFIG, LIVE_CONFIG);
            populateLiveForms();
        } else {
            fetch('invest_biz/live_config.js?t=' + Date.now())
                .then(function (res) { return res.text(); })
                .then(function (text) {
                    var match = text.match(/var\s+LIVE_CONFIG\s*=\s*([\s\S]+?);/);
                    if (match && match[1]) {
                        liveCmsState = JSON.parse(match[1]);
                    } else {
                        throw new Error("Could not parse live_config.js content");
                    }
                    populateLiveForms();
                })
                .catch(function (err) {
                    console.warn("Could not load invest_biz/live_config.js directly. Loading fallback configuration:", err);
                    liveCmsState = JSON.parse(JSON.stringify(DEFAULT_LIVE_FALLBACK_CONFIG));
                    populateLiveForms();
                });
        }
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
        
        if (cmsState.hero.cta_new_tab) {
            document.getElementById('cms-hero-cta-target-blank').checked = true;
        } else {
            document.getElementById('cms-hero-cta-target-same').checked = true;
        }
        
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
        document.getElementById('cms-footer-disclaimer-p1').value = cmsState.footer.disclaimer_p1 || '';
        document.getElementById('cms-footer-disclaimer-p2').value = cmsState.footer.disclaimer_p2 || '';
        document.getElementById('cms-footer-copyright-year').value = cmsState.footer.copyright_year || '';

        // Apps
        document.getElementById('cms-footer-play-store-url').value = cmsState.footer.apps?.play_store?.url || '';
        if (cmsState.footer.apps?.play_store?.new_tab !== false) {
            document.getElementById('cms-play-store-target-blank').checked = true;
        } else {
            document.getElementById('cms-play-store-target-same').checked = true;
        }
        document.getElementById('cms-footer-app-store-url').value = cmsState.footer.apps?.app_store?.url || '';
        if (cmsState.footer.apps?.app_store?.new_tab !== false) {
            document.getElementById('cms-app-store-target-blank').checked = true;
        } else {
            document.getElementById('cms-app-store-target-same').checked = true;
        }

        // Contact
        document.getElementById('cms-footer-contact-phones').value = (cmsState.footer.contact?.phones || []).join(', ');
        document.getElementById('cms-footer-contact-email').value = cmsState.footer.contact?.email || '';
        document.getElementById('cms-footer-contact-address').value = cmsState.footer.contact?.address || '';
        document.getElementById('cms-footer-contact-timings').value = (cmsState.footer.contact?.timings || []).join('\n');

        // Compliance Years
        var years = cmsState.compliance?.years || ["2022", "2023", "2024", "2025", "2026"];
        document.getElementById('cms-regulatory-years').value = years.join(', ');

        // Populate years select in Grievance Database editor
        var yearSelectCms = document.getElementById('cms-grievance-edit-year');
        if (yearSelectCms) {
            yearSelectCms.innerHTML = '';
            years.forEach(function (y) {
                var opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                yearSelectCms.appendChild(opt);
            });
            if (years.length > 0) {
                yearSelectCms.value = years[years.length - 1];
            }
        }

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
        renderComplianceAudits();
        renderGrievanceRecordEditor();
    }

    function populatePricingForms() {
        if (!pricingCmsState) return;
        document.getElementById('cms-pricing-title').value = pricingCmsState.pricing_title || '';
        document.getElementById('cms-pricing-subtitle').value = pricingCmsState.pricing_subtitle || '';
        document.getElementById('cms-comparison-title').value = pricingCmsState.comparison_title || '';
        document.getElementById('cms-comparison-subtitle').value = pricingCmsState.comparison_subtitle || '';
        
        document.getElementById('cms-pricing-parameters').value = (pricingCmsState.parameters || []).join('\n');
        
        renderPlanList();
        renderCardList();
    }

    function populateLiveForms() {
        if (!liveCmsState) return;
        document.getElementById('cmsLiveIndexRedirect').value = liveCmsState.indexRedirectUrl || '';
        document.getElementById('cmsLiveVslCheckout').value = liveCmsState.vslCheckoutUrl || '';
        document.getElementById('cmsLiveTyWhatsApp').value = liveCmsState.tyWhatsAppUrl || '';
    }

    function renderPlanList() {
        var container = document.getElementById('cms-plan-list');
        if (!container) return;
        container.innerHTML = '';
        
        (pricingCmsState.table_plans || []).forEach(function (plan, planIdx) {
            var planListLength = (pricingCmsState.table_plans || []).length;
            var upDisabled = planIdx === 0 ? 'disabled' : '';
            var downDisabled = planIdx === planListLength - 1 ? 'disabled' : '';

            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            div.style.marginBottom = '20px';
            
            // Build the dynamic parameters list HTML for this plan
            var paramsHtml = (pricingCmsState.parameters || []).map(function(param) {
                var val = (plan.values && plan.values[param]) || '';
                return `
                    <div class="iv-cms-group" style="margin-bottom: 8px; flex: 1 1 200px; min-width: 180px;">
                        <label class="iv-cms-label" style="font-size: 11px; margin-bottom: 2px;">${escapeHtml(param)}</label>
                        <input type="text" class="iv-cms-input" style="padding: 6px 10px; font-size: 12px;" value="${escapeHtml(val)}" oninput="updatePlanValue(${planIdx}, '${escapeHtml(param).replace(/'/g, "\\'")}', this.value)">
                    </div>
                `;
            }).join('');
            
            div.innerHTML = `
                <div class="iv-cms-item-controls">
                    <button type="button" class="iv-cms-btn-move" onclick="movePlan(${planIdx}, -1)" ${upDisabled}>▲</button>
                    <button type="button" class="iv-cms-btn-move" onclick="movePlan(${planIdx}, 1)" ${downDisabled}>▼</button>
                    <button type="button" class="iv-cms-btn-remove" onclick="removePlan(${planIdx})">&times;</button>
                </div>
                <div class="iv-cms-row">
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Plan / Column Name <span class="req">Required</span></label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(plan.name)}" oninput="updatePlanField(${planIdx}, 'name', this.value)">
                    </div>
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Checkout / CTA Link <span class="req">Required</span></label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(plan.cta_link)}" oninput="updatePlanField(${planIdx}, 'cta_link', this.value)">
                    </div>
                </div>
                
                <div style="margin: 12px 0 6px 0; font-size: 12px; font-weight: bold; color: var(--accent);">Column Row Values:</div>
                <div class="iv-cms-row" style="flex-wrap: wrap; gap: 8px; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    ${paramsHtml}
                </div>
                
                <div class="iv-cms-export-actions" style="margin-top: 14px; gap: 8px; justify-content: flex-start;">
                    <button type="button" class="iv-admin-btn" style="width: auto; padding: 6px 12px; font-size: 11px; border-style: solid; border-color: var(--accent);" onclick="buildCardFromPlan(${planIdx})">
                        <i class="fa-solid fa-sync"></i> Build / Sync Pricing Card
                    </button>
                    <button type="button" class="iv-admin-btn" style="width: auto; padding: 6px 12px; font-size: 11px; background: rgba(239, 83, 80, 0.15); border-color: rgba(239, 83, 80, 0.3); color: #ef5350;" onclick="deleteCardForPlan(${planIdx})">
                        <i class="fa-solid fa-trash-can"></i> Delete Corresponding Card
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    function renderCardList() {
        var container = document.getElementById('cms-card-list');
        if (!container) return;
        container.innerHTML = '';
        
        (pricingCmsState.cards || []).forEach(function (card, cardIdx) {
            var cardListLength = (pricingCmsState.cards || []).length;
            var upDisabled = cardIdx === 0 ? 'disabled' : '';
            var downDisabled = cardIdx === cardListLength - 1 ? 'disabled' : '';

            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            
            div.innerHTML = `
                <div class="iv-cms-item-controls">
                    <button type="button" class="iv-cms-btn-move" onclick="moveCard(${cardIdx}, -1)" ${upDisabled}>▲</button>
                    <button type="button" class="iv-cms-btn-move" onclick="moveCard(${cardIdx}, 1)" ${downDisabled}>▼</button>
                    <button type="button" class="iv-cms-btn-remove" onclick="removeCard(${cardIdx})">&times;</button>
                </div>
                <div class="iv-cms-row">
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Plan Card Name <span class="req">Required</span></label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(card.name)}" oninput="updateCardField(${cardIdx}, 'name', this.value)">
                    </div>
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Min Capital <span class="req">Required</span></label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(card.min_capital)}" oninput="updateCardField(${cardIdx}, 'min_capital', this.value)">
                    </div>
                </div>
                <div class="iv-cms-row" style="margin-bottom: 10px;">
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Price/Fee Display (HTML allowed) <span class="req">Required</span></label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(card.price_display)}" oninput="updateCardField(${cardIdx}, 'price_display', this.value)">
                    </div>
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Duration Text <span class="req">Required</span></label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(card.duration)}" oninput="updateCardField(${cardIdx}, 'duration', this.value)">
                    </div>
                </div>
                <div class="iv-cms-row" style="margin-bottom: 0;">
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Discount Start Value (Optional, e.g. 45000)</label>
                        <input type="number" class="iv-cms-input" value="${card.discount_start || ''}" oninput="updateCardField(${cardIdx}, 'discount_start', this.value ? parseInt(this.value, 10) : '')">
                    </div>
                    <div class="iv-cms-group">
                        <label class="iv-cms-label">Discount End Value (Optional, e.g. 39871)</label>
                        <input type="number" class="iv-cms-input" value="${card.discount_end || ''}" oninput="updateCardField(${cardIdx}, 'discount_end', this.value ? parseInt(this.value, 10) : '')">
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    function compilePricingCmsState() {
        pricingCmsState.pricing_title = document.getElementById('cms-pricing-title').value;
        pricingCmsState.pricing_subtitle = document.getElementById('cms-pricing-subtitle').value;
        pricingCmsState.comparison_title = document.getElementById('cms-comparison-title').value;
        pricingCmsState.comparison_subtitle = document.getElementById('cms-comparison-subtitle').value;
        
        var paramsText = document.getElementById('cms-pricing-parameters').value;
        pricingCmsState.parameters = paramsText.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
        
        var jsonText = JSON.stringify(pricingCmsState, null, 4);
        var jsonDisplay = document.getElementById('cmsPricingJsonDisplay');
        if (jsonDisplay) {
            jsonDisplay.textContent = jsonText;
        }
        return jsonText;
    }

    function copyPricingJsonToClipboard() {
        var jsonText = compilePricingCmsState();
        navigator.clipboard.writeText(jsonText)
            .then(function () {
                showToast("Copied Pricing JSON to Clipboard!");
            })
            .catch(function (err) {
                console.error("Could not copy pricing text: ", err);
                var textarea = document.createElement('textarea');
                textarea.value = jsonText;
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    showToast("Copied Pricing JSON to Clipboard!");
                } catch (e) {
                    alert("Failed to copy. Please select the text inside the block and copy manually.");
                }
                document.body.removeChild(textarea);
            });
    }

    function downloadPricingJsonFile() {
        var jsonText = compilePricingCmsState();
        var blob = new Blob([jsonText], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = "pricing.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function compileLiveCmsState() {
        liveCmsState.indexRedirectUrl = document.getElementById('cmsLiveIndexRedirect').value.trim();
        liveCmsState.vslCheckoutUrl = document.getElementById('cmsLiveVslCheckout').value.trim();
        liveCmsState.tyWhatsAppUrl = document.getElementById('cmsLiveTyWhatsApp').value.trim();

        var jsonText = JSON.stringify(liveCmsState, null, 4);
        var jsContent = "var LIVE_CONFIG = " + jsonText + ";\n";
        var jsonDisplay = document.getElementById('cmsLiveJsonDisplay');
        if (jsonDisplay) {
            jsonDisplay.textContent = jsContent;
        }
        return jsContent;
    }

    function copyLiveJsonToClipboard() {
        var jsContent = compileLiveCmsState();
        navigator.clipboard.writeText(jsContent)
            .then(function () {
                showToast("Copied Live JS Config to Clipboard!");
            })
            .catch(function (err) {
                console.error("Could not copy live text: ", err);
                var textarea = document.createElement('textarea');
                textarea.value = jsContent;
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    showToast("Copied Live JS Config to Clipboard!");
                } catch (e) {
                    alert("Failed to copy. Please select the text inside the block and copy manually.");
                }
                document.body.removeChild(textarea);
            });
    }

    function downloadLiveJsonFile() {
        var jsContent = compileLiveCmsState();
        var blob = new Blob([jsContent], { type: "application/javascript" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = "live_config.js";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    window.updatePlanField = function (planIdx, field, val) {
        pricingCmsState.table_plans[planIdx][field] = val;
    };
    
    window.updatePlanValue = function (planIdx, paramName, val) {
        pricingCmsState.table_plans[planIdx].values = pricingCmsState.table_plans[planIdx].values || {};
        pricingCmsState.table_plans[planIdx].values[paramName] = val;
    };
    
    window.updateCardField = function (cardIdx, field, val) {
        pricingCmsState.cards[cardIdx][field] = val;
    };
    
    window.removePlan = function (planIdx) {
        var planName = pricingCmsState.table_plans[planIdx].name;
        if (confirm("Are you sure you want to remove the plan '" + planName + "'?")) {
            var deleteCard = confirm("Do you also want to delete the corresponding 3D pricing card '" + planName + "'?");
            if (deleteCard) {
                pricingCmsState.cards = (pricingCmsState.cards || []).filter(function (c) { return c.name !== planName; });
            }
            pricingCmsState.table_plans.splice(planIdx, 1);
            renderPlanList();
            renderCardList();
        }
    };
    
    window.removeCard = function (cardIdx) {
        if (confirm("Are you sure you want to remove this pricing card?")) {
            pricingCmsState.cards.splice(cardIdx, 1);
            renderCardList();
        }
    };

    window.movePlan = function (planIdx, dir) {
        var arr = pricingCmsState.table_plans || [];
        var target = planIdx + dir;
        if (target >= 0 && target < arr.length) {
            var temp = arr[planIdx];
            arr[planIdx] = arr[target];
            arr[target] = temp;
            renderPlanList();
        }
    };

    window.moveCard = function (cardIdx, dir) {
        var arr = pricingCmsState.cards || [];
        var target = cardIdx + dir;
        if (target >= 0 && target < arr.length) {
            var temp = arr[cardIdx];
            arr[cardIdx] = arr[target];
            arr[target] = temp;
            renderCardList();
        }
    };

    window.buildCardFromPlan = function(planIdx) {
        var plan = pricingCmsState.table_plans[planIdx];
        if (!plan.name) {
            alert("Please enter a Plan name first.");
            return;
        }
        pricingCmsState.cards = pricingCmsState.cards || [];
        var existingCard = pricingCmsState.cards.find(function(c) { return c.name.toLowerCase() === plan.name.toLowerCase(); });
        
        var capVal = (plan.values && plan.values['Minimum Capital']) || '';
        var feeVal = (plan.values && plan.values['Fee/Year']) || '';
        var tenureVal = (plan.values && plan.values['Bill Tenure']) || '';
        
        var priceDisplay = feeVal;
        if (priceDisplay.indexOf('₹') === -1 && priceDisplay.toLowerCase() !== 'custom') {
            priceDisplay = '₹' + priceDisplay;
        }
        if (priceDisplay.toLowerCase() !== 'custom' && priceDisplay.indexOf('/ year') === -1) {
            priceDisplay = priceDisplay + ' / year';
        }
        
        var durationText = tenureVal;
        if (durationText.toLowerCase() === 'annual') {
            durationText = '1 Year Subscription';
        } else if (durationText.toLowerCase() === 'quarterly') {
            durationText = 'Quarterly Billing';
        }
        
        if (existingCard) {
            existingCard.min_capital = capVal;
            existingCard.price_display = priceDisplay;
            existingCard.duration = durationText;
            alert("Updated existing card for '" + plan.name + "'!");
        } else {
            pricingCmsState.cards.push({
                name: plan.name,
                min_capital: capVal,
                price_display: priceDisplay,
                duration: durationText
            });
            alert("Created new pricing card for '" + plan.name + "'!");
        }
        renderCardList();
    };

    window.deleteCardForPlan = function(planIdx) {
        var plan = pricingCmsState.table_plans[planIdx];
        if (!plan.name) return;
        var originalLen = (pricingCmsState.cards || []).length;
        pricingCmsState.cards = (pricingCmsState.cards || []).filter(function(c) { return c.name.toLowerCase() !== plan.name.toLowerCase(); });
        if (pricingCmsState.cards.length < originalLen) {
            alert("Deleted pricing card matching plan '" + plan.name + "'!");
        } else {
            alert("No card found matching plan '" + plan.name + "'.");
        }
        renderCardList();
    };


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
        cmsState.hero.cta_new_tab = document.getElementById('cms-hero-cta-target-blank').checked;
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
        cmsState.footer.disclaimer_p1 = document.getElementById('cms-footer-disclaimer-p1').value;
        cmsState.footer.disclaimer_p2 = document.getElementById('cms-footer-disclaimer-p2').value;
        cmsState.footer.copyright_year = document.getElementById('cms-footer-copyright-year').value;

        // Apps
        cmsState.footer.apps = cmsState.footer.apps || {};
        cmsState.footer.apps.play_store = {
            url: document.getElementById('cms-footer-play-store-url').value,
            new_tab: document.getElementById('cms-play-store-target-blank').checked
        };
        cmsState.footer.apps.app_store = {
            url: document.getElementById('cms-footer-app-store-url').value,
            new_tab: document.getElementById('cms-app-store-target-blank').checked
        };

        // Contact
        cmsState.footer.contact = cmsState.footer.contact || {};
        var phonesVal = document.getElementById('cms-footer-contact-phones').value;
        cmsState.footer.contact.phones = phonesVal.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
        cmsState.footer.contact.email = document.getElementById('cms-footer-contact-email').value.trim();
        cmsState.footer.contact.address = document.getElementById('cms-footer-contact-address').value;
        var timingsVal = document.getElementById('cms-footer-contact-timings').value;
        cmsState.footer.contact.timings = timingsVal.split('\n').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });

        // Compliance Years
        cmsState.compliance = cmsState.compliance || {};
        var yearsVal = document.getElementById('cms-regulatory-years').value;
        cmsState.compliance.years = yearsVal.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });

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
            var listLength = (cmsState.navigation || []).length;
            var upDisabled = index === 0 ? 'disabled' : '';
            var downDisabled = index === listLength - 1 ? 'disabled' : '';

            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            div.innerHTML = `
                <div class="iv-cms-item-controls">
                    <button type="button" class="iv-cms-btn-move" onclick="moveNavItem(${index}, -1)" ${upDisabled}>▲</button>
                    <button type="button" class="iv-cms-btn-move" onclick="moveNavItem(${index}, 1)" ${downDisabled}>▼</button>
                    <button type="button" class="iv-cms-btn-remove" onclick="removeNavItem(${index})">&times;</button>
                </div>
                <div class="iv-cms-row" style="margin-bottom: 0;">
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <label class="iv-cms-label">Link Text</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(link.text)}" oninput="updateNavItem(${index}, 'text', this.value)">
                    </div>
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <label class="iv-cms-label">Link URL</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(link.url)}" oninput="updateNavItem(${index}, 'url', this.value)">
                        <div class="iv-cms-radio-group">
                            <label class="iv-cms-radio-label"><input type="radio" name="nav-target-${index}" value="same" ${!link.new_tab ? 'checked' : ''} onchange="updateNavItem(${index}, 'new_tab', false)"> Same Tab</label>
                            <label class="iv-cms-radio-label"><input type="radio" name="nav-target-${index}" value="blank" ${link.new_tab ? 'checked' : ''} onchange="updateNavItem(${index}, 'new_tab', true)"> New Tab</label>
                        </div>
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
        cmsState.navigation.push({ text: "New Link", url: "#", new_tab: false });
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
            var listLength = (cmsState.philosophy.cards || []).length;
            var upDisabled = index === 0 ? 'disabled' : '';
            var downDisabled = index === listLength - 1 ? 'disabled' : '';

            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            div.innerHTML = `
                <div class="iv-cms-item-controls">
                    <button type="button" class="iv-cms-btn-move" onclick="movePhilosophyCard(${index}, -1)" ${upDisabled}>▲</button>
                    <button type="button" class="iv-cms-btn-move" onclick="movePhilosophyCard(${index}, 1)" ${downDisabled}>▼</button>
                    <button type="button" class="iv-cms-btn-remove" onclick="removePhilosophyCard(${index})">&times;</button>
                </div>
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
                        <div class="iv-cms-radio-group">
                            <label class="iv-cms-radio-label"><input type="radio" name="philosophy-target-${index}" value="same" ${!card.new_tab ? 'checked' : ''} onchange="updatePhilosophyCard(${index}, 'new_tab', false)"> Same Tab</label>
                            <label class="iv-cms-radio-label"><input type="radio" name="philosophy-target-${index}" value="blank" ${card.new_tab ? 'checked' : ''} onchange="updatePhilosophyCard(${index}, 'new_tab', true)"> New Tab</label>
                        </div>
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
            link: "#",
            new_tab: false
        });
        renderPhilosophyCards();
    });

    // 4. News items
    function renderNewsItems() {
        var container = document.getElementById('cms-news-list');
        container.innerHTML = '';
        (cmsState.news.items || []).forEach(function (item, index) {
            var listLength = (cmsState.news.items || []).length;
            var upDisabled = index === 0 ? 'disabled' : '';
            var downDisabled = index === listLength - 1 ? 'disabled' : '';

            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            var randId = 'news-logo-' + index;
            div.innerHTML = `
                <div class="iv-cms-item-controls">
                    <button type="button" class="iv-cms-btn-move" onclick="moveNewsItem(${index}, -1)" ${upDisabled}>▲</button>
                    <button type="button" class="iv-cms-btn-move" onclick="moveNewsItem(${index}, 1)" ${downDisabled}>▼</button>
                    <button type="button" class="iv-cms-btn-remove" onclick="removeNewsItem(${index})">&times;</button>
                </div>
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
                        <div class="iv-cms-radio-group">
                            <label class="iv-cms-radio-label"><input type="radio" name="news-target-${index}" value="same" ${item.new_tab === false ? 'checked' : ''} onchange="updateNewsItem(${index}, 'new_tab', false)"> Same Tab</label>
                            <label class="iv-cms-radio-label"><input type="radio" name="news-target-${index}" value="blank" ${item.new_tab !== false ? 'checked' : ''} onchange="updateNewsItem(${index}, 'new_tab', true)"> New Tab</label>
                        </div>
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
            logo: "",
            new_tab: true
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
            var compListLength = (cmsState.case_studies.companies || []).length;
            var compUpDisabled = cIdx === 0 ? 'disabled' : '';
            var compDownDisabled = cIdx === compListLength - 1 ? 'disabled' : '';

            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            div.style.border = '1px solid rgba(255, 140, 0, 0.15)';
            
            var reportsHtml = '';
            comp.reports = comp.reports || [];
            comp.reports.forEach(function (rep, rIdx) {
                var repRandId = 'rep-url-' + cIdx + '-' + rIdx;
                var repListLength = comp.reports.length;
                var repUpDisabled = rIdx === 0 ? 'disabled' : '';
                var repDownDisabled = rIdx === repListLength - 1 ? 'disabled' : '';

                reportsHtml += `
                    <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:12px; border-bottom:1px dashed rgba(255,255,255,0.05); padding-bottom:8px;">
                        <div style="display:flex; gap:10px; align-items:center;">
                            <input type="text" class="iv-cms-input" style="width:30%; font-size:12px; padding:8px 12px;" value="${escapeHtml(rep.name)}" placeholder="Report Name" oninput="updateCompanyReport(${cIdx}, ${rIdx}, 'name', this.value)">
                            <div class="iv-cms-file-picker" style="flex-grow:1;">
                                <input type="text" id="${repRandId}" class="iv-cms-input" style="font-size:12px; padding:8px 12px;" value="${escapeHtml(rep.url)}" placeholder="PDF Path" oninput="updateCompanyReport(${cIdx}, ${rIdx}, 'url', this.value)">
                                <button type="button" class="iv-cms-file-btn" style="padding:8px 12px; font-size:11px;" onclick="simulateFileUpload('${repRandId}', 'CS reports')">Upload PDF</button>
                            </div>
                            <button type="button" class="iv-cms-btn-move" style="height:32px; width:32px; flex-shrink: 0;" ${repUpDisabled} onclick="moveCompanyReport(${cIdx}, ${rIdx}, -1)">▲</button>
                            <button type="button" class="iv-cms-btn-move" style="height:32px; width:32px; flex-shrink: 0;" ${repDownDisabled} onclick="moveCompanyReport(${cIdx}, ${rIdx}, 1)">▼</button>
                            <button type="button" class="iv-cms-btn-remove" style="position:static; margin-left:5px; height:32px; width:32px; display:inline-flex; flex-shrink: 0;" onclick="removeCompanyReport(${cIdx}, ${rIdx})">&times;</button>
                        </div>
                        <div class="iv-cms-radio-group" style="margin-left: 31%; margin-top:2px;">
                            <label class="iv-cms-radio-label"><input type="radio" name="report-target-${cIdx}-${rIdx}" value="same" ${rep.new_tab === false ? 'checked' : ''} onchange="updateCompanyReport(${cIdx}, ${rIdx}, 'new_tab', false)"> Same Tab</label>
                            <label class="iv-cms-radio-label"><input type="radio" name="report-target-${cIdx}-${rIdx}" value="blank" ${rep.new_tab !== false ? 'checked' : ''} onchange="updateCompanyReport(${cIdx}, ${rIdx}, 'new_tab', true)"> New Tab</label>
                        </div>
                    </div>
                `;
            });

            div.innerHTML = `
                <div class="iv-cms-item-controls">
                    <button type="button" class="iv-cms-btn-move" onclick="moveCompany(${cIdx}, -1)" ${compUpDisabled}>▲</button>
                    <button type="button" class="iv-cms-btn-move" onclick="moveCompany(${cIdx}, 1)" ${compDownDisabled}>▼</button>
                    <button type="button" class="iv-cms-btn-remove" onclick="removeCompany(${cIdx})">&times;</button>
                </div>
                <div class="iv-cms-row">
                    <div class="iv-cms-group" style="flex: 0 0 15%;">
                        <label class="iv-cms-label">Number (e.g. 01)</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(comp.num)}" oninput="updateCompany(${cIdx}, 'num', this.value)">
                    </div>
                    <div class="iv-cms-group" style="flex: 1 1 35%;">
                        <label class="iv-cms-label">Company Name</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(comp.name)}" oninput="updateCompany(${cIdx}, 'name', this.value)">
                    </div>
                    <div class="iv-cms-group" style="flex: 1 1 45%;">
                        <label class="iv-cms-label">Company Logo URL / Path</label>
                        <div class="iv-cms-file-picker">
                            <input type="text" id="comp-logo-${cIdx}" class="iv-cms-input" value="${escapeHtml(comp.logo || '')}" oninput="updateCompany(${cIdx}, 'logo', this.value)">
                            <button type="button" class="iv-cms-file-btn" onclick="simulateFileUpload('comp-logo-${cIdx}', 'CS reports')">Select Logo</button>
                        </div>
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
            logo: "",
            reports: []
        });
        renderCaseStudies();
    });

    window.addCompanyReport = function (cIdx) {
        cmsState.case_studies.companies[cIdx].reports.push({
            name: "Report Name",
            url: "",
            new_tab: true
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
            var listLength = (cmsState.team.members || []).length;
            var upDisabled = index === 0 ? 'disabled' : '';
            var downDisabled = index === listLength - 1 ? 'disabled' : '';

            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            var randId = 'team-photo-' + index;
            div.innerHTML = `
                <div class="iv-cms-item-controls">
                    <button type="button" class="iv-cms-btn-move" onclick="moveTeamMember(${index}, -1)" ${upDisabled}>▲</button>
                    <button type="button" class="iv-cms-btn-move" onclick="moveTeamMember(${index}, 1)" ${downDisabled}>▼</button>
                    <button type="button" class="iv-cms-btn-remove" onclick="removeTeamMember(${index})">&times;</button>
                </div>
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
            var listLength = (cmsState.testimonials.items || []).length;
            var upDisabled = index === 0 ? 'disabled' : '';
            var downDisabled = index === listLength - 1 ? 'disabled' : '';

            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            var randId = 'testimonial-avatar-' + index;
            div.innerHTML = `
                <div class="iv-cms-item-controls">
                    <button type="button" class="iv-cms-btn-move" onclick="moveTestimonial(${index}, -1)" ${upDisabled}>▲</button>
                    <button type="button" class="iv-cms-btn-move" onclick="moveTestimonial(${index}, 1)" ${downDisabled}>▼</button>
                    <button type="button" class="iv-cms-btn-remove" onclick="removeTestimonial(${index})">&times;</button>
                </div>
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
            var listLength = (cmsState.faqs.items || []).length;
            var upDisabled = index === 0 ? 'disabled' : '';
            var downDisabled = index === listLength - 1 ? 'disabled' : '';

            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            div.innerHTML = `
                <div class="iv-cms-item-controls">
                    <button type="button" class="iv-cms-btn-move" onclick="moveFaq(${index}, -1)" ${upDisabled}>▲</button>
                    <button type="button" class="iv-cms-btn-move" onclick="moveFaq(${index}, 1)" ${downDisabled}>▼</button>
                    <button type="button" class="iv-cms-btn-remove" onclick="removeFaq(${index})">&times;</button>
                </div>
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
            var listLength = (cmsState.footer.quick_links || []).length;
            var upDisabled = index === 0 ? 'disabled' : '';
            var downDisabled = index === listLength - 1 ? 'disabled' : '';

            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            div.innerHTML = `
                <div class="iv-cms-item-controls">
                    <button type="button" class="iv-cms-btn-move" onclick="moveFooterQuickLink(${index}, -1)" ${upDisabled}>▲</button>
                    <button type="button" class="iv-cms-btn-move" onclick="moveFooterQuickLink(${index}, 1)" ${downDisabled}>▼</button>
                    <button type="button" class="iv-cms-btn-remove" onclick="removeFooterQuickLink(${index})">&times;</button>
                </div>
                <div class="iv-cms-row" style="margin-bottom: 0;">
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <label class="iv-cms-label">Link Text</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(link.text)}" oninput="updateFooterQuickLink(${index}, 'text', this.value)">
                    </div>
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <label class="iv-cms-label">Link URL</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(link.url)}" oninput="updateFooterQuickLink(${index}, 'url', this.value)">
                        <div class="iv-cms-radio-group">
                            <label class="iv-cms-radio-label"><input type="radio" name="footer-quick-target-${index}" value="same" ${!link.new_tab ? 'checked' : ''} onchange="updateFooterQuickLink(${index}, 'new_tab', false)"> Same Tab</label>
                            <label class="iv-cms-radio-label"><input type="radio" name="footer-quick-target-${index}" value="blank" ${link.new_tab ? 'checked' : ''} onchange="updateFooterQuickLink(${index}, 'new_tab', true)"> New Tab</label>
                        </div>
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
        cmsState.footer.quick_links.push({ text: "New Link", url: "#", new_tab: false });
        renderFooterQuickLinks();
    });

    // 10. Footer Important Compliance Links
    function renderFooterImportantLinks() {
        var container = document.getElementById('cms-footer-imp-list');
        container.innerHTML = '';
        (cmsState.footer.important_info || []).forEach(function (link, index) {
            var listLength = (cmsState.footer.important_info || []).length;
            var upDisabled = index === 0 ? 'disabled' : '';
            var downDisabled = index === listLength - 1 ? 'disabled' : '';

            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            div.innerHTML = `
                <div class="iv-cms-item-controls">
                    <button type="button" class="iv-cms-btn-move" onclick="moveFooterImportantLink(${index}, -1)" ${upDisabled}>▲</button>
                    <button type="button" class="iv-cms-btn-move" onclick="moveFooterImportantLink(${index}, 1)" ${downDisabled}>▼</button>
                    <button type="button" class="iv-cms-btn-remove" onclick="removeFooterImportantLink(${index})">&times;</button>
                </div>
                <div class="iv-cms-row" style="margin-bottom: 0;">
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <label class="iv-cms-label">Link Text</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(link.text)}" oninput="updateFooterImportantLink(${index}, 'text', this.value)">
                    </div>
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <label class="iv-cms-label">Link URL</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(link.url)}" oninput="updateFooterImportantLink(${index}, 'url', this.value)">
                        <div class="iv-cms-radio-group">
                            <label class="iv-cms-radio-label"><input type="radio" name="footer-imp-target-${index}" value="same" ${!link.new_tab ? 'checked' : ''} onchange="updateFooterImportantLink(${index}, 'new_tab', false)"> Same Tab</label>
                            <label class="iv-cms-radio-label"><input type="radio" name="footer-imp-target-${index}" value="blank" ${link.new_tab ? 'checked' : ''} onchange="updateFooterImportantLink(${index}, 'new_tab', true)"> New Tab</label>
                        </div>
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
        cmsState.footer.important_info.push({ text: "New Link", url: "#", new_tab: false });
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

    // 11. Compliance Audits
    function renderComplianceAudits() {
        var container = document.getElementById('cms-audit-list');
        if (!container) return;
        container.innerHTML = '';
        (cmsState.compliance?.audits || []).forEach(function (audit, index) {
            var listLength = (cmsState.compliance?.audits || []).length;
            var upDisabled = index === 0 ? 'disabled' : '';
            var downDisabled = index === listLength - 1 ? 'disabled' : '';

            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            div.innerHTML = `
                <div class="iv-cms-item-controls">
                    <button type="button" class="iv-cms-btn-move" onclick="moveComplianceAudit(${index}, -1)" ${upDisabled}>▲</button>
                    <button type="button" class="iv-cms-btn-move" onclick="moveComplianceAudit(${index}, 1)" ${downDisabled}>▼</button>
                    <button type="button" class="iv-cms-btn-remove" onclick="removeComplianceAudit(${index})">&times;</button>
                </div>
                <div class="iv-cms-row" style="margin-bottom: 0;">
                    <div class="iv-cms-group" style="margin-bottom: 0; width: 30%;">
                        <label class="iv-cms-label">Financial Year</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(audit.fy)}" placeholder="e.g. FY 2025-26" oninput="updateComplianceAudit(${index}, 'fy', this.value)">
                    </div>
                    <div class="iv-cms-group" style="margin-bottom: 0; width: 30%;">
                        <label class="iv-cms-label">Audit Status</label>
                        <select class="iv-cms-select" onchange="updateComplianceAudit(${index}, 'status', this.value)">
                            <option value="Conducted" ${audit.status === 'Conducted' ? 'selected' : ''}>Conducted</option>
                            <option value="Pending" ${audit.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        </select>
                    </div>
                    <div class="iv-cms-group" style="margin-bottom: 0; width: 40%;">
                        <label class="iv-cms-label">Remarks, If any</label>
                        <input type="text" class="iv-cms-input" value="${escapeHtml(audit.remarks || '')}" placeholder="e.g. N/A" oninput="updateComplianceAudit(${index}, 'remarks', this.value)">
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    window.removeComplianceAudit = function (idx) {
        cmsState.compliance.audits.splice(idx, 1);
        renderComplianceAudits();
    };
    window.updateComplianceAudit = function (idx, field, val) {
        cmsState.compliance.audits[idx][field] = val;
    };

    window.moveNavItem = function (idx, dir) {
        var arr = cmsState.navigation || [];
        var target = idx + dir;
        if (target >= 0 && target < arr.length) {
            var temp = arr[idx];
            arr[idx] = arr[target];
            arr[target] = temp;
            renderNavMenu();
        }
    };

    window.movePhilosophyCard = function (idx, dir) {
        var arr = cmsState.philosophy.cards || [];
        var target = idx + dir;
        if (target >= 0 && target < arr.length) {
            var temp = arr[idx];
            arr[idx] = arr[target];
            arr[target] = temp;
            renderPhilosophyCards();
        }
    };

    window.moveNewsItem = function (idx, dir) {
        var arr = cmsState.news.items || [];
        var target = idx + dir;
        if (target >= 0 && target < arr.length) {
            var temp = arr[idx];
            arr[idx] = arr[target];
            arr[target] = temp;
            renderNewsItems();
        }
    };

    window.moveCompany = function (idx, dir) {
        var arr = cmsState.case_studies.companies || [];
        var target = idx + dir;
        if (target >= 0 && target < arr.length) {
            var temp = arr[idx];
            arr[idx] = arr[target];
            arr[target] = temp;
            renderCaseStudies();
        }
    };

    window.moveCompanyReport = function (cIdx, rIdx, dir) {
        var arr = cmsState.case_studies.companies[cIdx].reports || [];
        var target = rIdx + dir;
        if (target >= 0 && target < arr.length) {
            var temp = arr[rIdx];
            arr[rIdx] = arr[target];
            arr[target] = temp;
            renderCaseStudies();
        }
    };

    window.moveTeamMember = function (idx, dir) {
        var arr = cmsState.team.members || [];
        var target = idx + dir;
        if (target >= 0 && target < arr.length) {
            var temp = arr[idx];
            arr[idx] = arr[target];
            arr[target] = temp;
            renderTeamMembers();
        }
    };

    window.moveTestimonial = function (idx, dir) {
        var arr = cmsState.testimonials.items || [];
        var target = idx + dir;
        if (target >= 0 && target < arr.length) {
            var temp = arr[idx];
            arr[idx] = arr[target];
            arr[target] = temp;
            renderTestimonials();
        }
    };

    window.moveFaq = function (idx, dir) {
        var arr = cmsState.faqs.items || [];
        var target = idx + dir;
        if (target >= 0 && target < arr.length) {
            var temp = arr[idx];
            arr[idx] = arr[target];
            arr[target] = temp;
            renderFaqs();
        }
    };

    window.moveFooterQuickLink = function (idx, dir) {
        var arr = cmsState.footer.quick_links || [];
        var target = idx + dir;
        if (target >= 0 && target < arr.length) {
            var temp = arr[idx];
            arr[idx] = arr[target];
            arr[target] = temp;
            renderFooterQuickLinks();
        }
    };

    window.moveFooterImportantLink = function (idx, dir) {
        var arr = cmsState.footer.important_info || [];
        var target = idx + dir;
        if (target >= 0 && target < arr.length) {
            var temp = arr[idx];
            arr[idx] = arr[target];
            arr[target] = temp;
            renderFooterImportantLinks();
        }
    };

    window.moveComplianceAudit = function (idx, dir) {
        var arr = cmsState.compliance.audits || [];
        var target = idx + dir;
        if (target >= 0 && target < arr.length) {
            var temp = arr[idx];
            arr[idx] = arr[target];
            arr[target] = temp;
            renderComplianceAudits();
        }
    };

    // 12. Grievance Status database editor
    window.renderGrievanceRecordEditor = function() {
        var container = document.getElementById('cms-grievance-record-editor');
        if (!container) return;
        
        var yearSelect = document.getElementById('cms-grievance-edit-year');
        var monthSelect = document.getElementById('cms-grievance-edit-month');
        if (!yearSelect || !monthSelect) return;
        
        var year = yearSelect.value;
        var month = monthSelect.value;
        
        if (!year || !month) return;
        
        cmsState.compliance = cmsState.compliance || {};
        cmsState.compliance.grievances = cmsState.compliance.grievances || {};
        cmsState.compliance.grievances[year] = cmsState.compliance.grievances[year] || {};
        cmsState.compliance.grievances[year][month] = cmsState.compliance.grievances[year][month] || {};
        
        var record = cmsState.compliance.grievances[year][month];
        
        var sources = ['direct', 'sebi', 'other'];
        var sourceNames = {
            'direct': 'Directly from Investors',
            'sebi': 'SEBI (scores)',
            'other': 'Other Sources (if any)'
        };
        
        var html = '';
        sources.forEach(function (src) {
            record[src] = record[src] || {
                pending_last: 0,
                received: 0,
                resolved: 0,
                pending_total: 0,
                pending_gt_3m: 0,
                avg_res_time: 0
            };
            
            var data = record[src];
            
            html += `
                <div class="cms-grievance-source-card" style="border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; margin-bottom: 12px; background: rgba(255,255,255,0.02);">
                    <strong style="color: var(--accent); font-size:13px; display:block; margin-bottom:10px;">${sourceNames[src]}</strong>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 8px;">
                        <div>
                           <label style="font-size:11px; color: var(--text-muted);">Pending Last Month</label>
                           <input type="number" class="iv-cms-input" style="padding:6px 10px; font-size:12px;" value="${data.pending_last}" oninput="updateGrievanceField('${year}', '${month}', '${src}', 'pending_last', this.value)">
                        </div>
                        <div>
                           <label style="font-size:11px; color: var(--text-muted);">Received</label>
                           <input type="number" class="iv-cms-input" style="padding:6px 10px; font-size:12px;" value="${data.received}" oninput="updateGrievanceField('${year}', '${month}', '${src}', 'received', this.value)">
                        </div>
                        <div>
                           <label style="font-size:11px; color: var(--text-muted);">Resolved</label>
                           <input type="number" class="iv-cms-input" style="padding:6px 10px; font-size:12px;" value="${data.resolved}" oninput="updateGrievanceField('${year}', '${month}', '${src}', 'resolved', this.value)">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        <div>
                           <label style="font-size:11px; color: var(--text-muted);">Total Pending</label>
                           <input type="number" class="iv-cms-input" style="padding:6px 10px; font-size:12px;" value="${data.pending_total}" oninput="updateGrievanceField('${year}', '${month}', '${src}', 'pending_total', this.value)">
                        </div>
                        <div>
                           <label style="font-size:11px; color: var(--text-muted);">Pending > 3 Months</label>
                           <input type="number" class="iv-cms-input" style="padding:6px 10px; font-size:12px;" value="${data.pending_gt_3m}" oninput="updateGrievanceField('${year}', '${month}', '${src}', 'pending_gt_3m', this.value)">
                        </div>
                        <div>
                           <label style="font-size:11px; color: var(--text-muted);">Avg Res Time (Days)</label>
                           <input type="number" class="iv-cms-input" style="padding:6px 10px; font-size:12px;" value="${data.avg_res_time}" oninput="updateGrievanceField('${year}', '${month}', '${src}', 'avg_res_time', this.value)">
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    };
    
    window.updateGrievanceField = function (year, month, source, field, value) {
        cmsState.compliance = cmsState.compliance || {};
        cmsState.compliance.grievances = cmsState.compliance.grievances || {};
        cmsState.compliance.grievances[year] = cmsState.compliance.grievances[year] || {};
        cmsState.compliance.grievances[year][month] = cmsState.compliance.grievances[year][month] || {};
        cmsState.compliance.grievances[year][month][source] = cmsState.compliance.grievances[year][month][source] || {};
        cmsState.compliance.grievances[year][month][source][field] = parseFloat(value) || 0;
    };

    function initTabs() {
        // Scoped for Homepage CMS
        var hpWorkspace = document.getElementById('homepageCmsWorkspace');
        if (hpWorkspace) {
            var hpLinks = hpWorkspace.querySelectorAll('.iv-cms-tab-link');
            hpLinks.forEach(function (link) {
                link.addEventListener('click', function () {
                    var tabId = link.getAttribute('data-tab');
                    hpLinks.forEach(function (l) { l.classList.remove('active'); });
                    link.classList.add('active');

                    var hpContents = hpWorkspace.querySelectorAll('.iv-cms-tab-content');
                    hpContents.forEach(function (c) { c.classList.remove('active'); });

                    var targetContent = document.getElementById(tabId);
                    if (targetContent) {
                        targetContent.classList.add('active');
                    }

                    if (tabId === 'tab-export') {
                        compileCmsState();
                        compilePricingCmsState();
                        compileLiveCmsState();
                    }
                });
            });
        }

        // Scoped for Blogs CMS
        var blogsWorkspace = document.getElementById('blogsCmsWorkspace');
        if (blogsWorkspace) {
            var blogsLinks = blogsWorkspace.querySelectorAll('.iv-cms-tab-link');
            blogsLinks.forEach(function (link) {
                link.addEventListener('click', function () {
                    var tabId = link.getAttribute('data-tab');
                    blogsLinks.forEach(function (l) { l.classList.remove('active'); });
                    link.classList.add('active');

                    var blogsContents = blogsWorkspace.querySelectorAll('.iv-cms-tab-content');
                    blogsContents.forEach(function (c) { c.classList.remove('active'); });

                    var targetContent = document.getElementById(tabId);
                    if (targetContent) {
                        targetContent.classList.add('active');
                    }

                    var iframe = document.getElementById('blogsPreviewIframe');
                    var sidebar = document.getElementById('blogsEditorSidebar');
                    var postSaveBtn = document.getElementById('blogPostSaveBtn');
                    var postCancelBtn = document.getElementById('blogPostCancelBtn');
                    var standardSaveBtn = document.getElementById('blogsSaveBtn');
                    var standardCloseBtn = document.getElementById('closeBlogsCmsBtn');

                    if (tabId === 'tab-blogs-edit') {
                        if (sidebar) sidebar.style.display = 'none';
                        if (postSaveBtn) postSaveBtn.style.display = 'inline-block';
                        if (postCancelBtn) postCancelBtn.style.display = 'inline-block';
                        if (standardSaveBtn) standardSaveBtn.style.display = 'none';
                        if (standardCloseBtn) standardCloseBtn.style.display = 'none';

                        if (!currentEditingBlog) {
                            var newId = blogsState.length > 0 ? Math.max.apply(Math, blogsState.map(function(b) { return b.id || 0; })) + 1 : 1001;
                            currentEditingBlog = {
                                id: newId,
                                slug: "",
                                title: "",
                                date: formatDate(new Date()),
                                rawDate: new Date().toISOString().substring(0, 19),
                                category: "Uncategorized",
                                readingTime: "3 min read",
                                image: "",
                                gradient: "linear-gradient(135deg, #FF8C00, #121212)",
                                excerpt: "",
                                blocks: [],
                                content: ""
                            };
                            currentEditingBlogIndex = -1;
                        }
                        renderBlogEditor();
                        updateLivePreview();
                        if (iframe) {
                            iframe.src = 'blog-detail.html?preview=true';
                        }
                    } else {
                        if (sidebar) sidebar.style.display = 'flex';
                        if (postSaveBtn) postSaveBtn.style.display = 'none';
                        if (postCancelBtn) postCancelBtn.style.display = 'none';
                        if (standardSaveBtn) standardSaveBtn.style.display = 'inline-block';
                        if (standardCloseBtn) standardCloseBtn.style.display = 'inline-block';

                        if (iframe && iframe.src.indexOf('blogs.html') === -1) {
                            iframe.src = 'blogs.html?preview=true';
                        }
                    }

                    if (tabId === 'tab-blogs-export') {
                        compileBlogsCmsState();
                    }
                });
            });
        }
    }

    function setNestedKey(obj, path, value) {
        var parts = path.split('.');
        var current = obj;
        for (var i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }

    function getNestedKey(obj, path) {
        if (!obj) return undefined;
        var parts = path.split('.');
        var current = obj;
        for (var i = 0; i < parts.length; i++) {
            if (current === null || current === undefined) return undefined;
            current = current[parts[i]];
        }
        return current;
    }

    function syncAllToIframe() {
        var iframe = document.getElementById('previewIframe');
        if (!iframe || !iframe.contentWindow) return;

        // Compile states
        compileCmsState();
        compilePricingCmsState();
        compileLiveCmsState();

        var editModeToggle = document.getElementById('editModeToggle');
        var enabled = editModeToggle ? editModeToggle.checked : true;

        iframe.contentWindow.postMessage({
            type: 'init_cms_state',
            homepageConfig: cmsState,
            pricingConfig: pricingCmsState,
            enabled: enabled
        }, '*');
    }

    function saveConfigToServer(filePath, configState) {
        // Save to localStorage for browser persistence (supports offline / static hosting edit sessions)
        if (filePath === 'homepage_config.json') {
            localStorage.setItem('pending_homepage_config', JSON.stringify(configState));
        } else if (filePath === 'pricing.json') {
            localStorage.setItem('pending_pricing_config', JSON.stringify(configState));
        } else if (filePath === 'blogs.json') {
            localStorage.setItem('pending_blogs_config', JSON.stringify(configState));
        } else if (filePath === 'live_config.js') {
            localStorage.setItem('pending_live_config', JSON.stringify(configState));
        }

        // Highlight the push button to indicate unsaved pending edits
        var pushBtn = document.getElementById('gitPushBtn');
        if (pushBtn) {
            pushBtn.style.boxShadow = '0 0 12px var(--accent)';
            pushBtn.innerHTML = '<i class="fa-brands fa-github"></i> Publish Edits to GitHub';
        }

        if (window.location.protocol.indexOf('http') !== -1 && window.location.hostname === 'localhost') {
            fetch('/api/save-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    config: configState,
                    filePath: filePath
                })
            })
            .then(function (res) { return res.json(); })
            .then(function (result) {
                if (result && result.success) {
                    console.log("[CMS Admin] Saved to server successfully: " + filePath);
                } else {
                    console.warn("[CMS Admin] Failed to save config to server: " + (result ? result.message : "unknown"));
                }
            })
            .catch(function (err) {
                console.error("[CMS Admin] Error calling save-config API", err);
            });
        }
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
                workspace.classList.remove('mode-pricing');
                workspace.classList.add('mode-homepage');
                document.getElementById('cmsWorkspaceTitle').innerText = "Homepage CMS Workspace";
                
                var iframe = document.getElementById('previewIframe');
                if (iframe) {
                    iframe.src = "index.html";
                }
                
                workspace.style.display = 'block';
                loadCmsData();
                var firstTabLink = document.querySelector('.iv-cms-tab-link[data-tab="tab-hero-nav"]');
                if (firstTabLink) firstTabLink.click();
            });
        }

        var openPricingBtn = document.getElementById('openPricingCmsBtn');
        if (openPricingBtn && workspace) {
            openPricingBtn.addEventListener('click', function () {
                workspace.classList.remove('mode-homepage');
                workspace.classList.add('mode-pricing');
                document.getElementById('cmsWorkspaceTitle').innerText = "Pricing & Plans CMS Workspace";
                
                var iframe = document.getElementById('previewIframe');
                if (iframe) {
                    iframe.src = "pricing.html";
                }
                
                workspace.style.display = 'block';
                loadCmsData();
                var pricingTabLink = document.querySelector('.iv-cms-tab-link[data-tab="tab-pricing"]');
                if (pricingTabLink) pricingTabLink.click();
            });
        }

        if (closeBtn && workspace) {
            closeBtn.addEventListener('click', function () {
                compileCmsState();
                compilePricingCmsState();
                compileLiveCmsState();
                saveConfigToServer('homepage_config.json', cmsState);
                saveConfigToServer('pricing.json', pricingCmsState);
                saveConfigToServer('live_config.js', liveCmsState);
                workspace.style.display = 'none';
                showToast("Unsaved edits stored in browser! Push to GitHub to go live.");
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                compileCmsState();
                compilePricingCmsState();
                compileLiveCmsState();
                saveConfigToServer('homepage_config.json', cmsState);
                saveConfigToServer('pricing.json', pricingCmsState);
                saveConfigToServer('live_config.js', liveCmsState);
                var exportTabLink = document.querySelector('.iv-cms-tab-link[data-tab="tab-export"]');
                if (exportTabLink) exportTabLink.click();
                showToast("CMS configs compiled and saved locally in browser!");
            });
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', copyJsonToClipboard);
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadJsonFile);
        }

        // Pricing Config clipboard copy & download buttons
        var copyPricingBtn = document.getElementById('cmsCopyPricingJsonBtn');
        if (copyPricingBtn) {
            copyPricingBtn.addEventListener('click', copyPricingJsonToClipboard);
        }

        var downloadPricingBtn = document.getElementById('cmsDownloadPricingJsonBtn');
        if (downloadPricingBtn) {
            downloadPricingBtn.addEventListener('click', downloadPricingJsonFile);
        }

        // Live Config clipboard copy & download buttons
        var copyLiveBtn = document.getElementById('cmsCopyLiveJsonBtn');
        if (copyLiveBtn) {
            copyLiveBtn.addEventListener('click', copyLiveJsonToClipboard);
        }

        var downloadLiveBtn = document.getElementById('cmsDownloadLiveJsonBtn');
        if (downloadLiveBtn) {
            downloadLiveBtn.addEventListener('click', downloadLiveJsonFile);
        }

        // Add plan column
        var addPlanBtn = document.getElementById('cms-plan-add-btn');
        if (addPlanBtn) {
            addPlanBtn.addEventListener('click', function () {
                pricingCmsState.table_plans = pricingCmsState.table_plans || [];
                // Gather default values map based on current parameters list
                var defaultValues = {};
                (pricingCmsState.parameters || []).forEach(function (param) {
                    defaultValues[param] = "";
                });
                
                pricingCmsState.table_plans.push({
                    name: "New Plan Name",
                    cta_link: "https://premium.intrinsicvalueequity.in/checkout/...",
                    values: defaultValues
                });
                renderPlanList();
            });
        }

        // Add plan card listing
        var addCardBtn = document.getElementById('cms-card-add-btn');
        if (addCardBtn) {
            addCardBtn.addEventListener('click', function () {
                pricingCmsState.cards = pricingCmsState.cards || [];
                pricingCmsState.cards.push({
                    name: "New Plan",
                    min_capital: "10 - 15 Lakhs",
                    price_display: "₹39,871 + GST / year",
                    duration: "1 Year Subscription"
                });
                renderCardList();
            });
        }

        // Bind pricing parameters text input change
        var pricingParamsInput = document.getElementById('cms-pricing-parameters');
        if (pricingParamsInput) {
            pricingParamsInput.addEventListener('input', function () {
                pricingCmsState.parameters = this.value.split('\n').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
                renderPlanList();
            });
        }

        document.getElementById('cms-hero-media-type').addEventListener('change', toggleMediaUrlField);

        // Regulatory compliance events binding
        var regYearsInput = document.getElementById('cms-regulatory-years');
        if (regYearsInput) {
            regYearsInput.addEventListener('input', function () {
                var val = this.value;
                cmsState.compliance = cmsState.compliance || {};
                cmsState.compliance.years = val.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
                
                var yearSelectCms = document.getElementById('cms-grievance-edit-year');
                if (yearSelectCms) {
                    var prevVal = yearSelectCms.value;
                    yearSelectCms.innerHTML = '';
                    cmsState.compliance.years.forEach(function (y) {
                        var opt = document.createElement('option');
                        opt.value = y;
                        opt.textContent = y;
                        yearSelectCms.appendChild(opt);
                    });
                    if (cmsState.compliance.years.indexOf(prevVal) !== -1) {
                        yearSelectCms.value = prevVal;
                    } else if (cmsState.compliance.years.length > 0) {
                        yearSelectCms.value = cmsState.compliance.years[cmsState.compliance.years.length - 1];
                    }
                }
                renderGrievanceRecordEditor();
            });
        }

        var auditAddBtn = document.getElementById('cms-audit-add-btn');
        if (auditAddBtn) {
            auditAddBtn.addEventListener('click', function () {
                cmsState.compliance = cmsState.compliance || {};
                cmsState.compliance.audits = cmsState.compliance.audits || [];
                cmsState.compliance.audits.push({
                    fy: "FY 2025-26",
                    status: "Conducted",
                    remarks: "N/A"
                });
                renderComplianceAudits();
            });
        }

        // Responsive Device Preview toggler
        var deviceBtns = document.querySelectorAll('.btn-device-toggle');
        var previewPane = document.querySelector('.iv-cms-preview-pane');
        if (deviceBtns && previewPane) {
            deviceBtns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    deviceBtns.forEach(function(b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    
                    var device = btn.getAttribute('data-device');
                    if (device === 'phone') {
                        previewPane.classList.remove('device-laptop');
                        previewPane.classList.add('device-phone');
                    } else {
                        previewPane.classList.remove('device-phone');
                        previewPane.classList.add('device-laptop');
                    }
                });
            });
        }

        // Toggle Sidebar Layout (Left Pane)
        var toggleLayoutBtn = document.getElementById('toggleLayoutBtn');
        var editorPane = document.querySelector('.iv-cms-editor-pane');
        if (toggleLayoutBtn && editorPane) {
            toggleLayoutBtn.addEventListener('click', function() {
                if (editorPane.style.display === 'none' || editorPane.style.display === '') {
                    editorPane.style.display = 'flex';
                } else {
                    editorPane.style.display = 'none';
                }
            });
        }

        // Highlight Elements Checkbox
        var editModeToggle = document.getElementById('editModeToggle');
        if (editModeToggle) {
            editModeToggle.addEventListener('change', function() {
                var iframe = document.getElementById('previewIframe');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: 'toggle_edit_mode',
                        enabled: editModeToggle.checked
                    }, '*');
                }
            });
        }

        // Auto sync state to iframe when parent form inputs change
        if (workspace) {
            workspace.addEventListener('input', function(e) {
                if (e.target.closest('input') || e.target.closest('textarea') || e.target.closest('select')) {
                    syncAllToIframe();
                }
            });
            workspace.addEventListener('change', function(e) {
                if (e.target.closest('input') || e.target.closest('textarea') || e.target.closest('select')) {
                    syncAllToIframe();
                }
                if (e.target.closest('button') || e.target.closest('a')) {
                    setTimeout(syncAllToIframe, 50);
                }
            });
        }

        // Parent Message Event Listener
        window.addEventListener('message', function(event) {
            var msg = event.data;
            if (!msg) return;

            if (msg.type === 'iframe_ready') {
                currentPreviewPage = msg.page || 'index.html';
                console.log("[CMS Admin] Preview Iframe ready (" + currentPreviewPage + "), syncing state...");
                syncAllToIframe();
            } else if (msg.type === 'update_cms_state_from_iframe') {
                var targetConfig = msg.isPricing ? pricingCmsState : cmsState;
                setNestedKey(targetConfig, msg.key, msg.value);
                if (msg.isPricing) {
                    populatePricingForms();
                } else {
                    populateCmsForms();
                }
            }
        });

        // Load settings from localStorage
        var patInput = document.getElementById('gitPatInput');
        var repoInput = document.getElementById('gitRepoInput');
        var gitPushBtn = document.getElementById('gitPushBtn');
        var gitCommitInput = document.getElementById('gitCommitMessage');
        var gitStatusMsg = document.getElementById('gitStatusMessage');
        
        if (patInput) {
            patInput.value = localStorage.getItem('git_pat') || '';
            patInput.addEventListener('input', function() {
                localStorage.setItem('git_pat', patInput.value.trim());
            });
        }
        
        if (repoInput) {
            repoInput.value = localStorage.getItem('git_repo') || '';
            repoInput.addEventListener('input', function() {
                localStorage.setItem('git_repo', repoInput.value.trim());
            });
        }

        // Highlight push button if there are already pending unsaved edits in localStorage on load
        if (localStorage.getItem('pending_homepage_config') || localStorage.getItem('pending_pricing_config') || localStorage.getItem('pending_blogs_config') || localStorage.getItem('pending_live_config') || localStorage.getItem('pending_vsl_config') || localStorage.getItem('pending_workshop_config')) {
            if (gitPushBtn) {
                gitPushBtn.style.boxShadow = '0 0 12px var(--accent)';
                gitPushBtn.innerHTML = '<i class="fa-brands fa-github"></i> Publish Edits to GitHub';
            }
        }

        var clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', function() {
                if (confirm("Are you sure you want to discard all unsaved edits stored in this browser's cache and reload the latest configuration files from the server? This cannot be undone.")) {
                    localStorage.removeItem('pending_homepage_config');
                    localStorage.removeItem('pending_pricing_config');
                    localStorage.removeItem('pending_blogs_config');
                    localStorage.removeItem('pending_live_config');
                    localStorage.removeItem('pending_vsl_config');
                    localStorage.removeItem('pending_workshop_config');
                    window.location.reload();
                }
            });
        }

        var gitRollbackBtn = document.getElementById('gitRollbackBtn');
        if (gitRollbackBtn) {
            gitRollbackBtn.addEventListener('click', function() {
                if (confirm("Are you sure you want to rollback the latest commit? This will revert the website to how it was before the last commit. This action cannot be undone.")) {
                    try {
                        var pat = patInput ? patInput.value.trim() : '';
                        var repo = repoInput ? repoInput.value.trim() : '';
                        repo = repo.replace(/^https?:\/\/github\.com\//i, '');
                        repo = repo.replace(/\.git$/i, '');
                        var branch = 'main';

                        var isLocalhost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

                        if (pat && repo && !isLocalhost) {
                            gitRollbackBtn.disabled = true;
                            gitRollbackBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rolling back...';
                            if (gitStatusMsg) {
                                gitStatusMsg.style.display = 'block';
                                gitStatusMsg.style.color = '#FF8C00';
                                gitStatusMsg.innerText = 'Connecting to GitHub...';
                            }

                            var headers = {
                                'Authorization': 'token ' + pat,
                                'Accept': 'application/vnd.github.v3+json',
                                'Content-Type': 'application/json'
                            };

                            // 1. Get branch head reference
                            fetch('https://api.github.com/repos/' + repo + '/git/ref/heads/' + branch, { headers: headers })
                                .then(function(res) {
                                    if (res.status === 404) {
                                        throw new Error('Branch main not found. Check repository path or token.');
                                    }
                                    if (!res.ok) {
                                        throw new Error('Failed to fetch branch reference (HTTP ' + res.status + ')');
                                    }
                                    return res.json();
                                })
                                .then(function(data) {
                                    var lastCommitSha = data.object.sha;
                                    if (gitStatusMsg) gitStatusMsg.innerText = 'Retrieving details for the latest commit...';
                                    
                                    // 2. Fetch the commit details to find parent commit(s)
                                    return fetch('https://api.github.com/repos/' + repo + '/git/commits/' + lastCommitSha, { headers: headers });
                                })
                                .then(function(res) {
                                    if (!res.ok) throw new Error('Failed to fetch commit details (HTTP ' + res.status + ')');
                                    return res.json();
                                })
                                .then(function(commitData) {
                                    if (!commitData.parents || commitData.parents.length === 0) {
                                        throw new Error('No previous commit found to rollback to (this appears to be the initial commit).');
                                    }
                                    var parentSha = commitData.parents[0].sha;
                                    if (gitStatusMsg) gitStatusMsg.innerText = 'Resetting branch main to previous commit (' + parentSha.substring(0, 7) + ')...';

                                    // 3. Update branch ref (heads/main) to point to the parent SHA, using force: true
                                    return fetch('https://api.github.com/repos/' + repo + '/git/refs/heads/' + branch, {
                                        method: 'PATCH',
                                        headers: headers,
                                        body: JSON.stringify({
                                            sha: parentSha,
                                            force: true
                                        })
                                    });
                                })
                                .then(function(res) {
                                    if (!res.ok) {
                                        return res.json().then(function(d) {
                                            throw new Error('Failed to update branch reference: ' + (d.message || res.status));
                                        });
                                    }
                                    return res.json();
                                })
                                .then(function(data) {
                                    gitRollbackBtn.disabled = false;
                                    gitRollbackBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Revert Latest Commit';
                                    if (gitStatusMsg) {
                                        gitStatusMsg.style.color = '#34A853';
                                        gitStatusMsg.innerText = 'Successfully rolled back the latest commit directly on GitHub!\n\nThis will trigger the GitHub Action build workflow to redeploy the previous state live.';
                                    }
                                    setTimeout(function() {
                                        if (confirm("Rollback complete. Would you like to clear browser cache and reload the page?")) {
                                            localStorage.removeItem('pending_homepage_config');
                                            localStorage.removeItem('pending_pricing_config');
                                            localStorage.removeItem('pending_blogs_config');
                                            localStorage.removeItem('pending_live_config');
                                            localStorage.removeItem('pending_vsl_config');
                                            localStorage.removeItem('pending_workshop_config');
                                            window.location.reload();
                                        }
                                    }, 1000);
                                })
                                .catch(function(err) {
                                    gitRollbackBtn.disabled = false;
                                    gitRollbackBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Revert Latest Commit';
                                    if (gitStatusMsg) {
                                        gitStatusMsg.style.color = '#EA4335';
                                        gitStatusMsg.innerText = 'Rollback Failed:\n' + err.message;
                                    }
                                });
                        } else {
                            // Local fallback using local server.py endpoint
                            if (!isLocalhost) {
                                alert('To publish or rollback changes online, you must fill in your GitHub Personal Access Token and Repository info in the settings fields.');
                                if (gitStatusMsg) {
                                    gitStatusMsg.style.color = '#EA4335';
                                    gitStatusMsg.innerText = 'Error: Missing GitHub credentials configuration.';
                                }
                                return;
                            }

                            gitRollbackBtn.disabled = true;
                            gitRollbackBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rolling back...';
                            if (gitStatusMsg) {
                                gitStatusMsg.style.display = 'block';
                                gitStatusMsg.style.color = '#FF8C00';
                                gitStatusMsg.innerText = 'Connecting to server and rolling back latest commit...';
                            }
                            
                            fetch('/api/git-rollback', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            })
                            .then(function (res) {
                                return res.json().then(function (data) {
                                    if (!res.ok) {
                                        throw new Error(data.message || 'HTTP error ' + res.status);
                                    }
                                    return data;
                                });
                            })
                            .then(function (data) {
                                gitRollbackBtn.disabled = false;
                                gitRollbackBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Revert Latest Commit';
                                if (gitStatusMsg) {
                                    gitStatusMsg.style.color = '#34A853';
                                    gitStatusMsg.innerText = data.message;
                                }
                                setTimeout(function() {
                                    window.location.reload();
                                }, 1500);
                            })
                            .catch(function (err) {
                                gitRollbackBtn.disabled = false;
                                gitRollbackBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Revert Latest Commit';
                                if (gitStatusMsg) {
                                    gitStatusMsg.style.color = '#EA4335';
                                    gitStatusMsg.innerText = 'Rollback Failed:\n' + err.message;
                                }
                            });
                        }
                    } catch (e) {
                        gitRollbackBtn.disabled = false;
                        gitRollbackBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Revert Latest Commit';
                        if (gitStatusMsg) {
                            gitStatusMsg.style.display = 'block';
                            gitStatusMsg.style.color = '#EA4335';
                            gitStatusMsg.innerText = 'Execution Error: ' + e.message + '\n' + e.stack;
                        }
                    }
                }
            });
        }

        if (gitPushBtn) {
            gitPushBtn.addEventListener('click', function () {
                try {
                    var commitMessage = gitCommitInput ? gitCommitInput.value.trim() : '';
                    var pat = patInput ? patInput.value.trim() : '';
                    var repo = repoInput ? repoInput.value.trim() : '';
                    // Clean up repository format (strip full url, hostname, and .git suffix)
                    repo = repo.replace(/^https?:\/\/github\.com\//i, '');
                    repo = repo.replace(/\.git$/i, '');
                    var branch = 'main';

                    var isLocalhost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

                    if (pat && repo && !isLocalhost) {
                        // Direct browser-to-GitHub commit logic (online / serverless static hosts)
                        gitPushBtn.disabled = true;
                        gitPushBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Committing...';
                        if (gitStatusMsg) {
                            gitStatusMsg.style.display = 'block';
                            gitStatusMsg.style.color = '#FF8C00';
                            gitStatusMsg.innerText = 'Initializing API connection...';
                        }
                        
                        // Collect pending files to commit
                        var filesToCommit = [];
                        
                        var pendingCms = localStorage.getItem('pending_homepage_config');
                        if (pendingCms) {
                            filesToCommit.push({ path: 'homepage_config.json', content: pendingCms, encoding: 'utf-8' });
                        }
                        var pendingPricing = localStorage.getItem('pending_pricing_config');
                        if (pendingPricing) {
                            filesToCommit.push({ path: 'pricing.json', content: pendingPricing, encoding: 'utf-8' });
                        }
                        var pendingBlogs = localStorage.getItem('pending_blogs_config');
                        if (pendingBlogs) {
                            filesToCommit.push({ path: 'blogs.json', content: pendingBlogs, encoding: 'utf-8' });
                        }
                        var pendingLive = localStorage.getItem('pending_live_config');
                        if (pendingLive) {
                            var liveContentStr = "var LIVE_CONFIG = " + JSON.stringify(JSON.parse(pendingLive), null, 4) + ";\n";
                            filesToCommit.push({ path: 'live_config.js', content: liveContentStr, encoding: 'utf-8' });
                            filesToCommit.push({ path: 'invest_biz/live_config.js', content: liveContentStr, encoding: 'utf-8' });
                        }
                        var pendingVsl = localStorage.getItem('pending_vsl_config');
                        if (pendingVsl) {
                            var vslContentStr = "var VSL_CONFIG = " + JSON.stringify(JSON.parse(pendingVsl), null, 4) + ";\n";
                            filesToCommit.push({ path: 'vsl/lp.intrinsicvalueequity.in/vsl/vsl_config.js', content: vslContentStr, encoding: 'utf-8' });
                        }
                        var pendingWorkshop = localStorage.getItem('pending_workshop_config');
                        if (pendingWorkshop) {
                            var workshopContentStr = "var WORKSHOP_CONFIG = " + JSON.stringify(JSON.parse(pendingWorkshop), null, 4) + ";\n";
                            filesToCommit.push({ path: 'workshop/workshop_config.js', content: workshopContentStr, encoding: 'utf-8' });
                        }

                        // Append pending binary file uploads!
                        pendingUploads.forEach(function(up) {
                            filesToCommit.push({
                                path: up.path,
                                content: up.content,
                                encoding: 'base64'
                            });
                        });
                        
                        if (filesToCommit.length === 0) {
                            gitPushBtn.disabled = false;
                            gitPushBtn.innerHTML = '<i class="fa-brands fa-github"></i> Push to GitHub';
                            if (gitStatusMsg) {
                                gitStatusMsg.style.color = '#EA4335';
                                gitStatusMsg.innerText = 'No unsaved edits found. Make changes in CMS workspace first!';
                            }
                            return;
                        }
                        
                        if (gitStatusMsg) {
                            gitStatusMsg.innerText = 'Fetching latest branch head...';
                        }

                        var headers = {
                            'Authorization': 'token ' + pat,
                            'Accept': 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json'
                        };

                        var lastCommitSha, baseTreeSha, newTreeSha, newCommitSha;

                        // 1. Get branch head
                        fetch('https://api.github.com/repos/' + repo + '/git/ref/heads/' + branch, { headers: headers })
                            .then(function(res) {
                                if (res.status === 404) {
                                    throw new Error('Branch main not found. Check repository path or token.');
                                }
                                if (!res.ok) {
                                    throw new Error('Failed to fetch branch reference (HTTP ' + res.status + ')');
                                }
                                return res.json();
                            })
                            .then(function(data) {
                                lastCommitSha = data.object.sha;
                                if (gitStatusMsg) gitStatusMsg.innerText = 'Fetching base tree...';
                                // 2. Get tree of the last commit
                                return fetch('https://api.github.com/repos/' + repo + '/git/commits/' + lastCommitSha, { headers: headers });
                            })
                            .then(function(res) {
                                if (!res.ok) throw new Error('Failed to fetch commit tree (HTTP ' + res.status + ')');
                                return res.json();
                            })
                            .then(function(data) {
                                baseTreeSha = data.tree.sha;
                                if (gitStatusMsg) gitStatusMsg.innerText = 'Creating blobs on GitHub...';

                                // Upload all files to commit as blobs
                                var blobPromises = filesToCommit.map(function(fileObj) {
                                    var encodedContent = fileObj.encoding === 'base64' ? 
                                        fileObj.content : 
                                        btoa(unescape(encodeURIComponent(fileObj.content)));
                                        
                                    return fetch('https://api.github.com/repos/' + repo + '/git/blobs', {
                                        method: 'POST',
                                        headers: headers,
                                        body: JSON.stringify({
                                            content: encodedContent,
                                            encoding: 'base64'
                                        })
                                    })
                                    .then(function(r) {
                                        if (!r.ok) {
                                            return r.json().then(function(d) {
                                                throw new Error('Failed to create blob for ' + fileObj.path + ': ' + (d.message || r.status));
                                            });
                                        }
                                        return r.json();
                                    })
                                    .then(function(blobData) {
                                        return {
                                            path: fileObj.path,
                                            mode: '100644',
                                            type: 'blob',
                                            sha: blobData.sha
                                        };
                                    });
                                });

                                return Promise.all(blobPromises);
                            })
                            .then(function(treeData) {
                                if (gitStatusMsg) gitStatusMsg.innerText = 'Creating new commit tree...';

                                // 3. Create a new tree
                                return fetch('https://api.github.com/repos/' + repo + '/git/trees', {
                                    method: 'POST',
                                    headers: headers,
                                    body: JSON.stringify({
                                        base_tree: baseTreeSha,
                                        tree: treeData
                                    })
                                });
                            })
                            .then(function(res) {
                                if (!res.ok) {
                                    return res.json().then(function(d) {
                                        throw new Error('Failed to create tree: ' + (d.message || res.status));
                                    });
                                }
                                return res.json();
                            })
                            .then(function(data) {
                                newTreeSha = data.sha;
                                if (gitStatusMsg) gitStatusMsg.innerText = 'Creating new commit...';

                                // 4. Create new commit pointing to new tree
                                return fetch('https://api.github.com/repos/' + repo + '/git/commits', {
                                    method: 'POST',
                                    headers: headers,
                                    body: JSON.stringify({
                                        message: commitMessage || 'CMS Update',
                                        tree: newTreeSha,
                                        parents: [lastCommitSha]
                                    })
                                });
                            })
                            .then(function(res) {
                                if (!res.ok) {
                                    return res.json().then(function(d) {
                                        throw new Error('Failed to create commit: ' + (d.message || res.status));
                                    });
                                }
                                return res.json();
                            })
                            .then(function(data) {
                                newCommitSha = data.sha;
                                if (gitStatusMsg) gitStatusMsg.innerText = 'Updating branch reference...';

                                // 5. Update branch ref (heads/main) to point to new commit
                                return fetch('https://api.github.com/repos/' + repo + '/git/refs/heads/' + branch, {
                                    method: 'PATCH',
                                    headers: headers,
                                    body: JSON.stringify({
                                        sha: newCommitSha,
                                        force: false
                                    })
                                });
                            })
                            .then(function(res) {
                                if (!res.ok) {
                                    return res.json().then(function(d) {
                                        throw new Error('Failed to update branch reference: ' + (d.message || res.status));
                                    });
                                }
                                return res.json();
                            })
                            .then(function(data) {
                                // All files committed in ONE single commit!
                                localStorage.removeItem('pending_homepage_config');
                                localStorage.removeItem('pending_pricing_config');
                                localStorage.removeItem('pending_blogs_config');
                                localStorage.removeItem('pending_live_config');
                                localStorage.removeItem('pending_vsl_config');
                                localStorage.removeItem('pending_workshop_config');
                                localStorage.removeItem('pending_file_uploads');
                                pendingUploads = [];

                                gitPushBtn.disabled = false;
                                gitPushBtn.style.boxShadow = 'none';
                                gitPushBtn.innerHTML = '<i class="fa-brands fa-github"></i> Push to GitHub';
                                if (gitCommitInput) gitCommitInput.value = '';

                                if (gitStatusMsg) {
                                    gitStatusMsg.style.color = '#34A853';
                                    gitStatusMsg.innerText = 'Successfully pushed all edits in a single commit directly to GitHub!\n\nThis will trigger the GitHub Action build workflow to recompile templates and deploy the final pages live.';
                                }
                            })
                            .catch(function(err) {
                                gitPushBtn.disabled = false;
                                gitPushBtn.innerHTML = '<i class="fa-brands fa-github"></i> Push to GitHub';
                                if (gitStatusMsg) {
                                    gitStatusMsg.style.color = '#EA4335';
                                    gitStatusMsg.innerText = 'Deployment Failed:\n' + err.message;
                                }
                            });
                    } else {
                        // Local fallback using local server.py endpoint
                        if (!isLocalhost) {
                            gitPushBtn.disabled = false;
                            gitPushBtn.innerHTML = '<i class="fa-brands fa-github"></i> Push to GitHub';
                            alert('To publish changes online, you must fill in your GitHub Personal Access Token and Repository info in the settings fields.');
                            if (gitStatusMsg) {
                                gitStatusMsg.style.color = '#EA4335';
                                gitStatusMsg.innerText = 'Error: Missing GitHub credentials configuration.';
                            }
                            return;
                        }

                        gitPushBtn.disabled = true;
                        gitPushBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pushing...';
                        if (gitStatusMsg) {
                            gitStatusMsg.style.display = 'block';
                            gitStatusMsg.style.color = '#FF8C00';
                            gitStatusMsg.innerText = 'Connecting to server and deploying to GitHub...';
                        }
                        
                        fetch('/api/git-push', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ commitMessage: commitMessage })
                        })
                        .then(function (res) {
                            return res.json().then(function (data) {
                                if (!res.ok) {
                                    throw new Error(data.message || 'HTTP error ' + res.status);
                                }
                                return data;
                            });
                        })
                        .then(function (data) {
                            gitPushBtn.disabled = false;
                            gitPushBtn.innerHTML = '<i class="fa-brands fa-github"></i> Push to GitHub';
                            if (gitStatusMsg) {
                                gitStatusMsg.style.color = '#34A853';
                                gitStatusMsg.innerText = data.message;
                            }
                            if (gitCommitInput) {
                                gitCommitInput.value = '';
                            }
                        })
                        .catch(function (err) {
                            gitPushBtn.disabled = false;
                            gitPushBtn.innerHTML = '<i class="fa-brands fa-github"></i> Push to GitHub';
                            if (gitStatusMsg) {
                                gitStatusMsg.style.color = '#EA4335';
                                gitStatusMsg.innerText = 'Deployment Failed:\n' + err.message;
                            }
                        });
                    }
                } catch (e) {
                    gitPushBtn.disabled = false;
                    gitPushBtn.innerHTML = '<i class="fa-brands fa-github"></i> Push to GitHub';
                    if (gitStatusMsg) {
                        gitStatusMsg.style.display = 'block';
                        gitStatusMsg.style.color = '#EA4335';
                        gitStatusMsg.innerText = 'Execution Error: ' + e.message + '\n' + e.stack;
                    }
                }
            });
        }
    }

    // ----------------------------------------------------
    // BLOGS & ARTICLES CMS WORKSPACE ENGINE
    // ----------------------------------------------------
    var blogsState = [];
    var currentEditingBlog = null;
    var currentEditingBlogIndex = -1;

    window.updateLivePreview = function() {
        if (!currentEditingBlog) return;
        
        currentEditingBlog.title = document.getElementById('blog-edit-title').value.trim();
        currentEditingBlog.slug = document.getElementById('blog-edit-slug').value.trim();
        currentEditingBlog.category = document.getElementById('blog-edit-category').value.trim() || "Uncategorized";
        currentEditingBlog.date = document.getElementById('blog-edit-date').value.trim();
        currentEditingBlog.image = document.getElementById('blog-edit-image').value.trim() || null;
        currentEditingBlog.readingTime = document.getElementById('blog-edit-time').value.trim() || "3 min read";
        currentEditingBlog.gradient = document.getElementById('blog-edit-gradient').value.trim() || "linear-gradient(135deg, #FF8C00, #121212)";
        currentEditingBlog.excerpt = document.getElementById('blog-edit-excerpt').value.trim();
        
        localStorage.setItem('preview_blog_data', JSON.stringify(currentEditingBlog));
        
        var iframe = document.getElementById('blogsPreviewIframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage('update_blog_preview', '*');
        }
    };

    function loadBlogsCmsData() {
        var pendingBlogs = localStorage.getItem('pending_blogs_config');
        if (pendingBlogs) {
            try {
                blogsState = JSON.parse(pendingBlogs);
                renderBlogsList();
            } catch(e) {
                console.error("Error parsing pending_blogs_config", e);
            }
        } else {
            fetch('blogs.json?t=' + Date.now())
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    blogsState = data;
                    renderBlogsList();
                })
                .catch(function (err) {
                    console.warn("Could not fetch blogs.json directly.", err);
                    blogsState = [];
                    renderBlogsList();
                });
        }
    }

    function renderBlogsList() {
        var tbody = document.getElementById('blogs-list-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (blogsState.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">No blogs found. Click "Create New Blog" to write your first post.</td></tr>';
            return;
        }

        blogsState.forEach(function (blog, index) {
            var tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(String(blog.id || ''))}</strong></td>
                <td><span style="font-weight: 600; color: var(--text-primary);">${escapeHtml(blog.title || '')}</span></td>
                <td><span class="status-badge conducted" style="background: rgba(255,140,0,0.1); color: var(--accent); border: 1px solid rgba(255,140,0,0.2);">${escapeHtml(blog.category || 'Uncategorized')}</span></td>
                <td><span style="color: var(--text-muted); font-size: 13px;">${escapeHtml(blog.date || '')}</span></td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <button type="button" class="iv-cms-btn-add" style="width: auto; padding: 4px 10px; font-size: 11px;" onclick="editBlog(${index})">
                            <i class="fa-solid fa-pen-to-square"></i> Edit
                        </button>
                        <button type="button" class="iv-cms-btn-remove" style="position: static; padding: 4px 10px; font-size: 11px; width: auto;" onclick="deleteBlog(${index})">
                            <i class="fa-solid fa-trash-can"></i> Delete
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.createNewBlog = function () {
        var newId = blogsState.length > 0 ? Math.max.apply(Math, blogsState.map(function(b) { return b.id || 0; })) + 1 : 1001;
        currentEditingBlog = {
            id: newId,
            slug: "",
            title: "",
            date: formatDate(new Date()),
            rawDate: new Date().toISOString().substring(0, 19),
            category: "Uncategorized",
            readingTime: "3 min read",
            image: "",
            gradient: "linear-gradient(135deg, #FF8C00, #121212)",
            excerpt: "",
            blocks: [],
            content: ""
        };
        currentEditingBlogIndex = -1;
        renderBlogEditor();
        
        var editTabLink = document.getElementById('tab-btn-blogs-edit');
        if (editTabLink) editTabLink.click();
    };

    window.editBlog = function (index) {
        currentEditingBlog = JSON.parse(JSON.stringify(blogsState[index]));
        currentEditingBlogIndex = index;
        
        if (!currentEditingBlog.blocks || currentEditingBlog.blocks.length === 0) {
            currentEditingBlog.blocks = parseHtmlToBlocks(currentEditingBlog.content || "");
        }
        
        renderBlogEditor();
        
        var editTabLink = document.getElementById('tab-btn-blogs-edit');
        if (editTabLink) editTabLink.click();
    };

    window.deleteBlog = function (index) {
        if (confirm("Are you sure you want to delete the blog post: \"" + blogsState[index].title + "\"?")) {
            blogsState.splice(index, 1);
            localStorage.setItem('pending_blogs_config', JSON.stringify(blogsState));
            renderBlogsList();
            
            // Highlight the push button to indicate unsaved edits
            var pushBtn = document.getElementById('gitPushBtn');
            if (pushBtn) {
                pushBtn.style.boxShadow = '0 0 12px var(--accent)';
                pushBtn.innerHTML = '<i class="fa-brands fa-github"></i> Publish Edits to GitHub';
            }
            
            var iframe = document.getElementById('blogsPreviewIframe');
            if (iframe) {
                iframe.src = 'blogs.html?preview=true';
            }
        }
    };

    function formatDate(date) {
        var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
    }

    function parseHtmlToBlocks(html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var blocks = [];
        var children = Array.prototype.slice.call(doc.body.childNodes);
        
        children.forEach(function (node) {
            if (node.nodeType === 1) { // ELEMENT_NODE
                var tagName = node.tagName.toLowerCase();
                if (tagName === 'h2' || tagName === 'h3' || tagName === 'h4' || tagName === 'h1' || tagName === 'h5' || tagName === 'h6') {
                    blocks.push({
                        type: 'heading',
                        text: node.innerText.trim()
                    });
                } else if (tagName === 'p') {
                    var img = node.querySelector('img');
                    var iframe = node.querySelector('iframe');
                    var video = node.querySelector('video');
                    if (img) {
                        blocks.push({
                            type: 'photo',
                            url: img.getAttribute('src') || ''
                        });
                    } else if (iframe) {
                        blocks.push({
                            type: 'video',
                            url: iframe.getAttribute('src') || ''
                        });
                    } else if (video) {
                        var source = video.querySelector('source');
                        blocks.push({
                            type: 'video',
                            url: source ? source.getAttribute('src') : (video.getAttribute('src') || '')
                        });
                    } else {
                        var inner = node.innerHTML.trim();
                        if (inner) {
                            var tempDiv = document.createElement('div');
                            tempDiv.innerHTML = inner;
                            var links = tempDiv.querySelectorAll('a');
                            links.forEach(function (a) {
                                var md = '[' + a.innerText + '](' + a.getAttribute('href') + ')';
                                a.outerHTML = md;
                            });
                            
                            var cleanedText = tempDiv.innerHTML
                                .replace(/<br\s*\/?>/gi, '\n')
                                .replace(/&amp;/g, '&')
                                .replace(/&lt;/g, '<')
                                .replace(/&gt;/g, '>')
                                .replace(/&quot;/g, '"')
                                .replace(/&#039;/g, "'");

                            blocks.push({
                                type: 'paragraph',
                                text: cleanedText
                            });
                        }
                    }
                } else if (tagName === 'img') {
                    blocks.push({
                        type: 'photo',
                        url: node.getAttribute('src') || ''
                    });
                } else if (tagName === 'iframe') {
                    blocks.push({
                        type: 'video',
                        url: node.getAttribute('src') || ''
                    });
                } else if (tagName === 'video') {
                    var source = node.querySelector('source');
                    blocks.push({
                        type: 'video',
                        url: source ? source.getAttribute('src') : (node.getAttribute('src') || '')
                    });
                } else {
                    var innerHtml = node.outerHTML.trim();
                    if (innerHtml) {
                        blocks.push({
                            type: 'paragraph',
                            text: innerHtml
                        });
                    }
                }
            } else if (node.nodeType === 3) { // TEXT_NODE
                var text = node.nodeValue.trim();
                if (text) {
                    blocks.push({
                        type: 'paragraph',
                        text: text
                    });
                }
            }
        });
        
        if (blocks.length === 0 && html.trim() !== '') {
            blocks.push({
                type: 'paragraph',
                text: html.trim()
            });
        }
        return blocks;
    }

    function renderBlogEditor() {
        if (!currentEditingBlog) return;
        document.getElementById('blog-edit-title').value = currentEditingBlog.title || "";
        document.getElementById('blog-edit-slug').value = currentEditingBlog.slug || "";
        document.getElementById('blog-edit-category').value = currentEditingBlog.category || "Uncategorized";
        document.getElementById('blog-edit-date').value = currentEditingBlog.date || "";
        document.getElementById('blog-edit-image').value = currentEditingBlog.image || "";
        document.getElementById('blog-edit-time').value = currentEditingBlog.readingTime || "3 min read";
        document.getElementById('blog-edit-gradient').value = currentEditingBlog.gradient || "linear-gradient(135deg, #FF8C00, #121212)";
        document.getElementById('blog-edit-excerpt').value = currentEditingBlog.excerpt || "";
        
        renderBlogElements();
    }

    function renderBlogElements() {
        var container = document.getElementById('blog-elements-list');
        if (!container) return;
        container.innerHTML = '';
        
        if (!currentEditingBlog) return;
        var blocks = currentEditingBlog.blocks || [];
        if (blocks.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No content blocks yet. Click below to add your first content block.</p>';
            return;
        }
        
        blocks.forEach(function (block, index) {
            var div = document.createElement('div');
            div.className = 'iv-cms-repeater-item';
            div.style.padding = '16px';
            div.style.marginBottom = '16px';
            div.style.border = '1px solid rgba(255, 140, 0, 0.1)';
            div.style.background = 'rgba(255, 255, 255, 0.01)';
            
            var labelColor = 'var(--text-muted)';
            var icon = 'fa-paragraph';
            if (block.type === 'heading') {
                labelColor = 'var(--accent)';
                icon = 'fa-heading';
            } else if (block.type === 'photo') {
                labelColor = '#3498db';
                icon = 'fa-image';
            } else if (block.type === 'video') {
                labelColor = '#e74c3c';
                icon = 'fa-video';
            }
            
            var upDisabled = index === 0 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : '';
            var downDisabled = index === blocks.length - 1 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : '';
            
            var blockHtml = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-size: 11px; font-weight: 700; color: ${labelColor}; text-transform: uppercase; letter-spacing: 0.05em;">
                        <i class="fa-solid ${icon}"></i> Block ${index + 1}: ${block.type}
                    </span>
                    <div style="display: flex; gap: 6px;">
                        <button type="button" class="iv-cms-btn-add" style="width: auto; padding: 2px 8px; font-size: 11px;" ${upDisabled} onclick="moveBlogElement(${index}, -1)">
                            <i class="fa-solid fa-arrow-up"></i> Up
                        </button>
                        <button type="button" class="iv-cms-btn-add" style="width: auto; padding: 2px 8px; font-size: 11px;" ${downDisabled} onclick="moveBlogElement(${index}, 1)">
                            <i class="fa-solid fa-arrow-down"></i> Down
                        </button>
                        <button type="button" class="iv-cms-btn-remove" style="position: static; margin-left: 10px;" onclick="removeBlogElement(${index})">
                            &times;
                        </button>
                    </div>
                </div>
            `;
            
            if (block.type === 'heading') {
                blockHtml += `
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <input type="text" class="iv-cms-input" style="font-size: 16px; font-weight: 700; color: var(--accent);" value="${escapeHtml(block.text || '')}" oninput="updateBlogElement(${index}, this.value); updateLivePreview();" placeholder="Enter highlighted heading text...">
                    </div>
                `;
            } else if (block.type === 'paragraph') {
                blockHtml += `
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <textarea class="iv-cms-textarea" style="min-height: 100px; font-size: 14px; line-height: 1.6;" oninput="updateBlogElement(${index}, this.value); updateLivePreview();" placeholder="Enter paragraph content... Markdown link format: [Text](URL) supported">${escapeHtml(block.text || '')}</textarea>
                    </div>
                `;
            } else if (block.type === 'photo') {
                blockHtml += `
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <div style="display: flex; gap: 8px;">
                            <input type="text" class="iv-cms-input" style="flex: 1;" value="${escapeHtml(block.url || '')}" oninput="updateBlogElement(${index}, this.value); updateLivePreview();" placeholder="Enter image URL/path (e.g. images/my-image.jpg)">
                            <button type="button" class="iv-cms-btn-add" style="width: auto; padding: 0 16px;" onclick="simulateFileUploadForBlock(${index})">Upload</button>
                        </div>
                    </div>
                `;
            } else if (block.type === 'video') {
                blockHtml += `
                    <div class="iv-cms-group" style="margin-bottom: 0;">
                        <div style="display: flex; gap: 8px;">
                            <input type="text" class="iv-cms-input" style="flex: 1;" value="${escapeHtml(block.url || '')}" oninput="updateBlogElement(${index}, this.value); updateLivePreview();" placeholder="Enter YouTube watch/embed URL or direct MP4 link">
                            <button type="button" class="iv-cms-btn-add" style="width: auto; padding: 0 16px;" onclick="simulateFileUploadForBlock(${index})">Upload</button>
                        </div>
                    </div>
                `;
            }
            
            div.innerHTML = blockHtml;
            container.appendChild(div);
        });
    }

    window.addBlogElement = function (type) {
        currentEditingBlog.blocks = currentEditingBlog.blocks || [];
        if (type === 'photo' || type === 'video') {
            currentEditingBlog.blocks.push({ type: type, url: '' });
        } else {
            currentEditingBlog.blocks.push({ type: type, text: '' });
        }
        renderBlogElements();
        updateLivePreview();
    };

    window.removeBlogElement = function (index) {
        currentEditingBlog.blocks.splice(index, 1);
        renderBlogElements();
        updateLivePreview();
    };

    window.moveBlogElement = function (index, direction) {
        var blocks = currentEditingBlog.blocks;
        var targetIndex = index + direction;
        if (targetIndex >= 0 && targetIndex < blocks.length) {
            var temp = blocks[index];
            blocks[index] = blocks[targetIndex];
            blocks[targetIndex] = temp;
            renderBlogElements();
            updateLivePreview();
        }
    };

    window.updateBlogElement = function (index, value) {
        var block = currentEditingBlog.blocks[index];
        if (block.type === 'photo' || block.type === 'video') {
            block.url = value;
        } else {
            block.text = value;
        }
    };

    window.simulateFileUploadForBlock = function (index) {
        window.simulateFileUpload('blog-block-temp-upload-id-' + index, 'images');
    };

    window.autoGenerateSlug = function (title) {
        var slugInput = document.getElementById('blog-edit-slug');
        if (slugInput) {
            var slug = title.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');
            slugInput.value = slug;
        }
    };

    window.saveCurrentBlog = function () {
        currentEditingBlog.title = document.getElementById('blog-edit-title').value.trim();
        currentEditingBlog.slug = document.getElementById('blog-edit-slug').value.trim();
        currentEditingBlog.category = document.getElementById('blog-edit-category').value.trim() || "Uncategorized";
        currentEditingBlog.date = document.getElementById('blog-edit-date').value.trim() || formatDate(new Date());
        currentEditingBlog.image = document.getElementById('blog-edit-image').value.trim() || null;
        currentEditingBlog.readingTime = document.getElementById('blog-edit-time').value.trim() || "3 min read";
        currentEditingBlog.gradient = document.getElementById('blog-edit-gradient').value.trim() || "linear-gradient(135deg, #FF8C00, #121212)";
        currentEditingBlog.excerpt = document.getElementById('blog-edit-excerpt').value.trim();

        if (!currentEditingBlog.title || !currentEditingBlog.slug || !currentEditingBlog.excerpt) {
            alert("Please fill in all required fields (Title, Slug, Excerpt).");
            return;
        }

        currentEditingBlog.content = compileBlocksToHtml(currentEditingBlog.blocks);

        if (currentEditingBlogIndex === -1) {
            blogsState.unshift(currentEditingBlog);
        } else {
            blogsState[currentEditingBlogIndex] = currentEditingBlog;
        }

        localStorage.setItem('pending_blogs_config', JSON.stringify(blogsState));
        renderBlogsList();
        
        // Highlight the push button to indicate unsaved edits
        var pushBtn = document.getElementById('gitPushBtn');
        if (pushBtn) {
            pushBtn.style.boxShadow = '0 0 12px var(--accent)';
            pushBtn.innerHTML = '<i class="fa-brands fa-github"></i> Publish Edits to GitHub';
        }
        
        var listTabLink = document.getElementById('tab-btn-blogs-list');
        if (listTabLink) listTabLink.click();
    };

    window.cancelBlogEdit = function () {
        if (confirm("Discard all unsaved edits to this blog post?")) {
            var listTabLink = document.getElementById('tab-btn-blogs-list');
            if (listTabLink) listTabLink.click();
        }
    };

    function compileBlocksToHtml(blocks) {
        var html = '';
        if (!blocks) return html;
        blocks.forEach(function (block) {
            if (block.type === 'heading') {
                html += '<h2 class="blog-highlighted-heading">' + escapeHtml(block.text) + '</h2>\n';
            } else if (block.type === 'paragraph') {
                var paragraphs = block.text.split('\n\n').filter(function (p) { return p.trim() !== ''; });
                paragraphs.forEach(function (p) {
                    var formattedText = escapeHtml(p).replace(/\n/g, '<br />');
                    formattedText = formattedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
                    html += '<p>' + formattedText + '</p>\n';
                });
            } else if (block.type === 'photo') {
                html += '<p><img loading="lazy" decoding="async" class="aligncenter" src="' + escapeHtml(block.url) + '" alt="" /></p>\n';
            } else if (block.type === 'video') {
                var videoUrl = block.url || '';
                if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
                    var embedUrl = getYouTubeEmbedUrl(videoUrl);
                    html += '<p><iframe loading="lazy" width="100%" height="450" src="' + escapeHtml(embedUrl) + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>\n';
                } else if (videoUrl) {
                    html += '<p><video controls style="width: 100%; max-height: 500px;"><source src="' + escapeHtml(videoUrl) + '" type="video/mp4">Your browser does not support the video tag.</video></p>\n';
                }
            }
        });
        return html;
    }

    function getYouTubeEmbedUrl(url) {
        var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        var match = url.match(regExp);
        if (match && match[2].length == 11) {
            return "https://www.youtube.com/embed/" + match[2];
        }
        return url;
    }

    function compileBlogsCmsState() {
        var jsonText = JSON.stringify(blogsState, null, 2);
        var display = document.getElementById('blogsJsonDisplay');
        if (display) {
            display.textContent = jsonText;
        }
        return jsonText;
    }

    function downloadBlogsJsonFile() {
        var jsonText = compileBlogsCmsState();
        var blob = new Blob([jsonText], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "blogs.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast("blogs.json Downloaded!");
    }

    function copyBlogsJsonToClipboard() {
        var jsonText = compileBlogsCmsState();
        navigator.clipboard.writeText(jsonText).then(function () {
            showToast("blogs.json copied!");
        }).catch(function (err) {
            console.error("Could not copy text: ", err);
        });
    }

    function bindBlogsCmsWorkspaceEvents() {
        var workspace = document.getElementById('blogsCmsWorkspace');
        var openBtn = document.getElementById('openBlogsCmsBtn');
        var closeBtn = document.getElementById('closeBlogsCmsBtn');
        var saveBtn = document.getElementById('blogsSaveBtn');
        var copyBtn = document.getElementById('blogsCopyJsonBtn');
        var downloadBtn = document.getElementById('blogsDownloadJsonBtn');
        
        if (openBtn && workspace) {
            openBtn.addEventListener('click', function () {
                workspace.style.display = 'block';
                loadBlogsCmsData();
                var firstTabLink = document.getElementById('tab-btn-blogs-list');
                if (firstTabLink) firstTabLink.click();
            });
        }

        if (closeBtn && workspace) {
            closeBtn.addEventListener('click', function () {
                compileBlogsCmsState();
                saveConfigToServer('blogs.json', blogsState);
                workspace.style.display = 'none';
                showToast("Unsaved edits stored in browser! Push to GitHub to go live.");
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                compileBlogsCmsState();
                saveConfigToServer('blogs.json', blogsState);
                var exportTabLink = document.getElementById('tab-btn-blogs-export');
                if (exportTabLink) exportTabLink.click();
                showToast("Blogs config compiled and saved locally in browser!");
            });
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', copyBlogsJsonToClipboard);
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadBlogsJsonFile);
        }

        // Device toggle listeners for Blogs Preview
        var deviceBtns = document.querySelectorAll('.btn-device-toggle-blog');
        var previewPane = document.querySelector('#blogsCmsWorkspace .iv-cms-preview-pane');
        deviceBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                deviceBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var dev = btn.getAttribute('data-device');
                if (previewPane) {
                    previewPane.classList.remove('device-laptop', 'device-phone');
                    previewPane.classList.add('device-' + dev);
                }
            });
        });

        // Listen for messages from preview iframe (Visual Inline Editor)
        window.addEventListener('message', function(event) {
            if (!event.data) return;
            
            if (event.data.type === 'trigger_file_upload') {
                simulateFileUpload(event.data.targetId, 'images');
            } else if (event.data.type === 'update_blog_state') {
                currentEditingBlog = event.data.blog;
                
                // Sync current state to hidden inputs to keep DOM values matching
                var tInput = document.getElementById('blog-edit-title');
                var sInput = document.getElementById('blog-edit-slug');
                var cInput = document.getElementById('blog-edit-category');
                var dInput = document.getElementById('blog-edit-date');
                var iInput = document.getElementById('blog-edit-image');
                var rInput = document.getElementById('blog-edit-time');
                var gInput = document.getElementById('blog-edit-gradient');
                var eInput = document.getElementById('blog-edit-excerpt');

                if (tInput) tInput.value = currentEditingBlog.title || "";
                if (sInput) sInput.value = currentEditingBlog.slug || "";
                if (cInput) cInput.value = currentEditingBlog.category || "";
                if (dInput) dInput.value = currentEditingBlog.date || "";
                if (iInput) iInput.value = currentEditingBlog.image || "";
                if (rInput) rInput.value = currentEditingBlog.readingTime || "";
                if (gInput) gInput.value = currentEditingBlog.gradient || "";
                if (eInput) eInput.value = currentEditingBlog.excerpt || "";
            }
        });
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
        bindBlogsCmsWorkspaceEvents();

        // Monitor activity to reset inactivity timer
        var activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        activityEvents.forEach(function (eventName) {
            document.addEventListener(eventName, resetInactivityTimer, { passive: true });
        });

        // Run session check every 10 seconds
        setInterval(checkSessionTimeout, 10000);
    });
})();
