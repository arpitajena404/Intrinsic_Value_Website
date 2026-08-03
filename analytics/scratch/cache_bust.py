import os
import glob
import re

def cache_bust_analytics():
    # 1. Analytics pages
    analytics_files = glob.glob("analytics/frontend/pages/*.html")
    for filepath in analytics_files:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Replace main.css?v=X with main.css?v=8
        updated = re.sub(r'main\.css\?v=\d+', 'main.css?v=8', content)
        # Replace navigation.js?v=X with navigation.js?v=12
        updated = re.sub(r'navigation\.js\?v=\d+', 'navigation.js?v=12', updated)
        # Replace modules/*.js?v=X with modules/*.js?v=12
        updated = re.sub(r'(js/modules/[a-zA-Z0-9_-]+\.js)\?v=\d+', r'\1?v=12', updated)
        # Replace portfolio-review-tool.css?v=X with portfolio-review-tool.css?v=12
        updated = re.sub(r'portfolio-review-tool\.css\?v=\d+', 'portfolio-review-tool.css?v=12', updated)
        
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
        
        # Replace style.css?v=X with style.css?v=8 (handles absolute, relative, and full URL paths)
        updated = re.sub(r'style\.css\?v=\d+', 'style.css?v=8', content)
        # Replace script.js?v=X with script.js?v=8
        updated = re.sub(r'script\.js\?v=\d+', 'script.js?v=8', updated)
        
        # Cache-bust iv_admin.js
        updated = updated.replace('src="iv_admin.js"', 'src="iv_admin.js?v=8"')
        updated = re.sub(r'iv_admin\.js\?v=\d+', 'iv_admin.js?v=8', updated)
        
        # Cache-bust main_cms_controller.js
        updated = updated.replace('src="main_cms_controller.js"', 'src="main_cms_controller.js?v=8"')
        updated = re.sub(r'main_cms_controller\.js\?v=\d+', 'main_cms_controller.js?v=8', updated)
        
        # Cache-bust blogs.js
        updated = updated.replace('src="blogs.js"', 'src="blogs.js?v=8"')
        updated = re.sub(r'blogs\.js\?v=\d+', 'blogs.js?v=8', updated)
        
        # Cache-bust fetch('/blogs.json') in blog-detail.html
        if 'blog-detail.html' in filepath:
            # Replace only the unversioned fetch('/blogs.json')
            updated = updated.replace("fetch('/blogs.json')", "fetch('/blogs.json?t=' + Date.now())")
            updated = updated.replace("fetch(\"/blogs.json\")", "fetch('/blogs.json?t=' + Date.now())")
        
        if updated != content:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(updated)
            print(f"Updated root/legal file: {filepath}")

if __name__ == "__main__":
    cache_bust_analytics()
    cache_bust_root()
