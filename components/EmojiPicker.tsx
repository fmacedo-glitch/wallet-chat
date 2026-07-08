"use client";
import { useState, useRef, useEffect } from "react";

const EMOJI_CATEGORIES = [
  { label: "😀", emojis: ["😀","😂","😍","🥰","😎","🤔","😅","🥺","😭","😡","🤩","🥳","😴","🤯","🫡","❤️","🔥","✅","👍","👎","🙏","💪","🎉","💯","⭐","🚀","💎","🌙","☀️","🌈"] },
  { label: "🐶", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🦋","🐝","🦄","🦊","🐺"] },
  { label: "🍕", emojis: ["🍕","🍔","🌮","🌯","🍜","🍣","🍩","🍪","🎂","🍫","🍬","🍭","☕","🧃","🍺","🥂","🍾","🎁","🎈","🎮"] },
];

export function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const [cat, setCat] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute bottom-full mb-2 left-0 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-xl z-50 w-72">
      <div className="flex gap-1 mb-2">
        {EMOJI_CATEGORIES.map((c, i) => (
          <button key={i} onClick={() => setCat(i)} className={`px-2 py-1 rounded text-sm ${cat === i ? "bg-zinc-700" : "hover:bg-zinc-800"}`}>{c.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1">
        {EMOJI_CATEGORIES[cat].emojis.map((e) => (
          <button key={e} onClick={() => onSelect(e)} className="text-lg hover:bg-zinc-800 rounded p-0.5 transition-colors">{e}</button>
        ))}
      </div>
    </div>
  );
}
