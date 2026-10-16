import { cp } from 'node:fs/promises';

await cp('dist/index.html', 'dist/404.html');