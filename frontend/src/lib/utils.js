import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => twMerge(clsx(inputs));

export function timeAgo(date) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  const units = [
    ['y', 31536000],
    ['mo', 2592000],
    ['d', 86400],
    ['h', 3600],
    ['m', 60],
  ];
  for (const [label, secs] of units) {
    if (s >= secs) return `${Math.floor(s / secs)}${label} ago`;
  }
  return 'just now';
}

export const formatDate = (date) =>
  new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const errorMessage = (err, fallback = 'Something went wrong') => {
  const data = err?.response?.data;
  if (data?.errors?.length) return data.errors.map((e) => e.message).join('. ');
  return data?.message || err?.message || fallback;
};
