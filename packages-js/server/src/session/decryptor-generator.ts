import { Decryptor } from '@omujs/omu/network';
import { pathToFileURL } from 'node:url';

export class DecryptorGenerator {
    public static generate(): Promise<Decryptor> {
        return DecryptorGenerator.generateInWorker().catch(() => Decryptor.new());
    }

    private static generateInWorker(): Promise<Decryptor> {
        const worker = new Worker(new URL('session/decryptor-worker.ts', pathToFileURL(Bun.main)));
        return new Promise((resolve, reject) => {
            worker.addEventListener('message', (event: MessageEvent<CryptoKeyPair>) => {
                worker.terminate();
                resolve(Decryptor.fromKeys(event.data.privateKey, event.data.publicKey));
            }, { once: true });
            worker.addEventListener('error', (event) => {
                worker.terminate();
                reject(event.error ?? new Error(event.message));
            }, { once: true });
        });
    }
}
