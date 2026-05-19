import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import type { EmoticonCue } from "./types";

const SAFE_TOP = 220;
const SAFE_BOTTOM = 380;
const FRAME_W = 1080;
const FRAME_H = 1920;
const SAFE_H = FRAME_H - SAFE_TOP - SAFE_BOTTOM;

interface CueSequenceProps {
  cue: EmoticonCue;
  fps: number;
}

const CueSequence: React.FC<CueSequenceProps> = ({ cue, fps }) => {
  const startFrame = Math.round((cue.startMs / 1000) * fps);
  const durationFrames = Math.max(1, Math.round((cue.durationMs / 1000) * fps));
  return (
    <Sequence from={startFrame} durationInFrames={durationFrames}>
      <CueLayer cue={cue} durationFrames={durationFrames} />
    </Sequence>
  );
};

const CueLayer: React.FC<{ cue: EmoticonCue; durationFrames: number }> = ({ cue, durationFrames }) => {
  const isPhoto = (cue.assetKind ?? cue.visualMode ?? "emoticon") === "photo";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <KenBurnsImage src={staticFile(cue.emoticonFileName)} durationFrames={durationFrames} isPhoto={isPhoto} />
    </AbsoluteFill>
  );
};

function useCueOpacity(durationFrames: number): number {
  const { useCurrentFrame } = require("remotion") as typeof import("remotion");
  const frame = useCurrentFrame();
  // 200ms (≈6 frames at 30fps) fade in/out. Very short cues skip the fade
  // entirely so the visual is on-screen for at least one solid beat.
  const fadeFrames = Math.min(6, Math.max(1, Math.floor(durationFrames / 4)));
  if (durationFrames <= fadeFrames * 2) return 1;
  const fadeIn = interpolate(frame, [0, fadeFrames], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationFrames - fadeFrames, durationFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return Math.min(fadeIn, fadeOut);
}

const KenBurnsImage: React.FC<{ src: string; durationFrames: number; isPhoto: boolean }> = ({
  src,
  durationFrames,
  isPhoto,
}) => {
  const scale = useKenBurnsScale(durationFrames);
  const opacity = useCueOpacity(durationFrames);
  if (isPhoto) {
    return (
      <div
        style={{
          position: "absolute",
          top: SAFE_TOP,
          left: 0,
          width: FRAME_W,
          height: SAFE_H,
          overflow: "hidden",
          opacity,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
            transformOrigin: "center",
          }}
        />
      </div>
    );
  }
  const size = Math.min(FRAME_W - 80, SAFE_H);
  const left = (FRAME_W - size) / 2;
  const top = SAFE_TOP + (SAFE_H - size) / 2;
  return (
    <Img
      src={src}
      style={{
        position: "absolute",
        top,
        left,
        width: size,
        height: size,
        objectFit: "contain",
        transform: `scale(${scale})`,
        transformOrigin: "center",
        opacity,
      }}
    />
  );
};

function useKenBurnsScale(durationFrames: number): number {
  const fps = useVideoConfig().fps;
  void fps;
  const { useCurrentFrame } = require("remotion") as typeof import("remotion");
  const frame = useCurrentFrame();
  return interpolate(frame, [0, durationFrames], [1.0, 1.15], {
    extrapolateRight: "clamp",
  });
}

export const VisualLayer: React.FC<{ emoticonCues: EmoticonCue[] }> = ({ emoticonCues }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {emoticonCues.map((cue, i) => (
        <CueSequence key={`${cue.emoticonFileName}-${cue.startMs}-${i}`} cue={cue} fps={fps} />
      ))}
    </AbsoluteFill>
  );
};
