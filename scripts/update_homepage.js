const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../homepage_config.json');
const htmlPath = path.join(__dirname, '../index.html');

if (!fs.existsSync(configPath)) {
    console.error("homepage_config.json not found!");
    process.exit(1);
}

if (!fs.existsSync(htmlPath)) {
    console.error("index.html not found!");
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
let html = fs.readFileSync(htmlPath, 'utf8').replace(/\r\n/g, '\n');

function replaceSection(sectionName, newContent) {
    let startMarker = `<!-- CMS_${sectionName}_START -->`;
    let endMarker = `<!-- CMS_${sectionName}_END -->`;
    
    if (sectionName === 'TYPEWRITER_WORDS') {
        startMarker = `// CMS_${sectionName}_START`;
        endMarker = `// CMS_${sectionName}_END`;
    }
    
    const startIndex = html.indexOf(startMarker);
    const endIndex = html.indexOf(endMarker);
    
    if (startIndex === -1 || endIndex === -1) {
        console.warn(`Markers not found for section: ${sectionName}`);
        return;
    }
    
    const before = html.substring(0, startIndex + startMarker.length);
    const after = html.substring(endIndex);
    
    html = before + "\n" + newContent + "\n" + after;
    console.log(`Successfully compiled section: ${sectionName}`);
}

// 1. Navigation Menu
const navHtml = config.navigation.map(link => {
    return `                    <li><a href="${link.url}" class="nav-link">${link.text}</a></li>`;
}).join('\n');
replaceSection('NAV', navHtml);

// 2. Hero Left Column
const heroLeftHtml = `                        <div class="iv-hero-tag">${config.hero.tag}</div>

                        <h1 class="iv-hero-h1">
                            ${config.hero.heading_html}
                        </h1>

                        <div class="iv-hero-bar"></div>

                        <p class="iv-hero-desc">
                            ${config.hero.desc1}
                        </p>

                        <p class="iv-hero-desc iv-hero-desc-2">
                            ${config.hero.desc2}
                        </p>

                        <a href="${config.hero.cta_url}" class="iv-hero-cta">
                            ${config.hero.cta_text}
                            <span class="iv-hero-cta-arrow">&rarr;</span>
                        </a>

                        <div class="iv-sebi-badge">${config.hero.sebi_badge}</div>`;
replaceSection('HERO_LEFT', heroLeftHtml);

// 3. Hero Stats HTML Generator
function generateStatsHtml() {
    return config.hero.stats.map((stat, idx) => {
        const divider = idx < config.hero.stats.length - 1 ? '\n                            <div class="iv-stat-divider"></div>\n' : '';
        return `                            <!-- Stat Item ${idx+1} -->
                            <div class="iv-stat-item">
                                <div class="iv-stat-num"><span class="count-up" data-target="${stat.num}">0</span>${stat.suffix}</div>
                                <div class="iv-stat-label">${stat.label}</div>
                            </div>${divider}`;
    }).join('\n');
}
const statsHtml = generateStatsHtml();
replaceSection('HERO_STATS', statsHtml);
replaceSection('HERO_STATS_MOBILE', statsHtml);

// 4. Hero Right Column Media
let heroRightHtml = '';
if (config.hero.media.type === 'animation') {
    heroRightHtml = `                        <!-- Staircase Card -->
                        <div class="iv-hero-card">
                            <div class="iv-card-planet">🪐</div>

                            <div class="iv-card-headline">
                                <em>Compound</em> Wealth,<br>Real Value.
                            </div>
                            <div class="iv-card-sub">Intrinsic Value Equity Advisors</div>

                            <!-- Staircase bar animation and walking figure -->
                            <div class="iv-staircase">
                                <div class="iv-stair-bars">
                                    <div class="iv-bar-item"></div>
                                    <div class="iv-bar-item"></div>
                                    <div class="iv-bar-item"></div>
                                    <div class="iv-bar-item"></div>
                                    <div class="iv-bar-item"></div>
                                </div>
                                <div class="iv-figure"><span style="display: inline-block; transform: scaleX(-1);">🚶</span></div>
                            </div>
                            <div class="iv-stair-base"></div>
                        </div>`;
} else if (config.hero.media.type === 'image') {
    heroRightHtml = `                        <div class="iv-hero-card" style="padding: 0; background: none; border: none; box-shadow: var(--shadow-soft);">
                            <img src="${config.hero.media.url}" alt="Hero Image" style="width: 100%; height: 100%; border-radius: 20px; object-fit: cover; border: 1px solid var(--border-color);">
                        </div>`;
} else if (config.hero.media.type === 'video') {
    heroRightHtml = `                        <div class="iv-hero-card" style="padding: 0; background: none; border: none; box-shadow: var(--shadow-soft);">
                            <video src="${config.hero.media.url}" autoplay loop muted playsinline style="width: 100%; height: 100%; border-radius: 20px; object-fit: cover; border: 1px solid var(--border-color);"></video>
                        </div>`;
}
replaceSection('HERO_RIGHT', heroRightHtml);

// 5. Typewriter Words
const typewriterWordsHtml = config.hero.typewriter_words.map(w => `                "${w}"`).join(',\n');
replaceSection('TYPEWRITER_WORDS', typewriterWordsHtml);

// 6. Philosophy Section Title & Cards
const philTitleHtml = `                        <h2>${config.philosophy.title}</h2>`;
replaceSection('PHILOSOPHY_TITLE', philTitleHtml);

const philCardsHtml = config.philosophy.cards.map((card, idx) => {
    return `                        <!-- Card ${idx} -->
                        <div class="spiral-card" data-index="${idx}">
                            <a href="${card.link}">
                                <div class="spiral-card-icon"><i class="${card.icon}"></i></div>
                                <h5>${card.title}</h5>
                                <p>${card.desc}</p>
                                <div class="spiral-card-readmore">
                                    <span>Read more</span>
                                    <span class="stm-amsterdam-arrow"></span>
                                </div>
                            </a>
                        </div>`;
}).join('\n');
replaceSection('PHILOSOPHY_CARDS', philCardsHtml);

// 7. Case Studies Section Title & Companies Accordion
const caseStudiesTitleHtml = `                        <span class="cases-pre-title">CASE STUDIES</span>
                        <h2 class="cases-main-title">${config.case_studies.title}</h2>`;
replaceSection('CASE_STUDIES_TITLE', caseStudiesTitleHtml);

const caseStudiesCompaniesHtml = config.case_studies.companies.map((comp, idx) => {
    const reportsHtml = comp.reports.map(rep => {
        return `                                <a href="${rep.url}" target="_blank" rel="noopener noreferrer" class="btn-report-item">
                                    <i class="far fa-file-pdf"></i>
                                    <span>${rep.name}</span>
                                </a>`;
    }).join('\n');
    
    return `                        <!-- Company ${idx + 1}: ${comp.name} -->
                        <div class="company-card-wrapper" data-case="${idx}">
                            <button class="btn-company-trigger">
                                <span class="company-btn-num">${comp.num}</span>
                                <span class="company-btn-title">${comp.name}</span>
                            </button>
                            <div class="company-reports-dropdown">
${reportsHtml}
                            </div>
                        </div>`;
}).join('\n');
replaceSection('CASE_STUDIES_COMPANIES', caseStudiesCompaniesHtml);

// 8. News Section Display Area & Cards Row
const firstNewsItem = config.news.items[0] || { quote: "", source: "" };
const newsDisplayHtml = `                        <span class="featured-pre-title">FEATURED</span>
                        <h2 class="featured-main-title">${config.news.title}</h2>

                        <div class="featured-quote-container">
                            <blockquote class="featured-quote">"${firstNewsItem.quote}"</blockquote>
                            <cite class="featured-source">— ${firstNewsItem.source}</cite>
                        </div>`;
replaceSection('NEWS_DISPLAY', newsDisplayHtml);

const newsCardsHtml = config.news.items.map((item, idx) => {
    const activeClass = idx === 0 ? ' active' : '';
    let logoHtml = '';
    
    if (item.logo && item.logo.startsWith('inline-svg:')) {
        logoHtml = `                                ${item.logo.substring('inline-svg:'.length)}`;
    } else if (item.logo && (item.logo.endsWith('.svg') || item.logo === '')) {
        logoHtml = `                                <svg viewBox="0 0 104 104" class="svg-logo" xmlns="http://www.w3.org/2000/svg">
                                    <rect width="104" height="104" fill="#ffffff" />
                                    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="12" fill="#111111">${item.label.toUpperCase()}</text>
                                </svg>`;
    } else {
        logoHtml = `                                <img src="${item.logo}" alt="${item.label}" class="logo-icon-img">`;
    }
    
    const wrapperClass = item.wrapperClass ? ` ${item.wrapperClass}` : '';
        
    return `                            <!-- Card ${idx + 1}: ${item.label} -->
                            <div class="featured-logo-card${activeClass}" data-index="${idx}"
                                data-link="${item.link}"
                                data-quote="&ldquo;${item.quote}&rdquo;"
                                data-source="&mdash; ${item.source}">
                                <div class="logo-icon-wrapper${wrapperClass}">
${logoHtml}
                                </div>
                                <span class="logo-card-label">${item.label}</span>
                            </div>`;
}).join('\n');
replaceSection('NEWS_CARDS', newsCardsHtml);

// 9. Testimonials Section Title & Cards Track
const testimonialsTitleHtml = `                    <span class="testimonials-pre-title">Reviews</span>
                    <h2 class="testimonials-main-title">${config.testimonials.title}</h2>`;
replaceSection('TESTIMONIALS_TITLE', testimonialsTitleHtml);

const testimonialsCardsHtml = config.testimonials.items.map((item, idx) => {
    return `                        <!-- Card ${idx + 1} -->
                        <div class="testimonial-card" data-index="${idx}">
                            <div class="testimonial-card-header">
                                <div class="card-dot"></div>
                                <img class="testimonial-avatar" src="${item.avatar || 'testimonials_images/avatar_page_1.jpg'}" alt="${item.name}" />
                            </div>
                            <div class="testimonial-quote">
                                "${item.quote}"
                            </div>
                            <div class="testimonial-author">
                                <h6>${item.name}</h6>
                                <div class="position">${item.position}</div>
                            </div>
                        </div>`;
}).join('\n');
replaceSection('TESTIMONIALS_CARDS', testimonialsCardsHtml);

// 10. Team Section Title & Cards Row
const teamTitleHtml = `                        <h2 class="team-section-heading">
                            ${config.team.title}
                        </h2>`;
replaceSection('TEAM_TITLE', teamTitleHtml);

const teamCardsHtml = config.team.members.map((member, idx) => {
    const linkedinHtml = member.linkedin ? 
        `                                    <a href="${member.linkedin}" target="_blank" rel="noopener noreferrer" class="team-social-link">
                                        <svg viewBox="0 0 24 24" class="team-linkedin-icon">
                                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                        </svg>
                                    </a>` : '';
                                    
    return `                                <div class="team-card">
                                    <div class="team-avatar-wrapper">
                                        <img src="${member.photo || 'profile.jpeg'}" alt="${member.name}" class="team-avatar">
                                    </div>
                                    <div class="team-info">
                                        <h3 class="team-name">${member.name}</h3>
                                        <p class="team-role">${member.role}</p>
${linkedinHtml}
                                    </div>
                                </div>`;
}).join('\n');
replaceSection('TEAM_CARDS', teamCardsHtml);

// 11. FAQ Section Title & List Accordion
const faqTitleHtml = `                <span class="faq-pre-title">COMMON QUERIES</span>
                <h2 class="faq-main-title">${config.faqs.title}</h2>
                <p class="faq-sub-title">Can't find the answer you're looking for? Reach out to us at <a class="faq-email-link">info@intrinsicvalueequity.in</a></p>`;
replaceSection('FAQ_TITLE', faqTitleHtml);

const faqListHtml = config.faqs.items.map((item, idx) => {
    return `                <!-- FAQ Item ${idx + 1} -->
                <div class="faq-item">
                    <div class="faq-question-header">
                        <h3 class="faq-question">${item.question}</h3>
                        <div class="faq-icon">
                            <span class="line horizontal"></span>
                            <span class="line vertical"></span>
                        </div>
                    </div>
                    <div class="faq-accent-bar"></div>
                    <div class="faq-answer">
                        <div class="faq-answer-inner">
                            ${item.answer}
                        </div>
                    </div>
                </div>`;
}).join('\n');
replaceSection('FAQ_LIST', faqListHtml);

// 12. Footer Section Brand & Links
const footerBrandHtml = `                    <p class="footer-desc">
                        ${config.footer.desc}
                    </p>`;
replaceSection('FOOTER_BRAND', footerBrandHtml);

const footerQuickLinksHtml = config.footer.quick_links.map(link => {
    return `                        <li><a href="${link.url}">${link.text}</a></li>`;
}).join('\n');
replaceSection('FOOTER_QUICK_LINKS', footerQuickLinksHtml);

const footerImportantHtml = config.footer.important_info.map(link => {
    return `                        <li><a href="${link.url}">${link.text}</a></li>`;
}).join('\n');
replaceSection('FOOTER_IMPORTANT_INFO', footerImportantHtml);

const footerDisclaimerHtml = `                <div class="footer-disclaimers">
                    <p class="disclaimer-text">
                        ${config.footer.disclaimer}
                    </p>
                </div>`;
replaceSection('FOOTER_DISCLAIMER', footerDisclaimerHtml);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log("Statically compiled index.html successfully!");
