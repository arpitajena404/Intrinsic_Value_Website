(function () {
    if (window.self === window.top) {
        // Not running inside iframe, exit
        return;
    }

    console.log("[CMS Preview] Visual Inline Controller loaded inside iframe.");

    var homepageConfig = null;
    var pricingConfig = null;
    var highlightStyles = null;
    var activePopover = null;
    var isHighlightEnabled = true;

    // Helper to set nested key value in object (e.g. "hero.tag")
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

    // Helper to get nested key value
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

    // Toggle highlight outlines dynamically
    function setHighlightMode(enabled) {
        isHighlightEnabled = enabled;
        if (enabled) {
            if (!highlightStyles) {
                highlightStyles = document.createElement('style');
                highlightStyles.id = 'cms-injected-highlights';
                highlightStyles.innerHTML = '\n' +
                    '                    .cms-editable-highlight {\n' +
                    '                        outline: 2px dashed #FF8C00 !important;\n' +
                    '                        outline-offset: 4px !important;\n' +
                    '                        box-shadow: 0 0 15px rgba(255, 140, 0, 0.4) !important;\n' +
                    '                        cursor: pointer !important;\n' +
                    '                        position: relative !important;\n' +
                    '                        transition: all 0.2s ease !important;\n' +
                    '                    }\n' +
                    '                    .cms-editable-highlight:hover {\n' +
                    '                        outline-color: #E6B53D !important;\n' +
                    '                        box-shadow: 0 0 25px rgba(230, 181, 61, 0.7) !important;\n' +
                    '                    }\n' +
                    '                    .cms-editable-highlight::after {\n' +
                    '                        content: "✏️ Edit";\n' +
                    '                        position: absolute;\n' +
                    '                        top: -24px;\n' +
                    '                        right: 4px;\n' +
                    '                        background: #FF8C00;\n' +
                    '                        color: #000;\n' +
                    '                        font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;\n' +
                    '                        font-size: 10px;\n' +
                    '                        font-weight: 800;\n' +
                    '                        padding: 2px 6px;\n' +
                    '                        border-radius: 4px 4px 0 0;\n' +
                    '                        z-index: 9999;\n' +
                    '                        pointer-events: none;\n' +
                    '                        opacity: 0;\n' +
                    '                        transition: opacity 0.2s ease;\n' +
                    '                    }\n' +
                    '                    .cms-editable-highlight:hover::after {\n' +
                    '                        opacity: 1;\n' +
                    '                    }\n' +
                    '                    /* Inline contenteditable focused glow */\n' +
                    '                    [contenteditable="true"]:focus {\n' +
                    '                        outline: none !important;\n' +
                    '                        box-shadow: 0 0 0 2px rgba(255, 140, 0, 0.5) !important;\n' +
                    '                        background: rgba(255, 140, 0, 0.05) !important;\n' +
                    '                        border-radius: 4px !important;\n' +
                    '                    }\n' +
                    '                    /* Inline popover styles */\n' +
                    '                    .cms-inline-popover {\n' +
                    '                        position: absolute;\n' +
                    '                        width: 320px;\n' +
                    '                        background: #111111;\n' +
                    '                        border: 1px solid #FF8C00;\n' +
                    '                        border-radius: 12px;\n' +
                    '                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 140, 0, 0.2);\n' +
                    '                        z-index: 100000;\n' +
                    '                        font-family: system-ui, -apple-system, sans-serif;\n' +
                    '                        color: #ffffff;\n' +
                    '                        padding: 12px;\n' +
                    '                        box-sizing: border-box;\n' +
                    '                        animation: popoverFadeIn 0.2s ease-out forwards;\n' +
                    '                    }\n' +
                    '                    @keyframes popoverFadeIn {\n' +
                    '                        from { opacity: 0; transform: translateY(5px) scale(0.98); }\n' +
                    '                        to { opacity: 1; transform: translateY(0) scale(1); }\n' +
                    '                    }\n' +
                    '                    .cms-popover-header {\n' +
                    '                        font-size: 10px;\n' +
                    '                        text-transform: uppercase;\n' +
                    '                        font-weight: 700;\n' +
                    '                        color: #FF8C00;\n' +
                    '                        margin-bottom: 8px;\n' +
                    '                        letter-spacing: 0.05em;\n' +
                    '                    }\n' +
                    '                    .cms-popover-input {\n' +
                    '                        width: 100%;\n' +
                    '                        background: #1e1e1e;\n' +
                    '                        border: 1px solid rgba(255, 255, 255, 0.1);\n' +
                    '                        border-radius: 6px;\n' +
                    '                        color: #ffffff;\n' +
                    '                        padding: 8px;\n' +
                    '                        font-size: 13px;\n' +
                    '                        box-sizing: border-box;\n' +
                    '                        outline: none;\n' +
                    '                        transition: border-color 0.2s;\n' +
                    '                    }\n' +
                    '                    .cms-popover-input:focus {\n' +
                    '                        border-color: #FF8C00;\n' +
                    '                    }\n' +
                    '                    .cms-popover-textarea {\n' +
                    '                        width: 100%;\n' +
                    '                        height: 80px;\n' +
                    '                        background: #1e1e1e;\n' +
                    '                        border: 1px solid rgba(255, 255, 255, 0.1);\n' +
                    '                        border-radius: 6px;\n' +
                    '                        color: #ffffff;\n' +
                    '                        padding: 8px;\n' +
                    '                        font-size: 13px;\n' +
                    '                        box-sizing: border-box;\n' +
                    '                        outline: none;\n' +
                    '                        resize: vertical;\n' +
                    '                    }\n' +
                    '                    .cms-popover-textarea:focus {\n' +
                    '                        border-color: #FF8C00;\n' +
                    '                    }\n' +
                    '                    .cms-popover-actions {\n' +
                    '                        display: flex;\n' +
                    '                        justify-content: flex-end;\n' +
                    '                        gap: 8px;\n' +
                    '                        margin-top: 10px;\n' +
                    '                    }\n' +
                    '                    .cms-popover-btn {\n' +
                    '                        padding: 6px 12px;\n' +
                    '                        border-radius: 6px;\n' +
                    '                        font-size: 12px;\n' +
                    '                        font-weight: 600;\n' +
                    '                        cursor: pointer;\n' +
                    '                        border: none;\n' +
                    '                        transition: all 0.2s;\n' +
                    '                    }\n' +
                    '                    .cms-popover-save {\n' +
                    '                        background: #FF8C00;\n' +
                    '                        color: #000000;\n' +
                    '                    }\n' +
                    '                    .cms-popover-save:hover {\n' +
                    '                        background: #E6B53D;\n' +
                    '                    }\n' +
                    '                    .cms-popover-cancel {\n' +
                    '                        background: rgba(255, 255, 255, 0.08);\n' +
                    '                        color: #ffffff;\n' +
                    '                        border: 1px solid rgba(255, 255, 255, 0.1);\n' +
                    '                    }\n' +
                    '                    .cms-popover-cancel:hover {\n' +
                    '                        background: rgba(255, 255, 255, 0.15);\n' +
                    '                    }\n' +
                    '                    /* Spacing Widget Arrow */\n' +
                    '                    .cms-popover-arrow {\n' +
                    '                        position: absolute;\n' +
                    '                        width: 0;\n' +
                    '                        height: 0;\n' +
                    '                        border-style: solid;\n' +
                    '                        z-index: 100000;\n' +
                    '                    }\n' +
                    '                    .cms-popover-arrow-bottom {\n' +
                    '                        border-width: 8px 8px 0 8px;\n' +
                    '                        border-color: #FF8C00 transparent transparent transparent;\n' +
                    '                    }\n' +
                    '                    .cms-popover-arrow-top {\n' +
                    '                        border-width: 0 8px 8px 8px;\n' +
                    '                        border-color: transparent transparent #FF8C00 transparent;\n' +
                    '                    }\n';
                document.head.appendChild(highlightStyles);
            }
            
            // Apply contenteditable to fields
            setContentEditableOnFields();
        } else {
            if (highlightStyles) {
                highlightStyles.parentNode.removeChild(highlightStyles);
                highlightStyles = null;
            }
            closeActivePopover();
            
            // Remove contenteditable status when edit mode is toggled off
            setContentEditableOnFields();
        }
    }

    // Set contenteditable status on elements carrying [data-field] and attach input listeners
    function setContentEditableOnFields() {
        var elements = document.querySelectorAll('[data-field]');
        elements.forEach(function (el) {
            var field = el.getAttribute('data-field');
            if (field.indexOf('navigation') === 0) {
                el.removeAttribute('contenteditable');
                return;
            }

            if (isHighlightEnabled) {
                el.setAttribute('contenteditable', 'true');
                
                // Add keydown listener to prevent enter keys for single line elements
                if (!el.dataset.cmsKeydownBound) {
                    el.dataset.cmsKeydownBound = 'true';
                    el.addEventListener('keydown', function (event) {
                        var isSingleLine = el.tagName === 'H1' || 
                                           el.tagName === 'H2' || 
                                           el.tagName === 'H3' || 
                                           el.tagName === 'H4' || 
                                           el.tagName === 'H5' || 
                                           el.tagName === 'H6' || 
                                           el.tagName === 'SPAN' || 
                                           el.tagName === 'A' ||
                                           el.classList.contains('iv-hero-tag') ||
                                           el.classList.contains('iv-sebi-badge') ||
                                           el.classList.contains('team-role') ||
                                           el.classList.contains('position') ||
                                           el.classList.contains('pricing-duration') ||
                                           el.classList.contains('pricing-plan-name') ||
                                           el.classList.contains('pricing-meta-value') ||
                                           el.classList.contains('pricing-price');
                        
                        if (isSingleLine && event.key === 'Enter') {
                            event.preventDefault();
                            el.blur();
                        }
                    });
                }

                if (!el.dataset.cmsInputBound) {
                    el.dataset.cmsInputBound = 'true';
                    el.addEventListener('input', function () {
                        var pageName = window.location.pathname.split('/').pop() || 'index.html';
                        var isPricingField = (pageName === 'pricing.html') || 
                                             (field.indexOf('pricing_') === 0) || 
                                             (field.indexOf('comparison_') === 0) || 
                                             (field.indexOf('cards') === 0) ||
                                             (field.indexOf('table_plans') === 0);

                        var configObj = isPricingField ? pricingConfig : homepageConfig;
                        if (!configObj) return;

                        // Retrieve edited content
                        var newVal = el.innerHTML;
                        
                        var isHtml = /<[a-z][\s\S]*>/i.test(el.innerHTML) || 
                                     field.indexOf('heading_html') !== -1 || 
                                     field.indexOf('desc') !== -1 || 
                                     field.indexOf('answer') !== -1 ||
                                     field.indexOf('title') !== -1 ||
                                     field.indexOf('quote') !== -1 ||
                                     field.indexOf('disclaimer') !== -1;

                        if (!isHtml) {
                            newVal = el.innerText.trim();
                        }

                        setNestedKey(configObj, field, newVal);

                        // Dispatch update to parent
                        window.parent.postMessage({
                            type: 'update_cms_state_from_iframe',
                            isPricing: isPricingField,
                            key: field,
                            value: newVal
                        }, '*');
                    });
                }
            } else {
                el.removeAttribute('contenteditable');
            }
        });
    }

    // Close active text popover editor
    function closeActivePopover() {
        if (activePopover) {
            if (activePopover.parentNode) {
                activePopover.parentNode.removeChild(activePopover);
            }
            activePopover = null;
        }
        var activeArrow = document.getElementById('cms-popover-arrow-el');
        if (activeArrow && activeArrow.parentNode) {
            activeArrow.parentNode.removeChild(activeArrow);
        }
    }

    // Helper to replace content inside a comment boundary (CMS_..._START/END)
    function replaceCmsSection(name, htmlString) {
        var startNode = null;
        var endNode = null;

        var iterator = document.createNodeIterator(
            document.documentElement,
            NodeFilter.SHOW_COMMENT,
            null,
            false
        );

        var node;
        while ((node = iterator.nextNode())) {
            var val = node.nodeValue.trim();
            if (val === 'CMS_' + name + '_START') {
                startNode = node;
            } else if (val === 'CMS_' + name + '_END') {
                endNode = node;
                break;
            }
        }

        if (!startNode || !endNode) {
            return;
        }

        // Avoid replacing section if the active focused element is inside it to prevent cursor loss
        var isFocusedInside = false;
        var activeEl = document.activeElement;
        if (activeEl && activeEl !== document.body) {
            var current = startNode.nextSibling;
            while (current && current !== endNode) {
                if (current === activeEl || (current.nodeType === 1 && current.contains(activeEl))) {
                    isFocusedInside = true;
                    break;
                }
                current = current.nextSibling;
            }
        }

        if (isFocusedInside) {
            return;
        }

        var parent = startNode.parentNode;
        var current = startNode.nextSibling;
        while (current && current !== endNode) {
            var next = current.nextSibling;
            parent.removeChild(current);
            current = next;
        }

        var fragment = document.createRange().createContextualFragment(htmlString);
        parent.insertBefore(fragment, endNode);
    }

    // Navigation items generator
    function generateNavHtml(navigation, prefix) {
        if (!navigation) return '';
        return navigation.map(function (link, idx) {
            var isAbsolute = /^(?:https?:)?\/\//i.test(link.url) || link.url.startsWith('/') || link.url.startsWith('#');
            var url = isAbsolute ? link.url : (prefix + link.url);
            var targetAttr = link.new_tab ? ' target="_blank" rel="noopener noreferrer"' : '';
            return '                    <li><a href="' + url + '" class="nav-link nav-item-el cms-editable-highlight" data-field="navigation.' + idx + '.text" data-tab="tab-hero-nav" data-id="cms-nav-list" data-label="Navigation Link Text"' + targetAttr + '>' + link.text + '</a></li>';
        }).join('\n');
    }

    // Pricing page generators
    function generatePricingTitleHtml(title) {
        return '<h1 class="cms-pricing-title cms-editable-highlight" data-field="pricing_title" data-tab="tab-pricing" data-id="cms-pricing-title" data-label="Pricing Title" data-cms-style-target="pricing-title" data-cms-label="Pricing Title">' + (title || '') + '</h1>';
    }

    function generatePricingSubtitleHtml(subtitle) {
        return '<p class="cms-pricing-subtitle cms-editable-highlight" data-field="pricing_subtitle" data-tab="tab-pricing" data-id="cms-pricing-subtitle" data-label="Pricing Subtitle" data-cms-style-target="pricing-subtitle" data-cms-label="Pricing Subtitle">' + (subtitle || '') + '</p>';
    }

    function generatePricingCardsHtml(cards) {
        if (!cards) return '';
        return cards.map(function (card, idx) {
            var startAttr = card.discount_start ? ' data-start="' + card.discount_start + '"' : '';
            var endAttr = card.discount_end ? ' data-end="' + card.discount_end + '"' : '';
            return '                        <!-- Plan ' + (idx + 1) + ': ' + card.name + ' -->\n' +
                '                        <div class="pricing-card-3d" data-index="' + idx + '"' + startAttr + endAttr + ' data-cms-style-target="pricing-card-3d" data-cms-label="Pricing Card" style="opacity: 1; transform: none;">\n' +
                '                            <div class="pricing-card-glow"></div>\n' +
                '                            <div class="pricing-card-header">\n' +
                '                                <h3 class="pricing-plan-name cms-editable-highlight" data-field="cards.' + idx + '.name">' + card.name + '</h3>\n' +
                '                                <div class="pricing-meta-item">\n' +
                '                                    <span class="pricing-meta-label">MINIMUM CAPITAL</span>\n' +
                '                                    <span class="pricing-meta-value cms-editable-highlight" data-field="cards.' + idx + '.min_capital">' + card.min_capital + '</span>\n' +
                '                                </div>\n' +
                '                                <div class="pricing-card-divider"></div>\n' +
                '                                <div class="pricing-price-box">\n' +
                '                                    <span class="pricing-price cms-editable-highlight" data-field="cards.' + idx + '.price_display">' + card.price_display + '</span>\n' +
                '                                </div>\n' +
                '                                <div class="pricing-duration cms-editable-highlight" data-field="cards.' + idx + '.duration">' + card.duration + '</div>\n' +
                '                                <div class="pricing-card-divider"></div>\n' +
                '                            </div>\n' +
                '                            <div class="pricing-card-footer">\n' +
                '                                <button class="btn-pricing-scroll" onclick="document.getElementById(\'comparison-section\').scrollIntoView({ behavior: \'smooth\' })">READ MORE</button>\n' +
                '                            </div>\n' +
                '                        </div>';
        }).join('\n\n');
    }

    function generateComparisonTableHtml(config) {
        var tableHtml = '<table class="comparison-table show-plan-1">\n' +
            '                            <thead>\n' +
            '                                <tr>\n' +
            '                                    <th>Parameters</th>\n';

        config.table_plans.forEach(function (plan, idx) {
            var isHighlight = plan.highlight || idx === 1;
            var highlightClass = isHighlight ? ' class="highlight-col"' : '';
            tableHtml += '                                    <th' + highlightClass + '><span class="cms-editable-highlight" data-field="table_plans.' + idx + '.name">' + plan.name + '</span></th>\n';
        });
        tableHtml += '                                </tr>\n' +
            '                            </thead>\n' +
            '                            <tbody>\n';

        config.parameters.forEach(function (param) {
            tableHtml += '                                <tr>\n' +
                '                                    <td class="param-name">' + param + '</td>\n';
            config.table_plans.forEach(function (plan, idx) {
                var isHighlight = plan.highlight || idx === 1;
                var highlightClass = isHighlight ? ' class="highlight-col"' : '';
                var val = plan.values[param] || '—';
                tableHtml += '                                    <td' + highlightClass + '>' + val + '</td>\n';
            });
            tableHtml += '                                </tr>\n';
        });

        tableHtml += '                                <tr class="action-row">\n' +
            '                                    <td class="param-name"></td>\n';
        config.table_plans.forEach(function (plan, idx) {
            var isHighlight = plan.highlight || idx === 1;
            var highlightClass = isHighlight ? ' class="highlight-col"' : '';
            tableHtml += '                                    <td' + highlightClass + '>\n' +
                '                                        <a href="' + plan.cta_link + '" target="_blank" rel="noopener noreferrer" class="table-btn">Subscribe Now</a>\n' +
                '                                    </td>\n';
        });
        tableHtml += '                                </tr>\n' +
            '                            </tbody>\n' +
            '                        </table>';

        return tableHtml;
    }

    // Apply configuration changes to the DOM preview
    function applyConfigs() {
        var page = window.location.pathname.split('/').pop() || 'index.html';

        if (page === 'index.html') {
            if (homepageConfig && homepageConfig.navigation) {
                replaceCmsSection('NAV', generateNavHtml(homepageConfig.navigation, ''));
            }
            if (pricingConfig) {
                replaceCmsSection('PRICING_TITLE', generatePricingTitleHtml(pricingConfig.pricing_title));
                replaceCmsSection('PRICING_SUBTITLE', generatePricingSubtitleHtml(pricingConfig.pricing_subtitle));
                replaceCmsSection('COMPARISON_TITLE', '<h2 class="comparison-main-title">' + pricingConfig.comparison_title + '</h2>');
                replaceCmsSection('COMPARISON_SUBTITLE', '<p class="comparison-subtitle">' + pricingConfig.comparison_subtitle + '</p>');
                replaceCmsSection('PRICING_CARDS', generatePricingCardsHtml(pricingConfig.cards));
                replaceCmsSection('COMPARISON_TABLE', generateComparisonTableHtml(pricingConfig));
            }
        } else if (page === 'pricing.html') {
            if (homepageConfig && homepageConfig.navigation) {
                replaceCmsSection('NAV', generateNavHtml(homepageConfig.navigation, ''));
            }
            if (pricingConfig) {
                replaceCmsSection('PRICING_TITLE', generatePricingTitleHtml(pricingConfig.pricing_title));
                replaceCmsSection('PRICING_SUBTITLE', generatePricingSubtitleHtml(pricingConfig.pricing_subtitle));
                replaceCmsSection('COMPARISON_TITLE', '<h2 class="comparison-main-title">' + pricingConfig.comparison_title + '</h2>');
                replaceCmsSection('COMPARISON_SUBTITLE', '<p class="comparison-subtitle">' + pricingConfig.comparison_subtitle + '</p>');
                replaceCmsSection('PRICING_CARDS', generatePricingCardsHtml(pricingConfig.cards));
                replaceCmsSection('COMPARISON_TABLE', generateComparisonTableHtml(pricingConfig));
            }
        }

        // Apply styles block
        applyLayoutStyles();

        // Sync configuration fields back to non-focused elements
        syncConfigsToDom();

        // Apply contenteditable to fields
        setContentEditableOnFields();

        // Re-trigger global script logic
        if (typeof initMobilePricingTabs === 'function') initMobilePricingTabs();
    }

    // Sync configuration values back to the DOM elements
    function syncConfigsToDom() {
        var page = window.location.pathname.split('/').pop() || 'index.html';
        var elements = document.querySelectorAll('[data-field]');
        elements.forEach(function (el) {
            var field = el.getAttribute('data-field');
            if (field.indexOf('navigation') === 0) return;

            // Skip if currently focused to prevent caret jump
            if (document.activeElement === el) return;

            var isPricingField = (page === 'pricing.html') || 
                                 (field.indexOf('pricing_') === 0) || 
                                 (field.indexOf('comparison_') === 0) || 
                                 (field.indexOf('cards') === 0) ||
                                 (field.indexOf('table_plans') === 0);

            var configObj = isPricingField ? pricingConfig : homepageConfig;
            if (!configObj) return;

            var val = getNestedKey(configObj, field);
            if (val !== undefined && val !== null) {
                var isHtml = /<[a-z][\s\S]*>/i.test(val) || 
                             field.indexOf('heading_html') !== -1 || 
                             field.indexOf('desc') !== -1 || 
                             field.indexOf('answer') !== -1 ||
                             field.indexOf('title') !== -1 ||
                             field.indexOf('quote') !== -1 ||
                             field.indexOf('disclaimer') !== -1;

                if (isHtml) {
                    if (el.innerHTML !== val) {
                        el.innerHTML = val;
                    }
                } else {
                    if (el.innerText !== val) {
                        el.innerText = val;
                    }
                }
            }
        });
    }

    // Update style block overrides dynamically in preview head
    function applyLayoutStyles() {
        var pageName = window.location.pathname.split('/').pop() || 'index.html';
        var isPricing = (pageName === 'pricing.html');
        var configTarget = isPricing ? pricingConfig : homepageConfig;

        if (!configTarget || !configTarget.layout_styles) return;

        var styleTag = document.getElementById('cms-preview-style-override');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'cms-preview-style-override';
            document.head.appendChild(styleTag);
        }

        var cssText = '';
        for (var key in configTarget.layout_styles) {
            var rules = configTarget.layout_styles[key];
            var cssSel = key;
            if (isPricing) {
                if (key === 'pricing-title') cssSel = '.cms-pricing-title';
                else if (key === 'pricing-subtitle') cssSel = '.cms-pricing-subtitle';
                else if (key === 'pricing-page-section') cssSel = '.pricing-page-section';
                else if (key === 'pricing-card-3d') cssSel = '.pricing-card-3d';
                else if (key === 'comparison-table-wrapper') cssSel = '.comparison-table-wrapper';
            } else {
                if (key === 'hero-section') cssSel = '.iv-hero';
                else if (key === 'hero-title') cssSel = '.iv-hero-h1';
                else if (key === 'hero-desc') cssSel = '.iv-hero-desc';
                else if (key === 'philosophy-card') cssSel = '.spiral-card';
                else if (key === 'testimonial-card') cssSel = '.testimonial-card';
                else if (key === 'team-card') cssSel = '.team-card';
                else if (key === 'faq-item') cssSel = '.faq-item';
            }

            cssText += cssSel + ' {\n  ' + rules + '\n}\n';
        }
        styleTag.innerHTML = cssText;
    }

    // Create and position the text-editing tooltip popover
    function openInlineEditor(target) {
        closeActivePopover();

        var fieldPath = target.getAttribute('data-field');
        var label = target.getAttribute('data-label') || "Edit Field";

        var pageName = window.location.pathname.split('/').pop() || 'index.html';
        var isPricingField = (pageName === 'pricing.html') || 
                             (fieldPath.indexOf('pricing_') === 0) || 
                             (fieldPath.indexOf('comparison_') === 0) || 
                             (fieldPath.indexOf('cards') === 0);

        var configObj = isPricingField ? pricingConfig : homepageConfig;
        var currentValue = getNestedKey(configObj, fieldPath);
        if (currentValue === undefined) {
            currentValue = target.innerText.trim();
        }

        // Create popover elements
        var popover = document.createElement('div');
        popover.className = 'cms-inline-popover';

        var header = document.createElement('div');
        header.className = 'cms-popover-header';
        header.innerText = label;
        popover.appendChild(header);

        var body = document.createElement('div');
        var inputField;
        if (currentValue.length > 60 || currentValue.indexOf('\n') !== -1 || target.tagName === 'P') {
            inputField = document.createElement('textarea');
            inputField.className = 'cms-popover-textarea';
            inputField.value = currentValue;
        } else {
            inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.className = 'cms-popover-input';
            inputField.value = currentValue;
        }
        body.appendChild(inputField);
        popover.appendChild(body);

        var actions = document.createElement('div');
        actions.className = 'cms-popover-actions';

        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'cms-popover-btn cms-popover-cancel';
        cancelBtn.innerText = 'Cancel';
        cancelBtn.onclick = function (e) {
            e.stopPropagation();
            closeActivePopover();
        };

        var saveBtn = document.createElement('button');
        saveBtn.className = 'cms-popover-btn cms-popover-save';
        saveBtn.innerText = 'Save';
        saveBtn.onclick = function (e) {
            e.stopPropagation();
            var newVal = inputField.value;

            setNestedKey(configObj, fieldPath, newVal);
            applyConfigs();

            // Dispatch update to parent
            window.parent.postMessage({
                type: 'update_cms_state_from_iframe',
                isPricing: isPricingField,
                key: fieldPath,
                value: newVal
            }, '*');

            closeActivePopover();
        };

        actions.appendChild(cancelBtn);
        actions.appendChild(saveBtn);
        popover.appendChild(actions);

        // Append hidden first to measure offsetHeight
        popover.style.visibility = 'hidden';
        document.body.appendChild(popover);

        var rect = target.getBoundingClientRect();
        var popoverWidth = 320;
        var popoverHeight = popover.offsetHeight || 135;

        // Smart Spacing Positioning above or below
        var spaceAbove = rect.top;
        var spaceBelow = window.innerHeight - rect.bottom;
        var topPos = rect.top + window.scrollY - popoverHeight - 12;
        var isAbove = true;

        if (spaceAbove < popoverHeight + 15) {
            if (spaceBelow > popoverHeight + 15) {
                topPos = rect.bottom + window.scrollY + 12;
                isAbove = false;
            } else {
                // Not enough room on either side, choose the larger space
                if (spaceBelow > spaceAbove) {
                    topPos = rect.bottom + window.scrollY + 12;
                    isAbove = false;
                }
            }
        }

        var leftPos = rect.left + window.scrollX + (rect.width / 2) - (popoverWidth / 2);
        // Constrain to window boundary
        if (leftPos < 10) leftPos = 10;
        if (leftPos + popoverWidth > window.innerWidth - 10) {
            leftPos = window.innerWidth - popoverWidth - 10;
        }

        popover.style.top = topPos + 'px';
        popover.style.left = leftPos + 'px';
        popover.style.visibility = 'visible';

        // Add pointing arrow
        var arrow = document.createElement('div');
        arrow.id = 'cms-popover-arrow-el';
        arrow.className = 'cms-popover-arrow ' + (isAbove ? 'cms-popover-arrow-bottom' : 'cms-popover-arrow-top');
        
        var arrowLeft = rect.left + window.scrollX + (rect.width / 2) - leftPos - 8;
        // Keep arrow within popover bounds
        if (arrowLeft < 15) arrowLeft = 15;
        if (arrowLeft > popoverWidth - 30) arrowLeft = popoverWidth - 30;

        arrow.style.left = (leftPos + arrowLeft) + 'px';
        if (isAbove) {
            arrow.style.top = (rect.top + window.scrollY - 12) + 'px';
        } else {
            arrow.style.top = (rect.bottom + window.scrollY + 4) + 'px';
        }
        document.body.appendChild(arrow);

        setTimeout(function () {
            inputField.focus();
            if (typeof inputField.select === 'function') {
                inputField.select();
            }
        }, 50);

        popover.onclick = function (e) {
            e.stopPropagation();
        };
    }

    // Message listener inside iframe
    window.addEventListener('message', function (event) {
        var msg = event.data;
        if (!msg) return;

        if (msg.type === 'init_cms_state') {
            homepageConfig = msg.homepageConfig;
            pricingConfig = msg.pricingConfig;
            applyConfigs();
            setHighlightMode(msg.enabled);
        } else if (msg.type === 'toggle_edit_mode') {
            setHighlightMode(msg.enabled);
        } else if (msg.type === 'update_cms_value') {
            var configTarget = msg.isPricing ? pricingConfig : homepageConfig;
            if (configTarget) {
                setNestedKey(configTarget, msg.key, msg.value);
                applyConfigs();
            }
        } else if (msg.type === 'update_preview_style') {
            var pageName = window.location.pathname.split('/').pop() || 'index.html';
            var isPricing = (pageName === 'pricing.html');
            var configTarget = isPricing ? pricingConfig : homepageConfig;
            if (configTarget) {
                configTarget.layout_styles = configTarget.layout_styles || {};
                configTarget.layout_styles[msg.targetKey] = msg.styles;
                applyLayoutStyles();
            }
        } else if (msg.type === 'clear_selection') {
            var selectedEls = document.querySelectorAll('.cms-selected-element');
            selectedEls.forEach(function (el) {
                el.classList.remove('cms-selected-element');
            });
        }
    });

    // Capture selections and clicks
    window.addEventListener('click', function (e) {
        if (!isHighlightEnabled) return;

        // 1. Check if user clicked a text-editable target first
        var textTarget = e.target.closest('[data-field]');
        if (textTarget) {
            var isInline = textTarget.getAttribute('contenteditable') === 'true';
            if (isInline) {
                var closestLink = e.target.closest('a');
                if (closestLink) {
                    e.preventDefault();
                    textTarget.focus();
                }
            } else {
                e.preventDefault();
                e.stopPropagation();
            }

            if (!isInline) {
                openInlineEditor(textTarget);
            }
            return;
        }

        closeActivePopover();
    }, true);

    // Notify parent that iframe is loaded and ready
    var pageName = window.location.pathname.split('/').pop() || 'index.html';
    window.parent.postMessage({ type: 'iframe_ready', page: pageName }, '*');
})();
