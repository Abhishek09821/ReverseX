export type OpenSupportDetail = { opener?: HTMLElement };

export const OPEN_SUPPORT_EVENT = 'weblens:open-support';

export function openSupportHelper(opener?: HTMLElement) {
  window.dispatchEvent(new CustomEvent<OpenSupportDetail>(OPEN_SUPPORT_EVENT, { detail: { opener } }));
}
