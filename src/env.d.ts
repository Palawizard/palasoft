declare namespace App {
  interface Locals {
    /** Language of the page, from its URL. */
    locale: import('./lib/locale.ts').Locale;
    /** Part of the URL after the base and the language prefix ("/" for the home), used to link the other language. */
    pagePath: string;
  }
}
