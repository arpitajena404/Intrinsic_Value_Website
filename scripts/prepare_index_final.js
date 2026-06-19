const fs = require('fs');
const path = require('path');

const htmlPath = 'c:/IV website/index.html';
if (!fs.existsSync(htmlPath)) {
    console.error("index.html not found!");
    process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8').replace(/\r\n/g, '\n');

function injectMarkerAbsolute(pos, marker) {
    html = html.substring(0, pos) + "\n" + marker + "\n" + html.substring(pos);
}

function injectAroundLandmarks(startLandmark, endLandmark, startMarker, endMarker) {
    if (html.indexOf(startMarker) !== -1) {
        console.log(`Markers already present for: ${startMarker}`);
        return;
    }

    const startIndex = html.indexOf(startLandmark);
    if (startIndex === -1) {
        console.warn(`Start landmark not found: "${startLandmark.substring(0, 50)}"`);
        return;
    }

    if (startLandmark === endLandmark) {
        const before = html.substring(0, startIndex);
        const content = startLandmark;
        const after = html.substring(startIndex + startLandmark.length);
        html = before + startMarker + "\n" + content + "\n" + endMarker + after;
        console.log(`Successfully injected: ${startMarker}`);
        return;
    }

    const endIndex = html.indexOf(endLandmark, startIndex + startLandmark.length);
    if (endIndex === -1) {
        console.warn(`End landmark not found: "${endLandmark.substring(0, 50)}"`);
        return;
    }

    const before = html.substring(0, startIndex);
    const content = html.substring(startIndex, endIndex + endLandmark.length);
    const after = html.substring(endIndex + endLandmark.length);

    html = before + startMarker + "\n" + content + "\n" + endMarker + after;
    console.log(`Successfully injected: ${startMarker}`);
}

// 1. Navigation Menu
injectAroundLandmarks(
    '<li><a href="pricing.html" class="nav-link" rel="noopener noreferrer">Service</a></li>',
    '<li><a href="analytics/index.html" class="nav-link">Analytics</a></li>',
    '<!-- CMS_NAV_START -->',
    '<!-- CMS_NAV_END -->'
);

// 2. Hero Left
injectAroundLandmarks(
    '<div class="iv-hero-tag">SEBI Registered Research Analyst</div>',
    '<div class="iv-sebi-badge">SEBI Registered · INH000009047</div>',
    '<!-- CMS_HERO_LEFT_START -->',
    '<!-- CMS_HERO_LEFT_END -->'
);

// 3. Stats Mobile (we search inside iv-mobile-stats)
const mobileStatsIndex = html.indexOf('class="iv-hero-stats-overlay iv-mobile-stats"');
if (mobileStatsIndex !== -1) {
    const startIndex = html.indexOf('<div class="iv-stat-item"', mobileStatsIndex);
    const lastLabelIndex = html.indexOf('Stocks Recommended</div>', mobileStatsIndex);
    if (startIndex !== -1 && lastLabelIndex !== -1) {
        const labelCloseIdx = html.indexOf('</div>', lastLabelIndex) + '</div>'.length;
        const itemCloseIdx = html.indexOf('</div>', labelCloseIdx) + '</div>'.length;
        const overlayCloseIdx = html.indexOf('</div>', itemCloseIdx);
        
        if (overlayCloseIdx !== -1) {
            const before = html.substring(0, startIndex);
            const content = html.substring(startIndex, overlayCloseIdx);
            const after = html.substring(overlayCloseIdx);
            html = before + '<!-- CMS_HERO_STATS_MOBILE_START -->\n' + content + '\n<!-- CMS_HERO_STATS_MOBILE_END -->' + after;
            console.log("Successfully injected stats mobile markers");
        }
    }
}

// 4. Hero Right Media
injectAroundLandmarks(
    '<!-- Staircase Card -->',
    '<div class="iv-stair-base"></div>\n                        </div>',
    '<!-- CMS_HERO_RIGHT_START -->',
    '<!-- CMS_HERO_RIGHT_END -->'
);

// 5. Stats Desktop (after iv-hero-right has ended)
const desktopStatsIndex = html.indexOf('<!-- Overlapping Stats Box (inspired by img2 layout) -->');
if (desktopStatsIndex !== -1) {
    const startIndex = html.indexOf('<div class="iv-stat-item"', desktopStatsIndex);
    const lastLabelIndex = html.indexOf('Stocks Recommended</div>', desktopStatsIndex);
    if (startIndex !== -1 && lastLabelIndex !== -1) {
        const labelCloseIdx = html.indexOf('</div>', lastLabelIndex) + '</div>'.length;
        const itemCloseIdx = html.indexOf('</div>', labelCloseIdx) + '</div>'.length;
        const overlayCloseIdx = html.indexOf('</div>', itemCloseIdx);
        
        if (overlayCloseIdx !== -1) {
            const before = html.substring(0, startIndex);
            const content = html.substring(startIndex, overlayCloseIdx);
            const after = html.substring(overlayCloseIdx);
            html = before + '<!-- CMS_HERO_STATS_START -->\n' + content + '\n<!-- CMS_HERO_STATS_END -->' + after;
            console.log("Successfully injected stats desktop markers");
        }
    }
}

// 6. Typewriter Words
const targetTypewriterWords = 'const words = [\n                "Wealth Creation.",\n                "Capital Growth.",\n                "Portfolio Alpha.",\n                "Financial Freedom."\n            ];';
const typewriterReplacement = 'const words = [\n                // CMS_TYPEWRITER_WORDS_START\n                "Wealth Creation.",\n                "Capital Growth.",\n                "Portfolio Alpha.",\n                "Financial Freedom."\n                // CMS_TYPEWRITER_WORDS_END\n            ];';
html = html.replace(targetTypewriterWords, typewriterReplacement);
console.log("Successfully injected typewriter markers");

// 7. Philosophy Title
injectAroundLandmarks(
    '<h2>Investment philosophy<em>.</em></h2>',
    '<h2>Investment philosophy<em>.</em></h2>',
    '<!-- CMS_PHILOSOPHY_TITLE_START -->',
    '<!-- CMS_PHILOSOPHY_TITLE_END -->'
);

// 8. Philosophy Cards Track
const trackStart = '<div class="spiral-carousel">';
const trackStartIdx = html.indexOf(trackStart);
if (trackStartIdx !== -1) {
    const insertStartPos = trackStartIdx + trackStart.length;
    html = html.substring(0, insertStartPos) + "\n<!-- CMS_PHILOSOPHY_CARDS_START -->\n" + html.substring(insertStartPos);
    
    const lastCardComment = '<!-- Card 8 -->';
    const lastCardIdx = html.indexOf(lastCardComment);
    if (lastCardIdx !== -1) {
        const aCloseIdx = html.indexOf('</a>', lastCardIdx);
        if (aCloseIdx !== -1) {
            const cardEndIdx = html.indexOf('</div>', aCloseIdx) + '</div>'.length;
            injectMarkerAbsolute(cardEndIdx, '<!-- CMS_PHILOSOPHY_CARDS_END -->');
            console.log("Successfully injected philosophy cards markers");
        }
    }
}

// 9. Case Studies Title
injectAroundLandmarks(
    '<span class="cases-pre-title">CASE STUDIES</span>',
    'Proven Wealth Unlocking <em>Cases</em>.</h2>',
    '<!-- CMS_CASE_STUDIES_TITLE_START -->',
    '<!-- CMS_CASE_STUDIES_TITLE_END -->'
);

// 10. Case Studies Companies Container
const containerStartIdx = html.indexOf('class="cases-buttons-container"');
if (containerStartIdx !== -1) {
    const insertStartPos = html.indexOf('>', containerStartIdx) + 1;
    html = html.substring(0, insertStartPos) + "\n<!-- CMS_CASE_STUDIES_COMPANIES_START -->" + html.substring(insertStartPos);
    
    const lastCompanyText = '<!-- Company 4: Texmaco -->';
    const lastCompanyIdx = html.indexOf(lastCompanyText);
    if (lastCompanyIdx !== -1) {
        const dropdownIdx = html.indexOf('class="company-reports-dropdown"', lastCompanyIdx);
        const exitReportIdx = html.indexOf('Exit Report', dropdownIdx);
        const linkCloseIdx = html.indexOf('</a>', exitReportIdx);
        const dropdownCloseIdx = html.indexOf('</div>', linkCloseIdx) + '</div>'.length; // closes dropdown
        const cardCloseIdx = html.indexOf('</div>', dropdownCloseIdx) + '</div>'.length; // closes company-card-wrapper
        
        injectMarkerAbsolute(cardCloseIdx, '<!-- CMS_CASE_STUDIES_COMPANIES_END -->');
        console.log("Successfully injected case study companies markers");
    }
}

// 11. News Display Quote
injectAroundLandmarks(
    '<span class="featured-pre-title">FEATURED</span>',
    'Business Standard</cite>\n                        </div>',
    '<!-- CMS_NEWS_DISPLAY_START -->',
    '<!-- CMS_NEWS_DISPLAY_END -->'
);

// 12. News Cards track
const rowStart = '<div class="featured-cards-row">';
const rowStartIdx = html.indexOf(rowStart);
if (rowStartIdx !== -1) {
    const insertStartPos = rowStartIdx + rowStart.length;
    html = html.substring(0, insertStartPos) + "\n<!-- CMS_NEWS_CARDS_START -->\n" + html.substring(insertStartPos);
    
    const lastLogoLabel = 'logo-card-label">YouTube</span>';
    const lastLogoIdx = html.indexOf(lastLogoLabel, insertStartPos);
    if (lastLogoIdx !== -1) {
        const cardCloseIdx = html.indexOf('</div>', lastLogoIdx) + '</div>'.length; // closes featured-logo-card
        injectMarkerAbsolute(cardCloseIdx, '<!-- CMS_NEWS_CARDS_END -->');
        console.log("Successfully injected news cards markers");
    }
}

// 13. Testimonials Title
injectAroundLandmarks(
    '<span class="testimonials-pre-title">Reviews</span>',
    'Client <em>Testimonials</em>.</h2>',
    '<!-- CMS_TESTIMONIALS_TITLE_START -->',
    '<!-- CMS_TESTIMONIALS_TITLE_END -->'
);

// 14. Testimonials Cards Container
const testimonialsCorner = 'class="testimonials-frame-corner bottom-right"></div>';
const cornerStartIdx = html.indexOf(testimonialsCorner);
if (cornerStartIdx !== -1) {
    const insertStartPos = cornerStartIdx + testimonialsCorner.length;
    html = html.substring(0, insertStartPos) + "\n<!-- CMS_TESTIMONIALS_CARDS_START -->\n" + html.substring(insertStartPos);
    
    const lastTestimonialText = 'Amazon, Gurugram';
    const lastTestimonialIdx = html.indexOf(lastTestimonialText);
    if (lastTestimonialIdx !== -1) {
        const posCloseIdx = html.indexOf('</div>', lastTestimonialIdx) + '</div>'.length; // closes position
        const authorCloseIdx = html.indexOf('</div>', posCloseIdx) + '</div>'.length; // closes testimonial-author
        const cardCloseIdx = html.indexOf('</div>', authorCloseIdx) + '</div>'.length; // closes testimonial-card
        injectMarkerAbsolute(cardCloseIdx, '<!-- CMS_TESTIMONIALS_CARDS_END -->');
        console.log("Successfully injected testimonials cards markers");
    }
}

// 15. Team Title
const teamTitleLandmark = 'Meet Our </span><span class="text-orange">Team</span>';
const teamTitleIdx = html.indexOf(teamTitleLandmark);
if (teamTitleIdx !== -1) {
    const startH2 = html.lastIndexOf('<h2 class="team-section-heading">', teamTitleIdx);
    const endH2 = html.indexOf('</h2>', teamTitleIdx) + '</h2>'.length;
    
    const before = html.substring(0, startH2);
    const content = html.substring(startH2, endH2);
    const after = html.substring(endH2);
    
    html = before + "<!-- CMS_TEAM_TITLE_START -->\n" + content + "\n<!-- CMS_TEAM_TITLE_END -->" + after;
    console.log("Successfully injected team title markers");
}

// 16. Team Cards Row
const teamRowStart = '<div class="team-cards-row">';
const teamRowStartIdx = html.indexOf(teamRowStart);
if (teamRowStartIdx !== -1) {
    const insertStartPos = teamRowStartIdx + teamRowStart.length;
    html = html.substring(0, insertStartPos) + "\n<!-- CMS_TEAM_CARDS_START -->\n" + html.substring(insertStartPos);
    
    const lastMemberText = 'Harshit Saaran';
    const lastMemberIdx = html.indexOf(lastMemberText);
    if (lastMemberIdx !== -1) {
        const roleCloseIdx = html.indexOf('</p>', lastMemberIdx) + '</p>'.length; // closes team-role
        const infoCloseIdx = html.indexOf('</div>', roleCloseIdx) + '</div>'.length; // closes team-info
        const cardCloseIdx = html.indexOf('</div>', infoCloseIdx) + '</div>'.length; // closes team-card
        injectMarkerAbsolute(cardCloseIdx, '<!-- CMS_TEAM_CARDS_END -->');
        console.log("Successfully injected team cards markers");
    }
}

// 17. FAQ Title
injectAroundLandmarks(
    '<span class="faq-pre-title">COMMON QUERIES</span>',
    'info@intrinsicvalueequity.in</a></p>',
    '<!-- CMS_FAQ_TITLE_START -->',
    '<!-- CMS_FAQ_TITLE_END -->'
);

// 18. FAQ List container
const faqListStart = '<div class="faq-accordion-list">';
const faqListStartIdx = html.indexOf(faqListStart);
if (faqListStartIdx !== -1) {
    const insertStartPos = faqListStartIdx + faqListStart.length;
    html = html.substring(0, insertStartPos) + "\n<!-- CMS_FAQ_LIST_START -->\n" + html.substring(insertStartPos);
    
    const lastFaqComment = '<!-- FAQ Item 6 -->';
    const lastFaqIdx = html.indexOf(lastFaqComment);
    if (lastFaqIdx !== -1) {
        const nextFaqHeader = html.indexOf('class="faq-question-header"', lastFaqIdx);
        const nextAnswer = html.indexOf('class="faq-answer"', nextFaqHeader);
        const nextAnswerInner = html.indexOf('class="faq-answer-inner"', nextAnswer);
        const innerClose = html.indexOf('</div>', nextAnswerInner) + '</div>'.length;
        const answerClose = html.indexOf('</div>', innerClose) + '</div>'.length;
        const itemClose = html.indexOf('</div>', answerClose) + '</div>'.length;
        injectMarkerAbsolute(itemClose, '<!-- CMS_FAQ_LIST_END -->');
        console.log("Successfully injected FAQ list markers");
    }
}

// 19. Footer Brand Description
injectAroundLandmarks(
    '<p class="footer-desc">',
    'wealth creation.\n                    </p>',
    '<!-- CMS_FOOTER_BRAND_START -->',
    '<!-- CMS_FOOTER_BRAND_END -->'
);

// 20. Footer Quick Links list
injectAroundLandmarks(
    '<li><a href="pricing.html" target="_blank" rel="noopener noreferrer">Service</a></li>',
    '<li><a href="analytics/index.html">Analytics</a></li>',
    '<!-- CMS_FOOTER_QUICK_LINKS_START -->',
    '<!-- CMS_FOOTER_QUICK_LINKS_END -->'
);

// 21. Footer Important Info list
injectAroundLandmarks(
    '<li><a href="Legal&Compliance/tnc.html">Terms And Conditions/ MITC</a></li>',
    '<li><a href="https://smartodr.in/login" target="_blank" rel="noopener noreferrer">Smart ODR</a></li>',
    '<!-- CMS_FOOTER_IMPORTANT_INFO_START -->',
    '<!-- CMS_FOOTER_IMPORTANT_INFO_END -->'
);

// 22. Footer Disclaimer
injectAroundLandmarks(
    '<div class="footer-disclaimers">',
    'provide any assurance of returns to investor.\n                    </p>\n                </div>',
    '<!-- CMS_FOOTER_DISCLAIMER_START -->',
    '<!-- CMS_FOOTER_DISCLAIMER_END -->'
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log("Final landmarks injection complete!");
