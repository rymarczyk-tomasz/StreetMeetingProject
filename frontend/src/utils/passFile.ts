import QRCode from "qrcode";

// Entry pass as a downloadable picture (PNG) or a one-page A4 PDF, drawn in the
// browser — no server work and no PDF library (the PDF just wraps a JPEG).

const WIDTH = 1080;
const HEIGHT = 1560;

type Pass = {
    code: string;
    link?: string;
    edition: number;
    name: string;
    carBrand: string;
    licensePlate: string;
};

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight = 700) {
    let fontSize = size;
    do {
        context.font = `${weight} ${fontSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
        fontSize -= 2;
    } while (context.measureText(text).width > maxWidth && fontSize > 16);
}

export async function renderPassCanvas(pass: Pass) {
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext("2d");
    const center = WIDTH / 2;
    const textWidth = WIDTH - 120;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, WIDTH, HEIGHT);

    // Header band.
    context.fillStyle = "#111111";
    context.fillRect(0, 0, WIDTH, 200);
    context.fillStyle = "#f5c518";
    context.textAlign = "center";
    context.textBaseline = "middle";
    fitText(context, `STREET SHOW ${pass.edition}`, textWidth, 72, 800);
    context.fillText(`STREET SHOW ${pass.edition}`, center, 80);
    context.fillStyle = "#ffffff";
    fitText(context, "WEJŚCIÓWKA · STREFA SELECT", textWidth, 40, 600);
    context.fillText("WEJŚCIÓWKA · STREFA SELECT", center, 150);

    // QR code: a link, so any phone camera opens the gate screen.
    const qr = document.createElement("canvas");
    await QRCode.toCanvas(qr, pass.link || pass.code, { width: 760, margin: 2, errorCorrectionLevel: "M" });
    context.drawImage(qr, center - 380, 250, 760, 760);

    context.fillStyle = "#111111";
    fitText(context, pass.licensePlate, textWidth, 110, 800);
    context.fillText(pass.licensePlate, center, 1110);
    fitText(context, `${pass.carBrand} · ${pass.name}`, textWidth, 46, 500);
    context.fillText(`${pass.carBrand} · ${pass.name}`, center, 1210);

    context.fillStyle = "#555555";
    fitText(context, "Pokaż ten kod przy wjeździe — na telefonie albo wydrukowany.", textWidth, 34, 400);
    context.fillText("Pokaż ten kod przy wjeździe — na telefonie albo wydrukowany.", center, 1320);
    fitText(context, `Kod: ${pass.code}`, textWidth, 30, 400);
    context.fillText(`Kod: ${pass.code}`, center, 1380);

    context.strokeStyle = "#dddddd";
    context.lineWidth = 4;
    context.strokeRect(2, 2, WIDTH - 4, HEIGHT - 4);
    return canvas;
}

// Safari on iPhone opens a `download` link in a new tab instead of saving it, so
// touch devices that can share files get the system share sheet ("Zachowaj obraz",
// "Zachowaj w Plikach"). Desktops keep the normal download.
async function saveBlob(blob: Blob, filename: string) {
    const file = new File([blob], filename, { type: blob.type });
    const isTouch = window.matchMedia?.("(hover: none)").matches;
    if (isTouch && navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: "Wejściówka Street Show" });
            return;
        } catch (error) {
            // Closed by the user: nothing to do. Anything else: fall back to the download.
            if ((error as DOMException)?.name === "AbortError") return;
        }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
    return new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas"))), type, quality),
    );
}

export function passFilename(pass: Pass, extension: string) {
    const plate = pass.licensePlate.replace(/[^a-zA-Z0-9]+/g, "");
    return `wejsciowka-streetshow-${pass.edition}-${plate || "auto"}.${extension}`;
}

export async function downloadPassPng(pass: Pass) {
    const canvas = await renderPassCanvas(pass);
    await saveBlob(await canvasBlob(canvas, "image/png"), passFilename(pass, "png"));
}

function buildPdf(jpeg: Uint8Array, width: number, height: number) {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 40;
    const scale = Math.min((pageWidth - 2 * margin) / width, (pageHeight - 2 * margin) / height);
    const drawWidth = (width * scale).toFixed(2);
    const drawHeight = (height * scale).toFixed(2);
    const x = ((pageWidth - width * scale) / 2).toFixed(2);
    const y = ((pageHeight - height * scale) / 2).toFixed(2);
    const content = `q ${drawWidth} 0 0 ${drawHeight} ${x} ${y} cm /Im0 Do Q`;

    const encoder = new TextEncoder();
    const parts: Uint8Array[] = [];
    const offsets: number[] = [];
    let length = 0;
    const push = (chunk: Uint8Array | string) => {
        const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
        parts.push(bytes);
        length += bytes.length;
    };
    const object = (body: (string | Uint8Array)[]) => {
        offsets.push(length);
        push(`${offsets.length} 0 obj\n`);
        body.forEach(push);
        push("\nendobj\n");
    };

    push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    object(["<< /Type /Catalog /Pages 2 0 R >>"]);
    object(["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"]);
    object([
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
            "/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>",
    ]);
    object([
        `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB ` +
            `/BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
        jpeg,
        "\nendstream",
    ]);
    object([`<< /Length ${content.length} >>\nstream\n${content}\nendstream`]);

    const xrefOffset = length;
    push(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`);
    offsets.forEach((offset) => push(`${String(offset).padStart(10, "0")} 00000 n \n`));
    push(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

    return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

export async function downloadPassPdf(pass: Pass) {
    const canvas = await renderPassCanvas(pass);
    const jpeg = new Uint8Array(await (await canvasBlob(canvas, "image/jpeg", 0.92)).arrayBuffer());
    await saveBlob(buildPdf(jpeg, canvas.width, canvas.height), passFilename(pass, "pdf"));
}
