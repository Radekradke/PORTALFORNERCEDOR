export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-lg font-semibold text-primary">Portal de Fornecedores</p>
          <p className="text-sm text-muted-foreground">Lifting Electric &amp; Instrumentation</p>
        </div>
        {children}
      </div>
    </div>
  );
}
