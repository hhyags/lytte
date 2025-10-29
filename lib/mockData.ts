import { User, Album, Track } from '../types';

export const mockUser: User = {
  id: 'user-1',
  name: 'Music Lover',
  profilePic: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
  history: [],
  downloads: [],
  likedSongs: [],
};

// Start with one sample album
export const mockAlbums: Album[] = [
  {
    id: 'album-1',
    title: 'Electronic Dreams',
    artist: 'Various Artists',
    cover: 'https://picsum.photos/seed/electronic-dreams/300/300',
    tracks: [],
  },
];

// Provide a few working, royalty-free tracks for demonstration
export const mockTracks: Track[] = [
  {
    id: 'track-1',
    title: 'Lofi Chill',
    artist: 'Lofi Girl',
    album: { id: 'album-1', title: 'Electronic Dreams', cover: 'https://picsum.photos/seed/electronic-dreams/300/300' },
    duration: 180,
    url: 'https://storage.googleapis.com/media.aistudio.google.com/Lofi_Chill.mp3',
  },
  {
    id: 'track-2',
    title: 'Ambient Relaxation',
    artist: 'Relaxation Station',
    album: { id: 'album-1', title: 'Electronic Dreams', cover: 'https://picsum.photos/seed/electronic-dreams/300/300' },
    duration: 240,
    url: 'https://storage.googleapis.com/media.aistudio.google.com/Ambient_Relaxation.mp3',
  },
  {
    id: 'track-3',
    title: 'Upbeat Funk',
    artist: 'Funky Groove',
    album: { id: 'album-1', title: 'Electronic Dreams', cover: 'https://picsum.photos/seed/electronic-dreams/300/300' },
    duration: 210,
    url: 'https://storage.googleapis.com/media.aistudio.google.com/Upbeat_Funk.mp3',
  }
];

// Link tracks to the album
mockAlbums[0].tracks = mockTracks;
