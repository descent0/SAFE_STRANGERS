export const STATUS_MESSAGES = {
  queued: 'Looking for someone to chat with',
  skipping: 'Finding your next chat partner',
  'finding-new': 'Looking for a new person to chat with',
  joining: 'Connecting to the matching service',
  matched: 'Match found! Connecting...',
  'partner-left': 'Your chat partner left.',
  'partner-skipped': 'Your chat partner moved on.',
  error: 'Connection error. Retrying...',
  expired: 'Session expired. Please refresh the page.',
  default: 'Connecting',
}

export const getStatusMessage = (connectionStatus) => {
  return STATUS_MESSAGES[connectionStatus] || STATUS_MESSAGES.default
}

export const waitingMessages = [
  'Everyone is busy chatting. Please wait...',
  'Think of interesting conversation starters',
  'Remember to be respectful and kind',
  'You can skip to the next person anytime',
]