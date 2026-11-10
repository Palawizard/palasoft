import { describe, expect, it } from 'vitest';
import { breadcrumbJsonLd, serializeJsonLd, siteJsonLd, softwareJsonLd, type SoftwareFacts } from '../src/lib/seo.ts';

const facts: SoftwareFacts = {
  name: 'PalaClips',
  description: 'Enregistre tes meilleurs moments en jeu.',
  url: 'https://palawi.fr/software/palaclips',
  category: 'MultimediaApplication',
  kind: 'windows',
  version: '1.2.0',
  downloadUrl: 'https://palawi.fr/software/dl/palaclips',
  screenshot: 'https://palawi.fr/software/_image?href=x',
  sameAs: ['https://github.com/Palawizard/PalaClips'],
};

describe('softwareJsonLd', () => {
  it('describes a free Windows program with its version and download', () => {
    expect(softwareJsonLd(facts)).toMatchObject({
      '@type': 'SoftwareApplication',
      name: 'PalaClips',
      operatingSystem: 'Windows',
      applicationCategory: 'MultimediaApplication',
      softwareVersion: '1.2.0',
      downloadUrl: 'https://palawi.fr/software/dl/palaclips',
      offers: { price: '0', priceCurrency: 'EUR' },
      author: { '@id': 'https://palawi.fr/#palawi' },
    });
  });

  it('leaves out what is not known and names Minecraft for the mod', () => {
    const data = softwareJsonLd({ ...facts, kind: 'minecraft-mod', version: undefined, downloadUrl: undefined, screenshot: undefined });
    expect(data.operatingSystem).toBe('Minecraft Java Edition');
    expect(data).not.toHaveProperty('softwareVersion');
    expect(data).not.toHaveProperty('downloadUrl');
    expect(data).not.toHaveProperty('screenshot');
  });
});

describe('breadcrumbJsonLd', () => {
  it('numbers the steps from one', () => {
    const data = breadcrumbJsonLd([
      { name: 'PalaSoft', url: 'https://palawi.fr/software/' },
      { name: 'PalaClips', url: 'https://palawi.fr/software/palaclips' },
    ]);
    expect(data.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'PalaSoft', item: 'https://palawi.fr/software/' },
      { '@type': 'ListItem', position: 2, name: 'PalaClips', item: 'https://palawi.fr/software/palaclips' },
    ]);
  });
});

describe('siteJsonLd', () => {
  it('lists every program page after the site', () => {
    const [site, list] = siteJsonLd('https://palawi.fr/software/', 'Les logiciels.', [
      { name: 'PalaClips', url: 'https://palawi.fr/software/palaclips' },
    ]);
    expect(site).toMatchObject({ '@type': 'WebSite', name: 'PalaSoft', url: 'https://palawi.fr/software/' });
    expect(list?.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'PalaClips', url: 'https://palawi.fr/software/palaclips' },
    ]);
  });
});

describe('serializeJsonLd', () => {
  it('wraps the nodes in one graph and cannot close the script element', () => {
    const text = serializeJsonLd([{ '@type': 'Thing', name: '</script><b>' }]);
    expect(text).not.toContain('</script>');
    expect(JSON.parse(text)).toEqual({ '@context': 'https://schema.org', '@graph': [{ '@type': 'Thing', name: '</script><b>' }] });
  });
});
