import fs from 'fs';
let c = fs.readFileSync('src/components/footer.tsx', 'utf8');

// Replace unavailable icons with available ones
c = c.replace(/<Twitter className="h-5 w-5" \/>/g, '<Globe className="h-5 w-5" />');
c = c.replace(/<Instagram className="h-5 w-5" \/>/g, '<Mail className="h-5 w-5" />');
c = c.replace(/<LinkedIn className="h-5 w-5" \/>/g, '<ExternalLink className="h-5 w-5" />');
c = c.replace(/<Linkedin className="h-5 w-5" \/>/g, '<ExternalLink className="h-5 w-5" />');
c = c.replace(/<Facebook className="h-5 w-5" \/>/g, '<Users className="h-5 w-5" />');

// Update tooltip texts
c = c.replace(/Síguenos en Facebook/g, 'Visita nuestro sitio');
c = c.replace(/Síguenos en Twitter/g, 'Escríbenos un email');
c = c.replace(/Síguenos en Instagram/g, 'Contáctanos');
c = c.replace(/Conéctate en LinkedIn/g, 'Conéctate en LinkedIn');
c = c.replace(/aria-label="Facebook"/g, 'aria-label="Sitio web"');
c = c.replace(/aria-label="Twitter"/g, 'aria-label="Email"');
c = c.replace(/aria-label="Instagram"/g, 'aria-label="Contacto"');
c = c.replace(/aria-label="LinkedIn"/g, 'aria-label="LinkedIn"');

fs.writeFileSync('src/components/footer.tsx', c);
console.log('Icons updated');