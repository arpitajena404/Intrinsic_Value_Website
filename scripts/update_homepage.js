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
    
    if (sectionName === 'TYPEWRITER_WORDS' || sectionName === 'GRIEVANCE_DATA') {
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

// 0. Compile Styles block
let stylesHtml = '';
if (config.layout_styles) {
    stylesHtml = '<style id="cms-compiled-homepage-styles">\n';
    for (const selector in config.layout_styles) {
        let rules = config.layout_styles[selector];
        let cssSelector = selector;
        if (selector === 'hero-section') cssSelector = '.iv-hero';
        else if (selector === 'hero-title') cssSelector = '.iv-hero-h1';
        else if (selector === 'hero-desc') cssSelector = '.iv-hero-desc';
        else if (selector === 'philosophy-card') cssSelector = '.spiral-card';
        else if (selector === 'testimonial-card') cssSelector = '.testimonial-card';
        else if (selector === 'team-card') cssSelector = '.team-card';
        else if (selector === 'faq-item') cssSelector = '.faq-item';
        
        stylesHtml += `    ${cssSelector} {\n        ${rules}\n    }\n`;
    }
    stylesHtml += '</style>';
}
replaceSection('HOMEPAGE_STYLES', stylesHtml);

// 1. Navigation Menu
function generateNavHtml(prefix) {
    return config.navigation.map(link => {
        const isAbsolute = /^(?:https?:)?\/\//i.test(link.url) || link.url.startsWith('/') || link.url.startsWith('#');
        const url = isAbsolute ? link.url : (prefix + link.url);
        const targetAttr = link.new_tab ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `                    <li><a href="${url}" class="nav-link"${targetAttr}>${link.text}</a></li>`;
    }).join('\n');
}
const navHtml = generateNavHtml('');
replaceSection('NAV', navHtml);

// 2. Hero Left Column
const heroCtaTarget = config.hero.cta_new_tab ? ' target="_blank" rel="noopener noreferrer"' : '';
const heroLeftHtml = `                        <div class="iv-hero-tag cms-editable-highlight" data-field="hero.tag">${config.hero.tag}</div>

                        <h1 class="iv-hero-h1 cms-editable-highlight" data-field="hero.heading_html">
                            ${config.hero.heading_html}
                        </h1>

                        <div class="iv-hero-bar"></div>

                        <p class="iv-hero-desc cms-editable-highlight" data-field="hero.desc1">
                            ${config.hero.desc1}
                        </p>

                        <p class="iv-hero-desc iv-hero-desc-2 cms-editable-highlight" data-field="hero.desc2">
                            ${config.hero.desc2}
                        </p>

                        <a href="${config.hero.cta_url}"${heroCtaTarget} class="iv-hero-cta cms-editable-highlight" data-field="hero.cta_text">
                            ${config.hero.cta_text}
                            <span class="iv-hero-cta-arrow">&rarr;</span>
                        </a>

                        <div class="iv-sebi-badge cms-editable-highlight" data-field="hero.sebi_badge">${config.hero.sebi_badge}</div>`;
replaceSection('HERO_LEFT', heroLeftHtml);

// 3. Hero Stats HTML Generator
function generateStatsHtml() {
    return config.hero.stats.map((stat, idx) => {
        const divider = idx < config.hero.stats.length - 1 ? '\n                            <div class="iv-stat-divider"></div>\n' : '';
        return `                            <!-- Stat Item ${idx+1} -->
                            <div class="iv-stat-item">
                                <div class="iv-stat-num"><span class="count-up" data-target="${stat.num}">0</span>${stat.suffix}</div>
                                <div class="iv-stat-label cms-editable-highlight" data-field="hero.stats.${idx}.label">${stat.label}</div>
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
const philTitleHtml = `                        <h2 class="cms-editable-highlight" data-field="philosophy.title">${config.philosophy.title}</h2>`;
replaceSection('PHILOSOPHY_TITLE', philTitleHtml);

const philCardsHtml = config.philosophy.cards.map((card, idx) => {
    const targetAttr = card.new_tab ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `                        <!-- Card ${idx} -->
                        <div class="spiral-card" data-index="${idx}">
                            <a href="${card.link}"${targetAttr}>
                                <div class="spiral-card-icon"><i class="${card.icon}"></i></div>
                                <h5 class="cms-editable-highlight" data-field="philosophy.cards.${idx}.title">${card.title}</h5>
                                <p class="cms-editable-highlight" data-field="philosophy.cards.${idx}.desc">${card.desc}</p>
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
                        <h2 class="cases-main-title cms-editable-highlight" data-field="case_studies.title">${config.case_studies.title}</h2>`;
replaceSection('CASE_STUDIES_TITLE', caseStudiesTitleHtml);

const rowCardsHtml = config.case_studies.companies.map((comp, globalIdx) => {
    const reportsHtml = comp.reports.map((rep, rIdx) => {
        const targetAttr = rep.new_tab !== false ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `                                    <a href="${rep.url}"${targetAttr} class="btn-report-item">
                                        <i class="far fa-file-pdf"></i>
                                        <span>${rep.name}</span>
                                    </a>`;
    }).join('\n');
    
    const logoTriggerHtml = comp.logo ? `
                                    <div class="company-trigger-logo-wrapper">
                                        <img src="${comp.logo}" class="company-trigger-logo" alt="${comp.name}">
                                    </div>` : `
                                    <div class="company-trigger-logo-wrapper placeholder-badge">
                                        <span class="company-btn-num-large">${comp.num}</span>
                                    </div>`;
    
    const headerLogoHtml = comp.logo ? `
                                <div class="reports-header-logo-wrapper">
                                    <img src="${comp.logo}" class="reports-header-logo" alt="${comp.name}">
                                </div>` : '';
    
    return `                        <!-- Company ${globalIdx + 1}: ${comp.name} -->
                        <div class="company-card-wrapper" data-case="${globalIdx}">
                            <button class="btn-company-trigger" aria-label="Open ${comp.name} reports">
                                <div class="company-trigger-num">${comp.num}</div>
                                ${logoTriggerHtml}
                            </button>
                            <div class="company-reports-dropdown">
                                <button class="btn-close-reports" aria-label="Close reports">&times;</button>
                                <div class="reports-expanded-header">
                                    ${headerLogoHtml}
                                    <div class="reports-list-title">${comp.name}</div>
                                </div>
                                <div class="reports-links-container">
${reportsHtml}
                                </div>
                            </div>
                        </div>`;
}).join('\n');

const caseStudiesCompaniesHtml = `                    <div class="cases-row-container">\n${rowCardsHtml}\n                    </div>`;
replaceSection('CASE_STUDIES_COMPANIES', caseStudiesCompaniesHtml);

// 8. News Section Display Area & Cards Row
const firstNewsItem = config.news.items[0] || { quote: "", source: "" };
const newsDisplayHtml = `                        <span class="featured-pre-title">FEATURED</span>
                        <h2 class="featured-main-title cms-editable-highlight" data-field="news.title">${config.news.title}</h2>

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
    const newTabAttr = item.new_tab !== false ? 'true' : 'false';
        
    return `                            <!-- Card ${idx + 1}: ${item.label} -->
                            <div class="featured-logo-card${activeClass}" data-index="${idx}"
                                data-link="${item.link}"
                                data-new-tab="${newTabAttr}"
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
                    <h2 class="testimonials-main-title cms-editable-highlight" data-field="testimonials.title">${config.testimonials.title}</h2>`;
replaceSection('TESTIMONIALS_TITLE', testimonialsTitleHtml);

const testimonialsCardsHtml = config.testimonials.items.map((item, idx) => {
    return `                        <!-- Card ${idx + 1} -->
                        <div class="testimonial-card" data-index="${idx}">
                            <div class="testimonial-card-header">
                                <div class="card-dot"></div>
                                <img class="testimonial-avatar" src="${item.avatar || 'testimonials_images/avatar_page_1.jpg'}" alt="${item.name}" />
                            </div>
                            <div class="testimonial-quote cms-editable-highlight" data-field="testimonials.items.${idx}.quote">
                                "${item.quote}"
                            </div>
                            <div class="testimonial-author">
                                <h6 class="cms-editable-highlight" data-field="testimonials.items.${idx}.name">${item.name}</h6>
                                <div class="position cms-editable-highlight" data-field="testimonials.items.${idx}.position">${item.position}</div>
                            </div>
                        </div>`;
}).join('\n');
replaceSection('TESTIMONIALS_CARDS', testimonialsCardsHtml);

// 10. Team Section Title & Cards Row
const teamTitleHtml = `                        <h2 class="team-section-heading cms-editable-highlight" data-field="team.title">
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
                                        <h3 class="team-name cms-editable-highlight" data-field="team.members.${idx}.name">${member.name}</h3>
                                        <p class="team-role cms-editable-highlight" data-field="team.members.${idx}.role">${member.role}</p>
${linkedinHtml}
                                    </div>
                                </div>`;
}).join('\n');
replaceSection('TEAM_CARDS', teamCardsHtml);

// 11. FAQ Section Title & List Accordion
const faqTitleHtml = `                <span class="faq-pre-title">COMMON QUERIES</span>
                <h2 class="faq-main-title cms-editable-highlight" data-field="faqs.title">${config.faqs.title}</h2>
                <p class="faq-sub-title">Can't find the answer you're looking for? Reach out to us at <a class="faq-email-link">info@intrinsicvalueequity.in</a></p>`;
replaceSection('FAQ_TITLE', faqTitleHtml);

const faqListHtml = config.faqs.items.map((item, idx) => {
    return `                <!-- FAQ Item ${idx + 1} -->
                <div class="faq-item">
                    <div class="faq-question-header">
                        <h3 class="faq-question cms-editable-highlight" data-field="faqs.items.${idx}.question">${item.question}</h3>
                        <div class="faq-icon">
                            <span class="line horizontal"></span>
                            <span class="line vertical"></span>
                        </div>
                    </div>
                    <div class="faq-accent-bar"></div>
                    <div class="faq-answer">
                        <div class="faq-answer-inner cms-editable-highlight" data-field="faqs.items.${idx}.answer">
                            ${item.answer}
                        </div>
                    </div>
                </div>`;
}).join('\n');
replaceSection('FAQ_LIST', faqListHtml);

// 12. Footer Section Brand & Links
const footerBrandHtml = `                    <p class="footer-desc cms-editable-highlight" data-field="footer.desc">
                        ${config.footer.desc}
                    </p>`;
replaceSection('FOOTER_BRAND', footerBrandHtml);

const footerQuickLinksHtml = config.footer.quick_links.map(link => {
    const targetAttr = link.new_tab ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `                        <li><a href="${link.url}"${targetAttr}>${link.text}</a></li>`;
}).join('\n');
replaceSection('FOOTER_QUICK_LINKS', footerQuickLinksHtml);

const footerImportantHtml = config.footer.important_info.map(link => {
    const targetAttr = link.new_tab ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `                        <li><a href="${link.url}"${targetAttr}>${link.text}</a></li>`;
}).join('\n');
replaceSection('FOOTER_IMPORTANT_INFO', footerImportantHtml);

const footerBottomHtml = `            <div class="footer-bottom">
                <div class="footer-disclaimers">
                    <p class="disclaimer-text cms-editable-highlight" data-field="footer.disclaimer_p1">
                        ${config.footer.disclaimer_p1}
                    </p>
                    <p class="disclaimer-text cms-editable-highlight" data-field="footer.disclaimer_p2">
                        ${config.footer.disclaimer_p2}
                    </p>
                </div>
                <div class="footer-copyright">
                    <p>&copy; <span class="cms-editable-highlight" data-field="footer.copyright_year">${config.footer.copyright_year}</span> Intrinsic Value Equity Advisors. All rights reserved.</p>
                </div>
            </div>`;
replaceSection('FOOTER_BOTTOM', footerBottomHtml);

// 13. Footer Apps
const playStoreTarget = config.footer.apps?.play_store?.new_tab !== false ? ' target="_blank" rel="noopener noreferrer"' : '';
const appStoreTarget = config.footer.apps?.app_store?.new_tab !== false ? ' target="_blank" rel="noopener noreferrer"' : '';

const footerAppsHtml = `                    <div class="app-download-buttons">
                        <a href="${config.footer.apps?.play_store?.url || '#'}"${playStoreTarget} class="app-store-btn" aria-label="Get it on Google Play">
                            <svg class="store-icon" viewBox="0 0 512 512">
                                <path fill="#34A853" d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z" />
                                <path fill="#4285F4" d="M47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0z" />
                                <path fill="#EA4335" d="M425.2 225.6l-58 33.3 60.1 60.1L479 321.8c13-7.5 21.7-20.7 21.7-36.2s-8.7-28.7-21.7-36.2l-6.8-4z" />
                                <path fill="#FBBC05" d="M325.3 277.7l60.1 60.1L104.6 499l220.7-221.3z" />
                            </svg>
                            <div class="btn-label">
                                <span class="btn-subtext">GET IT ON</span>
                                <span class="btn-maintext">Google Play</span>
                            </div>
                        </a>
                        <a href="${config.footer.apps?.app_store?.url || '#'}"${appStoreTarget} class="app-store-btn" aria-label="Download on the App Store">
                            <svg class="store-icon" viewBox="0 0 384 512">
                                <defs>
                                    <linearGradient id="apple-store-blue" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stop-color="#00c6ff" />
                                        <stop offset="100%" stop-color="#007aff" />
                                    </linearGradient>
                                </defs>
                                <path fill="url(#apple-store-blue)" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 51 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 47.5-24.4 76.5 26.9 2.4 51.2-16 68.3-38.9z" />
                            </svg>
                            <div class="btn-label">
                                <span class="btn-subtext">Download on the</span>
                                <span class="btn-maintext">App Store</span>
                            </div>
                        </a>
                    </div>`;
replaceSection('FOOTER_APPS', footerAppsHtml);

// 14. Footer Contact Bar
const phoneLinksHtml = (config.footer.contact?.phones || []).map(p => {
    const cleanPhone = p.replace(/\s+/g, '');
    return `                        <a href="tel:${cleanPhone}" class="contact-link">${p}</a>`;
}).join('\n');

const timingSpansHtml = (config.footer.contact?.timings || []).map(t => {
    return `                        <span>${t}</span>`;
}).join('\n');

const footerContactHtml = `            <div class="footer-contact-bar">
                <div class="contact-item">
                    <div class="contact-icon-wrapper">
                        <svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                    </div>
                    <div class="contact-text">
${phoneLinksHtml}
                    </div>
                </div>
                <div class="contact-item">
                    <div class="contact-icon-wrapper">
                        <svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                    </div>
                    <div class="contact-text">
                        <a href="mailto:${config.footer.contact?.email || ''}" class="contact-link cms-editable-highlight" data-field="footer.contact.email">${config.footer.contact?.email || ''}</a>
                    </div>
                </div>
                <div class="contact-item contact-item-address">
                    <div class="contact-icon-wrapper">
                        <svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                    </div>
                    <div class="contact-text">
                        <span class="cms-editable-highlight" data-field="footer.contact.address">${config.footer.contact?.address || ''}</span>
                    </div>
                </div>
                <div class="contact-item">
                    <div class="contact-icon-wrapper">
                        <svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    </div>
                    <div class="contact-text">
${timingSpansHtml}
                    </div>
                </div>
            </div>`;
replaceSection('FOOTER_CONTACT', footerContactHtml);

// 15. Compliance Years Options
const yearsHtml = (config.compliance?.years || ["2022", "2023", "2024", "2025", "2026"]).map(y => {
    const selected = y === "2026" ? " selected" : "";
    return `                                        <option value="${y}"${selected}>${y}</option>`;
}).join('\n');
replaceSection('REGULATORY_YEARS', yearsHtml);

// 16. Compliance Audits
const auditsHtml = (config.compliance?.audits || []).map((audit, idx) => {
    const badgeClass = audit.status === "Pending" ? "pending" : "conducted";
    return `                                        <tr>
                                            <td>${idx + 1}</td>
                                            <td>${audit.fy}</td>
                                            <td><span class="status-badge ${badgeClass}">${audit.status}</span></td>
                                            <td>${audit.remarks || 'N/A'}</td>
                                        </tr>`;
}).join('\n');
replaceSection('REGULATORY_AUDITS', auditsHtml);

// 17. Client-side Grievance Complaints Database
const grievanceDataHtml = `        const GRIEVANCE_DATA = ${JSON.stringify(config.compliance?.grievances || {}, null, 8)};`;
replaceSection('GRIEVANCE_DATA', grievanceDataHtml);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log("Statically compiled index.html successfully!");

// Compile navigation menu for all other HTML pages
const navRegex = /([\t ]*)<li><a href="(?:\.\.\/)?pricing\.html"[^>]*>Service<\/a><\/li>\s*<li><a href="(?:\.\.\/)?about\.html"[^>]*>About Us<\/a><\/li>\s*<li><a href="(?:\.\.\/)?blogs\.html"[^>]*>Blogs<\/a><\/li>\s*<li><a href="(?:\.\.\/)?analytics\/index\.html"[^>]*>Analytics<\/a><\/li>/;

function updateAllPagesNavigation() {
    const rootDir = path.join(__dirname, '..');
    
    function walkAndFindHtml(dir, fileList = []) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                if (file !== '.git' && file !== 'node_modules' && file !== 'analytics' && file !== 'CS reports') {
                    walkAndFindHtml(filePath, fileList);
                }
            } else if (file.endsWith('.html')) {
                fileList.push(filePath);
            }
        }
        return fileList;
    }

    const htmlFiles = walkAndFindHtml(rootDir);
    
    for (const filePath of htmlFiles) {
        // Skip index.html since we updated it via main loop
        if (path.resolve(filePath) === path.resolve(htmlPath)) {
            continue;
        }
        
        let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
        let modified = false;
        
        // 1. Inject markers if they don't exist but the standard nav links are there
        if (!content.includes('CMS_NAV_START')) {
            const match = content.match(navRegex);
            if (match) {
                const spaces = match[1] || '';
                const blockToReplace = match[0];
                const replacement = `\n${spaces}<!-- CMS_NAV_START -->\n${blockToReplace}\n${spaces}<!-- CMS_NAV_END -->`;
                content = content.replace(blockToReplace, replacement);
                modified = true;
                console.log(`Injected navigation markers into: ${path.relative(rootDir, filePath)}`);
            }
        }
        
        // 2. If it has markers now, update the navigation content
        if (content.includes('CMS_NAV_START')) {
            const startMarker = '<!-- CMS_NAV_START -->';
            const endMarker = '<!-- CMS_NAV_END -->';
            const startIndex = content.indexOf(startMarker);
            const endIndex = content.indexOf(endMarker);
            
            if (startIndex !== -1 && endIndex !== -1) {
                const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
                const depth = relPath.split('/').length - 1;
                const prefix = '../'.repeat(depth);
                
                const relativeNavHtml = generateNavHtml(prefix);
                
                const before = content.substring(0, startIndex + startMarker.length);
                const after = content.substring(endIndex);
                
                content = before + "\n" + relativeNavHtml + "\n" + after;
                modified = true;
                console.log(`Updated navigation in: ${path.relative(rootDir, filePath)}`);
            }
        }
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
        }
    }
}

updateAllPagesNavigation();

function updateAllPagesFooterBottom() {
    const rootDir = path.join(__dirname, '..');
    
    function walkAndFindHtml(dir, fileList = []) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                if (file !== '.git' && file !== 'node_modules' && file !== 'analytics' && file !== 'CS reports') {
                    walkAndFindHtml(filePath, fileList);
                }
            } else if (file.endsWith('.html')) {
                fileList.push(filePath);
            }
        }
        return fileList;
    }
    const htmlFiles = walkAndFindHtml(rootDir);
    for (const filePath of htmlFiles) {
        let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
        let modified = false;
        
        // 1. Inject markers if they don't exist
        if (!content.includes('CMS_FOOTER_BOTTOM_START')) {
            const startIdx = content.indexOf('<div class="footer-bottom">');
            const endIdx = content.indexOf('</footer>');
            if (startIdx !== -1 && endIdx !== -1) {
                const lastDivIdx = content.lastIndexOf('</div>', endIdx - 1);
                const footerBottomCloseIdx = content.lastIndexOf('</div>', lastDivIdx - 1) + '</div>'.length;
                
                if (footerBottomCloseIdx > startIdx) {
                    const before = content.substring(0, startIdx);
                    const blockToReplace = content.substring(startIdx, footerBottomCloseIdx);
                    const after = content.substring(footerBottomCloseIdx);
                    
                    content = before + `<!-- CMS_FOOTER_BOTTOM_START -->\n` + blockToReplace + `\n<!-- CMS_FOOTER_BOTTOM_END -->` + after;
                    modified = true;
                    console.log(`Injected footer bottom markers into: ${path.relative(rootDir, filePath)}`);
                }
            }
        }
        
        // 2. Update footer bottom content
        if (content.includes('CMS_FOOTER_BOTTOM_START')) {
            const startMarker = '<!-- CMS_FOOTER_BOTTOM_START -->';
            const endMarker = '<!-- CMS_FOOTER_BOTTOM_END -->';
            const startIndex = content.indexOf(startMarker);
            const endIndex = content.indexOf(endMarker);
            
            if (startIndex !== -1 && endIndex !== -1) {
                const spaces = '            ';
                const compiledFooterBottom = `${spaces}<div class="footer-bottom">
                    <div class="footer-disclaimers">
                        <p class="disclaimer-text cms-editable-highlight" data-field="footer.disclaimer_p1">
                            ${config.footer.disclaimer_p1}
                        </p>
                        <p class="disclaimer-text cms-editable-highlight" data-field="footer.disclaimer_p2">
                            ${config.footer.disclaimer_p2}
                        </p>
                    </div>
                    <div class="footer-copyright">
                        <p>&copy; <span class="cms-editable-highlight" data-field="footer.copyright_year">${config.footer.copyright_year}</span> Intrinsic Value Equity Advisors. All rights reserved.</p>
                    </div>
                </div>`;
                
                const before = content.substring(0, startIndex + startMarker.length);
                const after = content.substring(endIndex);
                
                content = before + "\n" + compiledFooterBottom + "\n" + after;
                modified = true;
                console.log(`Updated footer bottom in: ${path.relative(rootDir, filePath)}`);
            }
        }
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
        }
    }
}

updateAllPagesFooterBottom();

// 14. Generate sitemap.xml dynamically
function generateSitemap() {
    console.log("Generating sitemap.xml...");
    const staticPages = [
        '',
        'about',
        'blogs',
        'pricing',
        'nikhil-gangil-indian-value-investor'
    ];
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Add static pages
    staticPages.forEach(page => {
        xml += `  <url>\n`;
        xml += `    <loc>https://intrinsicvalueequity.in/${page}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>${page === '' ? '1.0' : '0.8'}</priority>\n`;
        xml += `  </url>\n`;
    });
    
    // Add dynamic blog pages from blogs.json
    const blogsPath = path.join(__dirname, '../blogs.json');
    if (fs.existsSync(blogsPath)) {
        try {
            const blogs = JSON.parse(fs.readFileSync(blogsPath, 'utf8'));
            blogs.forEach(blog => {
                if (blog.slug) {
                    xml += `  <url>\n`;
                    xml += `    <loc>https://intrinsicvalueequity.in/blog-detail?post=${encodeURIComponent(blog.slug)}</loc>\n`;
                    xml += `    <lastmod>${today}</lastmod>\n`;
                    xml += `    <changefreq>monthly</changefreq>\n`;
                    xml += `    <priority>0.6</priority>\n`;
                    xml += `  </url>\n`;
                }
            });
        } catch (e) {
            console.error("Error reading blogs.json for sitemap:", e);
        }
    }
    
    xml += `</urlset>\n`;
    const sitemapPath = path.join(__dirname, '../sitemap.xml');
    fs.writeFileSync(sitemapPath, xml, 'utf8');
    console.log("Successfully compiled sitemap.xml!");
}

generateSitemap();
