import os
import glob

def cache_bust_analytics():
    # 1. Analytics pages
    analytics_files = glob.glob("analytics/frontend/pages/*.html")
    for filepath in analytics_files:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Replace main.css?v=3 with main.css?v=6
        updated = content.replace('main.css?v=3', 'main.css?v=6')
        # Replace navigation.js?v=3 with navigation.js?v=6
        updated = updated.replace('navigation.js?v=3', 'navigation.js?v=6')
        
        if updated != content:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(updated)
            print(f"Updated analytics file: {filepath}")

def cache_bust_root():
    # 2. Root files and Legal&Compliance
    root_files = glob.glob("*.html") + glob.glob("Legal&Compliance/*.html")
    for filepath in root_files:
        if not os.path.exists(filepath):
            continue
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Replace style.css?v=5 with style.css?v=6
        updated = content.replace('style.css?v=5', 'style.css?v=6')
        
        if updated != content:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(updated)
            print(f"Updated root/legal file: {filepath}")

if __name__ == "__main__":
    cache_bust_analytics()
    cache_bust_root()
