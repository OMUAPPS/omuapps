export function applyOpacity(color: string, opacity: number) {
    return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent 0%)`;
}
