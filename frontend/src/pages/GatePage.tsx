import { useSearchParams } from "react-router-dom";
import GateCheckin from "../components/GateCheckin";

export default function GatePage() {
    const [searchParams] = useSearchParams();

    return (
        <section className="page gate-page">
            <h1 className="visually-hidden">Wjazd na strefę Select</h1>
            <GateCheckin initialCode={searchParams.get("kod") || ""} />
        </section>
    );
}
