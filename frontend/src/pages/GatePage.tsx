import { useSearchParams } from "react-router-dom";
import GateCheckin from "../components/GateCheckin";

// /wjazd — the only screen gate staff ("Obsługa wjazdu") can use. Scanning a pass
// with any phone camera opens /wjazd?kod=SSP-… and shows the result immediately.
export default function GatePage() {
    const [searchParams] = useSearchParams();

    return (
        <section className="page gate-page">
            <h1 className="visually-hidden">Wjazd na strefę Select</h1>
            <GateCheckin initialCode={searchParams.get("kod") || ""} />
        </section>
    );
}
