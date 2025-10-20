/**
 * Utility functions for processing and rendering questions
 */

/**
 * Process question text to replace blank placeholders with proper blank elements
 * Handles common SAT fill-in-the-blank patterns like ____blank____, _____, ___blank___, etc.
 *
 * @param text - The raw question text from the database
 * @returns Processed HTML string with proper blank rendering
 */
export function processQuestionBlanks(text: string): string {
  if (!text) return text;

  // Common blank patterns in SAT questions
  const blankPatterns = [
    /____(?:blank|Blank)?____/g, // ____blank____ or ____Blank____
    /___(?:blank|Blank)?___/g, // ___blank___ or ___Blank___
    /__(?:blank|Blank)?__/g, // __blank__ or __Blank__
    /_(?:blank|Blank)?_/g, // _blank_ or _Blank_
    /_{3,}/g, // Three or more underscores (____, _____, ______, etc.)
  ];

  let processedText = text;

  // Replace each blank pattern with a span element styled as an underline
  for (const pattern of blankPatterns) {
    processedText = processedText.replace(
      pattern,
      '<span class="question-blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>'
    );
  }

  return processedText;
}
