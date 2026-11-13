// Styled replacement for window.confirm in the admin panel: askConfirm() opens
// ConfirmDialog (mounted once next to StepUpDialog) and resolves true / false.
// Without a mounted dialog it falls back to the browser's own confirm.

export type ConfirmRequest = {
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
};
type Asker = (request: ConfirmRequest) => Promise<boolean>;

let asker: Asker | null = null;

export function registerConfirmAsker(fn: Asker | null) {
    asker = fn;
}

export function askConfirm(request: ConfirmRequest): Promise<boolean> {
    if (!asker) return Promise.resolve(window.confirm(`${request.title}\n\n${request.message}`));
    return asker(request);
}
