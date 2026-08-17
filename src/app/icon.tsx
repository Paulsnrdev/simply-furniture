import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: "8px",
        }}
      >
        <span
          style={{
            fontSize: 22,
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
