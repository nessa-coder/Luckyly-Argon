/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NessaVideoTrack {
  id: string;
  transcript: string;
  mediaPath: string;
}

export interface NessaDialogueItem {
  id: string;
  transcript: string;
  mediaPath?: string;
  mediaSrc?: string;
  text?: string;
  audioSrc?: string;
  audioFallbackSrc?: string;
  durationSec: number;
}

export const NESSA_TRACKS: NessaVideoTrack[] = [];

export const NESSA_DIALOGUES: NessaDialogueItem[] = [];
