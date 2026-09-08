export {};

declare global {
    interface Window {
        bootstrap?: {
            Collapse: {
                getInstance: (element: Element) => { hide: () => void } | null;
            };
        };
    }
}
