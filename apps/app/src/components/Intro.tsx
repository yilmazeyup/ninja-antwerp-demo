import { useEffect } from 'react';

/** Natively the splash screen is the opening. */
export function Intro({ onDone }: { onDone: () => void }) {
  useEffect(() => onDone(), [onDone]);
  return null;
}
