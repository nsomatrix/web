#!/usr/bin/env python3
import json

def get_weapon_attribute(weapon_name):
    name_lower = weapon_name.lower()
    if 'blade' in name_lower or 'fan' in name_lower:
        return 'Wind'
    elif 'sword' in name_lower or 'shuriken' in name_lower or 'darts' in name_lower:
        return 'Fire'
    elif 'bow' in name_lower or 'kunai' in name_lower or 'knife' in name_lower:
        return 'Water'
    return None

# Load JSON data
with open('json/structured_equipment_data.json', 'r') as f:
    data = json.load(f)

# Add attributes to weapons in sword category
for weapon in data['categories']['sword']:
    if weapon['type'] == 'weapon':
        attribute = get_weapon_attribute(weapon['name'])
        if attribute:
            weapon['attribute'] = attribute

# Save updated JSON
with open('json/structured_equipment_data.json', 'w') as f:
    json.dump(data, f, indent=2)

print("✅ Weapon attributes added successfully!")