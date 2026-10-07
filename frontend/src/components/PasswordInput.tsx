import { useState } from "react";
import type { InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    invalid?: boolean;
};

export default function PasswordInput({ invalid, className = "", ...props }: PasswordInputProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <span className={`field-password${invalid ? " is-invalid" : ""}`}>
            <input
                {...props}
                type={isVisible ? "text" : "password"}
                className={`field-input ${className}`.trim()}
                aria-invalid={invalid || undefined}
            />
            <button
                type="button"
                className="field-password-toggle"
                onClick={() => setIsVisible((value) => !value)}
                aria-pressed={isVisible}
                aria-label={isVisible ? "Ukryj hasło" : "Pokaż hasło"}
            >
                {isVisible ? "Ukryj" : "Pokaż"}
            </button>
        </span>
    );
}
