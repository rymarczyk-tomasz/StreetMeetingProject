import type { ReactNode } from "react";

type PageHeaderProps = {
    eyebrow?: string;
    title: ReactNode;
    lead?: ReactNode;
    action?: ReactNode;
};

// Grey band opening public sub-pages (Galeria, FAQ, Regulamin): eyebrow + big
// title on the left, an optional lead or action on the right.
export default function PageHeader({ eyebrow, title, lead, action }: PageHeaderProps) {
    return (
        <header className="page-header">
            <div className="site-container page-header-inner">
                <div className="page-header-title">
                    {eyebrow && <p className="eyebrow eyebrow-on-light">{eyebrow}</p>}
                    <h1>{title}</h1>
                </div>
                {lead && <p className="page-header-lead">{lead}</p>}
                {action}
            </div>
        </header>
    );
}
