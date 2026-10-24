import { Crawl, HttpClient, type ProfileNode } from './crawl';
import { Sites } from './sites';

export class Iwashi {
    public static tree(url: string): Promise<ProfileNode | undefined> {
        return new Crawl(Sites.all, new HttpClient()).tree(url);
    }
}
