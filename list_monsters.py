#!/usr/bin/env python3
import json

def list_monsters():
    with open('json/monsters_database.json', 'r') as f:
        data = json.load(f)
    
    print(f"NINJADEX - Total Monsters: {data['total_monsters']}")
    print("=" * 50)
    
    # Regular monsters
    print(f"\nREGULAR MONSTERS ({data['statistics']['regular_monsters']}):")
    print("-" * 30)
    for monster in data['monsters']['regular']:
        print(f"{monster['name']} (Lv.{monster['level']}, HP: {monster['hp']:,})")
    
    # Cursed monsters
    print(f"\nCURSED MONSTERS ({data['statistics']['cursed_monsters']}):")
    print("-" * 30)
    for monster in data['monsters']['cursed']:
        print(f"{monster['name']} (Lv.{monster['level']}, HP: {monster['hp']:,})")

if __name__ == "__main__":
    list_monsters()