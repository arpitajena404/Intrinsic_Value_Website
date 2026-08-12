import json
from collections import Counter

with open('blogs.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

images = [b.get('image') for b in data if b.get('image')]
counts = Counter(images)

print("Duplicate images in blogs.json:")
for img, count in counts.items():
    if count > 1:
        print(f"  Count {count}: {img}")
        matching_titles = [b.get('title')[:30] for b in data if b.get('image') == img]
        print(f"    Titles: {matching_titles}")
