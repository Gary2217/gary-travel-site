import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white"
        >
          <path d="M22.4 24.3 20 15l4.4-4.4c1.9-1.9 2.5-4.4 1.9-5.7-.8-.4-3 0-5.6 1.9L16.3 11 6 8.7c-.6-.1-1.1.1-1.4.6l-.4.6c-.3.6-.1 1.3.4 1.6L11.5 15l-2.5 3.8H5.5l-1.3 1.3 3.8 2.5 2.5 3.8 1.3-1.3V21.6l3.8-2.5 4.4 6.6c.4.5 1 .6 1.6.4l.6-.3c.5-.4.8-.9.6-1.5z" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
