import json
import re

def parse_skillsets():
    with open('skillsets.json', 'r') as f:
        raw_data = f.read()
    
    # Define school mappings
    schools = {
        'blade': 'haruna',
        'fan': 'haruna',
        'bow': 'ookaza', 
        'kunai': 'ookaza',
        'sword': 'hirosaki',
        'shuriken': 'hirosaki'
    }
    
    structured_data = {
        "schools": {
            "haruna": {"classes": ["blade", "fan"]},
            "ookaza": {"classes": ["bow", "kunai"]},
            "hirosaki": {"classes": ["sword", "shuriken"]}
        },
        "classes": {}
    }
    
    # Split by class sections
    sections = re.split(r'Class : (\w+),School : (\w+)', raw_data)[1:]
    
    for i in range(0, len(sections), 3):
        class_name = sections[i].lower()
        school_name = sections[i+1].lower()
        skills_text = sections[i+2].strip()
        
        skills = []
        for line in skills_text.split('\n'):
            if line.strip() and ':' in line:
                skill_match = re.match(r'([^-]+)-(\d+)\s*:\s*(.+)', line.strip())
                if skill_match:
                    skills.append({
                        "name": skill_match.group(1),
                        "level": int(skill_match.group(2)),
                        "description": skill_match.group(3)
                    })
        
        structured_data["classes"][class_name] = {
            "school": school_name,
            "skills": skills
        }
    
    with open('structured_skillsets.json', 'w') as f:
        json.dump(structured_data, f, indent=2)
    
    print("Structured skillsets data created successfully!")

if __name__ == "__main__":
    parse_skillsets()