-- Seed Categories and Topics for SAT Prep

-- Math Categories
INSERT INTO categories (name, section, weight_in_section) VALUES
('Algebra', 'math', 35.00),
('Advanced Math', 'math', 35.00),
('Problem-Solving and Data Analysis', 'math', 15.00),
('Geometry and Trigonometry', 'math', 15.00);

-- Reading/Writing Categories
INSERT INTO categories (name, section, weight_in_section) VALUES
('Craft and Structure', 'reading_writing', 25.00),
('Expression of Ideas', 'reading_writing', 25.00),
('Information and Ideas', 'reading_writing', 25.00),
('Standard English Conventions', 'reading_writing', 25.00);

-- Math Topics
-- Algebra (35%) - 5 topics, each gets 20% of category weight
INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Linear equations in one variable', id, 20.00
FROM categories WHERE name = 'Algebra' AND section = 'math';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Linear functions', id, 20.00
FROM categories WHERE name = 'Algebra' AND section = 'math';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Linear equations in two variables', id, 20.00
FROM categories WHERE name = 'Algebra' AND section = 'math';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Systems of two linear equations in two variables', id, 20.00
FROM categories WHERE name = 'Algebra' AND section = 'math';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Linear inequalities in one or two variables', id, 20.00
FROM categories WHERE name = 'Algebra' AND section = 'math';

-- Advanced Math (35%) - 3 topics, each gets 33.33% of category weight
INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Equivalent expressions', id, 33.33
FROM categories WHERE name = 'Advanced Math' AND section = 'math';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Nonlinear equations in one variable and systems of equations in two variables', id, 33.33
FROM categories WHERE name = 'Advanced Math' AND section = 'math';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Nonlinear functions', id, 33.34
FROM categories WHERE name = 'Advanced Math' AND section = 'math';

-- Problem-Solving and Data Analysis (15%) - 7 topics, each gets ~14.29% of category weight
INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Ratios, rates, proportional relationships, and units', id, 14.29
FROM categories WHERE name = 'Problem-Solving and Data Analysis' AND section = 'math';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Percentages', id, 14.29
FROM categories WHERE name = 'Problem-Solving and Data Analysis' AND section = 'math';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'One-variable data: Distributions and measures of center and spread', id, 14.29
FROM categories WHERE name = 'Problem-Solving and Data Analysis' AND section = 'math';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Two-variable data: Models and scatterplots', id, 14.29
FROM categories WHERE name = 'Problem-Solving and Data Analysis' AND section = 'math';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Probability and conditional probability', id, 14.29
FROM categories WHERE name = 'Problem-Solving and Data Analysis' AND section = 'math';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Inference from sample statistics and margin of error', id, 14.29
FROM categories WHERE name = 'Problem-Solving and Data Analysis' AND section = 'math';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Evaluating statistical claims: Observational studies and experiments', id, 14.26
FROM categories WHERE name = 'Problem-Solving and Data Analysis' AND section = 'math';

-- Geometry and Trigonometry (15%) - 4 topics, each gets 25% of category weight
INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Area and volume', id, 25.00
FROM categories WHERE name = 'Geometry and Trigonometry' AND section = 'math';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Lines, angles, and triangles', id, 25.00
FROM categories WHERE name = 'Geometry and Trigonometry' AND section = 'math';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Right triangles and trigonometry', id, 25.00
FROM categories WHERE name = 'Geometry and Trigonometry' AND section = 'math';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Circles', id, 25.00
FROM categories WHERE name = 'Geometry and Trigonometry' AND section = 'math';

-- Reading/Writing Topics
-- Craft and Structure - 3 topics, each gets 33.33% of category weight
INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Cross-Text Connections', id, 33.33
FROM categories WHERE name = 'Craft and Structure' AND section = 'reading_writing';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Text Structure and Purpose', id, 33.33
FROM categories WHERE name = 'Craft and Structure' AND section = 'reading_writing';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Words in Context', id, 33.34
FROM categories WHERE name = 'Craft and Structure' AND section = 'reading_writing';

-- Expression of Ideas - 2 topics, each gets 50% of category weight
INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Rhetorical Synthesis', id, 50.00
FROM categories WHERE name = 'Expression of Ideas' AND section = 'reading_writing';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Transitions', id, 50.00
FROM categories WHERE name = 'Expression of Ideas' AND section = 'reading_writing';

-- Information and Ideas - 3 topics, each gets 33.33% of category weight
INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Central Ideas and Details', id, 33.33
FROM categories WHERE name = 'Information and Ideas' AND section = 'reading_writing';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Command of Evidence', id, 33.33
FROM categories WHERE name = 'Information and Ideas' AND section = 'reading_writing';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Inferences', id, 33.34
FROM categories WHERE name = 'Information and Ideas' AND section = 'reading_writing';

-- Standard English Conventions - 3 topics, each gets 33.33% of category weight
INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Boundaries', id, 33.33
FROM categories WHERE name = 'Standard English Conventions' AND section = 'reading_writing';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Form, Structure, and Sense', id, 33.33
FROM categories WHERE name = 'Standard English Conventions' AND section = 'reading_writing';

INSERT INTO topics (name, category_id, weight_in_category)
SELECT 'Command of Evidence: Textual', id, 33.34
FROM categories WHERE name = 'Standard English Conventions' AND section = 'reading_writing';
