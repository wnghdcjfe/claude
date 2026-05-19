import { Composition } from "remotion";
import { TechExplainer } from "./TechExplainer";
import type { CueProps } from "./types";

const DEFAULT_PROPS: CueProps = {
  audioFileName: "",
  wordsFileName: "",
  bgColor: "#FFFFFF",
  chunkSize: 8,
  emoticonCues: [],
  captionSegments: [],
  companyLogoCues: [],
  numberCards: [],
  highlightKeywords: [],
  openingText: "",
  openingDurationMs: 0,
  showOpening: false,
  ctaText: "",
  showOutro: false,
  durationInFrames: 30,
};

const LooseTechExplainer = TechExplainer as unknown as React.FC<Record<string, unknown>>;
const LOOSE_DEFAULT_PROPS = DEFAULT_PROPS as unknown as Record<string, unknown>;

export const Root: React.FC = () => {
  return (
    <Composition
      id="TechExplainer"
      component={LooseTechExplainer}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={DEFAULT_PROPS.durationInFrames}
      defaultProps={LOOSE_DEFAULT_PROPS}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(
          1,
          Number((props as unknown as CueProps).durationInFrames ?? 30),
        ),
      })}
    />
  );
};
