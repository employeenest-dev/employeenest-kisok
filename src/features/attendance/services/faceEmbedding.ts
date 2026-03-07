import type { DetectedFace } from '../native/camera';

const LANDMARK_KEYS = [
  'LEFT_CHEEK',
  'LEFT_EAR',
  'LEFT_EYE',
  'MOUTH_BOTTOM',
  'MOUTH_LEFT',
  'MOUTH_RIGHT',
  'NOSE_BASE',
  'RIGHT_CHEEK',
  'RIGHT_EAR',
  'RIGHT_EYE',
] as const;

const CONTOUR_KEYS = [
  'FACE',
  'LEFT_EYEBROW_TOP',
  'RIGHT_EYEBROW_TOP',
  'LEFT_EYE',
  'RIGHT_EYE',
  'UPPER_LIP_TOP',
  'LOWER_LIP_BOTTOM',
  'NOSE_BRIDGE',
  'NOSE_BOTTOM',
] as const;

function normalizeCoordinate(value: number, center: number, size: number): number {
  if (!Number.isFinite(value) || size <= 0) {
    return 0;
  }

  return (value - center) / size;
}

export function buildFaceEmbedding(face: DetectedFace): number[] {
  const width = Math.max(face.bounds.width, 1);
  const height = Math.max(face.bounds.height, 1);
  const centerX = face.bounds.x + width / 2;
  const centerY = face.bounds.y + height / 2;
  const vector: number[] = [
    face.yawAngle / 90,
    face.rollAngle / 90,
    face.pitchAngle / 90,
    face.leftEyeOpenProbability || 0,
    face.rightEyeOpenProbability || 0,
    face.smilingProbability || 0,
    width / Math.max(height, 1),
  ];

  for (const key of LANDMARK_KEYS) {
    const point = face.landmarks?.[key];

    if (!point) {
      vector.push(0, 0, 0);
      continue;
    }

    vector.push(
      normalizeCoordinate(point.x, centerX, width),
      normalizeCoordinate(point.y, centerY, height),
      1,
    );
  }

  for (const key of CONTOUR_KEYS) {
    const points = face.contours?.[key];

    if (!points || points.length === 0) {
      vector.push(0, 0, 0, 0, 0);
      continue;
    }

    const centroidX =
      points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const centroidY =
      points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const minX = Math.min(...points.map(point => point.x));
    const maxX = Math.max(...points.map(point => point.x));
    const minY = Math.min(...points.map(point => point.y));
    const maxY = Math.max(...points.map(point => point.y));

    vector.push(
      normalizeCoordinate(centroidX, centerX, width),
      normalizeCoordinate(centroidY, centerY, height),
      (maxX - minX) / width,
      (maxY - minY) / height,
      points.length / 100,
    );
  }

  return vector;
}
