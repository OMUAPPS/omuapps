# `@omujs/omu`

TypeScript client for connecting an application to OMUAPPS.

## Installation

```sh
npm install @omujs/omu
```

## Usage

```ts
import { App, Omu } from '@omujs/omu';

const app = new App('com.example:sample', {
    version: '1.0.0',
});
const omu = new Omu(app);

void omu.start();
await omu.waitForReady();
```

Register required APIs, permissions, and plugins before calling `start()`.
The promise returned by `start()` remains pending while the connection loop is
running; use `waitForReady()` when initialization must wait for API readiness.

See the [OMUAPPS API documentation](https://omuapps.com/docs/api) for API
guides and examples.
