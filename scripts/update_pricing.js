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
    
    // 1. Pricing Title and Subtitle (if markers exist)
    replaceSection('PRING_TITLE', `<h1 style="font-size: clamp(32px, 5vw, 44px); font-weight: 800; color: var(--text-primary); margin: 0 0 12px 0; letter-spacing: -0.5px;">${config.pricing_title}</h1>`);
    // Fallback spelling
    replaceSection('PRICING_TITLE', `<h1 style="font-size: clamp(32px, 5vw, 44px); font-weight: 800; color: var(--text-primary); margin: 0 0 12px 0; letter-spacing: -0.5px;">${config.pricing_title}</h1>`);
    
    replaceSection('PRICING_SUBTITLE', `<p style="color: var(--text-muted); font-size: 16px; max-width: 600px; margin: 0 auto; line-height: 1.6;">${config.pricing_subtitle}</p>`);
    
    replaceSection('COMPARISON_TITLE', `<h2 class="comparison-main-title">${config.comparison_title}</h2>`);
    replaceSection('COMPARISON_SUBTITLE', `<p class="comparison-subtitle">${config.comparison_subtitle}</p>`);
    
    // 2. Pricing Cards Grid
    const cardsHtml = config.cards.map((card, idx) => {
        return `                        <!-- Plan ${idx + 1}: ${card.name} -->
                        <div class="pricing-card-3d" data-index="${idx}" style="opacity: 1; transform: none;">
                            <div class="pricing-card-glow"></div>
                            <div class="pricing-card-header">
                                <h3 class="pricing-plan-name">${card.name}</h3>

                                <div class="pricing-meta-item">
                                    <span class="pricing-meta-label">MINIMUM CAPITAL</span>
                                    <span class="pricing-meta-value">${card.min_capital}</span>
                                </div>

                                <div class="pricing-card-divider"></div>

                                <div class="pricing-price-box">
                                    <span class="pricing-price">${card.price_display}</span>
                                </div>

                                <div class="pricing-duration">${card.duration}</div>

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
        tableHtml += `                                    <th${highlightClass}>${plan.name}</th>\n`;
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
console.log("Pricing Static Compilation finished successfully.");
