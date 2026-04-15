const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl) return 'http://localhost:5000';
  if (envUrl.startsWith('http')) return envUrl;
  return `https://${envUrl}`;
};

export const API_URL = getApiUrl();
