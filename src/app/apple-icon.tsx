import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2b0a13",
        }}
      >
        <span
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: "#fdf6f2",
            lineHeight: 1,
          }}
        >
          s
        </span>
      </div>
    ),
    { ...size },
  );
}
