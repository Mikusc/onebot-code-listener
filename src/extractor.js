export function createCodeRegex(source) {
  return new RegExp(source, 'g');
}

export function getMessageText(event) {
  if (typeof event.raw_message === 'string' && event.raw_message.length > 0) {
    return event.raw_message;
  }

  if (Array.isArray(event.message)) {
    return event.message
      .filter((segment) => segment?.type === 'text' && typeof segment?.data?.text === 'string')
      .map((segment) => segment.data.text)
      .join('');
  }

  if (typeof event.message === 'string') {
    return event.message;
  }

  return '';
}

export function extractCodes(text, codeRegex) {
  if (!text) {
    return [];
  }

  codeRegex.lastIndex = 0;

  const codes = [];
  const seenInMessage = new Set();
  let match;

  while ((match = codeRegex.exec(text)) !== null) {
    const code = match[0];

    if (!seenInMessage.has(code)) {
      seenInMessage.add(code);
      codes.push(code);
    }

    if (match[0] === '') {
      codeRegex.lastIndex += 1;
    }
  }

  return codes;
}

export function summarizeMessage(text, maxLength = 120) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}
