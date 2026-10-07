export function plural(count: number, one: string, few: string, many: string) {
    const lastDigit = count % 10;
    const lastTwo = count % 100;
    const form =
        count === 1
            ? one
            : lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)
              ? few
              : many;
    return `${count} ${form}`;
}

export function photosLabel(count: number) {
    return plural(count, "zdjęcie", "zdjęcia", "zdjęć");
}
