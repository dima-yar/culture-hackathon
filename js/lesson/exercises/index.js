/**
 * Registry: exercise type (from js/data/units.js) → renderer.
 */

import { renderMultipleChoice } from './multiple-choice.js';
import { renderMeme } from './meme.js';
import { renderFillBlank } from './fill-blank.js';
import { renderFlashcard } from './flashcard.js';
import { renderChronology } from './chronology.js';
import { renderMatching } from './matching.js';
import { renderOpenAnswer } from './open-answer.js';
import { renderCrossword } from './crossword.js';

export const EXERCISE_RENDERERS = {
  mcq: renderMultipleChoice,
  meme: renderMeme,
  fill: renderFillBlank,
  flash: renderFlashcard,
  order: renderChronology,
  match: renderMatching,
  open: renderOpenAnswer,
  cross: renderCrossword,
};
