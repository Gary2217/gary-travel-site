import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || '旅遊規劃師 蓋瑞 GARY';
  const subtitle = searchParams.get('subtitle') || '熱門旅遊行程總覽';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0b0f2a 0%, #0a0a0a 50%, #1a0d0d 100%)',
          padding: '60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(255,255,255,0.15)',
            borderRadius: '32px',
            padding: '50px 60px',
            background: 'rgba(20,20,30,0.6)',
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: '#ffffff',
              textAlign: 'center',
              lineHeight: 1.3,
              display: 'flex',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 28,
              color: 'rgba(255,255,255,0.7)',
              marginTop: 16,
              textAlign: 'center',
              display: 'flex',
            }}
          >
            {subtitle}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 36,
              fontSize: 22,
              color: '#38bdf8',
            }}
          >
            ✈ 蓋瑞旅遊 GARY Travel
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
