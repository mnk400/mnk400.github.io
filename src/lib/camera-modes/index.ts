import { asciiMode } from './ascii.ts';
import { circlesMode } from './circles.ts';
import type { CameraMode } from './types.ts';

// Registry of paint modes for the camera tool. Order is the toggle order;
// the first entry is the default mode. Add a new mode by importing it here.
export const cameraModes: CameraMode[] = [asciiMode, circlesMode];

export type { CameraMode } from './types.ts';
