#!/usr/bin/env python3
import json
import re

def parse_monster_data(file_path, monster_type):
    """Parse raw monster data from file"""
    monsters = []
    
    with open(file_path, 'r') as f:
        content = f.read().strip()
    
    lines = [line.strip() for line in content.split('\n') if line.strip()]
    
    for line in lines:
        parts = line.split(',')
        if len(parts) >= 4:  # name, level, hp, maps...
            name = parts[0].replace('_', ' ')
            level = int(parts[1])
            hp = int(parts[2])
            maps = [map_name.replace('_', ' ') for map_name in parts[3:]]
            
            monster = {
                "id": parts[0].lower(),
                "name": name,
                "level": level,
                "hp": hp,
                "type": monster_type,
                "locations": maps,
                "metadata": {
                    "difficulty_tier": get_difficulty_tier(level),
                    "hp_category": get_hp_category(hp)
                }
            }
            monsters.append(monster)
    
    return monsters

def get_difficulty_tier(level):
    """Categorize monsters by difficulty based on level"""
    if level <= 10:
        return "beginner"
    elif level <= 30:
        return "intermediate"
    elif level <= 60:
        return "advanced"
    elif level <= 100:
        return "expert"
    else:
        return "master"

def get_hp_category(hp):
    """Categorize monsters by HP range"""
    if hp < 1000:
        return "low"
    elif hp < 10000:
        return "medium"
    elif hp < 100000:
        return "high"
    elif hp < 1000000:
        return "very_high"
    else:
        return "extreme"

def create_structured_database():
    """Create the main structured monster database"""
    
    # Parse both files
    regular_monsters = parse_monster_data('regular-monsters.json', 'regular')
    cursed_monsters = parse_monster_data('cursed-land-monsters.json', 'cursed')
    
    # Combine all monsters
    all_monsters = regular_monsters + cursed_monsters
    
    # Create structured database
    database = {
        "version": "1.0",
        "last_updated": "2024-01-01",
        "total_monsters": len(all_monsters),
        "statistics": {
            "regular_monsters": len(regular_monsters),
            "cursed_monsters": len(cursed_monsters),
            "level_range": {
                "min": min(m["level"] for m in all_monsters),
                "max": max(m["level"] for m in all_monsters)
            },
            "hp_range": {
                "min": min(m["hp"] for m in all_monsters),
                "max": max(m["hp"] for m in all_monsters)
            }
        },
        "monsters": {
            "regular": regular_monsters,
            "cursed": cursed_monsters
        }
    }
    
    return database

if __name__ == "__main__":
    # Create structured database
    monster_db = create_structured_database()
    
    # Save to file
    with open('monsters_database.json', 'w') as f:
        json.dump(monster_db, f, indent=2)
    
    print(f"✅ Created monsters_database.json with {monster_db['total_monsters']} monsters")
    print(f"📊 Regular: {monster_db['statistics']['regular_monsters']}")
    print(f"👹 Cursed: {monster_db['statistics']['cursed_monsters']}")
    print(f"🎯 Level range: {monster_db['statistics']['level_range']['min']}-{monster_db['statistics']['level_range']['max']}")