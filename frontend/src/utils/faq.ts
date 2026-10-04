// FAQ questions are numbered continuously across categories; returns the number
// of the first question in each category (1, 7, 12, …).
export function faqFirstNumbers(faq) {
    const numbers = [];
    let next = 1;
    for (const category of faq?.categories || []) {
        numbers.push(next);
        next += category.items.length;
    }
    return numbers;
}
