
const BASE_URL = 'https://music.dpdx.in';

export interface DPDXSong {
    id: string;
    title: string;
    artist: string;
    audioUrl?: string;
    coverUrl?: string;
    audio_url?: string;
    cover_url?: string;
}

export interface DPDXProfile {
    id: string;
    name: string;
    role: string;
}

export interface DPDXPlaylist {
    id: string;
    name: string;
    coverUrl?: string;
    cover_url?: string;
    songs: DPDXSong[];
}

const mapSong = (song: any): DPDXSong => ({
    ...song,
    coverUrl: song.cover_url || song.coverUrl,
    audioUrl: song.audio_url || song.audioUrl
});

export const musicApi = {
    async confirmLink(token: string): Promise<string> {
        const response = await fetch(`${BASE_URL}/auth-api/link/confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to confirm linking token');
        }

        const data = await response.json();
        return data.accessKey;
    },

    async searchSongs(query: string, accessKey: string): Promise<DPDXSong[]> {
        const response = await fetch(`${BASE_URL}/public-api/songs?q=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${accessKey}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to search songs');
        }

        const data = await response.json();
        return data.map(mapSong);
    },

    async getUserProfile(accessKey: string): Promise<DPDXProfile> {
        const response = await fetch(`${BASE_URL}/public-api/user/profile`, {
            headers: {
                'Authorization': `Bearer ${accessKey}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }

        return await response.json();
    },

    async getUserPlaylists(accessKey: string): Promise<DPDXPlaylist[]> {
        const response = await fetch(`${BASE_URL}/public-api/playlists`, {
            headers: {
                'Authorization': `Bearer ${accessKey}`,
            },
        });

        if (!response.ok) {
            return []; // Return empty if failing (e.g. no playlists or bad key)
        }

        const data = await response.json();
        return data.map((p: any) => ({
            ...p,
            coverUrl: p.cover_url || p.coverUrl,
            songs: (p.songs || []).map(mapSong)
        }));
    },

    async getAllSongs(accessKey: string): Promise<DPDXSong[]> {
        const response = await fetch(`${BASE_URL}/public-api/songs?q=&limit=100`, {
            headers: {
                'Authorization': `Bearer ${accessKey}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch songs');
        }

        const data = await response.json();
        return data.map(mapSong);
    },

    getStreamUrl(songId: string, accessKey?: string): string {
        const base = `${BASE_URL}/public-api/stream/${songId}`;
        return accessKey ? `${base}?key=${encodeURIComponent(accessKey)}` : base;
    }
};
