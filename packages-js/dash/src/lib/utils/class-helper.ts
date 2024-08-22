export function applyOpacity(color: string, opacity: number) {
    return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent 0%)`;
}

export function classes(...classes: (string | boolean | undefined | null)[]) {
    return classes.filter(Boolean).join(' ');
}
