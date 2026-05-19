import { AbsoluteFill, Img, staticFile } from "remotion";

export const BrandHeader: React.FC = () => {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1080,
          height: 220,
          backgroundColor: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Img
          src={staticFile("header_logo.png")}
          style={{
            height: 180,
            width: "auto",
            objectFit: "contain",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
