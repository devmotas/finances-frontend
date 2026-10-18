import { BUILD_INFO } from './build-info.generated';
import { BuildInfo } from './build-info.model';

export const BUILD_INFO_STORAGE_KEY = 'finances.version';
const APP_NAME = 'Minhas Finanças';
const BUILD_DATE_LOCALE = 'pt-BR';
const BUILD_DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'short' };

export function recordBuildInfo(info: BuildInfo = BUILD_INFO): void {
  console.info(APP_NAME, info.commit, info.builtAt);
  try {
    localStorage.setItem(BUILD_INFO_STORAGE_KEY, JSON.stringify(info));
  } catch {
  }
}

export function buildVersionLabel(info: BuildInfo = BUILD_INFO): string {
  const builtOn = new Date(info.builtAt).toLocaleDateString(BUILD_DATE_LOCALE, BUILD_DATE_FORMAT);
  return `Versão ${info.commit} · ${builtOn}`;
}
