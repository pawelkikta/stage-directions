/* App version - injected from package.json by Vite define. */
export const APP_VERSION: string = __APP_VERSION__;
export const APP_CHANNEL: string = __APP_CHANNEL__;

/** Label for the UI, for example "v1.0.0". */
export const APP_VERSION_LABEL = `v${APP_VERSION}${APP_CHANNEL ? ` ${APP_CHANNEL}` : ""}`;
