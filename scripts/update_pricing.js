const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../pricing.json');
const pricingHtmlPath = path.join(__dirname, '../pricing.html');
const indexHtmlPath = path.join(__dirname, '../index.html');

if (!fs.existsSync(configPath)) {
    console.error("pricing.json not found!");
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Helper function to compile files
function compileFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return;
    }
    
    let html = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
    
    function replaceSection(sectionName, newContent) {
        const startMarker = `<!-- CMS_${sectionName}_START -->`;
        const endMarker = `<!-- CMS_${sectionName}_END -->`;
        
        const startIndex = html.indexOf(startMarker);
        const endIndex = html.indexOf(endMarker);
        
        if (startIndex === -1 || endIndex === -1) {
            return;
        }
        
        const before = html.substring(0, startIndex + startMarker.length);
        const after = html.substring(endIndex);
        
        html = before + "\n" + newContent + "\n" + after;
    }
    
    // 0. Compile Styles block
    let stylesHtml = '';
    if (config.layout_styles) {
        stylesHtml = '<style id="cms-compiled-pricing-styles">\n';
        for (const selector in config.layout_styles) {
            let rules = config.layout_styles[selector];
            let cssSelector = selector;
            if (selector === 'pricing-title') cssSelector = '.cms-pricing-title';
            else if (selector === 'pricing-subtitle') cssSelector = '.cms-pricing-subtitle';
            else if (selector === 'pricing-page-section') cssSelector = '.pricing-page-section';
            else if (selector === 'pricing-card-3d') cssSelector = '.pricing-card-3d';
            else if (selector === 'comparison-table-wrapper') cssSelector = '.comparison-table-wrapper';
            
            stylesHtml += `    ${cssSelector} {\n        ${rules}\n    }\n`;
        }
        stylesHtml += '</style>';
    }
    replaceSection('PRICING_STYLES', stylesHtml);

    // 1. Pricing Title and Subtitle (if markers exist)
    replaceSection('PRING_TITLE', `<h1 class="cms-pricing-title cms-editable-highlight" data-field="pricing_title">${config.pricing_title}</h1>`);
    replaceSection('PRICING_TITLE', `<h1 class="cms-pricing-title cms-editable-highlight" data-field="pricing_title">${config.pricing_title}</h1>`);
    replaceSection('PRICING_SUBTITLE', `<p class="cms-pricing-subtitle cms-editable-highlight" data-field="pricing_subtitle">${config.pricing_subtitle}</p>`);
    
    replaceSection('COMPARISON_TITLE', `<h2 class="comparison-main-title cms-editable-highlight" data-field="comparison_title">${config.comparison_title}</h2>`);
    replaceSection('COMPARISON_SUBTITLE', `<p class="comparison-subtitle cms-editable-highlight" data-field="comparison_subtitle">${config.comparison_subtitle}</p>`);
    
    // 2. Pricing Cards Grid
    const cardsHtml = config.cards.map((card, idx) => {
        const startAttr = card.discount_start ? ` data-start="${card.discount_start}"` : '';
        const endAttr = card.discount_end ? ` data-end="${card.discount_end}"` : '';
        return `                        <!-- Plan ${idx + 1}: ${card.name} -->
                        <div class="pricing-card-3d" data-index="${idx}"${startAttr}${endAttr} style="opacity: 1; transform: none;">
                            <div class="pricing-card-glow"></div>
                            <div class="pricing-card-header">
                                <h3 class="pricing-plan-name cms-editable-highlight" data-field="cards.${idx}.name">${card.name}</h3>

                                <div class="pricing-meta-item">
                                    <span class="pricing-meta-label">MINIMUM CAPITAL</span>
                                    <span class="pricing-meta-value cms-editable-highlight" data-field="cards.${idx}.min_capital">${card.min_capital}</span>
                                </div>

                                <div class="pricing-card-divider"></div>

                                <div class="pricing-price-box">
                                    <span class="pricing-price cms-editable-highlight" data-field="cards.${idx}.price_display">${card.price_display}</span>
                                </div>

                                <div class="pricing-duration cms-editable-highlight" data-field="cards.${idx}.duration">${card.duration}</div>

                                <div class="pricing-card-divider"></div>
                            </div>
                            <div class="pricing-card-footer">
                                <button class="btn-pricing-scroll" onclick="document.getElementById('comparison-section').scrollIntoView({ behavior: 'smooth' })">READ MORE</button>
                            </div>
                        </div>`;
    }).join('\n\n');
    replaceSection('PRICING_CARDS', cardsHtml);
    
    // 3. Comparison Table HTML
    let tableHtml = `<table class="comparison-table show-plan-1">
                            <thead>
                                <tr>
                                    <th>Parameters</th>\n`;
    
    config.table_plans.forEach((plan, idx) => {
        const isHighlight = plan.highlight || idx === 1;
        const highlightClass = isHighlight ? ' class="highlight-col"' : '';
        tableHtml += `                                    <th${highlightClass}><span class="cms-editable-highlight" data-field="table_plans.${idx}.name">${plan.name}</span></th>\n`;
    });
    tableHtml += `                                </tr>
                            </thead>
                            <tbody>\n`;
    
    config.parameters.forEach(param => {
        tableHtml += `                                <tr>
                                    <td class="param-name">${param}</td>\n`;
        config.table_plans.forEach((plan, idx) => {
            const isHighlight = plan.highlight || idx === 1;
            const highlightClass = isHighlight ? ' class="highlight-col"' : '';
            const val = plan.values[param] || '—';
            tableHtml += `                                    <td${highlightClass}>${val}</td>\n`;
        });
        tableHtml += `                                </tr>\n`;
    });
    
    // Action Row
    tableHtml += `                                <tr class="action-row">
                                    <td class="param-name"></td>\n`;
    config.table_plans.forEach((plan, idx) => {
        const isHighlight = plan.highlight || idx === 1;
        const highlightClass = isHighlight ? ' class="highlight-col"' : '';
        tableHtml += `                                    <td${highlightClass}>
                                        <a href="${plan.cta_link}" target="_blank" rel="noopener noreferrer" class="table-btn">Subscribe Now</a>
                                    </td>\n`;
    });
    tableHtml += `                                </tr>
                            </tbody>
                        </table>`;
                        
    replaceSection('COMPARISON_TABLE', tableHtml);
    
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`Successfully compiled pricing data to: ${path.basename(filePath)}`);
}

compileFile(pricingHtmlPath);
compileFile(indexHtmlPath);

// Sync analytics lock redirects
function updateAnalyticsJsFiles() {
    const unlockUrl = config.analytics_unlock_url || "https://shrtn.in/qE6X3H";
    console.log(`Syncing analytics lock redirects to URL: ${unlockUrl}`);

    const navJsPath = path.join(__dirname, '../analytics/frontend/js/navigation.js');
    const dashJsPath = path.join(__dirname, '../analytics/frontend/js/modules/dashboard.js');

    if (fs.existsSync(navJsPath)) {
        let navJsContent = fs.readFileSync(navJsPath, 'utf8');
        navJsContent = navJsContent.replace(/overlay\.href\s*=\s*"https?:\/\/[^"]+"/g, `overlay.href = "${unlockUrl}"`);
        navJsContent = navJsContent.replace(/window\.location\.href\s*=\s*"https?:\/\/[^"]+"/g, `window.location.href = "${unlockUrl}"`);
        fs.writeFileSync(navJsPath, navJsContent, 'utf8');
        console.log("Successfully updated analytics/frontend/js/navigation.js");
    }

    if (fs.existsSync(dashJsPath)) {
        let dashJsContent = fs.readFileSync(dashJsPath, 'utf8');
        dashJsContent = dashJsContent.replace(/window\.location\.href\s*=\s*"https?:\/\/[^"]+"/g, `window.location.href = "${unlockUrl}"`);
        fs.writeFileSync(dashJsPath, dashJsContent, 'utf8');
        console.log("Successfully updated analytics/frontend/js/modules/dashboard.js");
    }
}

updateAnalyticsJsFiles();

console.log("Pricing Static Compilation finished successfully.");

