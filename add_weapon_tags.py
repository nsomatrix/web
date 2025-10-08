#!/usr/bin/env python3
import json

def get_weapon_tag(weapon_name):
    name_lower = weapon_name.lower()
    if 'sword' in name_lower:
        return 'sword'
    elif 'kunai' in name_lower or 'knife' in name_lower:
        return 'kunai'
    elif 'blade' in name_lower:
        return 'blade'
    elif 'shuriken' in name_lower or 'darts' in name_lower:
        return 'shuriken'
    elif 'bow' in name_lower:
        return 'bow'
    elif 'fan' in name_lower:
        return 'fan'
    return None

# Load JSON data
with open('json/structured_equipment_data.json', 'r') as f:
    data = json.load(f)

# Add weapon_type tag to all weapons
for weapon in data['categories']['sword']:
    if weapon['type'] == 'weapon':
        weapon_tag = get_weapon_tag(weapon['name'])
        if weapon_tag:
            weapon['weapon_type'] = weapon_tag
            print(f"Added tag: {weapon['name']} -> {weapon_tag}")

# Save updated JSON
with open('json/structured_equipment_data.json', 'w') as f:
    json.dump(data, f, indent=2)

print("✅ Weapon tags added successfully!")