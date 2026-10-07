import { Link } from "react-router-dom";

export type Consents = { acceptTerms: boolean; photoPublishConsent: boolean };

// Required regulamin/RODO acceptance + optional consent to publish photos of the car.
export default function ConsentFields({
    value,
    onChange,
}: {
    value: Consents;
    onChange: (next: Consents) => void;
}) {
    return (
        <div className="consent-fields">
            <label className="consent-label check-label">
                <input
                    type="checkbox"
                    className="check-input"
                    checked={value.acceptTerms}
                    onChange={(event) => onChange({ ...value, acceptTerms: event.target.checked })}
                    required
                />
                <span>
                    Akceptuję{" "}
                    <Link to="/regulamin" target="_blank">
                        regulamin wydarzenia
                    </Link>{" "}
                    i wyrażam zgodę na przetwarzanie moich danych w celu rozpatrzenia
                    zgłoszenia i organizacji strefy Select. <em>(wymagane)</em>
                </span>
            </label>
            <label className="consent-label check-label">
                <input
                    type="checkbox"
                    className="check-input"
                    checked={value.photoPublishConsent}
                    onChange={(event) =>
                        onChange({ ...value, photoPublishConsent: event.target.checked })
                    }
                />
                <span>
                    Zgadzam się na publikację zdjęć mojego auta w galerii i mediach
                    społecznościowych Street Show. <em>(opcjonalne)</em>
                </span>
            </label>
        </div>
    );
}
