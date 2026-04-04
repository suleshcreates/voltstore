/**
 * ChatBubble — renders user/ai messages with basic markdown support
 * Supports: **bold**, bullet points (• and -), line breaks
 */
function renderMarkdown(text) {
  if (!text) return null;

  return text.split('\n').map((line, i) => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((segment, j) => {
      if (segment.startsWith('**') && segment.endsWith('**')) {
        return <strong key={j}>{segment.slice(2, -2)}</strong>;
      }
      return segment;
    });

    return (
      <span key={i}>
        {parts}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    );
  });
}

export default function ChatBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div style={{ alignSelf: isUser ? 'flex-end' : 'flex-start' }}>
      <div className={`chat-bubble ${isUser ? 'user' : 'ai'}`}>
        {isUser ? message.text : renderMarkdown(message.text)}
      </div>
      <div className={`chat-time ${isUser ? 'user' : ''}`}>
        {message.time}
      </div>
    </div>
  );
}
