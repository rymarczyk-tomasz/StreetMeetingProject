import { Link } from "react-router-dom";

export type Consents = { acceptTerms: boolean };

// Required regulamin/RODO acceptance. Publishing approved cars is part of the Select terms (pkt 10.6).
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
                    oraz{" "}
                    <Link to="/regulamin-select" target="_blank">
                        regulamin Strefy Select i Expo
                    </Link>{" "}
                    oraz zapoznałem się z{" "}
                    <Link to="/polityka-prywatnosci" target="_blank">
                        polityką prywatności
                    </Link>
                    . Przyjmuję do wiadomości, że zakwalifikowane auto (marka i zdjęcia ze zgłoszenia) może
                    zostać pokazane w galerii na stronie i w mediach społecznościowych Street Show. O usunięcie
                    zdjęć mogę poprosić w każdej chwili. <em>(wymagane)</em>
                </span>
            </label>
        </div>
    );
}
