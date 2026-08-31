import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

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
          background:
            "linear-gradient(135deg, #151d2b 0%, #070a10 100%)",
          borderRadius: "8px",
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ліва стріла */}
          <path
            d="M14 22L50 84L50 44L14 22Z"
            fill="#FBBF24"
          />

          {/* Права стріла */}
          <path
            d="M86 22L50 84L50 44L86 22Z"
            fill="#F59E0B"
          />

          {/* Центральний акцент */}
          <circle
            cx="50"
            cy="20"
            r="7"
            fill="#F43F5E"
          />
        </svg>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
    }
  );
}