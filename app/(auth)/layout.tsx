export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary tracking-tight">toreply.me</h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium tracking-wide uppercase">
          IA Conversacional para qualquer sistema
        </p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
