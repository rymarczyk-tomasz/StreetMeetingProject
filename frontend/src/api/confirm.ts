// Styled replacements for window.confirm / window.prompt: askConfirm() and askText()
// open ConfirmDialog (mounted once in Layout) and resolve true / false or the typed text / null.
// Without a mounted dialog they fall back to the browser's own windows.

export type ConfirmRequest = {
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
};
export type TextRequest = ConfirmRequest & {
    label: string;
    value?: string;
    placeholder?: string;
};
type Answer = { confirmed: boolean; value: string };
type Asker = (request: ConfirmRequest & Partial<TextRequest> & { input: boolean }) => Promise<Answer>;

let asker: Asker | null = null;

export function registerConfirmAsker(fn: Asker | null) {
    asker = fn;
}

export function askConfirm(request: ConfirmRequest): Promise<boolean> {
    if (!asker) return Promise.resolve(window.confirm(`${request.title}\n\n${request.message}`));
    return asker({ ...request, input: false }).then((answer) => answer.confirmed);
}

// null when the dialog was cancelled, otherwise the (possibly empty) text
export function askText(request: TextRequest): Promise<string | null> {
    if (!asker) return Promise.resolve(window.prompt(`${request.title}\n\n${request.message}`, request.value || ""));
    return asker({ ...request, input: true }).then((answer) => (answer.confirmed ? answer.value : null));
}
