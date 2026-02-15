export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a1a]">
      <main className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-white">Eigenvue</h1>
        <p className="max-w-lg text-lg text-zinc-400">
          The visual learning platform for understanding algorithms, AI architectures, and quantum
          computing.
        </p>
        <div className="flex gap-3 text-sm font-mono">
          <span className="rounded-full bg-[#38bdf8]/10 px-3 py-1 text-[#38bdf8]">Classical</span>
          <span className="rounded-full bg-[#8b5cf6]/10 px-3 py-1 text-[#8b5cf6]">
            Deep Learning
          </span>
          <span className="rounded-full bg-[#f472b6]/10 px-3 py-1 text-[#f472b6]">
            Generative AI
          </span>
          <span className="rounded-full bg-[#00ffc8]/10 px-3 py-1 text-[#00ffc8]">Quantum</span>
        </div>
        <p className="mt-4 text-sm text-zinc-600">Under construction</p>
      </main>
    </div>
  );
}
