"use client";

import { useEffect, useRef, useState } from "react";
import { Button, FormControl } from "@/components/ui/primitives";

type Detector = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };

function detector(): (Detector | null) {
  const ctor = window.BarcodeDetector;
  if (typeof ctor !== "function") return null;
  try { return new ctor({ formats: ["qr_code"] }); }
  catch { return null; }
}

export function CheckinScanner({ disabled, onCode }: { readonly disabled: boolean; readonly onCode: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");

  function stop() {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);
  }

  useEffect(() => stop, []);

  async function start() {
    setError("");
    const reader = detector();
    if (!reader) { setError("이 브라우저는 카메라 QR을 바로 읽지 못합니다. 아래에 확인 코드를 입력해 주세요."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "environment" } });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) { stream.getTracks().forEach((track) => track.stop()); return; }
      video.srcObject = stream;
      await video.play();
      setLive(true);
      const scan = async () => {
        if (!videoRef.current || videoRef.current.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
          frameRef.current = requestAnimationFrame(() => void scan());
          return;
        }
        try {
          const codes = await reader.detect(videoRef.current);
          const value = codes[0]?.rawValue;
          if (value) { stop(); onCode(value); return; }
        } catch { /* keep scanning the next frame */ }
        frameRef.current = requestAnimationFrame(() => void scan());
      };
      frameRef.current = requestAnimationFrame(() => void scan());
    } catch {
      setError("카메라 권한이 필요합니다.");
      stop();
    }
  }

  return <div className="events-editor-fields">
    <video ref={videoRef} className="checkin-video" data-live={live ? "true" : "false"} muted playsInline />
    <div className="button-row">
      {live ? <Button type="button" variant="secondary" disabled={disabled} onClick={stop}>카메라 끄기</Button> : <Button type="button" disabled={disabled} onClick={() => void start()}>카메라로 체크인</Button>}
    </div>
    {error && <p className="events-error" role="alert">{error}</p>}
    <form className="events-field-grid" onSubmit={(event) => { event.preventDefault(); if (manual.trim()) onCode(manual.trim()); }}>
      <label>확인 코드 또는 주문 번호<FormControl><input value={manual} maxLength={500} autoCapitalize="none" spellCheck={false} onChange={(event) => setManual(event.target.value)} placeholder="확인 페이지 주소, 코드, 주문 번호" /></FormControl></label>
      <Button type="submit" variant="secondary" disabled={disabled || !manual.trim()}>수동 체크인</Button>
    </form>
  </div>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => Detector;
  }
}
