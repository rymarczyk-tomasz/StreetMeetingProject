import type { ReactNode } from "react";

type AuthLayoutProps = {
    image: string;
    eyebrow: string;
    headline: ReactNode;
    aside?: ReactNode;
    children: ReactNode;
};

// Login / registration: photo with a short pitch on the left, the form on the
// right. On phones the photo is dropped and only the form stays.
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
