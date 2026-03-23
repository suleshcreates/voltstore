export default function AIWhisper({ message }) {
  if (!message) return null;

  return (
    <div className="ai-whisper">
      <span className="ai-whisper-dot" />
      <span>AI watching · {message}</span>
    </div>
  );
}
