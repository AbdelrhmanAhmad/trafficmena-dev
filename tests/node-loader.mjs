import path from 'node:path';

const isRelativeSpecifier = (value) =>
  value.startsWith('./') || value.startsWith('../') || value.startsWith('/');

const tryResolve = async (specifier, context, nextResolve) => {
  try {
    return await nextResolve(specifier, context);
  } catch {
    return null;
  }
};

export async function resolve(specifier, context, nextResolve) {
  if (isRelativeSpecifier(specifier) && specifier.endsWith('.js')) {
    const tsSpecifier = specifier.replace(/\.js$/, '.ts');
    const resolved = await tryResolve(tsSpecifier, context, nextResolve);
    if (resolved) return resolved;
  }

  if (isRelativeSpecifier(specifier) && !path.extname(specifier)) {
    const extensions = ['.ts', '.tsx', '.js'];
    for (const ext of extensions) {
      const resolved = await tryResolve(`${specifier}${ext}`, context, nextResolve);
      if (resolved) return resolved;
    }
  }

  return nextResolve(specifier, context);
}
