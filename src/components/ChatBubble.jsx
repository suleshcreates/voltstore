export default function ChatBubble({ message }) {
  return (
    <div style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
      <div className={`chat-bubble ${message.role === 'user' ? 'user' : 'ai'}`}>
        {message.text}
      </div>
      <div className={`chat-time ${message.role === 'user' ? 'user' : ''}`}>
        {message.time}
      </div>
    </div>
  );
}
