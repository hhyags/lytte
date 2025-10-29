import { User, Album, Track } from '../types';
import { mockUser, mockAlbums, mockTracks } from './mockData';

// --- Data Initialization ---
// This simulates a simple database by using localStorage.

function initializeData<T>(key: string, defaultValue: T): T {
  try {
    const storedData = localStorage.getItem(key);
    if (storedData) {
      return JSON.parse(storedData);
    }
  } catch (error) {
    console.error(`Error parsing ${key} from localStorage`, error);
    localStorage.removeItem(key);
  }
  localStorage.setItem(key, JSON.stringify(defaultValue));
  return defaultValue;
}

let users: User[] = [initializeData<User>('lytte-user', mockUser)];
let albums: Album[] = initializeData<Album[]>('lytte-albums', mockAlbums);
let tracks: Track[] = initializeData<Track[]>('lytte-tracks', mockTracks);

function saveData() {
  localStorage.setItem('lytte-user', JSON.stringify(users[0]));
  localStorage.setItem('lytte-albums', JSON.stringify(albums));
  localStorage.setItem('lytte-tracks', JSON.stringify(tracks));
}

// --- API Functions ---
// All functions are async to simulate real API calls.

const api = {
  // --- User ---
  async getUser(): Promise<User> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(users[0]), 200);
    });
  },
  
  async updateUserProfile(updates: { name?: string, profilePicFile?: File }): Promise<User> {
    return new Promise((resolve) => {
        const user = users[0];
        if (updates.name) {
            user.name = updates.name;
        }
        if (updates.profilePicFile) {
            // In a real app, you'd upload this file. Here, we create a local URL.
            user.profilePic = URL.createObjectURL(updates.profilePicFile);
        }
        saveData();
        setTimeout(() => resolve(user), 200);
    });
  },

  // --- Music Library ---
  async getAlbums(): Promise<Album[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(albums), 200);
    });
  },

  async getAlbumById(id: string): Promise<Album | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(albums.find(a => a.id === id)), 200);
    });
  },

  async searchTracks(query: string): Promise<Track[]> {
    return new Promise((resolve) => {
      const lowerQuery = query.toLowerCase();
      const results = tracks.filter(
        t =>
          t.title.toLowerCase().includes(lowerQuery) ||
          t.artist.toLowerCase().includes(lowerQuery) ||
          t.album.title.toLowerCase().includes(lowerQuery)
      );
      setTimeout(() => resolve(results), 300);
    });
  },
  
  async getAutoplayTrack(excludeIds: string[]): Promise<Track | null> {
    return new Promise((resolve) => {
      const availableTracks = tracks.filter(t => !excludeIds.includes(t.id));
      if (availableTracks.length === 0) {
        resolve(null);
        return;
      }
      const randomIndex = Math.floor(Math.random() * availableTracks.length);
      resolve(availableTracks[randomIndex]);
    });
  },

  async uploadSong(file: File, title: string, artist: string, albumTitle: string, albumArt?: string): Promise<Track> {
    return new Promise((resolve) => {
      // Find or create album
      let album = albums.find(a => a.title.toLowerCase() === albumTitle.toLowerCase());
      if (!album) {
        album = {
          id: `album-${Date.now()}`,
          title: albumTitle,
          artist: artist,
          cover: albumArt || `https://picsum.photos/seed/${albumTitle}/300/300`,
          tracks: [],
        };
        albums.push(album);
      } else if (albumArt && !album.cover.startsWith('data:')) {
        // Update album art if new upload provides it
        album.cover = albumArt;
      }
      
      const newTrack: Track = {
        id: `track-${Date.now()}`,
        title,
        artist,
        album: {
          id: album.id,
          title: album.title,
          cover: album.cover,
        },
        duration: 0, // In a real app, you'd get this from the file
        url: URL.createObjectURL(file), // Create a local URL for playback
        albumArtUrl: albumArt,
      };

      tracks.push(newTrack);
      album.tracks.push(newTrack);

      saveData();
      setTimeout(() => resolve(newTrack), 500);
    });
  },

  // --- User Collections (History, Downloads, Liked) ---
  async addToHistory(track: Track): Promise<void> {
    return new Promise((resolve) => {
      const user = users[0];
      user.history = [track, ...user.history.filter(t => t.id !== track.id)].slice(0, 50);
      saveData();
      resolve();
    });
  },

  async getHistory(): Promise<Track[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(users[0].history), 200);
    });
  },

  async addDownload(trackId: string): Promise<void> {
    return new Promise((resolve) => {
        const user = users[0];
        if (!user.downloads.includes(trackId)) {
            user.downloads.push(trackId);
            saveData();
        }
        resolve();
    });
  },

  async removeDownload(trackId: string): Promise<void> {
      return new Promise((resolve) => {
          const user = users[0];
          user.downloads = user.downloads.filter(id => id !== trackId);
          saveData();
          resolve();
      });
  },

  async getDownloads(): Promise<Track[]> {
    return new Promise((resolve) => {
        const user = users[0];
        const downloadedTracks = tracks.filter(t => user.downloads.includes(t.id));
        setTimeout(() => resolve(downloadedTracks), 200);
    });
  },

  async addLikedSong(trackId: string): Promise<void> {
      return new Promise((resolve) => {
          const user = users[0];
          if (!user.likedSongs.includes(trackId)) {
              user.likedSongs.push(trackId);
              saveData();
          }
          resolve();
      });
  },

  async removeLikedSong(trackId: string): Promise<void> {
      return new Promise((resolve) => {
          const user = users[0];
          user.likedSongs = user.likedSongs.filter(id => id !== trackId);
          saveData();
          resolve();
      });
  },

  async getLikedSongs(): Promise<Track[]> {
    return new Promise((resolve) => {
        const user = users[0];
        const likedTracks = tracks.filter(t => user.likedSongs.includes(t.id));
        setTimeout(() => resolve(likedTracks), 200);
    });
  }
};

export default api;
