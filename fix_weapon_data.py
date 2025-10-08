#!/usr/bin/env python3
import json

# Load JSON data
with open('json/structured_equipment_data.json', 'r') as f:
    data = json.load(f)

# Fix weapon data
for weapon in data['categories']['sword']:
    if weapon['type'] == 'weapon':
        name_lower = weapon['name'].lower()
        
        # Fix Fire Darts - should be Shuriken type with Fire attribute
        if 'fire darts' in name_lower:
            weapon['attribute'] = 'Fire'
            print(f"Fixed: {weapon['name']} -> Fire attribute")
        
        # Fix Marine Knife and Glacier Knife - should be Kunai type with Water attribute  
        if 'marine knife' in name_lower or 'glacier knife' in name_lower:
            weapon['attribute'] = 'Water'
            print(f"Fixed: {weapon['name']} -> Water attribute")
        
        # Fix Black Fang Kunai - should be Kunai type with Water attribute
        if 'black fang kunai' in name_lower:
            weapon['attribute'] = 'Water'
            print(f"Fixed: {weapon['name']} -> Water attribute")

# Save updated JSON
with open('json/structured_equipment_data.json', 'w') as f:
    json.dump(data, f, indent=2)

print("✅ Weapon data corrections completed!")