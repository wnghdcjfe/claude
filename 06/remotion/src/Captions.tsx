import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import type { CaptionSegment, CueProps } from "./types";

const BASE_COLOR = "#FFFFFF";
// Per review.md §3순위 — legacy fallback if a segment has no precomputed
// highlight token. The yellow stays so videos rendered against an old
// props.json still look reasonable, but the production path now sends
// per-segment ``highlightToken`` + ``highlightColor`` from the planner.
const LEGACY_HIGHLIGHT_COLOR = "#FFD93D";

function fontSizeFor(chars: number): number {
  if (chars <= 14) return 78;
  if (chars <= 22) return 66;
  if (chars <= 32) return 56;
  if (chars <= 44) return 46;
  return 38;
}

function legacyHighlight(token: string, keywords: string[]): boolean {
  if (!token || keywords.length === 0) return false;
  return keywords.some((kw) => kw && token.includes(kw));
}

const SentenceLine: React.FC<{
  text: string;
  highlightKeywords: string[];
  highlightToken: string | null;
  highlightColor: string | null;
}> = ({ text, highlightKeywords, highlightToken, highlightColor }) => {
  const fontSize = fontSizeFor(text.length);
  // The highlight token can be a multi-token phrase (e.g. ``S&P 500``).
  // Split the sentence into whitespace-preserving tokens and then group
  // consecutive tokens that together reconstruct the highlight string,
  // so a multi-word highlight stays visually unified.
  const rawTokens = text.split(/(\s+)/);
  const colorOverride =
    highlightToken && highlightColor ? highlightColor : LEGACY_HIGHLIGHT_COLOR;

  const renderToken = (token: string, key: number, highlighted: boolean) => {
    if (/^\s+$/.test(token)) return <span key={key}>{token}</span>;
    if (highlighted) {
      return (
        <span
          key={key}
          style={{
            color: colorOverride,
            fontWeight: 900,
            fontSize: Math.round(fontSize * 1.08),
            letterSpacing: -1.5,
            textShadow:
              "0 2px 8px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.95)",
          }}
        >
          {token}
        </span>
      );
    }
    return (
      <span key={key} style={{ color: BASE_COLOR, fontWeight: 700 }}>
        {token}
      </span>
    );
  };

  // Detect which run of tokens corresponds to ``highlightToken``.
  let highlightRange: [number, number] | null = null;
  if (highlightToken) {
    const target = highlightToken;
    let assembled = "";
    let runStart = -1;
    for (let i = 0; i < rawTokens.length; i++) {
      const tok = rawTokens[i];
      if (/^\s+$/.test(tok)) {
        if (runStart !== -1) assembled += tok;
        continue;
      }
      if (runStart === -1) {
        runStart = i;
        assembled = tok;
      } else {
        assembled += tok;
      }
      // Trim trailing punctuation when comparing so ``18%`` matches
      // ``18%`` even if the sentence reads ``18%,``.
      const trimmed = assembled.replace(/[,.…!?]*$/, "");
      if (trimmed.includes(target)) {
        highlightRange = [runStart, i];
        break;
      }
      // Bail out if the assembled run drifts too far past the target.
      if (assembled.length > target.length * 3) {
        runStart = -1;
        assembled = "";
      }
    }
  }

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 220,
      }}
    >
      <div
        style={{
          maxWidth: 980,
          textAlign: "center",
          color: BASE_COLOR,
          fontSize,
          lineHeight: 1.25,
          fontWeight: 700,
          fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
          letterSpacing: -1,
          padding: "20px 36px",
          borderRadius: 24,
          backgroundColor: "rgba(0,0,0,0.62)",
          textShadow: "0 2px 6px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)",
        }}
      >
        {rawTokens.map((tok, i) => {
          const inHighlightRange =
            highlightRange !== null &&
            i >= highlightRange[0] &&
            i <= highlightRange[1];
          if (inHighlightRange) {
            return renderToken(tok, i, true);
          }
          if (highlightToken === null && legacyHighlight(tok, highlightKeywords)) {
            return renderToken(tok, i, true);
          }
          return renderToken(tok, i, false);
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Captions: React.FC<
  Pick<
    CueProps,
    "captionSegments" | "highlightKeywords" | "openingDurationMs"
  >
> = ({ captionSegments, highlightKeywords, openingDurationMs }) => {
  const { fps } = useVideoConfig();
  if (!captionSegments || captionSegments.length === 0) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {captionSegments.map((seg: CaptionSegment, i: number) => {
        const segStartMs = Math.max(seg.startMs, openingDurationMs);
        if (segStartMs >= seg.endMs) return null;
        const startFrame = Math.round((segStartMs / 1000) * fps);
        const durationFrames = Math.max(
          1,
          Math.round(((seg.endMs - segStartMs) / 1000) * fps),
        );
        return (
          <Sequence
            key={`${seg.startMs}-${i}`}
            from={startFrame}
            durationInFrames={durationFrames}
            layout="none"
          >
            <SentenceLine
              text={seg.text}
              highlightKeywords={highlightKeywords}
              highlightToken={seg.highlightToken ?? null}
              highlightColor={seg.highlightColor ?? null}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
