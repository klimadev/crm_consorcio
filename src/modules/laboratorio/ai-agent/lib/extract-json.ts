export function extractJson<T = unknown>(text: string): T {
  const trimmed = text.trim();

  // 1. Try direct parse
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // continue
  }

  // 2. Try to extract ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as T;
    } catch {
      // continue
    }
  }

  // 3. Try to extract first { ... } complete object
  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]) as T;
    } catch {
      // continue
    }
  }

  // 4. Try to extract first [ ... ] complete array
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]) as T;
    } catch {
      // continue
    }
  }

  throw new Error("Could not extract valid JSON from model response");
}
