// Section header in the admin panel: optional eyebrow, title, text and actions on the right.
export default function AdminHeading({ eyebrow = "", title, description = "", children = null }) {
    return (
        <div className="admin-heading">
            <div>
                {eyebrow && <p className="admin-eyebrow">{eyebrow}</p>}
                <h2>{title}</h2>
                {description && <p className="admin-heading-text">{description}</p>}
            </div>
            {children && <div className="admin-heading-actions">{children}</div>}
        </div>
    );
}
