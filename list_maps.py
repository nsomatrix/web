#!/usr/bin/env python3
import json

def list_maps():
    with open('json/monsters_database.json', 'r') as f:
        data = json.load(f)
    
    # Collect all unique locations
    all_locations = set()
    
    # From regular monsters
    for monster in data['monsters']['regular']:
        all_locations.update(monster['locations'])
    
    # From cursed monsters
    for monster in data['monsters']['cursed']:
        all_locations.update(monster['locations'])
    
    # Sort locations
    sorted_locations = sorted(all_locations)
    
    # Categorize maps
    cursed_keywords = ['death', 'nightmare', 'horror', 'skeleton', 'cannibal', 'dread', 'heartbreak', 'suicide', 'secrets']
    regular_maps = []
    cursed_maps = []
    
    for location in sorted_locations:
        is_cursed = any(keyword in location.lower() for keyword in cursed_keywords)
        if is_cursed:
            cursed_maps.append(location)
        else:
            regular_maps.append(location)
    
    print(f"NINJADEX MAPS - Total: {len(sorted_locations)}")
    print("=" * 50)
    
    print(f"\nREGULAR MAPS ({len(regular_maps)}):")
    print("-" * 30)
    for i, map_name in enumerate(regular_maps, 1):
        print(f"{i:2d}. {map_name}")
    
    print(f"\nCURSED LAND MAPS ({len(cursed_maps)}):")
    print("-" * 30)
    for i, map_name in enumerate(cursed_maps, 1):
        print(f"{i:2d}. {map_name}")

if __name__ == "__main__":
    list_maps()