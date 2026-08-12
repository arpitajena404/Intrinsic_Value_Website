import json, sys

with open('blogs.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for i, b in enumerate(data):
    photos = [bk.get('url') for bk in b.get('blocks', []) if bk.get('type') == 'photo']
    title = (b.get('title') or '')[:40].encode('ascii', 'replace').decode('ascii')
    print(f"Index {i} | ID: {b.get('id')} | Title: {title} | Image: {b.get('image')} | First Block Photo: {photos[0] if photos else None}")
