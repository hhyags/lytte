import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Link, useParams, useNavigate, NavLink } from 'react-router-dom';
import { User, Album, Track } from './types';
import api from './lib/api';

// --- Helper Components ---

function AlbumCard({ album }: { album: Album }) {
  return (
    <Link to={`/album/${album.id}`} className="block group">
      <div className="relative">
        <img src={album.cover} alt={album.title} className="w-full aspect-square object-cover rounded-md shadow-lg group-hover:opacity-75 transition-opacity" />
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
          <i className="fas fa-play text-white text-5xl"></i>
        </div>
      </div>
      <h3 className="text-sm font-bold mt-2 truncate text-brand-text">{album.title}</h3>
      <p className="text-xs text-gray-400 truncate">{album.artist}</p>
    </Link>
  );
}

function SongRow({ track, onPlay, isLiked, onLike, isDownloaded, onDownload, index }: { track: Track, onPlay: () => void, isLiked: boolean, onLike: () => void, isDownloaded: boolean, onDownload: () => void, index: number }) {
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };
    
  return (
    <div className="flex items-center p-2 rounded-lg hover:bg-white/10 group">
      <div className="w-8 text-center text-gray-400">{index + 1}</div>
      <div className="flex items-center flex-1 mx-4">
        <img src={track.albumArtUrl || track.album.cover} alt={track.title} className="w-10 h-10 object-cover rounded-sm mr-4" />
        <div>
          <p className="font-semibold text-brand-text">{track.title}</p>
          <p className="text-sm text-gray-400">{track.artist}</p>
        </div>
      </div>
       <div className="flex items-center space-x-4 text-gray-400 text-lg">
         <button onClick={onPlay} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <i className="fas fa-play text-white"></i>
        </button>
        <button onClick={onLike} className={`${isLiked ? 'text-royal-blue' : 'text-gray-400'}`}>
          <i className={`${isLiked ? 'fas' : 'far'} fa-heart`}></i>
        </button>
        <button onClick={onDownload}>
          <i className={`fas ${isDownloaded ? 'fa-check-circle text-royal-blue' : 'fa-download'}`}></i>
        </button>
      </div>
      <div className="w-16 text-right text-gray-400 text-sm">{formatTime(track.duration)}</div>
    </div>
  );
}


// --- Main App Component ---
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [duration, setDuration] = useState(0);

  const [playQueue, setPlayQueue] = useState<Track[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');
  const [isAutoplay, setIsAutoplay] = useState(true);
  
  const [likedSongs, setLikedSongs] = useState<string[]>([]);
  const [downloadedSongs, setDownloadedSongs] = useState<string[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);


  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      const fetchedUser = await api.getUser();
      setUser(fetchedUser);
      setLikedSongs(fetchedUser.likedSongs);
      setDownloadedSongs(fetchedUser.downloads);
    };
    fetchInitialData();
  }, []);

  const playTrack = (track: Track, contextTracks?: Track[]) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    api.addToHistory(track); // Add to history on play

    if (contextTracks) {
      setPlayQueue(contextTracks);
      setCurrentQueueIndex(contextTracks.findIndex(t => t.id === track.id));
    } else {
      setPlayQueue([track]);
      setCurrentQueueIndex(0);
    }

    if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.play().catch(e => console.error("Playback error:", e));
    }
  };

  const handleTogglePlay = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleNext = useCallback(async () => {
    if (playQueue.length === 0) return;
    let nextIndex;

    if (isShuffle) {
        nextIndex = Math.floor(Math.random() * playQueue.length);
        if (playQueue.length > 1 && nextIndex === currentQueueIndex) {
            nextIndex = (currentQueueIndex + 1) % playQueue.length;
        }
    } else {
        nextIndex = currentQueueIndex + 1;
    }
    
    if (nextIndex >= playQueue.length) {
        if (repeatMode === 'all') {
            nextIndex = 0;
        } else if (isAutoplay) {
            const autoplayTrack = await api.getAutoplayTrack(playQueue.map(t => t.id));
            if (autoplayTrack) {
                const newQueue = [...playQueue, autoplayTrack];
                playTrack(autoplayTrack, newQueue);
            }
            return;
        } else {
            setIsPlaying(false);
            return; 
        }
    }
    
    playTrack(playQueue[nextIndex], playQueue);
  }, [playQueue, currentQueueIndex, isShuffle, repeatMode, isAutoplay]);

  const handlePrevious = () => {
    if (playQueue.length === 0) return;
    let prevIndex = currentQueueIndex - 1;
    if (prevIndex < 0) {
        prevIndex = playQueue.length - 1;
    }
    playTrack(playQueue[prevIndex], playQueue);
  };

  const handleTrackEnded = useCallback(() => {
    if (repeatMode === 'one' && currentTrack) {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
        }
    } else {
        handleNext();
    }
  }, [repeatMode, currentTrack, handleNext]);


  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = Number(e.target.value);
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const timeUpdateHandler = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const toggleLike = async (trackId: string) => {
    const isLiked = likedSongs.includes(trackId);
    if (isLiked) {
      await api.removeLikedSong(trackId);
      setLikedSongs(likedSongs.filter(id => id !== trackId));
    } else {
      await api.addLikedSong(trackId);
      setLikedSongs([...likedSongs, trackId]);
    }
  };

  const toggleDownload = async (trackId: string) => {
    const isDownloaded = downloadedSongs.includes(trackId);
    if (isDownloaded) {
      await api.removeDownload(trackId);
      setDownloadedSongs(downloadedSongs.filter(id => id !== trackId));
    } else {
      await api.addDownload(trackId);
      setDownloadedSongs([...downloadedSongs, trackId]);
    }
  };
  
  const toggleShuffle = () => setIsShuffle(!isShuffle);
  
  const toggleRepeat = () => {
    const modes: ('none' | 'all' | 'one')[] = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  const toggleAutoplay = () => setIsAutoplay(!isAutoplay);
  
  const handleProfileSave = async (updates: { name?: string; profilePicFile?: File }) => {
    if (!user) return;
    const updatedUser = await api.updateUserProfile(updates);
    setUser(updatedUser);
    setIsProfileModalOpen(false);
  };

  if (!user) {
    return <div className="flex justify-center items-center h-screen"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-royal-blue"></div></div>;
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Router>
      <div className="flex h-screen bg-brand-bg text-brand-text font-sans">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage playTrack={playTrack} likedSongs={likedSongs} toggleLike={toggleLike} downloadedSongs={downloadedSongs} toggleDownload={toggleDownload} />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/album/:albumId" element={<AlbumView playTrack={playTrack} likedSongs={likedSongs} toggleLike={toggleLike} downloadedSongs={downloadedSongs} toggleDownload={toggleDownload} />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/liked" element={<LikedSongsPage playTrack={playTrack} likedSongs={likedSongs} toggleLike={toggleLike} downloadedSongs={downloadedSongs} toggleDownload={toggleDownload} />} />
              <Route path="/history" element={<HistoryPage playTrack={playTrack} likedSongs={likedSongs} toggleLike={toggleLike} downloadedSongs={downloadedSongs} toggleDownload={toggleDownload} />} />
              <Route path="/downloads" element={<DownloadsPage playTrack={playTrack} likedSongs={likedSongs} toggleLike={toggleLike} downloadedSongs={downloadedSongs} toggleDownload={toggleDownload} />} />
              <Route path="/profile" element={<ProfilePage user={user} onEditProfile={() => setIsProfileModalOpen(true)} />} />
            </Routes>
          </main>
          {isProfileModalOpen && (
            <ProfileEditModal
                user={user}
                onSave={handleProfileSave}
                onClose={() => setIsProfileModalOpen(false)}
            />
           )}
          <Player
            track={currentTrack}
            isPlaying={isPlaying}
            progress={progress}
            duration={duration}
            volume={volume}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            formatTime={formatTime}
            likedSongs={likedSongs}
            toggleLike={toggleLike}
            downloadedSongs={downloadedSongs}
            toggleDownload={toggleDownload}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isShuffle={isShuffle}
            toggleShuffle={toggleShuffle}
            repeatMode={repeatMode}
            toggleRepeat={toggleRepeat}
            isAutoplay={isAutoplay}
            toggleAutoplay={toggleAutoplay}
          />
        </div>
        <audio
          ref={audioRef}
          onTimeUpdate={timeUpdateHandler}
          onLoadedMetadata={timeUpdateHandler}
          onEnded={handleTrackEnded}
        ></audio>
      </div>
    </Router>
  );
}

// --- Sidebar ---
const Sidebar = ({ user }: { user: User }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const NavItem = ({ to, icon, children }: { to: string, icon: string, children: React.ReactNode }) => (
        <NavLink to={to} className={({ isActive }) => `flex items-center space-x-4 p-2 rounded-lg transition-colors ${isActive ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-gray-400'}`}>
            <i className={`fas ${icon} w-6 text-center`}></i>
            <span className="font-semibold">{children}</span>
        </NavLink>
    );

    const sidebarContent = (
        <>
            <div className="px-4 py-2">
                <Link to="/" className="text-2xl font-bold text-brand-headings tracking-wider" style={{ textShadow: '0 0 8px rgba(255, 215, 0, 0.5)' }}>Lytte</Link>
            </div>
            <nav className="flex-1 px-4 mt-8 space-y-2">
                <NavItem to="/" icon="fa-home">Home</NavItem>
                <NavItem to="/search" icon="fa-search">Search</NavItem>
                <NavItem to="/library" icon="fa-layer-group">Your Library</NavItem>
            </nav>
            <nav className="px-4 mt-8 space-y-2">
                <p className="text-xs font-bold uppercase text-gray-500 px-2">Collections</p>
                <NavItem to="/liked" icon="fa-heart">Liked Songs</NavItem>
                <NavItem to="/downloads" icon="fa-download">Downloads</NavItem>
                <NavItem to="/history" icon="fa-history">History</NavItem>
                <NavItem to="/upload" icon="fa-upload">Upload</NavItem>
            </nav>
            <div className="mt-auto p-4">
                <Link to="/profile" className="flex items-center space-x-3 group">
                    <img src={user.profilePic} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                    <span className="font-semibold text-brand-text group-hover:text-white truncate">{user.name}</span>
                </Link>
            </div>
        </>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden md:flex md:flex-col md:w-64 bg-black/30 backdrop-blur-sm p-2">
                {sidebarContent}
            </div>

            {/* Mobile Header and Menu */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-brand-bg/80 backdrop-blur-sm">
                <Link to="/" className="text-2xl font-bold text-brand-headings tracking-wider" style={{ textShadow: '0 0 8px rgba(255, 215, 0, 0.5)' }}>Lytte</Link>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-2xl">
                    <i className="fas fa-bars"></i>
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* Mobile Menu Content */}
            <div className={`md:hidden fixed top-0 left-0 h-full w-64 bg-black/80 backdrop-blur-lg z-40 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col p-2 overflow-hidden`}>
                {sidebarContent}
            </div>
            
             {/* Add padding to main content to avoid being overlapped by mobile header */}
            <div className="md:hidden pt-16"></div>
        </>
    );
};

// --- Player Component ---
// FIX: Add `downloadedSongs` to props to fix type error and implement download state display.
const Player = ({ track, isPlaying, progress, duration, volume, onTogglePlay, onSeek, onVolumeChange, formatTime, likedSongs, toggleLike, onNext, onPrevious, isShuffle, toggleShuffle, repeatMode, toggleRepeat, toggleAutoplay, isAutoplay, toggleDownload, downloadedSongs }) => {
  if (!track) return <div className="h-24 bg-black/30 border-t border-white/10"></div>;

  const isLiked = likedSongs.includes(track.id);
  const isDownloaded = downloadedSongs.includes(track.id);

  const repeatIcon = {
    'none': 'fa-random', // Just a placeholder, will be replaced by shuffle logic
    'all': 'fa-repeat',
    'one': 'fa-repeat-1-alt'
  };

  return (
    <div className="h-24 bg-black/30 backdrop-blur-sm border-t border-white/10 p-4 flex items-center space-x-4">
      <div className="flex items-center w-1/4">
        <img src={track.albumArtUrl || track.album.cover} alt={track.title} className="w-14 h-14 object-cover rounded-md" />
        <div className="ml-4">
          <p className="font-semibold truncate">{track.title}</p>
          <p className="text-sm text-gray-400 truncate">{track.artist}</p>
        </div>
        <button onClick={() => toggleLike(track.id)} className={`ml-4 text-xl ${isLiked ? 'text-royal-blue' : 'text-gray-400'}`}>
          <i className={`${isLiked ? 'fas' : 'far'} fa-heart`}></i>
        </button>
         <button onClick={() => toggleDownload(track.id)} className={`ml-2 text-xl ${isDownloaded ? 'text-royal-blue' : 'text-gray-400'}`}>
            <i className={`fas ${isDownloaded ? 'fa-check-circle' : 'fa-download'}`}></i>
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex items-center space-x-6 text-2xl">
          <button onClick={toggleShuffle} className={`${isShuffle ? 'text-royal-blue' : 'text-gray-400'}`}><i className="fas fa-random"></i></button>
          <button onClick={onPrevious} className="text-gray-300 hover:text-white"><i className="fas fa-step-backward"></i></button>
          <button onClick={onTogglePlay} className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center text-xl">
            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
          </button>
          <button onClick={onNext} className="text-gray-300 hover:text-white"><i className="fas fa-step-forward"></i></button>
          <button onClick={toggleRepeat} className={`${repeatMode !== 'none' ? 'text-royal-blue' : 'text-gray-400'}`}>
            <i className={`fas ${repeatMode === 'one' ? 'fa-repeat-1-alt' : 'fa-repeat'}`}></i>
          </button>
        </div>
        <div className="flex items-center space-x-2 w-full mt-2">
          <span className="text-xs text-gray-400">{formatTime(progress)}</span>
          {/* FIX: Cast style to React.CSSProperties to allow custom properties and prevent division by zero. */}
          <input type="range" min="0" max={duration} value={progress} onChange={onSeek} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" style={{'--progress': `${duration ? (progress / duration) * 100 : 0}%`} as React.CSSProperties} />
          <span className="text-xs text-gray-400">{formatTime(duration)}</span>
        </div>
      </div>
      <div className="w-1/4 flex items-center justify-end space-x-4">
         <button onClick={toggleAutoplay} className={`${isAutoplay ? 'text-royal-blue' : 'text-gray-400'}`}><i className="fas fa-infinity"></i></button>
        <i className="fas fa-volume-down text-gray-400"></i>
        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={onVolumeChange} className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
      </div>
    </div>
  );
};


// --- Pages ---

function HomePage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  
  useEffect(() => {
    const fetchAlbums = async () => {
      const fetchedAlbums = await api.getAlbums();
      setAlbums(fetchedAlbums);
    };
    fetchAlbums();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-headings mb-6" style={{ textShadow: '0 0 8px rgba(255, 215, 0, 0.5)' }}>Welcome Back</h1>
      {albums.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {albums.map(album => <AlbumCard key={album.id} album={album} />)}
        </div>
      ) : (
         <div className="text-center py-20 bg-black/20 rounded-lg">
            <i className="fas fa-compact-disc text-5xl text-gray-500 mb-4 animate-spin-slow"></i>
            <h2 className="text-xl font-bold">Your Music Collection is Empty</h2>
            <p className="text-gray-400 mt-2">Upload your first song to see albums appear here.</p>
            <Link to="/upload" className="mt-4 inline-block bg-royal-blue text-white font-bold py-2 px-4 rounded-full hover:bg-blue-500 transition-colors">
                Upload Music
            </Link>
        </div>
      )}
    </div>
  );
}

function SearchPage({ playTrack, likedSongs, toggleLike, downloadedSongs, toggleDownload }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.length > 2) {
      const handleSearch = async () => {
        setIsLoading(true);
        const searchResults = await api.searchTracks(query);
        setResults(searchResults);
        setIsLoading(false);
      };
      const debounce = setTimeout(handleSearch, 300);
      return () => clearTimeout(debounce);
    } else {
      setResults([]);
    }
  }, [query]);

  return (
    <div>
      <div className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for songs, artists, albums..."
          className="w-full bg-white/10 p-4 pl-12 rounded-full text-lg focus:outline-none focus:ring-2 focus:ring-royal-blue"
        />
        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
      </div>
      <div>
        {isLoading && <p>Searching...</p>}
        {results.length > 0 && !isLoading && (
          <div>
            {results.map((track, index) => (
              <SongRow 
                key={track.id} 
                track={track}
                index={index}
                onPlay={() => playTrack(track, results)}
                isLiked={likedSongs.includes(track.id)}
                onLike={() => toggleLike(track.id)}
                isDownloaded={downloadedSongs.includes(track.id)}
                onDownload={() => toggleDownload(track.id)}
               />
            ))}
          </div>
        )}
        {query.length > 2 && results.length === 0 && !isLoading && (
          <p className="text-center text-gray-400 mt-8">No results found for "{query}"</p>
        )}
      </div>
    </div>
  );
}

function LibraryPage() {
    const navigate = useNavigate();
    
    const LibraryCard = ({ title, icon, path }) => (
        <div onClick={() => navigate(path)} className="bg-white/5 p-6 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/10 transition-colors">
            <i className={`fas ${icon} text-4xl text-royal-blue mb-4`}></i>
            <h3 className="font-bold text-lg">{title}</h3>
        </div>
    );
    
    return (
        <div>
            <h1 className="text-3xl font-bold text-brand-headings mb-6" style={{ textShadow: '0 0 8px rgba(255, 215, 0, 0.5)' }}>Your Library</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <LibraryCard title="Liked Songs" icon="fa-heart" path="/liked" />
                <LibraryCard title="Downloads" icon="fa-download" path="/downloads" />
                <LibraryCard title="History" icon="fa-history" path="/history" />
                <LibraryCard title="Uploads" icon="fa-upload" path="/upload" />
            </div>
        </div>
    );
}

function AlbumView({ playTrack, likedSongs, toggleLike, downloadedSongs, toggleDownload }) {
  const { albumId } = useParams();
  const [album, setAlbum] = useState<Album | null>(null);

  useEffect(() => {
    if (albumId) {
      const fetchAlbum = async () => {
        const fetchedAlbum = await api.getAlbumById(albumId);
        setAlbum(fetchedAlbum || null);
      };
      fetchAlbum();
    }
  }, [albumId]);

  if (!album) return <div className="text-center">Loading album...</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row items-center md:items-end mb-8">
        <img src={album.cover} alt={album.title} className="w-48 h-48 object-cover rounded-lg shadow-2xl mb-4 md:mb-0 md:mr-8" />
        <div>
          <h1 className="text-4xl md:text-6xl font-bold text-brand-headings" style={{ textShadow: '0 0 8px rgba(255, 215, 0, 0.5)' }}>{album.title}</h1>
          <p className="text-lg text-gray-300 mt-2">{album.artist}</p>
        </div>
      </div>
      <div>
        {album.tracks.map((track, index) => (
          <SongRow 
            key={track.id} 
            track={track}
            index={index}
            onPlay={() => playTrack(track, album.tracks)}
            isLiked={likedSongs.includes(track.id)}
            onLike={() => toggleLike(track.id)}
            isDownloaded={downloadedSongs.includes(track.id)}
            onDownload={() => toggleDownload(track.id)}
          />
        ))}
      </div>
    </div>
  );
}

function UploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [album, setAlbum] = useState('');
    const [albumArt, setAlbumArt] = useState<string | undefined>();
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            // jsmediatags is loaded from CDN in index.html
            (window as any).jsmediatags.read(selectedFile, {
                onSuccess: (tag: any) => {
                    setTitle(tag.tags.title || '');
                    setArtist(tag.tags.artist || '');
                    setAlbum(tag.tags.album || '');
                    const { data, format } = tag.tags.picture || {};
                    if (data) {
                        const base64String = data.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
                        setAlbumArt(`data:${format};base64,${window.btoa(base64String)}`);
                    }
                },
                onError: (error: any) => {
                    console.error('Error reading media tags:', error);
                    // Pre-fill title from filename if no tags
                    setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
                }
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title || !artist || !album) {
            setMessage('Please fill in all fields and select a file.');
            return;
        }
        setIsUploading(true);
        setMessage('Uploading...');
        try {
            await api.uploadSong(file, title, artist, album, albumArt);
            setMessage('Upload successful! Redirecting...');
            setTimeout(() => navigate('/'), 2000);
        } catch (error) {
            setMessage('Upload failed. Please try again.');
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };
    
    return (
        <div>
            <h1 className="text-3xl font-bold text-brand-headings mb-6" style={{ textShadow: '0 0 8px rgba(255, 215, 0, 0.5)' }}>Upload Music</h1>
            <form onSubmit={handleSubmit} className="max-w-xl mx-auto bg-black/20 p-8 rounded-lg">
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">Audio File</label>
                    <input type="file" accept="audio/*" onChange={handleFileChange} className="w-full p-2 bg-white/10 rounded" required />
                </div>
                 <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">Title</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 bg-white/10 rounded" required />
                </div>
                 <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">Artist</label>
                    <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} className="w-full p-2 bg-white/10 rounded" required />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">Album</label>
                    <input type="text" value={album} onChange={(e) => setAlbum(e.target.value)} className="w-full p-2 bg-white/10 rounded" required />
                </div>
                {albumArt && <img src={albumArt} alt="Album Art Preview" className="w-24 h-24 object-cover rounded-md mb-4" />}
                <button type="submit" disabled={isUploading} className="w-full bg-royal-blue text-white font-bold py-3 px-4 rounded-full hover:bg-blue-500 transition-colors disabled:bg-gray-500">
                    {isUploading ? 'Uploading...' : 'Upload Song'}
                </button>
                {message && <p className="mt-4 text-center">{message}</p>}
            </form>
        </div>
    );
}

// A generic page for showing a list of songs
function SongListPage({ fetchFunction, title, emptyMessage, playTrack, likedSongs, toggleLike, downloadedSongs, toggleDownload }) {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTracks = async () => {
            setLoading(true);
            const fetchedTracks = await fetchFunction();
            setTracks(fetchedTracks);
            setLoading(false);
        };
        loadTracks();
    }, [fetchFunction]);

    if (loading) return <div>Loading...</div>;
    
    return (
        <div>
            <h1 className="text-3xl font-bold text-brand-headings mb-6" style={{ textShadow: '0 0 8px rgba(255, 215, 0, 0.5)' }}>{title}</h1>
            {tracks.length > 0 ? (
                <div>
                    {tracks.map((track, index) => (
                        <SongRow 
                            key={track.id} 
                            track={track}
                            index={index}
                            onPlay={() => playTrack(track, tracks)}
                            isLiked={likedSongs.includes(track.id)}
                            onLike={() => toggleLike(track.id)}
                            isDownloaded={downloadedSongs.includes(track.id)}
                            onDownload={() => toggleDownload(track.id)}
                        />
                    ))}
                </div>
            ) : (
                <p>{emptyMessage}</p>
            )}
        </div>
    );
}

const LikedSongsPage = (props) => (
    <SongListPage
        {...props}
        fetchFunction={api.getLikedSongs}
        title="Liked Songs"
        emptyMessage="You haven't liked any songs yet."
    />
);

const HistoryPage = (props) => (
    <SongListPage
        {...props}
        fetchFunction={api.getHistory}
        title="Listening History"
        emptyMessage="Your listening history is empty."
    />
);

const DownloadsPage = (props) => (
    <SongListPage
        {...props}
        fetchFunction={api.getDownloads}
        title="Downloads"
        emptyMessage="You haven't downloaded any songs."
    />
);


function ProfilePage({ user, onEditProfile }) {
    return (
        <div className="text-center">
            <img src={user.profilePic} alt={user.name} className="w-48 h-48 rounded-full object-cover mx-auto mb-6 shadow-2xl" />
            <h1 className="text-4xl font-bold text-brand-headings" style={{ textShadow: '0 0 8px rgba(255, 215, 0, 0.5)' }}>{user.name}</h1>
            <button onClick={onEditProfile} className="mt-6 bg-royal-blue text-white font-bold py-2 px-6 rounded-full hover:bg-blue-500 transition-colors">
                Edit Profile
            </button>
        </div>
    );
}

function ProfileEditModal({ user, onSave, onClose }) {
    const [name, setName] = useState(user.name);
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [preview, setPreview] = useState(user.profilePic);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfilePicFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, profilePicFile: profilePicFile || undefined });
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-brand-bg border border-white/20 p-8 rounded-lg shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-brand-headings mb-6">Edit Profile</h2>
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col items-center mb-6">
                        <img src={preview} alt="Profile Preview" className="w-32 h-32 rounded-full object-cover mb-4" />
                        <label htmlFor="profile-pic-upload" className="cursor-pointer bg-white/10 py-2 px-4 rounded-full text-sm hover:bg-white/20">Change Picture</label>
                        <input id="profile-pic-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </div>
                    <div className="mb-6">
                         <label className="block text-sm font-bold mb-2">Display Name</label>
                         <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 bg-white/10 rounded" />
                    </div>
                    <div className="flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-full hover:bg-gray-500">Cancel</button>
                        <button type="submit" className="bg-royal-blue text-white font-bold py-2 px-4 rounded-full hover:bg-blue-500">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default App;