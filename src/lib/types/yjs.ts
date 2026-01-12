import type * as Y from 'yjs';
import type { WebrtcProvider } from 'y-webrtc';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface YjsState {
	doc: Y.Doc | null;
	provider: WebrtcProvider | null;
	status: ConnectionStatus;
	peerCount: number;
	errorMessage: string | null;
}
