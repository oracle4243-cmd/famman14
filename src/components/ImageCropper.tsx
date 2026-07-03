import { useMemo, useState } from "react";
import { Minus, Move, Plus, RotateCcw, X } from "lucide-react";
import { cropImageToSquare } from "../lib/image";

type ImageCropperProps = {
  file: File;
  title: string;
  onCancel: () => void;
  onApply: (blob: Blob, previewUrl: string) => void;
};

export function ImageCropper({ file, title, onCancel, onApply }: ImageCropperProps) {
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  async function applyCrop() {
    setIsProcessing(true);
    setError("");

    try {
      const blob = await cropImageToSquare(file, scale, offsetX, offsetY);
      const resultUrl = URL.createObjectURL(blob);
      onApply(blob, resultUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "이미지를 편집하지 못했습니다.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="cropper-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" type="button" aria-label="편집 취소" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="cropper-frame" aria-label="정사각형 크롭 미리보기">
          <img
            src={previewUrl}
            alt="업로드 이미지 미리보기"
            style={{
              transform: `translate(${offsetX}%, ${offsetY}%) scale(${scale})`,
            }}
          />
          <div className="cropper-grid" />
        </div>

        <div className="crop-controls">
          <label>
            <span>
              <Plus size={16} /> 확대
            </span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={scale}
              onChange={(event) => setScale(Number(event.target.value))}
            />
          </label>
          <label>
            <span>
              <Move size={16} /> 가로 이동
            </span>
            <input
              type="range"
              min="-45"
              max="45"
              step="1"
              value={offsetX}
              onChange={(event) => setOffsetX(Number(event.target.value))}
            />
          </label>
          <label>
            <span>
              <Minus size={16} /> 세로 이동
            </span>
            <input
              type="range"
              min="-45"
              max="45"
              step="1"
              value={offsetY}
              onChange={(event) => setOffsetY(Number(event.target.value))}
            />
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="button-row">
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              setScale(1);
              setOffsetX(0);
              setOffsetY(0);
            }}
          >
            <RotateCcw size={16} /> 초기화
          </button>
          <button className="ghost-button" type="button" onClick={onCancel}>
            취소
          </button>
          <button className="primary-button" type="button" onClick={applyCrop} disabled={isProcessing}>
            {isProcessing ? "처리 중..." : "적용"}
          </button>
        </div>
      </section>
    </div>
  );
}
