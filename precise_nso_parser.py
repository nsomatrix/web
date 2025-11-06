#!/usr/bin/env python3
import json
import re

def parse_nso_codes_precise():
    """Parse NSO codes with precise section detection"""
    
    with open('nsocodes.json', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    structured_data = {
        "metadata": {
            "title": "NSO Game Codes",
            "description": "Categorized command codes for NSO game",
            "version": "1.0",
            "categories": ["general", "nsotien", "trungduc"]
        },
        "codes": {
            "general": [],
            "nsotien": [],
            "trungduc": []
        }
    }
    
    current_category = None
    
    for i, line in enumerate(lines):
        line = line.strip()
        
        # Skip empty lines
        if not line:
            continue
        
        # Check for category headers
        if line.lower() == 'general':
            current_category = 'general'
            print(f"📂 Found category: {current_category} at line {i+1}")
            continue
        elif line.lower() == 'nsotien':
            current_category = 'nsotien'
            print(f"📂 Found category: {current_category} at line {i+1}")
            continue
        elif line.lower() == 'trungduc':
            current_category = 'trungduc'
            print(f"📂 Found category: {current_category} at line {i+1}")
            continue
        
        # Skip if no category is set yet
        if current_category is None:
            continue
        
        # Parse command line
        if ':' in line:
            parts = line.split(':', 1)
            command = parts[0].strip()
            description = parts[1].strip()
            
            # Extract examples in brackets
            example = None
            example_match = re.search(r'\[([^\]]+)\]', description)
            if example_match:
                example = example_match.group(1)
                description = re.sub(r'\s*\[([^\]]+)\]', '', description).strip()
            
            command_obj = {
                "command": command,
                "description": description
            }
            
            if example:
                command_obj["example"] = example
            
            structured_data["codes"][current_category].append(command_obj)
    
    return structured_data

def print_statistics(structured_data):
    """Print detailed statistics"""
    print("\n📊 Final Statistics:")
    
    expected_counts = {
        "general": 64,
        "nsotien": 12,
        "trungduc": 44
    }
    
    total_actual = 0
    all_correct = True
    
    for category in ["general", "nsotien", "trungduc"]:
        actual = len(structured_data["codes"][category])
        expected = expected_counts[category]
        total_actual += actual
        
        status = "✅" if actual == expected else "❌"
        print(f"{status} {category.capitalize()}: {actual} codes (expected: {expected})")
        
        if actual != expected:
            all_correct = False
    
    total_expected = sum(expected_counts.values())
    total_status = "✅" if total_actual == total_expected else "❌"
    print(f"{total_status} Total: {total_actual} codes (expected: {total_expected})")
    
    return all_correct

def show_category_boundaries(structured_data):
    """Show the first and last commands of each category"""
    print("\n🔍 Category Boundaries:")
    
    for category in ["general", "nsotien", "trungduc"]:
        codes = structured_data["codes"][category]
        if codes:
            first_cmd = codes[0]["command"]
            last_cmd = codes[-1]["command"]
            print(f"{category.capitalize()}: {first_cmd} → {last_cmd} ({len(codes)} codes)")
        else:
            print(f"{category.capitalize()}: Empty")

def main():
    try:
        print("🔄 Parsing NSO codes with precise detection...")
        structured_data = parse_nso_codes_precise()
        
        # Show boundaries
        show_category_boundaries(structured_data)
        
        # Print statistics
        is_valid = print_statistics(structured_data)
        
        # Add metadata
        for category, codes in structured_data["codes"].items():
            structured_data["metadata"][f"{category}_count"] = len(codes)
        
        structured_data["metadata"]["total_codes"] = sum(
            len(codes) for codes in structured_data["codes"].values()
        )
        
        # Write output
        output_file = 'nsocode_final.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(structured_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Successfully created {output_file}")
        
        if is_valid:
            print("🎉 All counts match expected values!")
        else:
            print("⚠️  Some counts don't match. Check the parsing logic.")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()