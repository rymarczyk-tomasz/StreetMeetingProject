import { useSearchParams } from "react-router-dom";
import GateCheckin from "../components/GateCheckin";

// /wjazd — the only screen gate staff ("Obsługa wjazdu") can use. Scanning a pass
// with any phone camera opens /wjazd?kod=SSP-… and shows the result immediately.
export default function GatePage() {
    const [searchParams] = useSearchParams();

    return (
        <section className="page admin-page gate-page">
            <p className="page-eyebrow">Obsługa wjazdu</p>
            <h1>Wjazd na strefę Select</h1>
            <GateCheckin initialCode={searchParams.get("kod") || ""} />
        </section>
    );
}
