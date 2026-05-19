import { AbsoluteFill } from "remotion";

export const BottomBar: React.FC = () => {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: 1080,
          height: 380,
          backgroundColor: "#000000",
        }}
      />
    </AbsoluteFill>
  );
};
