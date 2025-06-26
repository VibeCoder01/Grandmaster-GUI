
let engineWorker: Worker | null = null;
let nextRequestId = 0;
const pendingRequests = new Map<number, (value: string | null) => void>();

function getWorker(): Worker | null {
    if (typeof window === 'undefined') {
        return null;
    }
    if (!engineWorker) {
        engineWorker = new Worker(new URL('./engine.worker.ts', import.meta.url));
        
        engineWorker.onmessage = (e: MessageEvent<{id: number, move: string | null}>) => {
            const { id, move } = e.data;
            const resolve = pendingRequests.get(id);
            if (resolve) {
                resolve(move);
                pendingRequests.delete(id);
            }
        };
    }
    return engineWorker;
}

export const getBestMove = async (fen: string, depth: number): Promise<string | null> => {
    const worker = getWorker();
    if (!worker) {
        console.error("Engine worker not available.");
        return Promise.resolve(null);
    }

    const id = nextRequestId++;
    const promise = new Promise<string | null>((resolve) => {
        pendingRequests.set(id, resolve);
    });

    worker.postMessage({ id, fen, depth });

    return promise;
};
