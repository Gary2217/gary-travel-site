export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
        <p className="mt-4 text-white/70">載入中...</p>
      </div>
    </main>
  );
}
