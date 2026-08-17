(function () {
    function getDecodedPath() {
        try {
            return decodeURIComponent(window.location.pathname).toLowerCase();
        } catch (e) {
            return window.location.pathname.toLowerCase();
        }
    }

    function isLegalPage() {
        var path = getDecodedPath();
        return path.indexOf("legal&compliance") !== -1 || path.indexOf("legal%26compliance") !== -1 || !!document.querySelector(".legal-content") || !!document.querySelector(".legal-page-header");
    }

    function isNikhilBioPage() {
        var path = getDecodedPath();
        return path.indexOf("nikhil-gangil") !== -1 || path.indexOf("nikhil") !== -1 || !!document.querySelector(".profile-title-area");
    }

    function getLegalDocId() {
        var path = getDecodedPath();
        var page = path.split("/").pop() || "disclaimer.html";
        if (page.indexOf("privacy") !== -1) return "privacypolicy";
        if (page.indexOf("tnc") !== -1 || page.indexOf("terms") !== -1) return "tnc";
        if (page.indexOf("investor") !== -1 || page.indexOf("charter") !== -1) return "investorcharter";
        if (page.indexOf("grievance") !== -1) return "grievance_redressal";
        return "disclaimer";
    }

    var isIframe = (window.self !== window.top);
    if (!isIframe) {
        document.addEventListener("DOMContentLoaded", function () {
            if (isNikhilBioPage()) {
                fetch("nikhil_profile_config.json?t=" + Date.now())
                    .then(function (r) { return r.json(); })
                    .then(function (cfg) {
                        renderNikhilProfileFromConfig(cfg);
                    })
                    .catch(function () {});
            } else if (isLegalPage()) {
                var docId = getLegalDocId();
                var prefix = window.location.pathname.indexOf("Legal") !== -1 ? "../" : "";
                fetch(prefix + "legal_config.json?t=" + Date.now())
                    .then(function (r) { return r.json(); })
                    .then(function (cfg) {
                        renderLegalDocFromConfig(cfg, docId);
                    })
                    .catch(function () {});
            }
        });
    }

    console.log("[CMS Preview] Visual Inline Controller with Rich Text Formatting loaded.");

    var homepageConfig = null;
    var pricingConfig = null;
    var legalConfig = null;
    var nikhilProfileConfig = null;
    var highlightStyles = null;
    var activePopover = null;
    var isHighlightEnabled = true;
    var savedSelectionRange = null;

    function setNestedKey(obj, path, value) {
        if (!obj || !path) return;
        var parts = path.split(".");
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
        if (!obj || !path) return undefined;
        var parts = path.split(".");
        var current = obj;
        for (var i = 0; i < parts.length; i++) {
            if (current === null || current === undefined) return undefined;
            current = current[parts[i]];
        }
        return current;
    }

    // =========================================================================
    // INJECT RICH TEXT FORMATTING TOOLBAR & STYLES
    // =========================================================================
    function injectToolbarStyles() {
        if (document.getElementById("cms-rich-text-styles")) return;
        var styleEl = document.createElement("style");
        styleEl.id = "cms-rich-text-styles";
        styleEl.innerHTML = `
            .cms-editable-highlight {
                outline: 2px dashed #FF8C00 !important;
                outline-offset: 4px !important;
                box-shadow: 0 0 15px rgba(255, 140, 0, 0.4) !important;
                cursor: text !important;
                position: relative !important;
                transition: outline 0.15s ease, box-shadow 0.15s ease !important;
            }
            .cms-editable-highlight:hover {
                outline-color: #E6B53D !important;
                box-shadow: 0 0 22px rgba(230, 181, 61, 0.6) !important;
            }
            [contenteditable="true"] {
                cursor: text !important;
            }
            [contenteditable="true"]:focus {
                outline: none !important;
                box-shadow: 0 0 0 2px rgba(255, 140, 0, 0.7), 0 0 18px rgba(255, 140, 0, 0.3) !important;
                background: rgba(255, 140, 0, 0.04) !important;
                border-radius: 4px !important;
            }
            
            /* Floating Rich Text Format Toolbar */
            #cmsFloatingFormatToolbar {
                position: absolute;
                display: none;
                align-items: center;
                gap: 4px;
                background: #181818;
                border: 1px solid rgba(255, 140, 0, 0.4);
                border-radius: 8px;
                padding: 4px 8px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.85), 0 0 16px rgba(255, 140, 0, 0.25);
                z-index: 999999;
                font-family: system-ui, -apple-system, sans-serif;
                user-select: none;
                animation: cmsToolbarFadeIn 0.15s ease-out forwards;
            }
            @keyframes cmsToolbarFadeIn {
                from { opacity: 0; transform: translateY(4px) scale(0.96); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .cms-fmt-btn {
                background: transparent;
                border: none;
                color: #e5e5e5;
                font-size: 13px;
                font-weight: 600;
                min-width: 26px;
                height: 28px;
                border-radius: 5px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.15s;
                padding: 0 4px;
            }
            .cms-fmt-btn:hover {
                background: rgba(255, 140, 0, 0.2);
                color: #FF8C00;
            }
            .cms-fmt-btn.active {
                background: #FF8C00;
                color: #000;
            }
            .cms-fmt-divider {
                width: 1px;
                height: 18px;
                background: rgba(255, 255, 255, 0.15);
                margin: 0 3px;
            }

            /* Color Palette Popover */
            #cmsColorPalettePopover {
                position: absolute;
                display: none;
                flex-direction: column;
                gap: 8px;
                background: #1e1e1e;
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 8px;
                padding: 10px;
                box-shadow: 0 12px 35px rgba(0, 0, 0, 0.9);
                z-index: 1000000;
                width: 190px;
            }
            .cms-color-presets {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 6px;
            }
            .cms-color-preset-item {
                width: 32px;
                height: 26px;
                border-radius: 4px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                cursor: pointer;
                transition: transform 0.1s, border-color 0.1s;
            }
            .cms-color-preset-item:hover {
                transform: scale(1.15);
                border-color: #fff;
            }
            .cms-custom-color-row {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 4px;
            }
            .cms-custom-color-input {
                flex: 1;
                background: #111;
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #fff;
                font-size: 11px;
                padding: 4px 6px;
                border-radius: 4px;
                font-family: monospace;
            }
            .cms-custom-color-btn {
                background: #FF8C00;
                color: #000;
                border: none;
                font-size: 11px;
                font-weight: 700;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
            }

            /* Link Popover */
            #cmsLinkPopover {
                position: absolute;
                display: none;
                flex-direction: column;
                gap: 6px;
                background: #1e1e1e;
                border: 1px solid #FF8C00;
                border-radius: 8px;
                padding: 10px;
                box-shadow: 0 12px 35px rgba(0, 0, 0, 0.9);
                z-index: 1000000;
                width: 250px;
            }
            .cms-link-input {
                width: 100%;
                background: #111;
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #fff;
                font-size: 12px;
                padding: 6px 8px;
                border-radius: 4px;
                box-sizing: border-box;
                outline: none;
            }
            .cms-link-input:focus {
                border-color: #FF8C00;
            }
            .cms-link-actions {
                display: flex;
                justify-content: flex-end;
                gap: 6px;
            }

            /* Legal Compliance & Rich Content Block Editor Styles */
            .legal-content-editable-mode {
                position: relative;
            }
            .legal-block-wrapper {
                position: relative;
                margin: 14px 0 18px 0;
                transition: all 0.2s ease;
            }
            .legal-block-top-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
                position: relative;
                opacity: 0.85;
                transition: opacity 0.2s ease;
            }
            .legal-block-wrapper:hover .legal-block-top-controls,
            .legal-block-wrapper:focus-within .legal-block-top-controls {
                opacity: 1;
            }
            .legal-adder-btn {
                background: #1a1a1a;
                border: 1px solid var(--accent, #FF8C00);
                color: var(--accent, #FF8C00);
                font-size: 11px;
                font-weight: 700;
                padding: 4px 14px;
                border-radius: 16px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
                transition: transform 0.2s, background 0.2s, color 0.2s;
                user-select: none;
            }
            .legal-adder-btn:hover {
                background: var(--accent, #FF8C00);
                color: #000;
                transform: scale(1.04);
            }
            .legal-block-actions {
                display: inline-flex;
                align-items: center;
                gap: 3px;
                background: #1c1c1c;
                border: 1px solid rgba(255, 140, 0, 0.3);
                border-radius: 6px;
                padding: 3px 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
                user-select: none;
            }
            .legal-action-btn {
                background: transparent;
                border: none;
                color: #fff;
                font-size: 11px;
                padding: 3px 6px;
                cursor: pointer;
                border-radius: 4px;
                transition: background 0.2s, color 0.2s;
                line-height: 1;
            }
            .legal-action-btn:hover {
                background: var(--accent, #FF8C00);
                color: #000;
            }
            .legal-action-btn.btn-delete:hover {
                background: #ef4444;
                color: #fff;
            }
            .legal-adder-popover {
                position: absolute;
                top: 32px;
                left: 0;
                background: #1c1c1c;
                border: 1px solid rgba(255, 140, 0, 0.4);
                border-radius: 8px;
                padding: 6px;
                display: none;
                flex-direction: column;
                gap: 4px;
                z-index: 100000;
                width: 170px;
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.85);
            }
            .legal-adder-item {
                background: transparent;
                border: none;
                color: #fff;
                text-align: left;
                padding: 7px 12px;
                font-size: 12px;
                font-weight: 500;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: background 0.15s, color 0.15s;
            }
            .legal-adder-item:hover {
                background: var(--accent, #FF8C00);
                color: #000;
            }
            .legal-block-inner {
                border: 2px dashed rgba(255, 140, 0, 0.6) !important;
                border-radius: 8px !important;
                padding: 16px 20px !important;
                background: rgba(255, 140, 0, 0.015) !important;
                transition: border-color 0.2s, box-shadow 0.2s, background 0.2s !important;
                outline: none !important;
                cursor: text !important;
                min-height: 32px;
            }
            .legal-block-inner:hover,
            .legal-block-inner:focus {
                border-color: #FF8C00 !important;
                box-shadow: 0 0 16px rgba(255, 140, 0, 0.25) !important;
                background: rgba(255, 140, 0, 0.035) !important;
            }
            /* High-contrast blog-style typography for legal content */
            .legal-content {
                color: #ffffff !important;
                font-size: 1.05rem !important;
                line-height: 1.85 !important;
            }
            .legal-content p {
                color: #f0f0f0 !important;
                font-size: 1.05rem !important;
                line-height: 1.85 !important;
                margin-bottom: 1.25rem !important;
            }
            .legal-content h1, .legal-content h2, .legal-content h3, .legal-content h4 {
                font-family: var(--font-heading), 'Outfit', sans-serif !important;
                color: #ffffff !important;
                font-weight: 700 !important;
            }
            .legal-content h2 {
                font-size: 1.35rem !important;
                margin: 2rem 0 1rem !important;
            }
            .legal-content h3 {
                font-size: 1.15rem !important;
                margin: 1.5rem 0 0.75rem !important;
            }
            .legal-content strong, .legal-content b {
                color: #ffffff !important;
                font-weight: 700 !important;
            }
            .legal-content a {
                color: var(--accent, #FF8C00) !important;
                text-decoration: underline !important;
            }
            .legal-content ul, .legal-content ol {
                padding-left: 1.5rem !important;
                margin-bottom: 1.25rem !important;
                color: #f0f0f0 !important;
            }
            .legal-content li {
                margin-bottom: 0.5rem !important;
                line-height: 1.85 !important;
            }
        `;
        document.head.appendChild(styleEl);
    }

    function createFloatingToolbar() {
        if (document.getElementById("cmsFloatingFormatToolbar")) return;
        injectToolbarStyles();

        // 1. Toolbar DOM
        var toolbar = document.createElement("div");
        toolbar.id = "cmsFloatingFormatToolbar";
        toolbar.innerHTML = `
            <button type="button" class="cms-fmt-btn" id="cmsBtnBold" title="Bold (Ctrl+B)"><b>B</b></button>
            <button type="button" class="cms-fmt-btn" id="cmsBtnItalic" title="Italic (Ctrl+I)"><i>I</i></button>
            <button type="button" class="cms-fmt-btn" id="cmsBtnUnderline" title="Underline (Ctrl+U)"><u>U</u></button>
            <button type="button" class="cms-fmt-btn" id="cmsBtnList" title="Bulleted List" style="font-size: 15px; line-height: 1;"><b>≡</b></button>
            <button type="button" class="cms-fmt-btn" id="cmsBtnLink" title="Insert / Edit Link">🔗</button>
            <div class="cms-fmt-divider"></div>
            <button type="button" class="cms-fmt-btn" id="cmsBtnColor" title="Font Color" style="width: auto; padding: 0 8px; display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: #FF8C00;">
                <span style="font-size:12px;">🎨</span> Color
            </button>
        `;
        document.body.appendChild(toolbar);

        // 2. Color Palette Popover
        var colorPalette = document.createElement("div");
        colorPalette.id = "cmsColorPalettePopover";
        colorPalette.innerHTML = `
            <div style="font-size: 10px; font-weight: 700; color: #FF8C00; text-transform: uppercase;">Select Text Color</div>
            <div class="cms-color-presets">
                <div class="cms-color-preset-item" data-color="#FF8C00" style="background:#FF8C00;" title="Orange Accent"></div>
                <div class="cms-color-preset-item" data-color="#E6B53D" style="background:#E6B53D;" title="Gold"></div>
                <div class="cms-color-preset-item" data-color="#FFFFFF" style="background:#FFFFFF;" title="White"></div>
                <div class="cms-color-preset-item" data-color="#9CA3AF" style="background:#9CA3AF;" title="Muted Grey"></div>
                <div class="cms-color-preset-item" data-color="#10B981" style="background:#10B981;" title="Green"></div>
                <div class="cms-color-preset-item" data-color="#EF4444" style="background:#EF4444;" title="Red"></div>
                <div class="cms-color-preset-item" data-color="#3B82F6" style="background:#3B82F6;" title="Blue"></div>
                <div class="cms-color-preset-item" data-color="#A855F7" style="background:#A855F7;" title="Purple"></div>
            </div>
            <div class="cms-custom-color-row">
                <input type="text" id="cmsCustomColorHex" class="cms-custom-color-input" placeholder="#FF8C00" value="#FF8C00">
                <button type="button" id="cmsApplyColorBtn" class="cms-custom-color-btn">Apply</button>
            </div>
        `;
        document.body.appendChild(colorPalette);

        // 3. Link Popover
        var linkPopover = document.createElement("div");
        linkPopover.id = "cmsLinkPopover";
        linkPopover.innerHTML = `
            <div style="font-size: 10px; font-weight: 700; color: #FF8C00; text-transform: uppercase;">Insert Link URL</div>
            <input type="text" id="cmsLinkUrlInput" class="cms-link-input" placeholder="https://example.com" value="https://">
            <div class="cms-link-actions">
                <button type="button" id="cmsLinkCancelBtn" class="cms-fmt-btn" style="width: auto; padding: 4px 8px; font-size: 11px;">Cancel</button>
                <button type="button" id="cmsLinkApplyBtn" class="cms-custom-color-btn">Insert Link</button>
            </div>
        `;
        document.body.appendChild(linkPopover);

        // Event listeners for toolbar buttons
        function saveRange() {
            var sel = window.getSelection();
            if (sel.rangeCount > 0) {
                savedSelectionRange = sel.getRangeAt(0).cloneRange();
            }
        }

        function restoreRange() {
            if (savedSelectionRange) {
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(savedSelectionRange);
            }
        }

        function triggerActiveInput() {
            var active = document.activeElement;
            if (active && active.isContentEditable) {
                active.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }

        document.getElementById("cmsBtnBold").addEventListener("click", function (e) {
            e.preventDefault();
            document.execCommand("bold", false, null);
            triggerActiveInput();
        });

        document.getElementById("cmsBtnItalic").addEventListener("click", function (e) {
            e.preventDefault();
            document.execCommand("italic", false, null);
            triggerActiveInput();
        });

        document.getElementById("cmsBtnUnderline").addEventListener("click", function (e) {
            e.preventDefault();
            document.execCommand("underline", false, null);
            triggerActiveInput();
        });

        document.getElementById("cmsBtnList").addEventListener("click", function (e) {
            e.preventDefault();
            document.execCommand("insertUnorderedList", false, null);
            triggerActiveInput();
        });

        document.getElementById("cmsBtnColor").addEventListener("click", function (e) {
            e.preventDefault();
            saveRange();
            var rect = toolbar.getBoundingClientRect();
            colorPalette.style.top = rect.bottom + window.scrollY + 6 + "px";
            colorPalette.style.left = rect.left + window.scrollX + "px";
            colorPalette.style.display = colorPalette.style.display === "flex" ? "none" : "flex";
            linkPopover.style.display = "none";
        });

        colorPalette.querySelectorAll(".cms-color-preset-item").forEach(function (item) {
            item.addEventListener("click", function () {
                var color = item.getAttribute("data-color");
                restoreRange();
                document.execCommand("foreColor", false, color);
                colorPalette.style.display = "none";
                triggerActiveInput();
            });
        });

        document.getElementById("cmsApplyColorBtn").addEventListener("click", function () {
            var color = document.getElementById("cmsCustomColorHex").value.trim();
            if (!color.startsWith("#")) color = "#" + color;
            restoreRange();
            document.execCommand("foreColor", false, color);
            colorPalette.style.display = "none";
            triggerActiveInput();
        });

        document.getElementById("cmsBtnLink").addEventListener("click", function (e) {
            e.preventDefault();
            saveRange();
            var rect = toolbar.getBoundingClientRect();
            linkPopover.style.top = rect.bottom + window.scrollY + 6 + "px";
            linkPopover.style.left = rect.left + window.scrollX + "px";
            linkPopover.style.display = linkPopover.style.display === "flex" ? "none" : "flex";
            colorPalette.style.display = "none";
            var linkInput = document.getElementById("cmsLinkUrlInput");
            setTimeout(function () {
                linkInput.focus();
                linkInput.select();
            }, 50);
        });

        document.getElementById("cmsLinkApplyBtn").addEventListener("click", function () {
            var url = document.getElementById("cmsLinkUrlInput").value.trim();
            if (url && url !== "https://") {
                restoreRange();
                document.execCommand("createLink", false, url);
                var sel = window.getSelection();
                if (sel && sel.anchorNode) {
                    var parentEl = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
                    var linkEl = parentEl ? parentEl.closest("a") : null;
                    if (linkEl) {
                        linkEl.setAttribute("target", "_blank");
                        linkEl.setAttribute("rel", "noopener noreferrer");
                        linkEl.style.color = "var(--accent, #FF8C00)";
                        linkEl.style.textDecoration = "underline";
                    }
                }
                triggerActiveInput();
            }
            linkPopover.style.display = "none";
        });

        document.getElementById("cmsLinkCancelBtn").addEventListener("click", function () {
            linkPopover.style.display = "none";
        });

        // Hide toolbar when clicking outside
        document.addEventListener("mousedown", function (e) {
            if (
                !toolbar.contains(e.target) &&
                !colorPalette.contains(e.target) &&
                !linkPopover.contains(e.target) &&
                !e.target.isContentEditable
            ) {
                toolbar.style.display = "none";
                colorPalette.style.display = "none";
                linkPopover.style.display = "none";
            }
        });

        // Handle selection to show floating toolbar
        function handleSelectionChange() {
            var selection = window.getSelection();
            if (selection.rangeCount > 0 && !selection.isCollapsed) {
                var range = selection.getRangeAt(0);
                var node = range.commonAncestorContainer;
                if (node.nodeType === 3) node = node.parentNode;
                var editable = node.closest('[contenteditable="true"]');
                if (editable) {
                    var rects = range.getClientRects();
                    if (rects.length > 0) {
                        var rect = rects[0];
                        toolbar.style.display = "flex";
                        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                        var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                        var tbHeight = toolbar.offsetHeight || 36;
                        var tbWidth = toolbar.offsetWidth || 230;

                        var topPos = rect.top + scrollTop - tbHeight - 8;
                        var leftPos = rect.left + scrollLeft + (rect.width - tbWidth) / 2;
                        if (leftPos < 10) leftPos = 10;
                        if (leftPos + tbWidth > window.innerWidth - 10) leftPos = window.innerWidth - tbWidth - 10;

                        toolbar.style.top = topPos + "px";
                        toolbar.style.left = leftPos + "px";
                        return;
                    }
                }
            }
            if (
                toolbar.style.display !== "none" &&
                colorPalette.style.display !== "flex" &&
                linkPopover.style.display !== "flex"
            ) {
                toolbar.style.display = "none";
            }
        }

        document.addEventListener("selectionchange", handleSelectionChange);
    }

    function createBlockWrapperHtml(index, innerHtml) {
        return `
            <div class="legal-block-wrapper" data-block-index="${index}">
                <div class="legal-block-top-controls">
                    <button type="button" class="legal-adder-btn" data-action="toggle-adder">
                        <i class="fa-solid fa-plus"></i> Add Block
                    </button>
                    <div class="legal-adder-popover">
                        <button type="button" class="legal-adder-item" data-insert="p"><i class="fa-solid fa-paragraph"></i> Paragraph</button>
                        <button type="button" class="legal-adder-item" data-insert="h2"><i class="fa-solid fa-heading"></i> Heading</button>
                        <button type="button" class="legal-adder-item" data-insert="ul"><i class="fa-solid fa-list-ul"></i> Bullet List</button>
                    </div>
                    <div class="legal-block-actions">
                        <button type="button" class="legal-action-btn" data-action="move-up" title="Move Up"><i class="fa-solid fa-arrow-up"></i></button>
                        <button type="button" class="legal-action-btn" data-action="move-down" title="Move Down"><i class="fa-solid fa-arrow-down"></i></button>
                        <button type="button" class="legal-action-btn btn-delete" data-action="delete" title="Delete Block"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="legal-block-inner" contenteditable="true">
                    ${innerHtml}
                </div>
            </div>
        `;
    }

    function createBottomAdderHtml() {
        return `
            <div class="legal-bottom-adder" style="display:flex; justify-content:center; margin: 24px 0 10px 0; position:relative;">
                <button type="button" class="legal-adder-btn" data-action="toggle-bottom-adder">
                    <i class="fa-solid fa-plus"></i> Add Block
                </button>
                <div class="legal-adder-popover" style="left:50%; transform:translateX(-50%); top:36px;">
                    <button type="button" class="legal-adder-item" data-insert-bottom="p"><i class="fa-solid fa-paragraph"></i> Paragraph</button>
                    <button type="button" class="legal-adder-item" data-insert-bottom="h2"><i class="fa-solid fa-heading"></i> Heading</button>
                    <button type="button" class="legal-adder-item" data-insert-bottom="ul"><i class="fa-solid fa-list-ul"></i> Bullet List</button>
                </div>
            </div>
        `;
    }

    function syncLegalContentToConfig(legalContent, docId) {
        if (!legalContent) return;
        var wrappers = legalContent.querySelectorAll(".legal-block-wrapper");
        var compiledHtml = [];
        wrappers.forEach(function(w) {
            var inner = w.querySelector(".legal-block-inner");
            if (inner) {
                var content = inner.innerHTML.trim();
                if (content) {
                    compiledHtml.push(content);
                }
            }
        });
        var fullHtml = compiledHtml.join("\n\n");
        if (legalConfig && legalConfig[docId]) {
            legalConfig[docId].html_content = fullHtml;
            window.parent.postMessage(
                {
                    type: "update_cms_state_from_iframe",
                    isLegal: true,
                    docId: docId,
                    key: docId + ".html_content",
                    value: fullHtml
                },
                "*"
            );
        }
    }

    function bindLegalBlockEvents(legalContent, docId) {
        // Handle input inside blocks
        legalContent.querySelectorAll(".legal-block-inner").forEach(function(inner) {
            if (!inner.dataset.cmsBlockBound) {
                inner.dataset.cmsBlockBound = "true";
                inner.addEventListener("input", function() {
                    syncLegalContentToConfig(legalContent, docId);
                });
            }
        });

        // Event delegation for actions (Add Block, Move Up, Move Down, Delete)
        if (!legalContent.dataset.cmsEventsBound) {
            legalContent.dataset.cmsEventsBound = "true";
            
            legalContent.addEventListener("click", function(e) {
                var target = e.target.closest("button");
                if (!target) return;

                var isToggle = target.dataset.action === "toggle-adder" || target.dataset.action === "toggle-bottom-adder";
                if (!isToggle) {
                    legalContent.querySelectorAll(".legal-adder-popover").forEach(function(p) {
                        p.style.display = "none";
                    });
                }

                // 1. Toggle Adder Popover
                if (target.dataset.action === "toggle-adder") {
                    e.preventDefault();
                    e.stopPropagation();
                    var wrapper = target.closest(".legal-block-wrapper");
                    var popover = wrapper ? wrapper.querySelector(".legal-adder-popover") : null;
                    if (popover) {
                        var isVisible = popover.style.display === "flex";
                        legalContent.querySelectorAll(".legal-adder-popover").forEach(function(p) { p.style.display = "none"; });
                        popover.style.display = isVisible ? "none" : "flex";
                    }
                    return;
                }

                // 2. Toggle Bottom Adder Popover
                if (target.dataset.action === "toggle-bottom-adder") {
                    e.preventDefault();
                    e.stopPropagation();
                    var bottomAdder = target.closest(".legal-bottom-adder");
                    var popover = bottomAdder ? bottomAdder.querySelector(".legal-adder-popover") : null;
                    if (popover) {
                        var isVisible = popover.style.display === "flex";
                        legalContent.querySelectorAll(".legal-adder-popover").forEach(function(p) { p.style.display = "none"; });
                        popover.style.display = isVisible ? "none" : "flex";
                    }
                    return;
                }

                // 3. Insert Block at Index
                var insertType = target.dataset.insert;
                if (insertType) {
                    e.preventDefault();
                    var wrapper = target.closest(".legal-block-wrapper");
                    if (wrapper) {
                        var defaultHtml = "<p>Enter text here...</p>";
                        if (insertType === "h2") defaultHtml = "<h2>Section Title</h2>";
                        else if (insertType === "ul") defaultHtml = "<ul><li>List item 1</li><li>List item 2</li></ul>";
                        
                        var newWrapperHtml = createBlockWrapperHtml(0, defaultHtml);
                        var tempEl = document.createElement("div");
                        tempEl.innerHTML = newWrapperHtml;
                        var newWrapperNode = tempEl.firstElementChild;
                        wrapper.parentNode.insertBefore(newWrapperNode, wrapper);
                        
                        syncLegalContentToConfig(legalContent, docId);
                        bindLegalBlockEvents(legalContent, docId);
                        
                        var newInner = newWrapperNode.querySelector(".legal-block-inner");
                        if (newInner) {
                            newInner.focus();
                        }
                    }
                    return;
                }

                // 4. Insert Block at Bottom
                var insertBottomType = target.dataset.insertBottom;
                if (insertBottomType) {
                    e.preventDefault();
                    var bottomAdder = legalContent.querySelector(".legal-bottom-adder");
                    var defaultHtml = "<p>Enter text here...</p>";
                    if (insertBottomType === "h2") defaultHtml = "<h2>Section Title</h2>";
                    else if (insertBottomType === "ul") defaultHtml = "<ul><li>List item 1</li><li>List item 2</li></ul>";

                    var newWrapperHtml = createBlockWrapperHtml(0, defaultHtml);
                    var tempEl = document.createElement("div");
                    tempEl.innerHTML = newWrapperHtml;
                    var newWrapperNode = tempEl.firstElementChild;
                    if (bottomAdder) {
                        bottomAdder.parentNode.insertBefore(newWrapperNode, bottomAdder);
                    } else {
                        legalContent.appendChild(newWrapperNode);
                    }
                    
                    syncLegalContentToConfig(legalContent, docId);
                    bindLegalBlockEvents(legalContent, docId);
                    
                    var newInner = newWrapperNode.querySelector(".legal-block-inner");
                    if (newInner) {
                        newInner.focus();
                    }
                    return;
                }

                // 5. Move Up
                if (target.dataset.action === "move-up") {
                    e.preventDefault();
                    var wrapper = target.closest(".legal-block-wrapper");
                    if (wrapper && wrapper.previousElementSibling && wrapper.previousElementSibling.classList.contains("legal-block-wrapper")) {
                        wrapper.parentNode.insertBefore(wrapper, wrapper.previousElementSibling);
                        syncLegalContentToConfig(legalContent, docId);
                    }
                    return;
                }

                // 6. Move Down
                if (target.dataset.action === "move-down") {
                    e.preventDefault();
                    var wrapper = target.closest(".legal-block-wrapper");
                    if (wrapper && wrapper.nextElementSibling && wrapper.nextElementSibling.classList.contains("legal-block-wrapper")) {
                        wrapper.parentNode.insertBefore(wrapper.nextElementSibling, wrapper);
                        syncLegalContentToConfig(legalContent, docId);
                    }
                    return;
                }

                // 7. Delete Block
                if (target.dataset.action === "delete") {
                    e.preventDefault();
                    if (confirm("Delete this content block?")) {
                        var wrapper = target.closest(".legal-block-wrapper");
                        if (wrapper) {
                            wrapper.remove();
                            syncLegalContentToConfig(legalContent, docId);
                        }
                    }
                    return;
                }
            });

            document.addEventListener("click", function(e) {
                if (!e.target.closest(".legal-block-top-controls") && !e.target.closest(".legal-bottom-adder")) {
                    legalContent.querySelectorAll(".legal-adder-popover").forEach(function(p) {
                        p.style.display = "none";
                    });
                }
            });
        }
    }

    function getLegalDocId() {
        var pathname = window.location.pathname;
        var page = decodeURIComponent(pathname.split("/").pop() || "disclaimer.html").toLowerCase();
        if (page.indexOf("privacy") !== -1) return "privacypolicy";
        if (page.indexOf("tnc") !== -1 || page.indexOf("terms") !== -1) return "tnc";
        if (page.indexOf("investor") !== -1 || page.indexOf("charter") !== -1) return "investorcharter";
        if (page.indexOf("grievance") !== -1) return "grievance_redressal";
        return "disclaimer";
    }

    function initLegalBlockEditor() {
        if (!isLegalPage()) return;
        createFloatingToolbar();
        var legalContainer = document.querySelector(".legal-container");
        var docId = getLegalDocId();

        // 1. Make Legal Page Header Title & Subtitle editable
        var legalHeader = document.querySelector(".legal-page-header");
        if (legalHeader) {
            var h1 = legalHeader.querySelector("h1");
            var p = legalHeader.querySelector("p");
            if (h1) {
                h1.setAttribute("data-field", "legal." + docId + ".title");
                if (isHighlightEnabled) {
                    h1.classList.add("cms-editable-highlight");
                    h1.setAttribute("contenteditable", "true");
                    bindInputListeners(h1, "legal." + docId + ".title");
                } else {
                    h1.classList.remove("cms-editable-highlight");
                    h1.removeAttribute("contenteditable");
                }
            }
            if (p) {
                p.setAttribute("data-field", "legal." + docId + ".subtitle");
                if (isHighlightEnabled) {
                    p.classList.add("cms-editable-highlight");
                    p.setAttribute("contenteditable", "true");
                    bindInputListeners(p, "legal." + docId + ".subtitle");
                } else {
                    p.classList.remove("cms-editable-highlight");
                    p.removeAttribute("contenteditable");
                }
            }
        }

        // 2. Transform Legal Content into interactive block editor
        var legalContent = document.querySelector(".legal-content");
        if (!legalContent) return;

        legalContent.classList.add("legal-content-editable-mode");

        var existingWrappers = legalContent.querySelectorAll(".legal-block-wrapper");
        if (existingWrappers.length === 0) {
            var rawChildren = Array.from(legalContent.children);
            if (rawChildren.length > 0) {
                var newHtml = "";
                rawChildren.forEach(function (child, idx) {
                    if (child.classList.contains("legal-bottom-adder")) return;
                    newHtml += createBlockWrapperHtml(idx, child.outerHTML);
                });
                newHtml += createBottomAdderHtml();
                legalContent.innerHTML = newHtml;
            } else if (legalContent.innerHTML.trim()) {
                var tempDiv = document.createElement("div");
                tempDiv.innerHTML = legalContent.innerHTML;
                var children = Array.from(tempDiv.children);
                var newHtml = "";
                children.forEach(function (child, idx) {
                    newHtml += createBlockWrapperHtml(idx, child.outerHTML);
                });
                newHtml += createBottomAdderHtml();
                legalContent.innerHTML = newHtml;
            }
        }

        bindLegalBlockEvents(legalContent, docId);
    }

    function initNikhilBioEditor() {
        if (!isNikhilBioPage()) return;
        createFloatingToolbar();
        var selectors = [
            ".profile-title-area h1",
            ".profile-title-area p",
            ".bio-section p",
            ".philosophy-section h3",
            ".philosophy-section p",
            ".experience-section h3",
            ".experience-section li div",
            ".media-section h3",
            ".media-section p",
            ".media-section li div",
            ".predictions-section h3",
            ".predictions-section p",
            ".predictions-section strong",
            ".achievements-section h3",
            ".achievements-section li div",
            ".interviews-section h3",
            ".interviews-section li",
            ".news-section h3",
            ".news-section span"
        ];
        var elements = document.querySelectorAll(selectors.join(", "));
        elements.forEach(function (el, idx) {
            var field = el.getAttribute("data-field");
            if (!field) {
                field = "profile.auto_field_" + idx;
                el.setAttribute("data-field", field);
            }
            if (isHighlightEnabled) {
                el.classList.add("cms-editable-highlight");
                el.setAttribute("contenteditable", "true");
                bindInputListeners(el, field);
            } else {
                el.classList.remove("cms-editable-highlight");
                el.removeAttribute("contenteditable");
            }
        });
    }

    function setContentEditableOnFields() {
        createFloatingToolbar();

        // 1. Mark fields with data-field as contenteditable
        var elements = document.querySelectorAll("[data-field]");
        elements.forEach(function (el) {
            var field = el.getAttribute("data-field");
            if (
                field.indexOf("navigation") === 0 ||
                field.endsWith(".num") ||
                field.endsWith(".suffix") ||
                el.tagName === "IMG" ||
                field.indexOf("about_profile.linkedin") === 0 ||
                field.indexOf("about_profile.twitter") === 0 ||
                field.indexOf("about_profile.youtube") === 0
            ) {
                el.removeAttribute("contenteditable");
                return;
            }
            if (isHighlightEnabled) {
                el.classList.add("cms-editable-highlight");
                el.setAttribute("contenteditable", "true");
                bindInputListeners(el, field);
            } else {
                el.classList.remove("cms-editable-highlight");
                el.removeAttribute("contenteditable");
            }
        });

        // 2. On Legal Pages, initialize block-based editor
        if (isLegalPage()) {
            initLegalBlockEditor();
        }

        // 3. On Nikhil Bio Page, initialize bio editor
        if (isNikhilBioPage()) {
            initNikhilBioEditor();
        }
    }

    function bindInputListeners(el, field) {
        if (!el.dataset.cmsKeydownBound) {
            el.dataset.cmsKeydownBound = "true";
            el.addEventListener("keydown", function (event) {
                var isSingleLine =
                    el.tagName === "H1" ||
                    el.tagName === "H2" ||
                    el.tagName === "H3" ||
                    el.tagName === "H4" ||
                    el.tagName === "H5" ||
                    el.tagName === "H6" ||
                    el.tagName === "SPAN" ||
                    el.tagName === "A" ||
                    el.classList.contains("iv-hero-tag") ||
                    el.classList.contains("iv-sebi-badge") ||
                    el.classList.contains("team-role") ||
                    el.classList.contains("position") ||
                    el.classList.contains("pricing-duration") ||
                    el.classList.contains("pricing-plan-name") ||
                    el.classList.contains("pricing-meta-value") ||
                    el.classList.contains("pricing-price");
                if (isSingleLine && event.key === "Enter") {
                    event.preventDefault();
                    el.blur();
                }
            });
        }
        if (!el.dataset.cmsInputBound) {
            el.dataset.cmsInputBound = "true";
            el.addEventListener("input", function () {
                var isPricingField = field.indexOf("pricing_") === 0 || field.indexOf("comparison_") === 0 || field.indexOf("cards") === 0 || field.indexOf("table_plans") === 0;
                var isNikhilField = isNikhilBioPage() || field.indexOf("profile.") === 0;
                var isLegalField = isLegalPage() || field.indexOf("legal.") === 0;

                var configObj = isPricingField ? pricingConfig : isNikhilField ? nikhilProfileConfig : isLegalField ? legalConfig : homepageConfig;
                if (!configObj) return;

                var newVal = el.innerHTML;
                var isHtml = /<[a-z][\s\S]*>/i.test(el.innerHTML) || field.indexOf("heading_html") !== -1 || field.indexOf("desc") !== -1 || field.indexOf("answer") !== -1 || field.indexOf("title") !== -1 || field.indexOf("quote") !== -1 || field.indexOf("disclaimer") !== -1 || field.indexOf("subtitle") !== -1;
                if (!isHtml) {
                    newVal = el.innerText.trim();
                }
                
                var cleanKey = field.replace(/^profile\./, '').replace(/^legal\./, '');
                setNestedKey(configObj, cleanKey, newVal);

                window.parent.postMessage(
                    {
                        type: "update_cms_state_from_iframe",
                        isPricing: isPricingField,
                        isNikhil: isNikhilField,
                        isLegal: isLegalField,
                        docId: isLegalField ? getLegalDocId() : undefined,
                        key: cleanKey,
                        value: newVal
                    },
                    "*"
                );
            });
        }
    }

    function replaceCmsSection(name, htmlString) {
        var startNode = null;
        var endNode = null;
        var iterator = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT, null, false);
        var node;
        while ((node = iterator.nextNode())) {
            var val = node.nodeValue.trim();
            if (val === "CMS_" + name + "_START") {
                startNode = node;
            } else if (val === "CMS_" + name + "_END") {
                endNode = node;
                break;
            }
        }
        if (!startNode || !endNode) {
            return;
        }
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

    // Generator helpers for Nikhil Profile Page
    function renderNikhilProfileFromConfig(cfg) {
        if (!cfg) return;
        
        // 1. Header
        if (cfg.header) {
            var headerHtml = `
                <div class="profile-title-area">
                    <h1 class="profile-name" data-field="profile.header.name">${cfg.header.name || "Nikhil Gangil"}</h1>
                    <p class="profile-subtitle" data-field="profile.header.subtitle">${cfg.header.subtitle || ""}</p>
                    <div class="profile-underline"></div>
                </div>
            `;
            replaceCmsSection("NIKHIL_HEADER", headerHtml);
        }

        // 2. Bio Paragraphs
        if (cfg.bio_paragraphs && Array.isArray(cfg.bio_paragraphs)) {
            var bioHtml = cfg.bio_paragraphs.map(function (p, idx) {
                return `<p data-field="profile.bio_paragraphs.${idx}">${p}</p>`;
            }).join("\n");
            replaceCmsSection("NIKHIL_BIO", bioHtml);
        }

        // 3. Philosophy
        if (cfg.philosophy) {
            var philHtml = `
                <h3 style="color: var(--text-primary); border-left: 3px solid var(--accent); padding-left: 12px; margin-bottom: 1.25rem;" data-field="profile.philosophy.title">${cfg.philosophy.title || "Investment Philosophy"}</h3>
                ${(cfg.philosophy.paragraphs || []).map(function (p, idx) {
                    return `<p data-field="profile.philosophy.paragraphs.${idx}">${p}</p>`;
                }).join("\n")}
            `;
            replaceCmsSection("NIKHIL_PHILOSOPHY", philHtml);
        }

        // 4. Experience
        if (cfg.experience) {
            var expHtml = `
                <h3 style="color: var(--text-primary); border-left: 3px solid var(--accent); padding-left: 12px; margin-bottom: 1.25rem;" data-field="profile.experience.title">${cfg.experience.title || "Experience & Background"}</h3>
                <ul class="custom-list" style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.85rem;">
                    ${(cfg.experience.items || []).map(function (item, idx) {
                        return `
                            <li style="display: flex; align-items: flex-start; gap: 12px; color: var(--text-muted); line-height: 1.6;">
                                <span style="color: var(--accent); font-size: 1.1rem; line-height: 1.2;"><i class="${item.icon || 'fa-solid fa-check'}"></i></span>
                                <div data-field="profile.experience.items.${idx}.description"><strong>${item.title}</strong>${item.description ? " – " + item.description : ""}</div>
                            </li>
                        `;
                    }).join("\n")}
                </ul>
            `;
            replaceCmsSection("NIKHIL_EXPERIENCE", expHtml);
        }

        // 5. Media Reach
        if (cfg.media_reach) {
            var reachHtml = `
                <h3 style="color: var(--text-primary); border-left: 3px solid var(--accent); padding-left: 12px; margin-bottom: 1.25rem;" data-field="profile.media_reach.title">${cfg.media_reach.title || "Media Presence & Public Reach"}</h3>
                <p data-field="profile.media_reach.intro">${cfg.media_reach.intro || ""}</p>
                <ul class="custom-list" style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 1.5rem;">
                    ${(cfg.media_reach.stats || []).map(function (st, idx) {
                        return `
                            <li style="display: flex; align-items: flex-start; gap: 12px; color: var(--text-muted); line-height: 1.6;">
                                <span style="color: var(--accent); font-size: 1.1rem; line-height: 1.2;"><i class="${st.icon || 'fa-solid fa-chart-simple'}"></i></span>
                                <div>${st.bold ? "<strong>" + st.bold + "</strong> " : ""}${st.text || ""}</div>
                            </li>
                        `;
                    }).join("\n")}
                </ul>
            `;
            replaceCmsSection("NIKHIL_MEDIA_REACH", reachHtml);
        }

        // 6. Predictions
        if (cfg.predictions) {
            var predHtml = `
                <h3 style="color: var(--text-primary); border-left: 3px solid var(--accent); padding-left: 12px; margin-bottom: 1.25rem;" data-field="profile.predictions.title">${cfg.predictions.title || "Market Cycle Predictions"}</h3>
                <p style="margin-bottom: 1.5rem;" data-field="profile.predictions.subtitle">${cfg.predictions.subtitle || ""}</p>
                <div style="display: flex; flex-direction: column; gap: 1.5rem; border-left: 2px solid rgba(255, 255, 255, 0.05); padding-left: 1.5rem; margin-left: 0.5rem;">
                    ${(cfg.predictions.items || []).map(function (pred, idx) {
                        var linkHtml = pred.link_url ? ` <a href="${pred.link_url}" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">${pred.link_text || "View Link"} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 10px;"></i></a>` : "";
                        return `
                            <div style="position: relative;">
                                <div style="position: absolute; left: -29px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 8px var(--accent);"></div>
                                <strong style="color: var(--text-primary); display: block; margin-bottom: 4px;" data-field="profile.predictions.items.${idx}.date_title">${pred.date_title}</strong>
                                <p style="font-size: 0.95rem; margin: 0 0 6px 0;" data-field="profile.predictions.items.${idx}.description">${pred.description}${linkHtml}</p>
                            </div>
                        `;
                    }).join("\n")}
                </div>
            `;
            replaceCmsSection("NIKHIL_PREDICTIONS", predHtml);
        }

        // 7. Achievements
        if (cfg.achievements) {
            var achHtml = `
                <h3 style="color: var(--text-primary); border-left: 3px solid var(--accent); padding-left: 12px; margin-bottom: 1.25rem;" data-field="profile.achievements.title">${cfg.achievements.title || "Key Achievements & Contributions"}</h3>
                <ul class="custom-list" style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.85rem;">
                    ${(cfg.achievements.items || []).map(function (ach, idx) {
                        return `
                            <li style="display: flex; align-items: flex-start; gap: 12px; color: var(--text-muted); line-height: 1.6;">
                                <span style="color: var(--accent); font-size: 1.1rem; line-height: 1.2;"><i class="${ach.icon || 'fa-solid fa-award'}"></i></span>
                                <div data-field="profile.achievements.items.${idx}.html">${ach.html}</div>
                            </li>
                        `;
                    }).join("\n")}
                </ul>
            `;
            replaceCmsSection("NIKHIL_ACHIEVEMENTS", achHtml);
        }

        // 8. Expertise
        if (cfg.expertise) {
            var expListHtml = `
                <h3 style="color: var(--text-primary); margin-bottom: 0.5rem; font-weight: 700;" data-field="profile.expertise.title">${cfg.expertise.title || "Areas of Expertise:"}</h3>
                <div style="width: 60px; height: 4px; background-color: var(--accent); margin: 0 0 1.5rem 0; border-radius: 2px;"></div>
                <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.85rem; font-size: 1.1rem; line-height: 1.6; color: var(--text-muted);">
                    ${(cfg.expertise.items || []).map(function (it, idx) {
                        return `
                            <li style="display: flex; align-items: flex-start; gap: 8px;">
                                <span>–</span>
                                <span data-field="profile.expertise.items.${idx}">${it}</span>
                            </li>
                        `;
                    }).join("\n")}
                </ul>
            `;
            replaceCmsSection("NIKHIL_EXPERTISE", expListHtml);
        }

        // 9. Featured Articles
        if (cfg.featured_articles) {
            var artHtml = `
                <h3 style="color: var(--text-primary); border-left: 3px solid var(--accent); padding-left: 12px; margin-bottom: 1.25rem;" data-field="profile.featured_articles.title">${cfg.featured_articles.title || "Key Featured Articles"}</h3>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${(cfg.featured_articles.items || []).map(function (art, idx) {
                        return `
                            <a href="${art.url}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); border-radius: 12px; text-decoration: none; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'; this.style.borderColor='var(--accent)';" onmouseout="this.style.background='rgba(255,255,255,0.01)'; this.style.borderColor='rgba(255,255,255,0.03)';">
                                <span style="color: var(--text-primary); font-size: 0.95rem;"><strong>${art.publication}:</strong> ${art.title}</span>
                                <span style="color: var(--accent); font-size: 0.9rem;"><i class="fa-solid fa-arrow-up-right-from-square"></i></span>
                            </a>
                        `;
                    }).join("\n")}
                </div>
            `;
            replaceCmsSection("NIKHIL_ARTICLES", artHtml);
        }

        // 10. YouTube Interviews
        if (cfg.youtube_interviews) {
            var ytHtml = `
                <h3 style="color: var(--text-primary); margin-bottom: 0.5rem; font-weight: 700;" data-field="profile.youtube_interviews.title">${cfg.youtube_interviews.title || "Interviews on Prominent Youtube channels:"}</h3>
                <div style="width: 60px; height: 4px; background-color: var(--accent); margin: 0 0 1.5rem 0; border-radius: 2px;"></div>
                <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.85rem; font-size: 1.1rem; line-height: 1.6; color: var(--text-muted);">
                    ${(cfg.youtube_interviews.items || []).map(function (yt, idx) {
                        return `
                            <li style="word-break: break-all;">
                                ${yt.title} – <a href="${yt.url}" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none;">${yt.url}</a>
                            </li>
                        `;
                    }).join("\n")}
                </ul>
            `;
            replaceCmsSection("NIKHIL_INTERVIEWS", ytHtml);
        }

        // 11. News Mentions
        if (cfg.news_mentions) {
            var newsHtml = `
                <h3 style="color: var(--text-primary); border-left: 3px solid var(--accent); padding-left: 12px; margin-bottom: 1.25rem;" data-field="profile.news_mentions.title">${cfg.news_mentions.title || "Other News & Media Mentions"}</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.75rem;">
                    ${(cfg.news_mentions.items || []).map(function (nm, idx) {
                        return `
                            <div style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); padding: 1.25rem; border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px;">
                                <span style="font-size: 0.95rem; color: var(--text-muted);"><strong>${nm.source}:</strong> ${nm.headline}</span>
                                <a href="${nm.url}" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">Read Article <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 10px;"></i></a>
                            </div>
                        `;
                    }).join("\n")}
                </div>
            `;
            replaceCmsSection("NIKHIL_NEWS", newsHtml);
        }
    }

    // Generator helpers for Legal & Compliance
    function renderLegalDocFromConfig(cfg, docId) {
        if (!cfg) return;
        var doc = cfg[docId];
        if (!doc) return;

        if (doc.title !== undefined) {
            var headerHtml = `
                <h1 style="font-size: clamp(2rem, 4vw, 3rem); font-weight: 700; margin-bottom: 0.75rem;" data-field="legal.${docId}.title">${doc.title}</h1>
                <p style="color: var(--text-secondary); font-size: 1rem;" data-field="legal.${docId}.subtitle">${doc.subtitle || ""}</p>
                <div style="width: 60px; height: 3px; background: var(--accent-primary, #f97316); border-radius: 2px; margin-top: 1rem;"></div>
            `;
            replaceCmsSection("LEGAL_HEADER", headerHtml);
        }

        if (doc.html_content) {
            replaceCmsSection("LEGAL_CONTENT", doc.html_content);
        }
    }

    function generateNavHtml(navigation, prefix) {
        if (!navigation) return "";
        var htmlList = navigation.map(function (link, idx) {
            var isAbsolute = /^(?:https?:)?\/\//i.test(link.url) || link.url.startsWith("/") || link.url.startsWith("#");
            var url = isAbsolute ? link.url : prefix + link.url;
            var targetAttr = link.new_tab ? ' target="_blank" rel="noopener noreferrer"' : "";
            return (
                '                    <li><a href="' +
                url +
                '" class="nav-link nav-item-el" data-field="navigation.' +
                idx +
                '.text" data-tab="tab-hero-nav" data-id="cms-nav-list" data-label="Navigation Link Text"' +
                targetAttr +
                ">" +
                link.text +
                "</a></li>"
            );
        });
        if (homepageConfig && homepageConfig.header_buttons) {
            var loginLink = homepageConfig.header_buttons.client_login;
            var loginTarget = loginLink.new_tab ? ' target="_blank" rel="noopener noreferrer"' : "";
            htmlList.push(
                '                    <li><a href="' +
                loginLink.url +
                '" class="nav-link nav-item-el" data-field="header_buttons.client_login.text" data-tab="tab-hero-nav" data-id="cms-nav-list" data-label="Client Login Text"' +
                loginTarget +
                '><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: middle; display: inline-block;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' +
                loginLink.text +
                "</a></li>"
            );
            var contactLink = homepageConfig.header_buttons.contact_us;
            var contactTarget = contactLink.new_tab ? ' target="_blank" rel="noopener noreferrer"' : "";
            htmlList.push(
                '                    <li class="nav-actions-mobile">\n' +
                '                        <a href="' +
                contactLink.url +
                '" class="btn-glow" data-field="header_buttons.contact_us.text" data-label="Contact Us Text"' +
                contactTarget +
                ">" +
                contactLink.text +
                "</a>\n" +
                "                    </li>"
            );
        }
        return htmlList.join("\n");
    }

    function applyConfigs() {
        var pathname = window.location.pathname;
        var page = pathname.split("/").pop() || "index.html";

        if (page === "index.html" || pathname === "/" || pathname === "") {
            if (homepageConfig && homepageConfig.navigation) {
                replaceCmsSection("NAV", generateNavHtml(homepageConfig.navigation, ""));
            }
            if (homepageConfig && homepageConfig.header_buttons) {
                var contactLink = homepageConfig.header_buttons.contact_us;
                var contactTarget = contactLink.new_tab ? ' target="_blank" rel="noopener noreferrer"' : "";
                var contactHtml = '                <a href="' + contactLink.url + '" class="btn-glow" data-field="header_buttons.contact_us.text" data-label="Contact Us Text"' + contactTarget + ">" + contactLink.text + "</a>";
                replaceCmsSection("NAV_CONTACT", contactHtml);
            }
            if (homepageConfig && homepageConfig.portfolio) {
                replaceCmsSection("PORTFOLIO_TITLE", '<h2 class="team-section-heading" data-field="portfolio.title" data-label="Portfolio Title">' + homepageConfig.portfolio.title + "</h2>");
                replaceCmsSection("PORTFOLIO_TRACK", homepageConfig.portfolio.embed_html);
                if (typeof initPortfolioCarousel === "function") initPortfolioCarousel();
                if (window.scEmbedController && typeof window.scEmbedController.load === "function") window.scEmbedController.load();
            }
        } else if (isNikhilBioPage()) {
            if (nikhilProfileConfig) {
                renderNikhilProfileFromConfig(nikhilProfileConfig);
            } else {
                fetch("nikhil_profile_config.json?t=" + Date.now())
                    .then(function (r) { return r.json(); })
                    .then(function (cfg) {
                        nikhilProfileConfig = cfg;
                        renderNikhilProfileFromConfig(nikhilProfileConfig);
                        setContentEditableOnFields();
                    })
                    .catch(function (err) { console.warn("Error fetching nikhil_profile_config.json:", err); });
            }
        } else if (isLegalPage()) {
            var docId = getLegalDocId();
            var prefix = window.location.pathname.indexOf("Legal") !== -1 ? "../" : "";
            if (legalConfig) {
                renderLegalDocFromConfig(legalConfig, docId);
            } else {
                fetch(prefix + "legal_config.json?t=" + Date.now())
                    .then(function (r) { return r.json(); })
                    .then(function (cfg) {
                        legalConfig = cfg;
                        renderLegalDocFromConfig(legalConfig, docId);
                        setContentEditableOnFields();
                    })
                    .catch(function (err) { console.warn("Error fetching legal_config.json:", err); });
            }
        }

        setContentEditableOnFields();
    }

    window.addEventListener("message", function (event) {
        var msg = event.data;
        if (!msg) return;
        if (msg.type === "init_cms_state") {
            if (msg.homepageConfig) homepageConfig = msg.homepageConfig;
            if (msg.pricingConfig) pricingConfig = msg.pricingConfig;
            if (msg.legalConfig) legalConfig = msg.legalConfig;
            if (msg.nikhilProfileConfig) nikhilProfileConfig = msg.nikhilProfileConfig;
            if (msg.enabled !== undefined) isHighlightEnabled = msg.enabled;
            applyConfigs();
        } else if (msg.type === "toggle_edit_mode") {
            isHighlightEnabled = msg.enabled;
            setContentEditableOnFields();
        } else if (msg.type === "update_cms_value") {
            var configTarget = msg.isPricing ? pricingConfig : msg.isNikhil ? nikhilProfileConfig : msg.isLegal ? legalConfig : homepageConfig;
            if (configTarget) {
                var cleanKey = msg.key.replace(/^profile\./, '').replace(/^legal\./, '');
                setNestedKey(configTarget, cleanKey, msg.value);
                applyConfigs();
            }
        } else if (msg.type === "set_legal_config") {
            legalConfig = msg.config;
            applyConfigs();
        } else if (msg.type === "set_nikhil_profile_config") {
            nikhilProfileConfig = msg.config;
            applyConfigs();
        }
    });

    window.addEventListener(
        "click",
        function (e) {
            if (!isHighlightEnabled) return;
            var textTarget = e.target.closest("[contenteditable='true'], [data-field]");
            if (textTarget) {
                var closestLink = e.target.closest("a");
                if (closestLink) {
                    e.preventDefault();
                    textTarget.focus();
                }
            }
        },
        true
    );

    if (isIframe) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", function () {
                applyConfigs();
                setContentEditableOnFields();
            });
        } else {
            applyConfigs();
            setContentEditableOnFields();
        }

        var pageName = window.location.pathname.split("/").pop() || "index.html";
        window.parent.postMessage({ type: "iframe_ready", page: pageName }, "*");
    }
})();