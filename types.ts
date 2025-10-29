export interface Track {
  id: string;
  title: string;
  artist: string;
  album: {
    id: string;
    title: string;
    cover: string;
  };
  duration: number;
  url: string;
  albumArtUrl?: string; // For custom art from uploaded files
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  cover: string;
  tracks: Track[];
}

export interface User {
  id: string;
  name: string;
  profilePic: string;
  history: Track[];
  downloads: string[]; // Store track IDs
  likedSongs: string[]; // Store track IDs
}
