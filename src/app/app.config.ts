import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';

import { routes } from './app.routes';
import { APP_ICONS } from './core/icons/lucide-icons';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideLucideIcons(...APP_ICONS),
  ],
};
