import type { ReactNode } from "react";

type AuthLayoutProps = {
    image: string;
    eyebrow: string;
    headline: ReactNode;
    aside?: ReactNode;
    children: ReactNode;
};

export default function AuthLayout({ image, eyebrow, headline, aside, children }: AuthLayoutProps) {
    return (
        <section className="auth-split">
            <div className="auth-split-photo" style={{ backgroundImage: `url("${image}")` }}>
                <div className="auth-split-pitch">
                    <p className="eyebrow">{eyebrow}</p>
                    <p className="auth-split-headline">{headline}</p>
                    {aside}
                </div>
            </div>
            <div className="auth-split-form">{children}</div>
        </section>
    );
}

export function SimpleAuthLayout({ children }: { children: ReactNode }) {
    return (
        <AuthLayout
            image="/img/optimized/photos/7-1200.webp"
            eyebrow="Konto Street Show"
            headline={
                <>
                    Zgłoszenia, garaż
                    <br />i wejściówki w jednym miejscu
                </>
            }
        >
            {children}
        </AuthLayout>
    );
}
