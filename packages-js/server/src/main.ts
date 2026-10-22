import { BundledPlugins } from './plugins';
import { Cli } from './server';

await Cli.run(Bun.argv.slice(2), BundledPlugins.all);
