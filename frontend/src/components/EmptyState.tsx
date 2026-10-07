import type { ReactNode } from "react";

export default function EmptyState({
    icon,
    title,
    children,
    action = null,
}: {
    icon: string;
    title: ReactNode;
    children?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">
                <i className={`bi ${icon}`} />
            </span>
            <div className="empty-state-text">
                <h2>{title}</h2>
                {children && <p>{children}</p>}
            </div>
            {action && <div className="empty-state-action">{action}</div>}
        </div>
    );
}
