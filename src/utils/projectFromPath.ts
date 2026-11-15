/** pathname → sidebar project id (Zustand `selectedProject`) */
export function projectIdFromPathname(pathname: string): string {
  if (pathname.startsWith('/s80c')) return 's80c'
  if (pathname.startsWith('/h7m7w7')) return 'h7m7w7'
  if (pathname.startsWith('/model-schedule')) return 'model-schedule'
  return 'model-schedule'
}
