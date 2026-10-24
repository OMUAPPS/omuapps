type Clause = {
    operator: string;
    version: string;
};

export class VersionSpecifier {
    private static readonly CLAUSE = /^(===|~=|==|!=|>=|<=|>|<)\s*(\S+)$/;

    private constructor(private readonly clauses: readonly Clause[]) {}

    public static parse(text: string | null): VersionSpecifier {
        if (!text) return new VersionSpecifier([]);
        const clauses = text.split(',').map((part) => part.trim()).filter(Boolean).map((part) => {
            const match = VersionSpecifier.CLAUSE.exec(part);
            if (!match) throw new Error(`Invalid version specifier: ${part}`);
            return { operator: match[1], version: match[2] };
        });
        return new VersionSpecifier(clauses);
    }

    public contains(version: string): boolean {
        return this.clauses.every((clause) => VersionSpecifier.matches(clause, version));
    }

    private static matches({ operator, version }: Clause, actual: string): boolean {
        if (operator === '===') return actual === version;
        if (version.endsWith('.*')) {
            const prefix = VersionSpecifier.parts(version.slice(0, -2));
            const equal = prefix.every((part, index) => VersionSpecifier.parts(actual)[index] === part);
            return operator === '!=' ? !equal : equal;
        }
        const order = VersionSpecifier.compare(actual, version);
        if (operator === '==') return order === 0;
        if (operator === '!=') return order !== 0;
        if (operator === '>=') return order >= 0;
        if (operator === '<=') return order <= 0;
        if (operator === '>') return order > 0;
        if (operator === '<') return order < 0;
        const prefix = VersionSpecifier.parts(version).slice(0, -1);
        return order >= 0 && prefix.every((part, index) => VersionSpecifier.parts(actual)[index] === part);
    }

    private static compare(left: string, right: string): number {
        const a = VersionSpecifier.parts(left);
        const b = VersionSpecifier.parts(right);
        for (let index = 0; index < Math.max(a.length, b.length); index++) {
            const difference = (a[index] ?? 0) - (b[index] ?? 0);
            if (difference !== 0) return Math.sign(difference);
        }
        return 0;
    }

    private static parts(version: string): number[] {
        return version.split('.').map((part) => Number.parseInt(part, 10) || 0);
    }
}
