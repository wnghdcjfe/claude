import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BottomBar } from "./BottomBar";
import { BrandHeader } from "./BrandHeader";
import { Captions } from "./Captions";
import { VisualLayer } from "./VisualLayer";
import type { CueProps } from "./types";

const OUTRO_DURATION_MS = 1500;

export const TechExplainer: React.FC<CueProps> = ({
  audioFileName,
  bgColor,
  emoticonCues,
  captionSegments,
  highlightKeywords,
  openingText,
  openingDurationMs,
  showOpening,
  ctaText,
  showOutro,
  durationInFrames,
}) => {
  const { fps } = useVideoConfig();
  const openingFrames = Math.max(
    1,
    Math.ceil((openingDurationMs / 1000) * fps),
  );
  const outroFrames = Math.max(1, Math.ceil((OUTRO_DURATION_MS / 1000) * fps));
  const outroStart = Math.max(0, durationInFrames - outroFrames);
  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      {audioFileName ? <Audio src={staticFile(audioFileName)} /> : null}
      <VisualLayer emoticonCues={emoticonCues} />
      <BrandHeader />
      <BottomBar />
      <Captions
        captionSegments={captionSegments}
        highlightKeywords={highlightKeywords}
        openingDurationMs={showOpening ? openingDurationMs : 0}
      />
      {showOpening && openingText ? (
        <Sequence from={0} durationInFrames={openingFrames} layout="none">
          <OpeningOverlay text={openingText} totalFrames={openingFrames} />
        </Sequence>
      ) : null}
      {showOutro && ctaText ? (
        <Sequence from={outroStart} durationInFrames={outroFrames} layout="none">
          <OutroOverlay text={ctaText} totalFrames={outroFrames} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

const OutroOverlay: React.FC<{ text: string; totalFrames: number }> = ({
  text,
  totalFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 130, mass: 0.6 },
    from: 0.85,
    to: 1.0,
  });
  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const fadeOutStart = Math.max(0, totalFrames - 6);
  const fadeOut = interpolate(frame, [fadeOutStart, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: `rgba(0,0,0,${0.85 * opacity})`,
      }}
    >
      <div
        style={{
          padding: "70px 90px",
          background: "linear-gradient(180deg, #FFD400 0%, #FFB800 100%)",
          color: "#1a1a1a",
          fontSize: 92,
          fontWeight: 900,
          lineHeight: 1.2,
          textAlign: "center",
          whiteSpace: "pre-line",
          fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
          transform: `scale(${scale})`,
          opacity,
          boxShadow: "0 22px 80px rgba(0,0,0,0.55)",
          borderRadius: 40,
          letterSpacing: -2,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

const OpeningOverlay: React.FC<{ text: string; totalFrames: number }> = ({
  text,
  totalFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 110, mass: 0.7 },
    from: 0.7,
    to: 1.0,
  });
  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const fadeOutStart = Math.max(0, totalFrames - 8);
  const fadeOut = interpolate(frame, [fadeOutStart, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: `rgba(0,0,0,${0.32 * opacity})`,
      }}
    >
      <div
        style={{
          padding: "60px 80px",
          backgroundColor: "rgba(0,0,0,0.88)",
          color: "#FFD400",
          fontSize: 110,
          fontWeight: 900,
          lineHeight: 1.15,
          textAlign: "center",
          whiteSpace: "pre-line",
          fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
          transform: `scale(${scale})`,
          opacity,
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          borderRadius: 32,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
