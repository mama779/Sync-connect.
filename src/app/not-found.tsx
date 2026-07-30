import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-white text-center">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-slate-400 mb-6">Página no encontrada</p>
      <Link href="/" className="px-4 py-2 bg-[#ff9900] text-black font-semibold rounded hover:bg-[#e68a00] transition">
        Volver al Inicio
      </Link>
    </div>
  );
}
