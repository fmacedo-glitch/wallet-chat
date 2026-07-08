export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-zinc-800 rounded-xl w-fit">
      {[0, 1, 2].map((i) => (
        <div key={i} className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }} />
      ))}
    </div>
  );
}
