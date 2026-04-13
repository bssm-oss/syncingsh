import type * as Y from 'yjs';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface YjsState {
	doc: Y.Doc | null;
	status: ConnectionStatus;
	peerCount: number;
	errorMessage: string | null;
}
