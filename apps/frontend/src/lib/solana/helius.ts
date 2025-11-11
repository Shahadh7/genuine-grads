const HELIUS_WS_TIMEOUT_DEFAULT = 60_000;

type Commitment = 'processed' | 'confirmed' | 'finalized';

function getHeliusNetwork(): string {
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet').toLowerCase();

  switch (network) {
    case 'mainnet':
    case 'mainnet-beta':
      return 'mainnet';
    case 'testnet':
      return 'testnet';
    case 'devnet':
    default:
      return 'devnet';
  }
}

function getHeliusWsUrl(): string | null {
  const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (!apiKey) {
    return null;
  }

  const network = getHeliusNetwork();
  return `wss://devnet.helius-rpc.com/?api-key=${apiKey}`;
}

interface WaitForTransactionOptions {
  commitment?: Commitment;
  timeoutMs?: number;
}

interface TransactionNotification {
  method: 'transactionNotification';
  params: {
    result: {
      err: unknown;
      signature: string;
      slot: number;
      confirmationStatus: Commitment;
    };
    subscription: number;
  };
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * Wait for a transaction to reach the desired commitment using Helius WebSockets.
 * Falls back to a no-op if the API key is not configured.
 */
export async function waitForHeliusTransaction(
  signature: string,
  options: WaitForTransactionOptions = {}
): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const wsUrl = getHeliusWsUrl();
  if (!wsUrl) {
    return;
  }

  const { commitment = 'confirmed', timeoutMs = HELIUS_WS_TIMEOUT_DEFAULT } = options;

  return new Promise<void>((resolve, reject) => {
    let resolved = false;
    let subscriptionId: number | null = null;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket?.close();
        reject(new Error('Timed out waiting for Helius transaction confirmation'));
      }
    }, timeoutMs);

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'transactionSubscribe',
          params: [
            signature,
            {
              commitment,
            },
          ],
        })
      );
    };

    socket.onerror = (event) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      socket.close();
      reject(new Error(`Helius WebSocket error: ${JSON.stringify(event)}`));
    };

    socket.onmessage = (event) => {
      if (resolved) return;

      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;

        // Subscription confirmation
        if (data.id === 1) {
          if ('error' in data) {
            resolved = true;
            clearTimeout(timeout);
            socket.close();
            const error = data.error as JsonRpcError | undefined;
            reject(
              new Error(
                `Helius subscription error: ${error?.message ?? 'Unknown error'} ${
                  error?.code ? `(code ${error.code})` : ''
                }`
              )
            );
            return;
          }

          if ('result' in data && typeof data.result === 'number') {
            subscriptionId = data.result;
          }
          return;
        }

        if (data.method === 'transactionNotification') {
          const notification = data as unknown as TransactionNotification;
          resolved = true;
          clearTimeout(timeout);

          if (subscriptionId !== null) {
            socket.send(
              JSON.stringify({
                jsonrpc: '2.0',
                id: 2,
                method: 'transactionUnsubscribe',
                params: [subscriptionId],
              })
            );
          }

          socket.close();

          if (notification.params.result.err) {
            reject(
              new Error(
                `Transaction failed: ${JSON.stringify(notification.params.result.err)}`
              )
            );
            return;
          }

          resolve();
        }
      } catch (error) {
        resolved = true;
        clearTimeout(timeout);
        socket.close();
        reject(
          error instanceof Error
            ? error
            : new Error('Failed to parse Helius WebSocket message')
        );
      }
    };

    socket.onclose = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      reject(new Error('Helius WebSocket closed before confirmation'));
    };
  });
}

