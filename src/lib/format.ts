import type { Locale } from './locale.ts';

const KIB = 1024;
const MIB = KIB * 1024;
const GIB = MIB * 1024;

const TAGS: Readonly<Record<Locale, string>> = { fr: 'fr-FR', en: 'en-US' };

const decimal = (locale: Locale) => new Intl.NumberFormat(TAGS[locale], { maximumFractionDigits: 1 });
const integer = (locale: Locale) => new Intl.NumberFormat(TAGS[locale], { maximumFractionDigits: 0 });

const UNITS: Readonly<Record<Locale, { gb: string; mb: string; kb: string; bytes: string }>> = {
  fr: { gb: 'Go', mb: 'Mo', kb: 'Ko', bytes: 'octets' },
  en: { gb: 'GB', mb: 'MB', kb: 'KB', bytes: 'bytes' },
};

export const formatSize = (bytes: number, locale: Locale): string => {
  const unit = UNITS[locale];
  if (bytes >= GIB) return `${decimal(locale).format(bytes / GIB)} ${unit.gb}`;
  if (bytes >= MIB) return `${decimal(locale).format(bytes / MIB)} ${unit.mb}`;
  if (bytes >= KIB) return `${integer(locale).format(bytes / KIB)} ${unit.kb}`;
  return `${integer(locale).format(bytes)} ${unit.bytes}`;
};

export const formatDownloads = (count: number, locale: Locale): string => {
  const number = integer(locale).format(count);
  if (locale === 'en') return `${number} download${count === 1 ? '' : 's'}`;
  return `${number} téléchargement${count === 1 || count === 0 ? '' : 's'}`;
};

const longDate = (locale: Locale) =>
  new Intl.DateTimeFormat(TAGS[locale], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });

export const formatDate = (isoDate: string, locale: Locale): string => {
  const parts = longDate(locale).formatToParts(new Date(isoDate));
  if (locale === 'en') return parts.map((part) => part.value).join('');
  return parts.map((part) => (part.type === 'day' && part.value === '1' ? '1er' : part.value)).join('');
};

const dateAndTime = (locale: Locale) =>
  new Intl.DateTimeFormat(TAGS[locale], {
    day: 'numeric',
    month: 'long',
    hour: locale === 'en' ? 'numeric' : '2-digit',
    minute: '2-digit',
    hourCycle: locale === 'en' ? 'h12' : 'h23',
    timeZone: 'Europe/Paris',
  });

export const formatDateTime = (timestamp: number, locale: Locale): string => {
  const parts = Object.fromEntries(
    dateAndTime(locale)
      .formatToParts(new Date(timestamp))
      .map((part) => [part.type, part.value]),
  );
  if (locale === 'en') {
    return `${parts['month']} ${parts['day']} at ${parts['hour']}:${parts['minute']} ${parts['dayPeriod']} (Paris time)`;
  }
  const day = parts['day'] === '1' ? '1er' : parts['day'];
  return `${day} ${parts['month']} à ${parts['hour']} h ${parts['minute']}`;
};

const LOADER_NAMES: Readonly<Record<string, string>> = {
  fabric: 'Fabric',
  forge: 'Forge',
  neoforge: 'NeoForge',
};

export const loaderName = (loader: string): string =>
  LOADER_NAMES[loader] ?? loader.charAt(0).toUpperCase() + loader.slice(1);

export const minecraftBandLabel = (bandId: string, locale: Locale): string =>
  bandId.split('-').join(locale === 'en' ? ' to ' : ' à ');
