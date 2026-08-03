(function () {
  document.addEventListener("DOMContentLoaded", function () {
    // Quick Tools Redirections
    var quickTools = document.querySelectorAll("[data-quick-view]");
    quickTools.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var view = btn.getAttribute("data-quick-view");
        if (!view) return;

        if (view === "tools") {
          window.location.href = "https://premium.intrinsicvalueequity.in/checkout/98ce69d1-d43b-47b2-a06c-f816b3ee8c91?dynamic_link=4ab4ed75-6d6f-4b1a-8084-aee9854d4863";
          return;
        }

        var filename = view + ".html";
        if (view === "ranking") {
          filename = "ranking-tool.html";
        } else if (view === "monthly-analysis") {
          filename = "monthly-market-analysis.html";
        } else if (view === "upcycle-downcycle" || view === "headwind-tailwind-indicator") {
          filename = "/analytics/upcycle-downcycle";
        }

        window.location.href = filename;
      });
    });

    // Render static ticker data (client-only free version fallback)
    var tickerEl = document.querySelector(".iv-ticker");
    if (tickerEl) {
      var staticItems = [
        { label: "NIFTY 50", value: "23,450.50", changeClass: "up", change: "+0.45%", badgeClass: "info", badge: "STABLE" },
        { label: "SENSEX", value: "77,100.80", changeClass: "up", change: "+0.38%", badgeClass: "info", badge: "STABLE" },
        { label: "RELIANCE", value: "₹2,950.00", changeClass: "up", change: "+1.20%", badgeClass: "success", badge: "UNDERVALUED" },
        { label: "TCS", value: "₹3,820.00", changeClass: "down", change: "-0.50%", badgeClass: "warn", badge: "FAIR VALUE" },
        { label: "HDFCBANK", value: "₹1,610.00", changeClass: "up", change: "+0.85%", badgeClass: "success", badge: "UNDERVALUED" },
        { label: "INFOSYS", value: "₹1,480.00", changeClass: "down", change: "-1.10%", badgeClass: "danger", badge: "OVERVALUED" },
        { label: "ICICIBANK", value: "₹1,120.00", changeClass: "up", change: "+2.30%", badgeClass: "success", badge: "UNDERVALUED" },
        { label: "BHARTIARTL", value: "₹1,350.00", changeClass: "up", change: "+0.10%", badgeClass: "warn", badge: "FAIR VALUE" }
      ];
      
      var itemsHtml = staticItems.map(function (item) {
        var isCompany = item.label;
        var labelClass = isCompany ? "ticker-label iv-blur-value" : "ticker-label";
        return '<div class="iv-ticker-item">' +
          '<span class="' + labelClass + '">' + item.label + '</span>' +
          '<span class="ticker-val">' + item.value + '</span>' +
          '<span class="ticker-change ' + item.changeClass + '">' + item.change + '</span>' +
          '<span class="ticker-badge ' + item.badgeClass + '">' + item.badge + '</span>' +
          '</div>';
      }).join('');
      
      // Duplicate items to ensure smooth infinite loop scroll
      tickerEl.innerHTML = itemsHtml + itemsHtml;
    }

    // Scroll Reveal Intersection Observer
    var revealItems = document.querySelectorAll(".iv-micro-card, .iv-stacked-card, .iv-discipline-card");
    
    // Add structural reveal classes
    revealItems.forEach(function (item) {
      item.classList.add("iv-reveal-item");
    });

    var observerOptions = {
      root: null, // viewport
      threshold: 0.08, // trigger when 8% is visible
      rootMargin: "0px 0px -40px 0px" // offset to trigger slightly early
    };

    var observer = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target); // trigger only once
        }
      });
    }, observerOptions);

    revealItems.forEach(function (item) {
      observer.observe(item);
    });

    // Equalize heights of all stacked cards so shorter cards cover taller ones when scrolled
    function adjustStackedCardsHeight() {
      var cards = document.querySelectorAll('.iv-stacked-card');
      if (!cards.length) return;
      
      // Reset min-height and top first to get natural values
      cards.forEach(function(card) {
        card.style.minHeight = '';
        card.style.top = '';
      });

      // Only equalize heights and center on desktop viewports
      if (window.innerWidth <= 768) {
        return;
      }
      
      // Find max height
      var maxHeight = 0;
      cards.forEach(function(card) {
        var height = card.offsetHeight;
        if (height > maxHeight) {
          maxHeight = height;
        }
      });
      
      // Calculate topOffset for vertical centering in viewport
      // Ensure at least 95px to clear sticky top navigation
      var topOffset = Math.max(95, Math.floor((window.innerHeight - maxHeight) / 2));
      
      // Apply max height as min-height and dynamic top offset to all cards
      cards.forEach(function(card) {
        card.style.minHeight = maxHeight + 'px';
        card.style.top = topOffset + 'px';
      });
    }

    // Mobile Tabs Toggling Logic
    var tabBtns = document.querySelectorAll(".iv-tab-btn");
    var stackedCards = document.querySelectorAll('.iv-stacked-card');

    function applyTabFiltering() {
      if (window.innerWidth <= 768) {
        var activeBtn = document.querySelector(".iv-tab-btn.active");
        if (activeBtn) {
          var targetId = activeBtn.getAttribute("data-target");
          stackedCards.forEach(function (card) {
            if (card.id === targetId) {
              card.classList.add("active-tab");
            } else {
              card.classList.remove("active-tab");
            }
          });
        } else if (tabBtns.length) {
          tabBtns[0].classList.add("active");
          var targetId = tabBtns[0].getAttribute("data-target");
          stackedCards.forEach(function (card) {
            if (card.id === targetId) {
              card.classList.add("active-tab");
            } else {
              card.classList.remove("active-tab");
            }
          });
        }
      } else {
        stackedCards.forEach(function (card) {
          card.classList.remove("active-tab");
        });
      }
    }

    tabBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        tabBtns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        applyTabFiltering();
      });
    });

    // Run height adjustment & tab filtering
    adjustStackedCardsHeight();
    applyTabFiltering();
    
    window.addEventListener("load", function () {
      adjustStackedCardsHeight();
      applyTabFiltering();
    });
    
    window.addEventListener("resize", function () {
      adjustStackedCardsHeight();
      applyTabFiltering();
    });
  });
})();

