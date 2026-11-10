const KIB = 1024;
const MIB = KIB * 1024;
const GIB = MIB * 1024;

const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export const formatSize = (bytes: number): string => {
  if (bytes >= GIB) return `${decimal.format(bytes / GIB)} Go`;
  if (bytes >= MIB) return `${decimal.format(bytes / MIB)} Mo`;
  if (bytes >= KIB) return `${integer.format(bytes / KIB)} Ko`;
  return `${integer.format(bytes)} octets`;
};

const longDate = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
});

export const formatDate = (isoDate: string): string =>
  longDate
    .formatToParts(new Date(isoDate))
    .map((part) => (part.type === 'day' && part.value === '1' ? '1er' : part.value))
    .join('');

const LOADER_NAMES: Readonly<Record<string, string>> = {
  fabric: 'Fabric',
  forge: 'Forge',
  neoforge: 'NeoForge',
};

export const loaderName = (loader: string): string =>
  LOADER_NAMES[loader] ?? loader.charAt(0).toUpperCase() + loader.slice(1);

export const minecraftBandLabel = (bandId: string): string => bandId.split('-').join(' à ');
