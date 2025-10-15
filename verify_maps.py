#!/usr/bin/env python3
import json
import os

# Get all map names from database
with open('json/monsters_database.json', 'r') as f:
    data = json.load(f)

all_locations = set()
for monster in data['monsters']['regular']:
    all_locations.update(monster['locations'])
for monster in data['monsters']['cursed']:
    all_locations.update(monster['locations'])

# Convert map names to expected filename format
def map_to_filename(map_name):
    # Keep Roman numerals uppercase in filenames
    filename = map_name.replace(' ', '-')
    # Convert to lowercase but preserve Roman numerals
    parts = filename.split('-')
    result = []
    for part in parts:
        if part in ['I', 'II', 'III', 'IV', 'V']:
            result.append(part)  # Keep Roman numerals uppercase
        else:
            result.append(part.lower())
    return '-'.join(result) + '.png'

# Get actual image files
image_dir = '/home/mackruize/Pictures/compressed'
actual_files = set(os.listdir(image_dir)) if os.path.exists(image_dir) else set()

# Check matches
expected_files = {map_to_filename(loc) for loc in all_locations}
matches = expected_files & actual_files
missing = expected_files - actual_files
extra = actual_files - expected_files

print(f"Database maps: {len(all_locations)}")
print(f"Image files: {len(actual_files)}")
print(f"Perfect matches: {len(matches)}")
print(f"Missing images: {len(missing)}")
print(f"Extra images: {len(extra)}")

if missing:
    print(f"\nMissing images:")
    for f in sorted(missing):
        print(f"  {f}")

if extra:
    print(f"\nExtra images (not in database):")
    for f in sorted(extra):
        print(f"  {f}")

print(f"\nMatch rate: {len(matches)}/{len(all_locations)} ({len(matches)/len(all_locations)*100:.1f}%)")