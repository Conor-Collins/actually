import { useState } from 'react';

import { useFormat } from '#hooks/useFormat';

// The text of an amount field. `amount` gives what the text says, or null
// when it is not an amount or is below zero; an empty text gives `whenEmpty`.
export function useAmountText(
  initial: number | null,
  whenEmpty: number | null = null,
) {
  const format = useFormat();
  const [text, setText] = useState(
    initial === null ? '' : format.forEdit(initial),
  );

  function amount(): number | null {
    if (text.trim() === '') {
      return whenEmpty;
    }
    const parsed = format.fromEdit(text, null);
    return parsed !== null && parsed >= 0 ? parsed : null;
  }

  return { text, setText, amount, isEmpty: text.trim() === '' };
}
