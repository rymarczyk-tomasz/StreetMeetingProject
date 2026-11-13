// Sensitive admin actions answer 403 { code: "step_up_required" } until the request
// carries stepUp: { password, code }. withStepUp asks for them (StepUpDialog) and retries.

export type StepUpCredentials = { password: string; code: string };
// isRetry: the previous password / code was refused, so `message` is an error
// context: what is being confirmed, shown in the dialog (optional)
type StepUpRequest = { message: string; twoFactor: boolean; isRetry: boolean; context?: string };
type Asker = (request: StepUpRequest) => Promise<StepUpCredentials | null>;

let asker: Asker | null = null;

export function registerStepUpAsker(fn: Asker | null) {
    asker = fn;
}

function isStepUpError(err) {
    return err?.response?.status === 403 && err.response.data?.code === "step_up_required";
}

const MAX_ATTEMPTS = 3;

export async function withStepUp<T>(
    send: (stepUp?: StepUpCredentials) => Promise<T>,
    context?: string,
): Promise<T> {
    let stepUp: StepUpCredentials | undefined;
    for (let attempt = 0; ; attempt++) {
        try {
            return await send(stepUp);
        } catch (err) {
            if (!isStepUpError(err) || !asker || attempt >= MAX_ATTEMPTS) throw err;
            const answer = await asker({
                message: err.response.data.message,
                twoFactor: Boolean(err.response.data.twoFactor),
                isRetry: Boolean(stepUp),
                context,
            });
            if (!answer) {
                // keeps the callers' usual err.response.data.message handling
                throw { response: { data: { message: "Anulowano — zmiana nie została zapisana." } } };
            }
            stepUp = answer;
        }
    }
}
