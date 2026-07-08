import { EmojiPicker } from "./EmojiPicker";

export function ChatInput({
  message, handleMessageInput, textareaRef, showEmojiPicker, setShowEmojiPicker,
  replyTo, setReplyTo, publicKey, getDisplayName, autoResize, setMessage, onSend,
}: any) {
  return (
    <div className="border-t border-zinc-800 px-3 py-3 flex-shrink-0">
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 bg-zinc-800 border-l-2 border-green-500 rounded-lg px-3 py-2">
          <div className="flex-1 min-w-0 pl-1">
            <div className="text-green-400 text-xs">{replyTo.sender === publicKey?.toBase58() ? "You" : getDisplayName(replyTo.sender)}</div>
            <div className="text-zinc-400 text-xs truncate">{replyTo.content}</div>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-zinc-500 hover:text-white">✕</button>
        </div>
      )}
      <div className="flex gap-2 items-end">
        <div className="relative flex-shrink-0">
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="bg-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm">😊</button>
          {showEmojiPicker && (
            <EmojiPicker onSelect={(e) => { setMessage((prev: string) => prev + e); setShowEmojiPicker(false); setTimeout(autoResize, 0); }} onClose={() => setShowEmojiPicker(false)} />
          )}
        </div>
        <textarea ref={textareaRef} value={message}
          onChange={(e) => handleMessageInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="Message..."
          rows={1}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm resize-none overflow-hidden focus:outline-none"
          style={{ minHeight: "56px", maxHeight: "160px" }} />
        <button onClick={onSend} className="bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 py-2.5 font-bold flex-shrink-0 transition-colors">↑</button>
      </div>
    </div>
  );
}
