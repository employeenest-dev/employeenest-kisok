import { RecognitionThresholds, RecognitionStatus, Employee } from '../types';
import { findBestEmployeeMatch, getMatchOutcome } from './matching';

export function evaluateRecognition(args: {
  embedding?: number[];
  employees: Employee[];
  faceCount: number;
  thresholds: RecognitionThresholds;
}): RecognitionStatus {
  if (args.faceCount === 0) {
    return {
      availability: 'unavailable',
      faceCount: 0,
      message: 'Waiting for a face in frame.',
      outcome: 'UNAVAILABLE',
    };
  }

  if (args.faceCount > 1) {
    return {
      availability: 'unavailable',
      faceCount: args.faceCount,
      message: 'Multiple faces detected. Keep a single person in frame.',
      outcome: 'UNAVAILABLE',
    };
  }

  if (!args.embedding || args.embedding.length === 0) {
    return {
      availability: 'unavailable',
      faceCount: 1,
      message:
        'Face detection is live, but embedding generation is not configured in this build yet. Manual fallback remains active.',
      outcome: 'UNAVAILABLE',
    };
  }

  const bestMatch = findBestEmployeeMatch(args.embedding, args.employees);

  if (!bestMatch) {
    return {
      availability: 'ready',
      faceCount: 1,
      message: 'No employee embeddings are available locally.',
      outcome: 'MANUAL',
    };
  }

  const outcome = getMatchOutcome(bestMatch.similarity, args.thresholds);

  return {
    availability: 'ready',
    confidence: bestMatch.similarity,
    faceCount: 1,
    matchedEmployeeId: bestMatch.employee.id,
    matchedEmployeeName: bestMatch.employee.name,
    message: `Best match ${bestMatch.employee.name} at ${bestMatch.similarity.toFixed(2)}.`,
    outcome,
  };
}
