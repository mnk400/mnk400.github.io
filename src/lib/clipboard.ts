function legacyCopy(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  document.body.appendChild(ta);
  ta.select();
  try {
    const copyCommand = Reflect.get(document, 'execCommand') as
      | ((commandId: string) => boolean)
      | undefined;
    return copyCommand?.call(document, 'copy') ?? false;
  } catch {
    return false;
  } finally {
    document.body.removeChild(ta);
  }
}

export function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => legacyCopy(text),
    );
  }
  return Promise.resolve(legacyCopy(text));
}
