import { redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const uuid = randomUUID();
	const roomId = uuid.slice(0, 8);
	redirect(307, `/room/${roomId}`);
};
