"""
Topic Mapping: JSON skill_desc -> Database topic_id
Auto-generated from database on 2025-10-10
"""

# Complete mapping of JSON skill descriptions to database topic UUIDs
TOPIC_MAP = {
    'Area and volume': 'd1867614-c1b4-443a-8d5a-91232b8558bc',  # Geometry and Trigonometry (math)
    'Boundaries': '2878f97e-9008-423e-85c1-e3cb070ca035',  # Standard English Conventions (reading_writing)
    'Central Ideas and Details': '1c462672-c19f-42f8-866b-aa6c28b86272',  # Information and Ideas (reading_writing)
    'Circles': '2168868c-c592-43ab-92c5-c13c4a82b827',  # Geometry and Trigonometry (math)
    'Command of Evidence': '4db1e737-8458-453f-9811-323e7144cbbb',  # Information and Ideas (reading_writing)
    'Command of Evidence: Textual': '3f55cf40-7d1f-4bb7-8857-92328d7fec91',  # Standard English Conventions (reading_writing) - UNUSED
    'Cross-Text Connections': '74e5dfa3-0f64-4163-9f44-34513d5a1e19',  # Craft and Structure (reading_writing)
    'Equivalent expressions': 'af779445-0a26-45a0-a6b3-55421f1a1cdf',  # Advanced Math (math)
    'Evaluating statistical claims: Observational studies and experiments': '5136a327-0745-4db2-b4fc-4e6f387df1c8',  # Problem-Solving and Data Analysis (math)
    'Form, Structure, and Sense': '4917758b-6b43-448c-9cf2-07e518472cde',  # Standard English Conventions (reading_writing)
    'Inference from sample statistics and margin of error': '4763783b-ff36-4965-a655-f7eab65976df',  # Problem-Solving and Data Analysis (math)
    'Inferences': '7c84da50-31d7-45d7-b118-291fbf6f51c5',  # Information and Ideas (reading_writing)
    'Linear equations in one variable': '611ad103-faf0-4c34-8591-f06eddaad74d',  # Algebra (math)
    'Linear equations in two variables': '0a2c7f95-0632-41bc-9788-b647f587d5d2',  # Algebra (math)
    'Linear functions': '9ce34737-5c3e-43b0-a084-a463e0c34806',  # Algebra (math)
    'Linear inequalities in one or two variables': 'c63b1df7-17f8-4423-ba41-c319b413635b',  # Algebra (math)
    'Lines, angles, and triangles': '5b9c0513-9247-45e0-a787-9d678c4f0749',  # Geometry and Trigonometry (math)
    'Nonlinear equations in one variable and systems of equations in two variables': 'ab19025c-1262-4a6d-aaa2-c239edc72c5d',  # Advanced Math (math)
    'Nonlinear functions': '414ac420-21bd-4733-b611-e3273a489f3f',  # Advanced Math (math)
    'One-variable data: Distributions and measures of center and spread': '5dedc42d-fa19-4650-9d32-dd0f9a06db70',  # Problem-Solving and Data Analysis (math)
    'Percentages': 'f128607d-c786-4fc6-b850-2bc363def9f0',  # Problem-Solving and Data Analysis (math)
    'Probability and conditional probability': '728804a9-9798-42af-8ff7-2a03060c7fe0',  # Problem-Solving and Data Analysis (math)
    'Ratios, rates, proportional relationships, and units': 'aae05493-4c86-4698-8c1d-631db289d83b',  # Problem-Solving and Data Analysis (math)
    'Rhetorical Synthesis': 'fa663add-4408-41bf-a4e8-332eb59c3756',  # Expression of Ideas (reading_writing)
    'Right triangles and trigonometry': '9d63dafb-376e-44e6-9e03-064424e0d7ce',  # Geometry and Trigonometry (math)
    'Systems of two linear equations in two variables': '5c5d49a8-f0a9-43f3-879c-8af0ffcc9d7b',  # Algebra (math)
    'Text Structure and Purpose': '4e64f9a7-33b2-4649-a0f1-c3756c70a287',  # Craft and Structure (reading_writing)
    'Transitions': '72db9cba-2c9a-442d-bb5c-7dc3ae063c30',  # Expression of Ideas (reading_writing)
    'Two-variable data: Models and scatterplots': '1a23d232-ebfc-44be-9ce9-a824944668f6',  # Problem-Solving and Data Analysis (math)
    'Words in Context': '02c55727-1a6c-4e78-b6b5-6fa4436696ed',  # Craft and Structure (reading_writing)
}


def get_topic_id(skill_desc: str) -> str:
    """
    Map JSON skill_desc to database topic_id.

    Handles case variations and returns the corresponding topic UUID.

    Args:
        skill_desc: The skill description from JSON (e.g., "Linear equations in one variable")

    Returns:
        UUID string of the topic, or None if not found
    """
    # Handle case variations (Cross-Text vs Cross-text)
    if skill_desc in ['Cross-Text Connections', 'Cross-text Connections']:
        return TOPIC_MAP['Cross-Text Connections']

    # Direct lookup
    topic_id = TOPIC_MAP.get(skill_desc)

    if not topic_id:
        print(f"⚠️  Warning: No mapping found for skill: '{skill_desc}'")

    return topic_id


def validate_mapping():
    """
    Validate that all mappings are valid UUIDs.
    Run this to check the mapping integrity.
    """
    import re
    uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')

    errors = []
    for skill, topic_id in TOPIC_MAP.items():
        if not uuid_pattern.match(topic_id):
            errors.append(f"Invalid UUID for '{skill}': {topic_id}")

    if errors:
        print("❌ Validation errors:")
        for error in errors:
            print(f"  - {error}")
        return False
    else:
        print(f"✅ All {len(TOPIC_MAP)} mappings are valid")
        return True


if __name__ == '__main__':
    # Run validation when script is executed directly
    validate_mapping()
