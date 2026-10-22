# 設計原則

この文書は設計の方向を決める。既存のコードは手本にせず、変更するときにこの向きへ直す。

## 所有

### 置き場所は主語で決める

処理を書くときは、その処理の主語にあたる型に置く。今編集しているファイル、パッケージ、移す前の場所で置き場所を決めない。入力と出力が同じ型の値だけで閉じる処理は、その型が下の層にあってもその型に置く。

悪い例

```ts
class InvoiceView {
    public static roundAmount(amount: Money, unit: Money): Money {
        ...
    }
}
```

良い例

```ts
class Money {
    public roundTo(unit: Money): Money {
        ...
    }
}
```

使う場面の名前を付けた型にある別の型の値を受け取って返すだけのメソッドが該当する。

汎用の概念を下の層が持っても、層の依存の向きに反しないためである。

### モジュール直下に関数を置かない

処理をモジュール直下に名前付きの関数として置かない。`const`に入れたアロー関数も含む。処理は所有者の型のメソッドにする。

悪い例

```ts
export function formatPrice(price: Price): string {
    ...
}
```

良い例

```ts
price.format();
```

### 所有者がないときは型を作る

処理の対象がメソッドを持てない値（`string`、JSONのデータなど）のときは、値の概念を名前にした型を作る。処理はその型の`static`メソッドにし、値を第1引数で受け取る。同じ値に何度も操作するときは、値を包むBindingにする。「Capabilityと対象の組はBindingにする」を参照。

悪い例

```ts
export function isValidEmail(email: string): boolean {
    ...
}
```

良い例

```ts
class Email {
    public static isValid(email: string): boolean {
        ...
    }
}
```

名前にHelperかUtilを含む型と`static`メソッドの第1引数の型がメソッドごとに違う型が該当する。

値が何の概念かと、その値への処理の持ち主をコードに表すためである。

### 同じ処理を複製しない

同じ処理が2か所以上にあるときは、所有者の型が欠けている。複製せず、値の持ち主の型に1つのメソッドとして置く。

悪い例

```ts
const invoiceTotal = invoice.prices.reduce((sum, price) => sum.plus(price), Money.zero);
const cartTotal = cart.prices.reduce((sum, price) => sum.plus(price), Money.zero);
```

良い例

```ts
const invoiceTotal = invoice.prices.total();
const cartTotal = cart.prices.total();
```

### `xxxOf`を作らない

引数に渡したものの持ち物（値、関係、派生物）を返すメソッドを作らない。持ち物は対象自身に持たせ、所有者は作るときに関係を作って保持する。持ち物が文脈（`library`など）で決まるときは、対象と文脈の組をBindingにする。

IDかキーで探すメソッド、自分自身の判定、自分の型を作る静的メソッドは対象外。

悪い例

```ts
library.authorOf(book);
library.shelfOf(book);
```

良い例

```ts
book.author;
book.shelf;
```

`b.xxx`と読み替えて意味が通る`a.xxxOf(b)`が該当する。

### 文脈を引数で運ばない

同じ対象に属し続ける文脈を何段もの関数の引数で渡していかない。文脈はBindingを作るときに1回だけ渡して持たせ、子のBindingは親のBindingが作る。

悪い例

```ts
class Shelf {
    public render(user: User, date: Date): void {
        this.books.forEach((book) => book.render(user, date));
    }
}
```

良い例

```ts
class ShelfBinding {
    public readonly books: BookBinding[];

    public constructor(shelf: Shelf, public readonly user: User, public readonly date: Date) {
        this.books = shelf.books.map((book) => new BookBinding(book, this));
    }

    public render(): void {
        this.books.forEach((book) => book.render());
    }
}
```

1つの呼び出しの引数を詰めただけの文脈のオブジェクトが該当する。

### 抽象化は責任を言えるときだけ作る

新しい型、`interface`、Capability、Bindingは何を持ち何を保証するかを言えるときだけ作る。共通のコードがあるだけでは作らない。将来使うかもしれない機能のために今のAPIを一般化しない。

悪い例

```ts
interface Named {
    readonly name: string;
}

class Author implements Named {
    ...
}
```

良い例

```ts
class Author {
    ...
}
```

### 既存の概念で表せるものに新しい概念を作らない

新しい仕組みを作るときは、既存の概念で表せるかを先に見る。既存の概念はSpec、Capability、Binding、Scope、Action、Passを指す。表せるなら似た概念を新しく作らない。

悪い例

```ts
interface FavoriteAdapter<S> {
    isFavorite(state: S): boolean;
}
```

良い例

```ts
interface CapabilityFavorite<S> {
    isFavorite(state: S): boolean;
}
```

## CapabilityとBinding

### 型に共通する能力はCapabilityに分ける

内部の表現が異なる型に共通の能力はCapabilityとしてデータから分けて定義する。Capabilityは対象の状態を持ち続けず、状態に対してできる操作だけを定義する。

良い例

```ts
interface CapabilityFavorite<S> {
    isFavorite(state: S): boolean;
    setFavorite(state: S, favorite: boolean): void;
}
```

### データの型に本質でない`interface`を実装させない

データの型にそのデータの形に本質でない共通の`interface`を実装させない。共通の能力はCapabilityの実装としてデータの型の外に置く。すべての型がすべてのCapabilityを持つ前提にしない。

悪い例

```ts
class Book implements Favoritable {
    public isFavorite(): boolean {
        ...
    }
}
```

良い例

```ts
class BookFavorite implements CapabilityFavorite<Book> {
    public isFavorite(book: Book): boolean {
        ...
    }
}
```

### 型を判定して振る舞いを分けない

型によって振る舞いが変わるときに、`instanceof`か種類の値で分岐しない。振る舞いをCapabilityとして持たせ、Capabilityがあるかどうかで分ける。

悪い例

```ts
if (target instanceof Book) target.favorite = true;
else if (target instanceof Author) target.starred = true;
```

良い例

```ts
const favorite = target.capabilities.favorite;
if (!favorite) return;
favorite.setFavorite(target.state, true);
```

新しい型を足すたびに、分岐を探して直さずに済むためである。

### Capabilityと対象の組はBindingにする

Capabilityを特定の対象、状態、Scopeと結び付けるときは、Bindingにする。データを置かれた文脈と結び付けるときもBindingにする。使う側には対象を中心にした状態を持つAPIとしてBindingを渡す。

悪い例

```ts
capability.isFavorite(state);
capability.setFavorite(state, true);
```

良い例

```ts
const binding = new FavoriteBinding(capability, state);
binding.isFavorite();
binding.setFavorite(true);
```

Capabilityの操作を呼ぶたびに同じ対象を渡している呼び出しが該当する。

## 段階ごとの型

### 段階ごとに型を分ける

同じ概念を保存形式、データ、文脈との結合、評価結果の段階ごとに別の型で表す。1つの型に2つ以上の段階を混ぜない。

| 段階 | 例 | 持つもの |
|---|---|---|
| JSON | `BookJSON` | シリアライズした形 |
| データ | `Book` | 編集する値（置かれた文脈を知らない） |
| Binding | `BookBinding` | データと置かれた文脈の結合 |
| Evaluated | `BookEvaluated` | ある時刻と文脈で評価した結果 |
| API | `BookAPI` | 式へ公開する窓口 |

### 名前は概念、段階の順にする

型の名前は概念の名前のあとに段階の名前を付ける。

悪い例

```ts
class EvaluatedBook {}
```

良い例

```ts
class BookEvaluated {}
```

### 別の文脈が要る段階はBindingで結ぶ

ある段階の型が別の文脈を必要とするときは、その文脈を型に持たせない。「型名+Binding」の別の型で結び付ける。

良い例

```text
ChapterEvaluatedBinding = ChapterEvaluated + BookEvaluated
```

各段階の型をその段階の責任だけで単独で扱えるようにするためである。

## 層

### 下の層は上の層を知らない

下の層は上の層の都合を知らない。上の層の都合で下の層のAPIを太らせない。依存の向きを逆にする必要があるときは、`interface`かBindingを境目に置く。

悪い例

```ts
class Invoice {
    public showInCart(cart: CartView): void {
        ...
    }
}
```

良い例

```ts
class CartView {
    public show(invoice: Invoice): void {
        ...
    }
}
```

名前に上の層の概念の名前を含む下の層の型とメソッドが該当する。

### モジュールの`import`は同じ層か下の層にだけ向ける

パッケージの中のモジュールを層に分ける。実行時の`import`は同じ層か下の層にだけ向ける。

型だけの`import`は対象外。

### 公開APIには意味だけを出す

公開APIには使う側が何をしたいかだけを出す。スロット、インデックス、バックエンド固有の値、一時的な内部のオブジェクトを出さない。

良い例

```ts
shelf.placeAfter(book, other);
```

## コードの決まり

### 別のモジュールはフォルダーを`import`する

パッケージのソースの直下のフォルダーを1つのモジュールとして扱う。別のモジュールのものはファイルでなくモジュールのフォルダーを`import`する。同じモジュールの中ではファイルを直接`import`する。

同じモジュールの中のフォルダー同士（`billing/invoice`と`billing/tax`など）は対象外。

悪い例

```ts
import { type Invoice } from '../../billing/invoice';
import { type Invoice } from '../../billing/index';
```

良い例

```ts
import { type Invoice } from '../../billing';
```

### ないと分かったらその場で打ち切る

値がないと分かった時点で`return`か`continue`する。三項演算子か`?.`で`undefined`を作って後ろへ運び、あとで判定しない。

`?.`と`??`の結果をそのまま使うとき（既定値を決める、表示する）は対象外。

悪い例

```ts
const user = id === undefined ? undefined : users.get(id);
if (!user) return;
```

良い例

```ts
if (!id) return;
const user = users.get(id);
if (!user) return;
```

### キャッシュは最後に足す

遅い処理を速くするときは、キャッシュを足す前に同じ値を何度も計算しているところを取り除く。結果が変わる時点が決まっているものはキャッシュせず、その時点で計算して保存する。いつ無効になるかが決まらないキャッシュは足さない。

悪い例

```ts
class Cart {
    private cachedTotal?: Money;

    public get total(): Money {
        return this.cachedTotal ??= this.sumAmounts();
    }
}
```

良い例

```ts
class Cart {
    public total = Money.zero;

    public add(amount: Money): void {
        this.amounts.push(amount);
        this.total = this.total.plus(amount);
    }
}
```

### コメントを書かない

コメントを書かない。`//`、`/* */`、JSDoc、TODOのどれも書かない。説明が要るときは名前で伝える。
