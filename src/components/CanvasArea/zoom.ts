export const ZOOM_STEPS = [10, 25, 33, 50, 67, 100, 150, 200, 300, 400, 600, 800, 1200, 1600, 3200];

export function snapZoom(current: number, direction: 'in' | 'out'): number {
  if (direction === 'in') {
    const next = ZOOM_STEPS.find((s) => s > current);
    return next ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
  }
  const prev = [...ZOOM_STEPS].reverse().find((s) => s < current);
  return prev ?? ZOOM_STEPS[0];
}
