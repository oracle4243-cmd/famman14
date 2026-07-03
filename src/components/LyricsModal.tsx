import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Song } from "../lib/types";

type LyricsModalProps = {
  song: Song | null;
  onClose: () => void;
};

export function LyricsModal({ song, onClose }: LyricsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!song) return;

    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [song, onClose]);

  if (!song) return null;

  return (
    <div className="modal-backdrop lyrics-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="lyrics-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lyrics-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">LYRICS</p>
            <h2 id="lyrics-title">{song.title}</h2>
          </div>
          <button ref={closeButtonRef} className="icon-button" type="button" aria-label="가사 닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="lyrics-scroll">{song.lyrics?.trim() || "등록된 가사가 없습니다."}</div>
      </section>
    </div>
  );
}
