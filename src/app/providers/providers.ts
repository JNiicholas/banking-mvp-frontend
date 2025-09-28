import { Provider } from '@angular/core';
import { BASE_PATH } from '../api/variables';
import { Configuration } from '../api/configuration';

export const apiProviders: Provider[] = [
  { provide: BASE_PATH, useValue: 'http://localhost:8002' },
  { provide: Configuration, useFactory: () => new Configuration({ basePath: 'http://localhost:8002' }) },
];