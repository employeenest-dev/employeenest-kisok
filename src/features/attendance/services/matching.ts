import { Employee, MatchOutcome, RecognitionThresholds } from '../types';

export function getMatchOutcome(
  similarity: number,
  thresholds: RecognitionThresholds,
): MatchOutcome {
  if (similarity >= thresholds.autoMatch) {
    return 'AUTO';
  }

  if (similarity >= thresholds.reviewMatch) {
    return 'REVIEW';
  }

  return 'MANUAL';
}

export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const l = left[index] || 0;
    const r = right[index] || 0;
    dot += l * r;
    leftMagnitude += l ** 2;
    rightMagnitude += r ** 2;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function findBestEmployeeMatch(
  embedding: number[],
  employees: Employee[],
): { employee: Employee; similarity: number } | null {
  let bestMatch: { employee: Employee; similarity: number } | null = null;

  for (const employee of employees) {
    const similarity = cosineSimilarity(embedding, employee.faceEmbedding);

    if (!bestMatch || similarity > bestMatch.similarity) {
      bestMatch = { employee, similarity };
    }
  }

  return bestMatch;
}
