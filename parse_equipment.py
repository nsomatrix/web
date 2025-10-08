import json
import re

def parse_equipment_data(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    equipment_data = {
        "version": "1.0",
        "last_updated": "2024-01-01",
        "description": "Equipment and weapons data for Ninja School Online",
        "categories": {}
    }
    
    sections = content.split('\n\n')
    current_category = None
    
    for section in sections:
        lines = section.strip().split('\n')
        if not lines or not lines[0]:
            continue
            
        # Check if this is a category header
        if 'DATA' in lines[0] and len(lines) == 1:
            current_category = lines[0].replace(' DATA', '').lower().replace(' ', '_')
            equipment_data["categories"][current_category] = []
            continue
            
        # Check if this is a weapon subcategory
        if current_category == "weapons" and len(lines) == 1 and lines[0].isupper():
            weapon_type = lines[0].lower()
            if weapon_type not in equipment_data["categories"]:
                equipment_data["categories"][weapon_type] = []
            current_category = weapon_type
            continue
            
        # Parse equipment/weapon lines
        for line in lines:
            if not line.strip() or 'DATA' in line or line.isupper():
                continue
                
            parsed_item = parse_line(line, current_category)
            if parsed_item and current_category:
                equipment_data["categories"][current_category].append(parsed_item)
    
    return equipment_data

def parse_line(line, category):
    parts = line.split(',')
    if len(parts) < 3:
        return None
    
    name = parts[0].strip()
    level = int(parts[1].strip())
    
    # Check if it's a weapon (has External_Strike and Internal_Strike)
    if 'External_Strike' in line and 'Internal_Strike' in line:
        return parse_weapon(parts, name, level)
    else:
        return parse_equipment(parts, name, level)

def parse_weapon(parts, name, level):
    weapon = {
        "name": name,
        "level": level,
        "type": "weapon",
        "external_strike": 0,
        "internal_strike": 0,
        "upgrades": []
    }
    
    # Extract external and internal strike
    for part in parts:
        if 'External_Strike' in part:
            weapon["external_strike"] = int(re.search(r'(\d+)', part).group(1))
        elif 'Internal_Strike' in part:
            weapon["internal_strike"] = int(re.search(r'(\d+)', part).group(1))
        elif '+' in part:
            upgrade = parse_upgrade(part)
            if upgrade:
                weapon["upgrades"].append(upgrade)
    
    return weapon

def parse_equipment(parts, name, level):
    equipment = {
        "name": name,
        "level": level,
        "type": "equipment",
        "attribute": parts[2].strip() if len(parts) > 2 else "Fire",
        "upgrades": []
    }
    
    # Parse upgrades (parts with +)
    for part in parts[3:]:
        if '+' in part:
            upgrade = parse_upgrade(part)
            if upgrade:
                equipment["upgrades"].append(upgrade)
    
    return equipment

def parse_upgrade(upgrade_text):
    upgrade_text = upgrade_text.strip()
    if not upgrade_text.startswith('+'):
        return None
    
    # Split by underscore to get upgrade level and description
    parts = upgrade_text.split('_', 1)
    if len(parts) != 2:
        return None
    
    upgrade_level = parts[0].replace('+', '')
    description_and_value = parts[1]
    
    # Split description and value by colon
    if ' : ' in description_and_value:
        description, value = description_and_value.split(' : ', 1)
        return {
            "upgrade_level": upgrade_level,
            "description": description.strip(),
            "value": value.strip()
        }
    
    return {
        "upgrade_level": upgrade_level,
        "description": description_and_value.strip(),
        "value": ""
    }

def main():
    input_file = 'equipmentsdata.json'  # Raw data file
    output_file = 'json/structured_equipment_data.json'
    
    try:
        equipment_data = parse_equipment_data(input_file)
        
        # Save structured data
        with open(output_file, 'w') as f:
            json.dump(equipment_data, f, indent=2)
        
        print(f"✅ Successfully parsed equipment data!")
        print(f"📁 Output saved to: {output_file}")
        print(f"📊 Categories found: {len(equipment_data['categories'])}")
        
        # Print summary
        for category, items in equipment_data['categories'].items():
            print(f"   - {category.replace('_', ' ').title()}: {len(items)} items")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()