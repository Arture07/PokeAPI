import { environment } from '../../environments/environment';

// Retorna a base da API considerando local/Codespaces
export function getApiBaseUrl(): string {
  const base = environment.apiBaseUrl;
  const isBrowser = typeof window !== 'undefined' && typeof window.location !== 'undefined';
  if (!isBrowser) {
    return base;
  }

  const host = window.location.hostname;
  const proto = window.location.protocol; // http: ou https:

  // GitHub Codespaces/Preview (porta exposta vira subdomínio 8000-<host>)
  if (host.endsWith('.githubpreview.dev') || host.endsWith('.app.github.dev') || host.endsWith('.github.dev')) {
    // host tem formato <porta>-<resto>.
    const parts = host.split('-');
    if (parts.length > 1 && /^\d+$/.test(parts[0])) {
      parts[0] = '8000';
    }
    const apiHost = parts.join('-');
    return `${proto}//${apiHost}/api`;
  }

  // Caso contrário, usa o configurado
  return base;
}
