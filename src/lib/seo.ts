// Structured data (schema.org JSON-LD) for search engines, built from the catalogue.

export const SITE_NAME = 'PalaSoft';

const author = {
  '@type': 'Person',
  '@id': 'https://palawi.fr/#palawi',
  name: 'Palawi',
  url: 'https://palawi.fr/',
} as const;

export type JsonLd = Record<string, unknown>;

export interface SoftwareFacts {
  name: string;
  description: string;
  url: string;
  category: string;
  kind: 'windows' | 'minecraft-mod';
  version: string | undefined;
  downloadUrl: string | undefined;
  screenshot: string | undefined;
  sameAs: string[];
  language: string;
}

export const softwareJsonLd = (facts: SoftwareFacts): JsonLd => {
  const data: JsonLd = {
    '@type': 'SoftwareApplication',
    name: facts.name,
    description: facts.description,
    url: facts.url,
    applicationCategory: facts.category,
    operatingSystem: facts.kind === 'windows' ? 'Windows' : 'Minecraft Java Edition',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    author,
    inLanguage: facts.language,
    sameAs: facts.sameAs,
  };
  if (facts.version !== undefined) data.softwareVersion = facts.version;
  if (facts.downloadUrl !== undefined) data.downloadUrl = facts.downloadUrl;
  if (facts.screenshot !== undefined) data.screenshot = facts.screenshot;
  return data;
};

export const breadcrumbJsonLd = (trail: { name: string; url: string }[]): JsonLd => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((step, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: step.name,
    item: step.url,
  })),
});

export interface SiteFacts {
  homeUrl: string;
  description: string;
  language: string;
  listName: string;
  pages: { name: string; url: string }[];
}

export const siteJsonLd = ({ homeUrl, description, language, listName, pages }: SiteFacts): JsonLd[] => [
  {
    '@type': 'WebSite',
    name: SITE_NAME,
    url: homeUrl,
    description,
    inLanguage: language,
    publisher: author,
  },
  {
    '@type': 'ItemList',
    name: listName,
    itemListElement: pages.map((page, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: page.name,
      url: page.url,
    })),
  },
];

// One graph per page; "<" is escaped so no value can close the script element early.
export const serializeJsonLd = (nodes: JsonLd[]): string =>
  JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c');
