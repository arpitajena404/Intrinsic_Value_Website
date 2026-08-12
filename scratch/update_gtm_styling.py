import os, glob, re

root_dir = r"c:\IV website"
html_files = []

for dirpath, dirnames, filenames in os.walk(root_dir):
    if '.git' in dirpath or 'node_modules' in dirpath:
        continue
    for f in filenames:
        if f.endswith('.html'):
            html_files.append(os.path.join(dirpath, f))

updated_count = 0
for filepath in html_files:
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Check if file has GTM iframe
    if 'googletagmanager.com/ns.html' in content:
        # Perform replacement of style and dimensions
        new_content = content.replace(
            'height="0" width="0" style="display:none;visibility:hidden"',
            'width="1" height="1" style="position:absolute;top:-9999px;left:-9999px;border:0;"'
        )
        new_content = new_content.replace(
            'style="display:none;visibility:hidden" height="0" width="0"',
            'width="1" height="1" style="position:absolute;top:-9999px;left:-9999px;border:0;"'
        )
        new_content = new_content.replace(
            'style="display:none;visibility:hidden"',
            'style="position:absolute;top:-9999px;left:-9999px;border:0;"'
        )
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            updated_count += 1
            print(f"Updated: {filepath}")

print(f"\nTotal HTML files updated: {updated_count}")
