import { Cli } from './server';

await Cli.run(Bun.argv.slice(2));
