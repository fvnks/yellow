import fs from 'fs';
let c = fs.readFileSync('src/components/footer.tsx', 'utf8');

const rest = `            {/* Enlaces rápidos */}
            <div>
              <h3 className="mb-4 text-base font-semibold text-ink">Enlaces rápidos</h3>
              <nav className="space-y-2 text-sm">
                <Link href="/" className="block transition-colors hover:text-accent">Inicio</Link>
                <Link href="/nosotros" className="block transition-colors hover:text-accent">Nosotros</Link>
                <Link href="/?oferta=erp" className="block transition-colors hover:text-accent">Facturación</Link>
                <Link href="/diseno" className="block transition-colors hover:text-accent">Diseño web</Link>
                <Link href="/contacto" className="block transition-colors hover:text-accent">Contacto</Link>
              </nav>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="mb-4 text-base font-semibold text-ink">Contacto</h3>
              <address className="space-y-2 text-sm not-italic text-muted">
                <p>Av. Providencia 123, Of. 401</p>
                <p>Providencia, Santiago, Chile</p>
                <p>Tel: +56 2 2940 1100</p>
                <p>Email: hola@yellow-erp.cl</p>
              </address>
            </div>

            {/* Redes sociales + dark mode toggle */}
            <div className="relative">
              <h3 className="mb-4 text-base font-semibold text-ink">Síguenos</h3>
              <div className="mb-6 flex space-x-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href="https://facebook.com/yellowerp" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-accent hover:text-accent focus-ring" aria-label="Facebook"><Facebook className="h-5 w-5" /></a>
                    </TooltipTrigger>
                    <TooltipContent><p>Síguenos en Facebook</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href="https://twitter.com/yellowerp" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-accent hover:text-accent focus-ring" aria-label="Twitter"><Twitter className="h-5 w-5" /></a>
                    </TooltipTrigger>
                    <TooltipContent><p>Síguenos en Twitter</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href="https://instagram.com/yellowerp" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-accent hover:text-accent focus-ring" aria-label="Instagram"><Instagram className="h-5 w-5" /></a>
                    </TooltipTrigger>
                    <TooltipContent><p>Síguenos en Instagram</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href="https://linkedin.com/company/yellowerp" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-accent hover:text-accent focus-ring" aria-label="LinkedIn"><Linkedin className="h-5 w-5" /></a>
                    </TooltipTrigger>
                    <TooltipContent><p>Conéctate en LinkedIn</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-muted" />
                <ThemeToggle />
                <Moon className="h-4 w-4 text-muted" />
              </div>
            </div>
          </div>

          {/* Copyright y legal */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-center md:flex-row">
            <p className="text-sm text-muted">© {new Date().getFullYear()} Yellow. Todos los derechos reservados.</p>
            <nav className="flex gap-4 text-sm">
              <Link href="/privacidad" className="transition-colors hover:text-accent">Privacidad</Link>
              <Link href="/terminos" className="transition-colors hover:text-accent">Términos</Link>
              <Link href="/cookies" className="transition-colors hover:text-accent">Cookies</Link>
            </nav>
          </div>
        </div>
      </TooltipProvider>
    </footer>
  );
}
`;

c = c.replace('/* MIDDLE */', rest);
fs.writeFileSync('src/components/footer.tsx', c);
console.log('Footer completo escrito');