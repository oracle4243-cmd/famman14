import { Disc3, FileText, X } from "lucide-react";
import type { Song } from "../lib/types";

type SongViewsProps = {
  songs: Song[];
  activeSongId?: string;
  viewMode: "grid" | "list";
  isAdmin: boolean;
  emptyMessage: string;
  onOpen: (song: Song) => void;
  onClose: () => void;
};

export function SongViews({ songs, activeSongId, viewMode, isAdmin, emptyMessage, onOpen, onClose }: SongViewsProps) {
  if (songs.length === 0) {
    return (
      <div className="empty-state">
        <Disc3 size={28} />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="song-list">
        {songs.map((song) => {
          const isActive = activeSongId === song.id;

          return (
            <article className={`song-list-item ${isActive ? "is-open" : ""}`} key={song.id}>
              <button className="song-list-row" type="button" onClick={() => onOpen(song)}>
                {song.image_url ? (
                  <img src={song.image_url} alt={`${song.title} 이미지`} />
                ) : (
                  <span className="list-image-placeholder">
                    <Disc3 size={20} />
                  </span>
                )}
                <span>{song.title}</span>
                {isAdmin && song.status !== "published" ? <small>{statusLabel(song.status)}</small> : null}
                <FileText size={17} />
              </button>
              {isActive ? <InlineLyrics song={song} onClose={onClose} /> : null}
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className="song-grid">
      {songs.map((song) => {
        const isActive = activeSongId === song.id;

        return (
          <article className={`song-card ${isActive ? "is-open" : ""}`} key={song.id}>
            <button type="button" className="song-card-trigger" onClick={() => onOpen(song)}>
              <span className="jewel-case">
                <span className="case-glare" />
                <span className="disc-shell">
                  {song.image_url ? (
                    <img className="disc-art" src={song.image_url} alt={`${song.title} CD 이미지`} />
                  ) : (
                    <span className="disc-empty">
                      <Disc3 size={44} />
                    </span>
                  )}
                  <span className="disc-ring" />
                </span>
                <span className="case-spine">{song.title}</span>
              </span>
              <span className="song-title-row">
                <span>{song.title}</span>
                {isAdmin && song.status !== "published" ? <small>{statusLabel(song.status)}</small> : null}
              </span>
            </button>
            {isActive ? <CardLyrics song={song} onClose={onClose} /> : null}
          </article>
        );
      })}
    </div>
  );
}

function CardLyrics({ song, onClose }: { song: Song; onClose: () => void }) {
  return (
    <div className="card-lyrics-overlay">
      <div className="card-lyrics-head">
        <span>LYRICS</span>
        <button type="button" className="mini-close-button" aria-label="가사 닫기" onClick={onClose}>
          <X size={15} />
        </button>
      </div>
      <div className="card-lyrics-body">{song.lyrics?.trim() || "등록된 가사가 없습니다."}</div>
    </div>
  );
}

function InlineLyrics({ song, onClose }: { song: Song; onClose: () => void }) {
  return (
    <div className="inline-lyrics">
      <div className="card-lyrics-head">
        <span>LYRICS</span>
        <button type="button" className="mini-close-button" aria-label="가사 닫기" onClick={onClose}>
          <X size={15} />
        </button>
      </div>
      <div className="card-lyrics-body">{song.lyrics?.trim() || "등록된 가사가 없습니다."}</div>
    </div>
  );
}

function statusLabel(status: Song["status"]) {
  if (status === "draft") return "임시";
  if (status === "private") return "비공개";
  return "공개";
}
