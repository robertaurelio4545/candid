export function linkify(text: string): string {
  const urlWithProtocolRegex = /(https?:\/\/[^\s]+)/g;
  const urlWithoutProtocolRegex = /(?<!https?:\/\/)(?<![\w@])([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?/g;

  let result = text.replace(urlWithProtocolRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline break-all">${url}</a>`;
  });

  result = result.replace(urlWithoutProtocolRegex, (url) => {
    if (url.includes('<a ')) return url;
    return `<a href="https://${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline break-all">${url}</a>`;
  });

  return result;
}
