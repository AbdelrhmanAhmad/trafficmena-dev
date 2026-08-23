export const isWidgetHidden = (pathname: string) =>
  pathname === '/admin' || pathname.startsWith('/admin/');
