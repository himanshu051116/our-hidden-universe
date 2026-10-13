export function validateIceServers(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry) => {
    const urls = (Array.isArray(entry?.urls) ? entry.urls : [entry?.urls])
      .filter((url) => typeof url === 'string' && /^(stun|stuns|turn|turns):[^\s]+$/i.test(url));
    if (!urls.length) return [];
    const turnUrls = urls.filter((url) => /^turns?:/i.test(url));
    const stunUrls = urls.filter((url) => !/^turns?:/i.test(url));
    if (turnUrls.length && (!entry.username || !entry.credential)) {
      return stunUrls.length ? [{ urls: stunUrls }] : [];
    }
    return [{ urls, ...(turnUrls.length ? { username: entry.username, credential: entry.credential } : {}) }];
  });
}
