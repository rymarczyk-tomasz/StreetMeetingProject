import { Children, Fragment, isValidElement, useEffect, useRef, useState } from "react";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "../utils/useScrollLock";

type Item = { value: string; label: string; disabled: boolean };
type Group = { label: string; items: Item[] };
type OptionProps = { children?: ReactNode; value?: string | number; label?: string; disabled?: boolean };

function textOf(node: ReactNode): string {
    if (node == null || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(textOf).join("");
    if (isValidElement(node)) return textOf((node.props as OptionProps).children);
    return "";
}

// reads the <option> / <optgroup> children the same way the browser would
function collect(children: ReactNode, groups: Group[], current: Group | null) {
    Children.forEach(children, (child) => {
        if (!isValidElement(child)) return;
        const props = child.props as OptionProps;
        if (child.type === Fragment) {
            collect(props.children, groups, current);
        } else if (child.type === "optgroup") {
            const group = { label: props.label || "", items: [] };
            groups.push(group);
            collect(props.children, groups, group);
        } else if (child.type === "option") {
            const label = textOf(props.children);
            const item = { value: String(props.value ?? label), label, disabled: Boolean(props.disabled) };
            let target = current;
            if (!target) {
                target = groups[groups.length - 1];
                if (!target || target.label) {
                    target = { label: "", items: [] };
                    groups.push(target);
                }
            }
            target.items.push(item);
        }
    });
}

function titleOf(select: HTMLSelectElement) {
    const label = select.labels?.[0];
    if (label) {
        const copy = label.cloneNode(true) as HTMLElement;
        copy.querySelectorAll("select").forEach((node) => node.remove());
        const text = copy.textContent?.trim();
        if (text) return text;
    }
    return select.getAttribute("aria-label") || "Wybierz";
}

function Sheet({
    title,
    groups,
    value,
    onPick,
    onClose,
}: {
    title: string;
    groups: Group[];
    value: string;
    onPick: (value: string) => void;
    onClose: () => void;
}) {
    useScrollLock(true);

    useEffect(() => {
        // captured so an Escape here doesn't also close a dialog the select sits in
        function onKey(event: KeyboardEvent) {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            onClose();
        }
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [onClose]);

    return createPortal(
        <div
            className="select-sheet-backdrop"
            onClick={(event) => event.target === event.currentTarget && onClose()}
        >
            <div className="select-sheet" role="dialog" aria-modal="true" aria-label={title}>
                <div className="select-sheet-head">
                    <h3>{title}</h3>
                    <button type="button" className="select-sheet-close" aria-label="Zamknij" onClick={onClose}>
                        <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                </div>
                <div className="select-sheet-list" role="listbox" aria-label={title}>
                    {groups.map((group, index) => (
                        <div key={`${group.label}-${index}`}>
                            {group.label && <p className="select-sheet-group">{group.label}</p>}
                            {group.items.map((item) => {
                                const selected = item.value === value;
                                return (
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        key={item.value}
                                        className={`select-sheet-option${selected ? " is-selected" : ""}`}
                                        disabled={item.disabled}
                                        ref={(node) => {
                                            if (selected) node?.scrollIntoView({ block: "center" });
                                        }}
                                        onClick={() => onPick(item.value)}
                                    >
                                        <span>{item.label}</span>
                                        {selected && <i className="bi bi-check-lg" aria-hidden="true" />}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body,
    );
}

// A native <select>, except that on touch screens it opens a bottom sheet in the site's
// style instead of the system list. The real select stays underneath, so styles, forms and
// onChange handlers work as before; picking an option fires a genuine change event on it.
export default function Select({ children, onMouseDown, onClick, ...props }: ComponentProps<"select">) {
    const ref = useRef<HTMLSelectElement>(null);
    // title and current value are read from the real select when it is tapped
    const [sheet, setSheet] = useState<{ title: string; value: string } | null>(null);

    const isTouch = () => window.matchMedia("(pointer: coarse)").matches;

    function handleMouseDown(event: MouseEvent<HTMLSelectElement>) {
        onMouseDown?.(event);
        if (!event.defaultPrevented && isTouch()) event.preventDefault();
    }

    function handleClick(event: MouseEvent<HTMLSelectElement>) {
        onClick?.(event);
        if (!event.defaultPrevented && isTouch()) {
            setSheet({ title: titleOf(event.currentTarget), value: event.currentTarget.value });
        }
    }

    function pick(value: string) {
        setSheet(null);
        const select = ref.current;
        if (!select || select.value === value) return;
        const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
        setValue?.call(select, value);
        select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const groups: Group[] = [];
    if (sheet) collect(children, groups, null);

    return (
        <>
            <select ref={ref} {...props} onMouseDown={handleMouseDown} onClick={handleClick}>
                {children}
            </select>
            {sheet && (
                <Sheet
                    title={sheet.title}
                    groups={groups}
                    value={sheet.value}
                    onPick={pick}
                    onClose={() => setSheet(null)}
                />
            )}
        </>
    );
}
